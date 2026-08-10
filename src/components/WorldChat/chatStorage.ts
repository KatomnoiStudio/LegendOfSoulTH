import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { reportError } from '../../lib/errors/reportError'

/** จำนวนข้อความล่าสุดที่โหลดขึ้น UI ต่อครั้ง — ประวัติจริงอยู่ฝั่ง Supabase */
const MAX_MESSAGES = 200

interface WorldChatRow {
  id: string
  author_name: string
  text: string
  created_at: string
}

export interface ChatMessage {
  id: string
  authorName: string
  text: string
  createdAt: string
}

async function getSupabase(): Promise<SupabaseClient> {
  const module = await import('../../lib/supabaseClient')
  return module.getSupabase()
}

function toChatMessage(row: WorldChatRow): ChatMessage {
  return {
    id: row.id,
    authorName: row.author_name,
    text: row.text,
    createdAt: row.created_at,
  }
}

/** อ่าน 200 ข้อความล่าสุดจากแหล่งข้อมูลกลาง เรียงเก่า → ใหม่สำหรับ feed */
export async function loadWorldChat(): Promise<ChatMessage[]> {
  try {
    const supabase = await getSupabase()
    const { data, error } = await supabase
      .from('world_chat_messages')
      .select('id, author_name, text, created_at')
      .order('created_at', { ascending: false })
      .limit(MAX_MESSAGES)

    if (error) throw error
    return ((data ?? []) as WorldChatRow[]).map(toChatMessage).toReversed()
  } catch (error) {
    reportError('WORLD_CHAT_LOAD_FAIL', 'silent', error)
    return []
  }
}

/**
 * โพสต์ผ่าน RPC เท่านั้น — server เป็นผู้กำหนด author_id, author_name และ created_at
 * จาก session/profile จริง client จึงปลอมชื่อผู้ส่งหรือเวลาไม่ได้
 */
export async function postWorldChatMessage(text: string): Promise<ChatMessage[]> {
  try {
    const supabase = await getSupabase()
    const { error } = await supabase.rpc('post_world_chat_message', { p_text: text })
    if (error) throw error
    return await loadWorldChat()
  } catch (error) {
    reportError('WORLD_CHAT_SEND_FAIL', 'silent', error)
    throw error
  }
}

/** ฟัง INSERT ใหม่จาก Supabase Realtime และคืนฟังก์ชัน unsubscribe ทันที */
export function subscribeToWorldChat(onNewMessage: () => void): () => void {
  let disposed = false
  let client: SupabaseClient | null = null
  let channel: RealtimeChannel | null = null

  void getSupabase()
    .then((supabase) => {
      if (disposed) return undefined
      client = supabase
      channel = supabase
        .channel('world-chat-messages')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'world_chat_messages' },
          onNewMessage,
        )
        .subscribe()
      return undefined
    })
    .catch((error: unknown) => {
      reportError('WORLD_CHAT_SUBSCRIBE_FAIL', 'silent', error)
    })

  return () => {
    disposed = true
    if (client && channel) void client.removeChannel(channel)
  }
}
