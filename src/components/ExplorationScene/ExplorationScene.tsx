import { useMemo } from 'react'
import { getCharacter } from '../../game/characters'
import type { NpcDefinition } from '../../game/npc/types'
import type { ExplorationState, MapDefinition } from '../../game/exploration/types'
import { SCENE_WIDTH, SCENE_HEIGHT } from '../../game/sceneDimensions'
import { publicUrl } from '../../lib/publicUrl'
import styles from './ExplorationScene.module.css'

interface ExplorationSceneProps {
  map: MapDefinition
  state: ExplorationState
  npcs: NpcDefinition[]
  playerSpriteUrl: string
  onExit: () => void
}

export function ExplorationScene({
  map,
  state,
  npcs,
  playerSpriteUrl,
  onExit,
}: ExplorationSceneProps) {
  const camera = useMemo(() => {
    const x = Math.min(
      Math.max(state.playerPosition.x - SCENE_WIDTH / 2, 0),
      Math.max(0, map.width - SCENE_WIDTH),
    )
    const y = Math.min(
      Math.max(state.playerPosition.y - SCENE_HEIGHT / 2, 0),
      Math.max(0, map.height - SCENE_HEIGHT),
    )
    return { x, y }
  }, [map.height, map.width, state.playerPosition.x, state.playerPosition.y])

  return (
    <div className={styles.explore}>
      <header className={styles.header}>
        <span className={styles.mapName}>{map.name}</span>
        <button type="button" className={styles.backBtn} onClick={onExit}>
          กลับล็อบบี้
        </button>
      </header>

      <div className={styles.viewport}>
        <div
          className={styles.world}
          style={{
            width: map.width,
            height: map.height,
            backgroundImage: `url(${map.background})`,
            transform: `translate(${-camera.x}px, ${-camera.y}px)`,
          }}
        >
          {npcs.map((npc) => (
            <div
              key={npc.id}
              className={styles.npc}
              data-nearby={state.nearbyNpcId === npc.id}
              style={{ left: npc.position.x, top: npc.position.y }}
            >
              <img src={npc.spriteUrl} alt="" draggable={false} />
              <span className={styles.npcLabel}>{npc.name}</span>
            </div>
          ))}

          <div
            className={styles.player}
            style={{
              left: state.playerPosition.x,
              top: state.playerPosition.y,
            }}
          >
            <img src={playerSpriteUrl} alt="" draggable={false} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function getPlayerSpriteUrl(teamSlots: (string | null)[]): string {
  const leadId = teamSlots.find((id) => id !== null) ?? 'monkey-king'
  return getCharacter(leadId)?.model.spriteUrl ?? publicUrl('characters/monkey-v2-idle-0.webp')
}
