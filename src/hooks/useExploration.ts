// ปิดไว้ชั่วคราว — โหมดสำรวจ (HetCreep สั่ง 2026-08-07)
//
// โค้ดทั้งไฟล์ถูกคอมเมนต์ไว้ ไม่ได้ลบ ระบบสำรวจ/บทสนทนา/NPC ไม่มีทางเข้าในเกมมาตั้งแต่
// PR #11 — ปุ่มในลอบบี้ทั้งสองปุ่มเปิด LobbyBattleSession เข้าห้องต่อสู้ตรง ๆ ไฟล์ในกอง
// นี้จึงไม่มีใคร import เลย ยืนยันด้วยการไล่ import graph จาก src/main.tsx ไม่ใช่ grep
// (21 ไฟล์ 1,579 บรรทัด + เทสต์ที่พึ่งมันอีก 3 ไฟล์)
//
// ทำไมคอมเมนต์แทนลบ: ตัดสินใจไว้ว่ายังไม่ลบ ของยังอยู่ให้อ่านและกู้ได้ทันทีโดยไม่ต้องขุด
// git แต่ก็ไม่กินเวลา typecheck/lint/test และไม่หลอกให้ใครคิดว่าเป็นโค้ดที่ยังทำงานอยู่
//
// เปิดกลับ: ลบ '// ' หน้าทุกบรรทัดในไฟล์กองนี้ แล้วต่อทางเข้าใหม่ใน LobbyPage
// (อย่าลืมเอา exclude ของสามไฟล์เทสต์ออกจาก vite.config.ts ด้วย)
//
// ─────────────────────────────────────────────────────────────────────────────

// โค้ดจริงถูกคอมเมนต์ไว้ทั้งหมด บรรทัดนี้ทำให้ไฟล์ยังเป็นโมดูลที่ถูกต้องและไม่ใช่ไฟล์ว่าง
// ไม่มีผลตอนรัน (type-only) ลบทิ้งได้ตอนเปิดโค้ดกลับ
export type ExplorationModeClosed = never

// import { useCallback, useEffect, useRef, useState } from 'react'
// import { clampToWalkable, isWalkable, npcObstacle } from '../game/exploration/collisions'
// import { getMap } from '../game/exploration/maps'
// import { movePosition } from '../game/exploration/movement'
// import { findNearbyNpc } from '../game/npc/proximity'
// import { getNpcsForMap } from '../game/npc/npcs'
// import type { Direction, ExplorationState, MovementVector } from '../game/exploration/types'
//
// const KEY_TO_DIRECTION: Record<string, Direction> = {
//   ArrowUp: 'up',
//   ArrowDown: 'down',
//   ArrowLeft: 'left',
//   ArrowRight: 'right',
//   w: 'up',
//   s: 'down',
//   a: 'left',
//   d: 'right',
// }
//
// const DIRECTION_VECTORS: Record<Direction, MovementVector> = {
//   up: { x: 0, y: -1 },
//   down: { x: 0, y: 1 },
//   left: { x: -1, y: 0 },
//   right: { x: 1, y: 0 },
// }
//
// /**
//  * รวมทิศที่กดค้างอยู่ทั้งหมด (คีย์บอร์ด + d-pad บนจอสัมผัส) เป็นเวกเตอร์เดียว
//  *
//  * ask-CB retroactive audit (2026-08-06) เจอว่าโค้ดเดิมเก็บ "เวกเตอร์ล่าสุด" ตัวเดียว
//  * (เขียนทับกันระหว่างคีย์บอร์ด/สัมผัส) แทนที่จะเก็บ "ชุดทิศที่กดอยู่" แบบเดียวกับ
//  * InputSystem.ts ของห้องต่อสู้ — ผลคือปล่อยปุ่มไหนก็ได้ = หยุดสนิททันที ทั้งที่ปุ่ม
//  * อื่นยังกดค้างอยู่จริง (เกิดตอนเล่นปกติ ไม่ต้อง alt-tab เลย) แก้โดยย้ายมาใช้ Set แบบ
//  * InputSystem.ts (ที่พิสูจน์แล้วว่าถูก) แทน
//  */
// export function sumHeldDirections(held: ReadonlySet<Direction>): MovementVector {
//   let x = 0
//   let y = 0
//   for (const direction of held) {
//     x += DIRECTION_VECTORS[direction].x
//     y += DIRECTION_VECTORS[direction].y
//   }
//   return { x, y }
// }
//
// interface UseExplorationOptions {
//   mapId: string
//   initialPosition?: ExplorationState['playerPosition']
//   movementLocked: boolean
// }
//
// export function useExploration({
//   mapId,
//   initialPosition,
//   movementLocked,
// }: UseExplorationOptions) {
//   const map = getMap(mapId)
//   const npcs = getNpcsForMap(mapId)
//
//   const [state, setState] = useState<ExplorationState>(() => ({
//     mapId,
//     playerPosition: initialPosition ?? map?.spawn ?? { x: 200, y: 520, direction: 'right' },
//     nearbyNpcId: null,
//     movementLocked,
//   }))
//
//   const heldRef = useRef<Set<Direction>>(new Set())
//   const rafRef = useRef<number | null>(null)
//   const lastTimeRef = useRef<number | null>(null)
//
//   useEffect(() => {
//     setState((current) => ({ ...current, movementLocked }))
//   }, [movementLocked])
//
//   useEffect(() => {
//     if (!map || movementLocked) return
//
//     const tick = (time: number) => {
//       const last = lastTimeRef.current ?? time
//       lastTimeRef.current = time
//       const delta = Math.min(0.05, (time - last) / 1000)
//       const vector = sumHeldDirections(heldRef.current)
//
//       if (vector.x !== 0 || vector.y !== 0) {
//         setState((current) => {
//           const npcBlocks = npcs.map(npcObstacle)
//           const next = movePosition(current.playerPosition, vector, delta)
//           const clamped = clampToWalkable(
//             isWalkable(next, map, npcBlocks) ? next : current.playerPosition,
//             map,
//             npcBlocks,
//           )
//           const nearby = findNearbyNpc(clamped, npcs, map)
//           return {
//             ...current,
//             playerPosition: clamped,
//             nearbyNpcId: nearby?.id ?? null,
//           }
//         })
//       } else {
//         setState((current) => {
//           const nearby = findNearbyNpc(current.playerPosition, npcs, map)
//           const nextId = nearby?.id ?? null
//           if (nextId === current.nearbyNpcId) return current
//           return { ...current, nearbyNpcId: nextId }
//         })
//       }
//
//       rafRef.current = requestAnimationFrame(tick)
//     }
//
//     rafRef.current = requestAnimationFrame(tick)
//     return () => {
//       if (rafRef.current) cancelAnimationFrame(rafRef.current)
//       lastTimeRef.current = null
//     }
//   }, [map, movementLocked, npcs])
//
//   useEffect(() => {
//     const onKeyDown = (event: KeyboardEvent) => {
//       if (movementLocked) return
//       const direction = KEY_TO_DIRECTION[event.key]
//       if (!direction) return
//       event.preventDefault()
//       heldRef.current.add(direction)
//     }
//     const onKeyUp = (event: KeyboardEvent) => {
//       const direction = KEY_TO_DIRECTION[event.key]
//       if (!direction) return
//       event.preventDefault()
//       heldRef.current.delete(direction)
//     }
//     // สลับแท็บ/มินิไมซ์ทั้งที่ยังกดค้างอยู่ = ไม่มี keyup ตามมา ต้องล้างเอง
//     // ไม่งั้นตัวละครเดินค้าง (เหมือน InputSystem.ts's onBlur ของห้องต่อสู้)
//     const onBlur = () => heldRef.current.clear()
//
//     window.addEventListener('keydown', onKeyDown)
//     window.addEventListener('keyup', onKeyUp)
//     window.addEventListener('blur', onBlur)
//     return () => {
//       window.removeEventListener('keydown', onKeyDown)
//       window.removeEventListener('keyup', onKeyUp)
//       window.removeEventListener('blur', onBlur)
//     }
//   }, [movementLocked])
//
//   /** d-pad บนจอสัมผัสเรียกคู่นี้ตอนกด/ปล่อยแต่ละทิศ — ลงชุดเดียวกับคีย์บอร์ด ไม่ทับกัน */
//   const pressDirection = useCallback((direction: Direction) => {
//     if (movementLocked) return
//     heldRef.current.add(direction)
//   }, [movementLocked])
//
//   const releaseDirection = useCallback((direction: Direction) => {
//     heldRef.current.delete(direction)
//   }, [])
//
//   const setPosition = useCallback((position: ExplorationState['playerPosition']) => {
//     setState((current) => ({ ...current, playerPosition: position }))
//   }, [])
//
//   return {
//     map,
//     npcs,
//     state,
//     pressDirection,
//     releaseDirection,
//     setPosition,
//   }
// }
//
