import { createClient } from 'npm:@supabase/supabase-js@2.112.2'
import {
  createPvPAuthorityState,
  toRealtimePvPResult,
} from '../../../src/game/pvp/PvPAuthorityEngine.ts'
import {
  runPvPAuthorityCommand,
  type PvPAuthorityCommand,
} from '../../../src/game/pvp/PvPAuthorityService.ts'
import { createRankedPlayerEntity } from '../../../src/game/pvp/rankedNormalization.ts'
import type { PvPAuthorityState } from '../../../src/game/pvp/pvpTypes.ts'
import type { OwnedCharacter, Player } from '../../../src/types/player.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RoomRow {
  id: string
  host_profile_id: string
  guest_profile_id: string | null
  host_hero_id: string
  guest_hero_id: string | null
  status: string
  state_version: number
  authoritative_state: PvPAuthorityState | null
}

interface OwnedCharacterRow {
  character_id: string
  level: number
  exp: number
  exp_to_next: number
  obtained_at: string
  skill_levels?: OwnedCharacter['skillLevels'] | null
  star?: number | null
  shards?: number | null
}

type RequestBody = PvPAuthorityCommand & { roomId: string }

/**
 * บันทึก failure ลง log stream ของ Edge Function — จุดเดียวที่รู้เรื่องนี้ได้จากฝั่งเซิร์ฟเวอร์
 *
 * ก่อนหน้านี้ทั้งไฟล์ไม่มี log สักบรรทัด ทุกทางที่ล้ม (commit ชน constraint/RLS/deadlock,
 * คีย์ใน env พัง, room หาย) คืน error code สั้น ๆ ให้ client แล้วหายไป — log stream ว่างเปล่า
 * ไม่ว่าจะพังหนักแค่ไหน ฝั่งเราจึงไม่มีทางรู้เลยว่าห้อง PvP กำลังพังอยู่จนกว่าจะมีคนบ่น
 *
 * เขียนเป็น JSON บรรทัดเดียวเพราะ Supabase log explorer ค้นและกรองแบบ structured ได้
 * (ต่างจากข้อความปนกันที่ต้อง grep เอาเอง) ตั้งใจไม่ log ตัว state/input — มันใหญ่มากและ
 * ไม่ได้ช่วยวินิจฉัยเพิ่มจาก error ที่แนบมาแล้ว
 */
function logFailure(fn: string, detail: Record<string, unknown>): void {
  try {
    console.error(JSON.stringify({ fn, ...detail }))
  } catch {
    console.error(`{"fn":"${fn}","err":"unserializable"}`)
  }
}

function describeError(error: unknown): unknown {
  if (error && typeof error === 'object') {
    const source = error as Record<string, unknown>
    return {
      name: source.name,
      message: source.message,
      code: source.code,
      details: source.details,
      hint: source.hint,
    }
  }
  return String(error)
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function readDefaultKeySet(
  name: 'SUPABASE_PUBLISHABLE_KEYS' | 'SUPABASE_SECRET_KEYS',
): string | null {
  const raw = Deno.env.get(name)
  if (!raw) return null
  try {
    const keys = JSON.parse(raw) as Record<string, unknown>
    return typeof keys.default === 'string' ? keys.default : null
  } catch (error) {
    // env ที่ตั้งไว้แต่ parse ไม่ออก ต่างจาก env ที่ไม่ได้ตั้งเลยโดยสิ้นเชิง — ทั้งคู่คืน null
    // เหมือนกันแล้วไปโผล่เป็น SERVER_CONFIG_MISSING 500 ใบเดียวกัน ถ้าไม่ log ตรงนี้
    // คนที่มาไล่จะเห็นแค่ "ไม่ได้ตั้งค่า" ทั้งที่ตั้งไว้แล้วแต่ JSON เสีย
    logFailure('readDefaultKeySet', { keySet: name, err: describeError(error) })
    return null
  }
}

function createMatchSeed(): number {
  const seed = crypto.getRandomValues(new Uint32Array(1))[0]
  return seed === 0 ? 1 : seed
}

function minimalPlayer(profileId: string, heroRow: OwnedCharacterRow): Player {
  const defaultSkillProgress = { level: 1, exp: 0, expToNext: 200 }
  const hero: OwnedCharacter = {
    characterId: heroRow.character_id,
    level: heroRow.level,
    exp: heroRow.exp,
    expToNext: heroRow.exp_to_next,
    obtainedAt: heroRow.obtained_at,
    skillLevels: heroRow.skill_levels ?? {
      skill1: { ...defaultSkillProgress },
      skill2: { ...defaultSkillProgress },
      skill3: { ...defaultSkillProgress },
      ultimate: { ...defaultSkillProgress },
    },
    talentState: { unlockedNodes: [] },
    awakeningState: { tier: 0, unlockedEffects: [] },
    star: heroRow.star ?? 1,
    shards: heroRow.shards ?? 0,
  }
  return {
    id: profileId,
    uid: profileId,
    name: profileId,
    title: '',
    level: 1,
    exp: 0,
    expToNext: 1,
    currency: { gold: 0, gem: 0 },
    ownedCharacters: [hero],
    inventory: [],
    friends: [],
    teamSlots: [hero.characterId, null, null, null],
    frameId: 'default',
    progress: { flags: {}, defeatedNpcIds: [], battleHistory: [] },
  }
}

function isRequestBody(value: unknown): value is RequestBody {
  if (!value || typeof value !== 'object') return false
  const body = value as Record<string, unknown>
  if (typeof body.roomId !== 'string') return false
  if (body.action === 'disconnect' || body.action === 'reconnect') return true
  if (body.action !== 'input') return false
  return (
    Number.isSafeInteger(body.sequence) &&
    Number.isSafeInteger(body.clientTick) &&
    body.input !== null &&
    typeof body.input === 'object'
  )
}

export async function handlePvPAuthorityRequest(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405)

  const authorization = request.headers.get('Authorization')
  const jwt = authorization?.replace(/^Bearer\s+/i, '')
  if (!jwt) return json({ error: 'AUTH_REQUIRED' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const publishableKey =
    readDefaultKeySet('SUPABASE_PUBLISHABLE_KEYS') ?? Deno.env.get('SUPABASE_ANON_KEY')
  const secretKey =
    readDefaultKeySet('SUPABASE_SECRET_KEYS') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !publishableKey || !secretKey) {
    logFailure('handlePvPAuthorityRequest', {
      error: 'SERVER_CONFIG_MISSING',
      // ค่าคีย์ห้ามลง log เด็ดขาด — บอกแค่ว่าตัวไหนหายพอวินิจฉัยแล้ว
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasPublishableKey: Boolean(publishableKey),
      hasSecretKey: Boolean(secretKey),
    })
    return json({ error: 'SERVER_CONFIG_MISSING' }, 500)
  }

  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userError } = await authClient.auth.getUser(jwt)
  const playerId = userData.user?.id
  if (userError || !playerId) {
    logFailure('handlePvPAuthorityRequest', {
      error: 'AUTH_INVALID',
      err: userError ? describeError(userError) : 'no user in token',
    })
    return json({ error: 'AUTH_INVALID' }, 401)
  }

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch (error) {
    logFailure('handlePvPAuthorityRequest', {
      error: 'INVALID_JSON',
      playerId,
      err: describeError(error),
    })
    return json({ error: 'INVALID_JSON' }, 400)
  }
  if (!isRequestBody(rawBody)) {
    logFailure('handlePvPAuthorityRequest', { error: 'INVALID_COMMAND', playerId })
    return json({ error: 'INVALID_COMMAND' }, 400)
  }

  const service = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: roomData, error: roomError } = await service
      .from('pvp_rooms')
      .select('*')
      .eq('id', rawBody.roomId)
      .maybeSingle()
    const room = roomData as RoomRow | null
    if (roomError || !room) {
      logFailure('handlePvPAuthorityRequest', {
        error: 'ROOM_NOT_FOUND',
        roomId: rawBody.roomId,
        playerId,
        err: roomError ? describeError(roomError) : 'no row',
      })
      return json({ error: 'ROOM_NOT_FOUND' }, 404)
    }
    if (playerId !== room.host_profile_id && playerId !== room.guest_profile_id) {
      logFailure('handlePvPAuthorityRequest', {
        error: 'PVP_NOT_A_PARTICIPANT',
        roomId: room.id,
        playerId,
      })
      return json({ error: 'PVP_NOT_A_PARTICIPANT' }, 403)
    }
    if (!room.guest_profile_id || !room.guest_hero_id) {
      return json({ error: 'WAITING_FOR_OPPONENT' }, 409)
    }
    if (room.authoritative_state?.status === 'completed') {
      return json({
        stateVersion: room.state_version,
        authoritativeState: room.authoritative_state,
        result: toRealtimePvPResult(room.authoritative_state),
      })
    }

    let source = room.authoritative_state
    if (!source) {
      const [hostHeroResult, guestHeroResult] = await Promise.all([
        service
          .from('owned_characters')
          .select('character_id,level,exp,exp_to_next,obtained_at,skill_levels,star,shards')
          .eq('profile_id', room.host_profile_id)
          .eq('character_id', room.host_hero_id)
          .maybeSingle(),
        service
          .from('owned_characters')
          .select('character_id,level,exp,exp_to_next,obtained_at,skill_levels,star,shards')
          .eq('profile_id', room.guest_profile_id)
          .eq('character_id', room.guest_hero_id)
          .maybeSingle(),
      ])
      const hostHero = hostHeroResult.data as OwnedCharacterRow | null
      const guestHero = guestHeroResult.data as OwnedCharacterRow | null
      if (!hostHero || !guestHero) {
        logFailure('handlePvPAuthorityRequest', {
          error: 'OWNED_HERO_NOT_FOUND',
          roomId: room.id,
          playerId,
          missingHost: !hostHero,
          missingGuest: !guestHero,
          err: describeError(hostHeroResult.error ?? guestHeroResult.error),
        })
        return json({ error: 'OWNED_HERO_NOT_FOUND' }, 409)
      }
      const hostEntity = createRankedPlayerEntity(minimalPlayer(room.host_profile_id, hostHero))
      const guestEntity = createRankedPlayerEntity(minimalPlayer(room.guest_profile_id, guestHero))
      if (!hostEntity || !guestEntity) {
        logFailure('handlePvPAuthorityRequest', {
          error: 'PVP_ENTITY_INIT_FAILED',
          roomId: room.id,
          playerId,
          hostHeroId: room.host_hero_id,
          guestHeroId: room.guest_hero_id,
        })
        return json({ error: 'PVP_ENTITY_INIT_FAILED' }, 500)
      }
      source = createPvPAuthorityState(
        room.id,
        { playerId: room.host_profile_id, entity: hostEntity },
        { playerId: room.guest_profile_id, entity: guestEntity },
        Date.now(),
        createMatchSeed(),
      )
    }

    let next: PvPAuthorityState
    try {
      next = runPvPAuthorityCommand(source, playerId, rawBody, Date.now())
    } catch (error) {
      logFailure('runPvPAuthorityCommand', {
        error: 'PVP_COMMAND_FAILED',
        roomId: room.id,
        playerId,
        action: rawBody.action,
        err: describeError(error),
      })
      return json({ error: error instanceof Error ? error.message : 'PVP_COMMAND_FAILED' }, 400)
    }
    const result = toRealtimePvPResult(next)
    const { data: committedVersion, error: commitError } = await service.rpc(
      'commit_pvp_authority_state',
      {
        p_room_id: room.id,
        p_expected_version: room.state_version,
        p_authoritative_state: next,
        p_state_hash: next.stateHash,
        p_status: next.status,
        p_winner_profile_id: result?.winnerPlayerId ?? null,
        p_loser_profile_id: result?.loserPlayerId ?? null,
        p_result_reason: result?.reason ?? null,
      },
    )
    if (!commitError) {
      return json({ stateVersion: committedVersion, authoritativeState: next, result })
    }
    /*
      commitError ถูกทิ้งทั้งก้อนตรงนี้มาตลอด

      constraint ชน, RLS ปฏิเสธ, deadlock, RPC หาย — ทั้งหมดถูกบีบเหลือ PVP_STATE_COMMIT_FAILED
      คำเดียวส่งกลับ client แล้วตัว error จริงหายไปโดยไม่มีใครเห็น สาเหตุพวกนี้แก้คนละทางกันหมด
      และเป็นสาเหตุที่ไม่มีทางเดาจากฝั่ง client ได้เลย ต้อง log ก่อนคืนเสมอ
    */
    logFailure('commit_pvp_authority_state', {
      error: 'PVP_STATE_COMMIT_FAILED',
      roomId: room.id,
      playerId,
      attempt,
      expectedVersion: room.state_version,
      conflict: commitError.message.includes('PVP_STATE_VERSION_CONFLICT'),
      err: describeError(commitError),
    })
    if (!commitError.message.includes('PVP_STATE_VERSION_CONFLICT')) {
      return json({ error: 'PVP_STATE_COMMIT_FAILED' }, 500)
    }
  }

  logFailure('handlePvPAuthorityRequest', {
    error: 'PVP_STATE_BUSY',
    roomId: rawBody.roomId,
    playerId,
  })
  return json({ error: 'PVP_STATE_BUSY' }, 409)
}

if (import.meta.main) Deno.serve(handlePvPAuthorityRequest)
