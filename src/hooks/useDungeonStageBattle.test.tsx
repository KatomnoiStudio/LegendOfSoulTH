import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useDungeonStageBattle } from './useDungeonStageBattle'
import { P5_TEST_DUNGEON } from '../game/dungeon/dungeonConfig'
import { createDefaultSkillLevels } from '../game/realtimeBattle/SkillProgressionSystem'
import type { Player } from '../types/player'
import { EMPTY_PROGRESS } from '../types/player'

/**
 * Pins the #104 dead-sprite fix: `subscribe` must re-derive from the current `activeRuntime`,
 * not stay memoized on `[orchestrator]` — which never changes across stage transitions even
 * though `dungeonOrchestrator.loadStage()` disposes the old `RealtimeBattleRuntime` and builds
 * a new one per stage. A fake orchestrator swaps the underlying runtime mid-run without running
 * a full combat simulation.
 *
 * The bug lives specifically in LISTENER REGISTRATION, which is why this test is built around
 * `notify()`. The pre-#104 `getSnapshot` read LIVE through `orchestrator?.getRuntime()?.`, so it
 * returned the new runtime's data on any re-render — asserting on the snapshot after a swap is
 * therefore NOT falsifiable, it passes on the broken code too. What actually broke was
 * `subscribe`, frozen on `[orchestrator]`: it never re-ran on a stage swap, leaving
 * `useSyncExternalStore` subscribed to stage 1's DISPOSED runtime whose listener Set was
 * cleared. Stage 2's per-frame `notify()` then reached nobody and the battle UI froze for the
 * whole stage. Only an assertion that requires runtime B's listener to have FIRED can see that.
 */

type Listener = () => void

const fixture = vi.hoisted(() => {
  function createRuntime(tag: string) {
    const listeners = new Set<Listener>()
    // useSyncExternalStore requires getSnapshot() to return a STABLE reference while nothing has
    // changed (React warns "should be cached to avoid an infinite loop" and re-renders without
    // settling otherwise) — so hold ONE object and replace it only inside notify(), the way a
    // real store does. A permanently-frozen snapshot would make this test unfalsifiable:
    // notify() could never change what the hook reads, so the listener would never have to fire
    // for the assertions to pass.
    let snapshot = { tag, tick: 0 }
    return {
      tag,
      subscribe: (listener: Listener) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      getSnapshot: () => snapshot,
      notify: () => {
        snapshot = { tag, tick: snapshot.tick + 1 }
        for (const listener of listeners) listener()
      },
      // no-ops — the battle loop's per-tick step() calls these unconditionally on whatever
      // `orch.getRuntime()` currently returns, real RealtimeBattleRuntime methods this fake
      // stands in for
      setMoveInput: () => {},
      requestAttack: () => {},
      requestSkill: () => {},
      requestExit: () => {},
    }
  }

  const runtimeA = createRuntime('A')
  const runtimeB = createRuntime('B')
  let active: ReturnType<typeof createRuntime> = runtimeA
  let step: ((deltaMs: number) => void) | null = null

  return {
    runtimeA,
    runtimeB,
    getActive: () => active,
    swapToB: () => {
      active = runtimeB
    },
    setStep: (fn: ((deltaMs: number) => void) | null) => {
      step = fn
    },
    runStep: (deltaMs: number) => step?.(deltaMs),
  }
})

vi.mock('../game/dungeon/dungeonOrchestrator', () => ({
  DungeonOrchestrator: class {
    getSnapshot() {
      return {
        phase: 'stage_active' as const,
        run: {
          dungeonId: 'fake',
          currentStageIndex: 0,
          status: 'active' as const,
          stageResults: [],
          startedAtMs: 0,
        },
        currentStage: { id: 'stage-1', arenaId: 'fake-arena' },
        stageSnapshot: null,
        result: null,
      }
    }
    start() {
      return true
    }
    getRuntime() {
      return fixture.getActive()
    }
    tick() {
      // no-op — the test drives runtime swaps directly via fixture.swapToB()
    }
    dispose() {}
  },
}))

vi.mock('../game/realtimeBattle/RealtimeBattleLoop', () => ({
  startBattleLoop: (opts: { step: (deltaMs: number) => void }) => {
    fixture.setStep(opts.step)
    return { stop: () => fixture.setStep(null) }
  },
}))

vi.mock('../game/realtimeBattle/battleAssets', () => ({
  preloadBattleTextures: async () => {},
}))

function stubPlayer(): Player {
  return {
    id: 'acc-1',
    uid: '1234567890',
    name: 'Tester',
    title: 'Novice',
    level: 1,
    exp: 0,
    expToNext: 100,
    currency: { gold: 0, gem: 0 },
    ownedCharacters: [
      {
        characterId: 'monkey-king',
        level: 1,
        exp: 0,
        expToNext: 100,
        obtainedAt: new Date().toISOString(),
        skillLevels: createDefaultSkillLevels(),
      },
    ],
    inventory: [],
    friends: [],
    teamSlots: ['monkey-king', null, null, null],
    frameId: 'default',
    progress: { ...EMPTY_PROGRESS },
  }
}

describe('useDungeonStageBattle — runtime swap across stage transitions', () => {
  it('re-subscribes to the new runtime after a stage swap and reflects its snapshot, not the disposed old one', async () => {
    // player must stay referentially stable across renders — `stubPlayer()` called inline in
    // the renderHook factory would return a fresh object every render, keeping the effect's
    // `[dungeon, player]` deps unstable so the effect (and `orchestrator`) reset every render,
    // masking the exact bug this test pins (a churning `orchestrator` "fixes" a stale-deps bug
    // for the wrong reason).
    const player = stubPlayer()
    const { result } = renderHook(() =>
      useDungeonStageBattle({
        dungeon: P5_TEST_DUNGEON,
        player,
        onDungeonComplete: vi.fn(),
      }),
    )

    await waitFor(() => expect(result.current.phase).toBe('active'))
    expect(result.current.runtime).toBe(fixture.runtimeA)
    expect(result.current.snapshot).toEqual({ tag: 'A', tick: 0 })

    act(() => {
      fixture.swapToB()
      fixture.runStep(16)
    })

    await waitFor(() => expect(result.current.runtime).toBe(fixture.runtimeB))

    // State plumbing only — passes on the pre-#104 code too (its getSnapshot read live through
    // `orchestrator.getRuntime()`), so this is a precondition, NOT the pin.
    expect(result.current.snapshot).toEqual({ tag: 'B', tick: 0 })

    // THE PIN. Nothing here re-renders the hook except runtime B's listener firing: notify()
    // advances B's snapshot to tick 1 and calls B's listener Set. If `subscribe` is memoized on
    // `[orchestrator]` it never re-ran on the swap, so the only registered listener still sits
    // on the disposed runtime A, B's Set is empty, no re-render happens, and the hook stays on
    // the tick-0 snapshot it last rendered — exactly the frozen battle UI the fix repaired.
    act(() => {
      fixture.runtimeB.notify()
    })
    expect(result.current.snapshot).toEqual({ tag: 'B', tick: 1 })
  })
})
