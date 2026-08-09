import { createClient } from 'npm:@supabase/supabase-js@2.112.2'
import {
  mapOwnedCharacterRow,
  type OwnedCharacterRow,
} from '../../../src/data/accountRepository.supabase.mapping.ts'
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
import type { Player } from '../../../src/types/player.ts'

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

interface RequestBody extends PvPAuthorityCommand {
  roomId: string
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function minimalPlayer(profileId: string, heroRow: OwnedCharacterRow): Player {
  const hero = mapOwnedCharacterRow(heroRow)
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

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405)

  const authorization = request.headers.get('Authorization')
  const jwt = authorization?.replace(/^Bearer\s+/i, '')
  if (!jwt) return json({ error: 'AUTH_REQUIRED' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY')
  const secretKey = Deno.env.get('SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !publishableKey || !secretKey) {
    return json({ error: 'SERVER_CONFIG_MISSING' }, 500)
  }

  const authClient = createClient(supabaseUrl, publishableKey)
  const { data: userData, error: userError } = await authClient.auth.getUser(jwt)
  const playerId = userData.user?.id
  if (userError || !playerId) return json({ error: 'AUTH_INVALID' }, 401)

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return json({ error: 'INVALID_JSON' }, 400)
  }
  if (!isRequestBody(rawBody)) return json({ error: 'INVALID_COMMAND' }, 400)

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
    if (roomError || !room) return json({ error: 'ROOM_NOT_FOUND' }, 404)
    if (playerId !== room.host_profile_id && playerId !== room.guest_profile_id) {
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
      if (!hostHero || !guestHero) return json({ error: 'OWNED_HERO_NOT_FOUND' }, 409)
      const hostEntity = createRankedPlayerEntity(minimalPlayer(room.host_profile_id, hostHero))
      const guestEntity = createRankedPlayerEntity(minimalPlayer(room.guest_profile_id, guestHero))
      if (!hostEntity || !guestEntity) return json({ error: 'PVP_ENTITY_INIT_FAILED' }, 500)
      source = createPvPAuthorityState(
        room.id,
        { playerId: room.host_profile_id, entity: hostEntity },
        { playerId: room.guest_profile_id, entity: guestEntity },
        Date.now(),
      )
    }

    let next: PvPAuthorityState
    try {
      next = runPvPAuthorityCommand(source, playerId, rawBody, Date.now())
    } catch (error) {
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
    if (!commitError.message.includes('PVP_STATE_VERSION_CONFLICT')) {
      return json({ error: 'PVP_STATE_COMMIT_FAILED' }, 500)
    }
  }

  return json({ error: 'PVP_STATE_BUSY' }, 409)
})
