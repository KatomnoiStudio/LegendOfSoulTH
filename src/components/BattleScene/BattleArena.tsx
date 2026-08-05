import { useEffect, useMemo } from 'react'
import { DoubleSide } from 'three'
import { getBattleTexture } from '../../game/realtimeBattle/battleAssets'
import { WORLD_SCALE } from '../../game/realtimeBattle/stageConfig'
import type { RealtimeBattleRuntime } from '../../game/realtimeBattle/RealtimeBattleRuntime'
import { BattleCamera } from './BattleCamera'
import { EnemyBattleSprite } from './EnemyBattleSprite'
import { PlayerBattleSprite } from './PlayerBattleSprite'

/**
 * ตัวห้องต่อสู้ในโลก 3 มิติ — พื้น ขอบเขต กล้อง และตัวละครทุกตัว
 *
 * พื้นและฉากใช้ Three.js ส่วนตัวละครเป็นระนาบภาพ PNG ตามสเปกข้อ 9
 * จุดกึ่งกลางห้อง (stage.width/2, stage.height/2) ถูก map ไปที่จุดกำเนิดของโลก
 * เพื่อให้กล้องเล็งที่ (0,0,0) ได้ตรง ๆ และคำนวณระยะได้จากขนาดห้องอย่างเดียว
 */
/** แถบขอบห้อง 4 ด้าน — axis คือแกนที่แถบทอดยาวไป, sign คือฝั่งของแกนอีกด้าน */
const ARENA_EDGES = [
  { id: 'top', axis: 'x', sign: -1 },
  { id: 'bottom', axis: 'x', sign: 1 },
  { id: 'left', axis: 'z', sign: -1 },
  { id: 'right', axis: 'z', sign: 1 },
] as const

const EDGE_THICKNESS = 0.06

export function BattleArena({ runtime }: { runtime: RealtimeBattleRuntime }) {
  const state = runtime.getState()
  const stage = state.stage

  const worldWidth = stage.width * WORLD_SCALE
  const worldDepth = stage.height * WORLD_SCALE

  /*
    ภาพของด่านถูกใช้เป็น "ฉากหลัง" ที่ตั้งขึ้นด้านหลังห้อง ไม่ใช่ลายพื้น

    ลองแปะเป็นพื้นก่อนแล้วผลออกมาผิดชัดเจน — ตัววิหารในภาพถูกกดให้นอนราบไปกับพื้น
    ศัตรูที่ยืนแถวบนเลยดูเหมือนลอยอยู่กลางอากาศ พอตั้งภาพขึ้นเป็นฉากหลังแทน
    เส้นขอบฟ้าของภาพก็เข้ากับมุมกล้อง top-down เฉียงพอดี
  */
  const backdropTexture = useMemo(() => {
    const source = stage.backgroundAsset ? getBattleTexture(stage.backgroundAsset) : null
    if (!source) return null

    /*
      กล้อง top-down เฉียงเห็นฉากหลังเป็นแถบบาง ๆ เหนือขอบไกลของห้องเท่านั้น
      ถ้าใช้ภาพเต็มใบ แถบที่เห็นจะไปตกที่ "พื้นลาน" ในภาพซึ่งดูไม่ออกว่าคืออะไร
      จึง crop เอาเฉพาะครึ่งบน (ตัววิหาร) มาแสดง

      ต้อง clone ก่อนแก้ repeat/offset — texture ตัวจริงถูกแคชไว้ใช้ร่วมกัน
      (ดู battleAssets.ts) การแก้ค่าบนตัวที่แคชจะไปกวนที่อื่นที่ใช้ภาพเดียวกัน
    */
    const cropped = source.clone()
    cropped.needsUpdate = true
    cropped.repeat.set(1, 0.58)
    cropped.offset.set(0, 0.42)
    return cropped
  }, [stage.backgroundAsset])

  // clone ไม่ได้ถูกสร้างโดย R3F จึงต้องคืนหน่วยความจำเอง (§28)
  useEffect(() => {
    if (!backdropTexture) return
    return () => backdropTexture.dispose()
  }, [backdropTexture])

  return (
    <group>
      <BattleCamera worldWidth={worldWidth} worldDepth={worldDepth} />

      <ambientLight intensity={0.9} />
      <hemisphereLight args={['#cdd6ff', '#241d33', 0.8]} />
      <directionalLight position={[4, 9, 6]} intensity={1.1} color="#fff2d8" />

      {/* ฉากหลัง — ตั้งขึ้นหลังขอบไกลของห้อง กว้างกว่าห้องเพื่อไม่ให้เห็นขอบภาพตอนกล้องขยับ */}
      {backdropTexture ? (
        <mesh position={[0, worldDepth * 0.28, -worldDepth / 2 - 0.6]}>
          <planeGeometry args={[worldWidth * 1.5, worldDepth * 0.56]} />
          <meshBasicMaterial map={backdropTexture} toneMapped={false} />
        </mesh>
      ) : null}

      {/* พื้นห้อง — ลานหินเรียบ ไม่ใช้ภาพฉากเป็นลายพื้น */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[worldWidth, worldDepth]} />
        <meshBasicMaterial color="#3a2f52" side={DoubleSide} />
      </mesh>

      {/* วงมณฑลกลางลาน ให้พื้นไม่โล่งจนไม่รู้ว่าตัวเองขยับไปไหนแล้ว */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[worldDepth * 0.26, worldDepth * 0.28, 64]} />
        <meshBasicMaterial color="#ffd765" transparent opacity={0.16} toneMapped={false} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[worldDepth * 0.1, worldDepth * 0.11, 48]} />
        <meshBasicMaterial color="#ffd765" transparent opacity={0.12} toneMapped={false} side={DoubleSide} />
      </mesh>

      {/*
        ขอบเขตที่เดินได้ — แถบบาง 4 ด้านให้ผู้เล่นเห็นว่าห้องจบตรงไหน
        ใช้ mesh แบบประกาศใน JSX ไม่ใช่สร้าง geometry เองในฟังก์ชัน render
        เพราะ R3F จะ dispose ให้อัตโนมัติตอน unmount (§28 ห้ามให้ทรัพยากรค้าง)
      */}
      {ARENA_EDGES.map((edge) => (
        <mesh
          key={edge.id}
          position={[
            edge.axis === 'x' ? 0 : (worldWidth / 2) * edge.sign,
            0.02,
            edge.axis === 'z' ? 0 : (worldDepth / 2) * edge.sign,
          ]}
        >
          <boxGeometry
            args={[
              edge.axis === 'x' ? worldWidth : EDGE_THICKNESS,
              EDGE_THICKNESS,
              edge.axis === 'z' ? worldDepth : EDGE_THICKNESS,
            ]}
          />
          <meshBasicMaterial color="#ffd765" transparent opacity={0.45} toneMapped={false} />
        </mesh>
      ))}

      <PlayerBattleSprite runtime={runtime} />
      {state.enemies.map((enemy) => (
        <EnemyBattleSprite key={enemy.id} runtime={runtime} enemy={enemy} />
      ))}
    </group>
  )
}
