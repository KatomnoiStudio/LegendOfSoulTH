import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabaseClient'
import type { PlayerInputState } from '../realtimeBattle/playerInput'
import { authorityErrorMessage } from './pvpAuthorityError'
import type { PvPAuthorityState, PvPRoomSummary, RealtimePvPResult } from './pvpTypes'

interface PvPRoomRow {
  id: string
  room_code: string
  status: PvPRoomSummary['status']
  host_profile_id: string
  guest_profile_id: string | null
  host_hero_id: string
  guest_hero_id: string | null
  state_version: number
  authoritative_state: PvPAuthorityState | null
}

export interface AuthorityResponse {
  stateVersion: number
  authoritativeState: PvPAuthorityState
  result: RealtimePvPResult | null
}

function mapRoom(row: PvPRoomRow): PvPRoomSummary {
  return {
    roomId: row.id,
    roomCode: row.room_code,
    status: row.status,
    hostPlayerId: row.host_profile_id,
    guestPlayerId: row.guest_profile_id,
    hostHeroId: row.host_hero_id,
    guestHeroId: row.guest_hero_id,
    stateVersion: row.state_version,
    authoritativeState: row.authoritative_state,
  }
}

function firstRoom(data: unknown, fallbackMessage: string): PvPRoomSummary {
  const row = Array.isArray(data) ? (data[0] as PvPRoomRow | undefined) : undefined
  if (!row) throw new Error(fallbackMessage)
  return mapRoom(row)
}

export async function createPrivatePvPRoom(heroId: string): Promise<PvPRoomSummary> {
  const { data, error } = await supabase.rpc('create_private_pvp_room', { p_hero_id: heroId })
  if (error) throw new Error(error.message)
  return firstRoom(data, 'สร้างห้อง PvP ไม่สำเร็จ')
}

export async function joinPrivatePvPRoom(
  roomCode: string,
  heroId: string,
): Promise<PvPRoomSummary> {
  const { data, error } = await supabase.rpc('join_private_pvp_room', {
    p_room_code: roomCode.trim().toUpperCase(),
    p_hero_id: heroId,
  })
  if (error) throw new Error(error.message)
  return firstRoom(data, 'เข้าห้อง PvP ไม่สำเร็จ')
}

export async function loadPrivatePvPRoom(roomId: string): Promise<PvPRoomSummary> {
  const { data, error } = await supabase
    .from('pvp_rooms')
    .select('*')
    .eq('id', roomId)
    .maybeSingle()
  if (error || !data) throw new Error(error?.message ?? 'ไม่พบห้อง PvP')
  return mapRoom(data as PvPRoomRow)
}

export async function invokePvPAuthority(
  roomId: string,
  command:
    | { action: 'input'; sequence: number; clientTick: number; input: PlayerInputState }
    | { action: 'disconnect' }
    | { action: 'reconnect' },
): Promise<AuthorityResponse> {
  const { data, error } = await supabase.functions.invoke<AuthorityResponse>('pvp-authority', {
    body: { roomId, ...command },
  })
  if (error) throw new Error(await authorityErrorMessage(error))
  if (!data) throw new Error('PvP authority ไม่ตอบกลับ')
  return data
}

export function subscribeToPrivatePvPRoom(
  roomId: string,
  onState: (response: AuthorityResponse) => void,
  onConnectionChange: (connected: boolean) => void,
): () => void {
  const channel: RealtimeChannel = supabase.channel(`pvp:${roomId}`, {
    config: { private: true },
  })
  channel
    .on('broadcast', { event: 'authoritative_state' }, ({ payload }) => {
      const value = payload as {
        stateVersion: number
        authoritativeState: PvPAuthorityState | null
      }
      if (!value.authoritativeState) return
      onState({
        stateVersion: value.stateVersion,
        authoritativeState: value.authoritativeState,
        result: null,
      })
    })
    .subscribe((status) => {
      onConnectionChange(status === 'SUBSCRIBED')
    })

  return () => {
    void supabase.removeChannel(channel)
  }
}
