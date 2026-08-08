import { readJson, writeJson } from '../../lib/storage'
import { supabase } from '../../lib/supabaseClient'
import { reportError } from '../../lib/errors/reportError'

/**
 * ที่เก็บข้อความแชทโลก — เวอร์ชันกึ่งฐานข้อมูลกลางกึ่ง Local Fallback
 * Reference: docs/agent-blueprint/28-social-communication-system.md
 * Master Blueprint §7.5: Data ownership - server-authoritative (Supabase, RLS-protected)
 */

const CHAT_KEY = 'los:worldchat:v1'
/** เก็บข้อความล่าสุดไว้พอประมาณ กัน localStorage บวมและ render ช้าถ้าคุยกันนาน ๆ */
const MAX_MESSAGES = 200

export interface ChatMessage {
  id: string
  authorName: string
  text: string
  createdAt: string
}

/** อ่านประวัติแชทโลกทั้งหมดที่มีอยู่บนเครื่องนี้ (Synchronous fallback) */
export function loadWorldChat(): ChatMessage[] {
  return readJson<ChatMessage[]>(CHAT_KEY) ?? []
}

/**
 * ดึงประวัติแชทล่าสุดจาก Supabase และบันทึกลง local cache เพื่อให้หน้าจอแสดงผลได้รวดเร็ว
 */
export async function syncWorldChatFromSupabase(): Promise<ChatMessage[]> {
  try {
    const session = (await supabase.auth.getSession()).data.session
    if (!session?.user) {
      return loadWorldChat()
    }

    const { data, error } = await supabase
      .from('world_chat')
      .select('id, author_name, text, created_at')
      .order('created_at', { ascending: false })
      .limit(MAX_MESSAGES)

    if (error) {
      reportError('CHAT_SYNC_FAIL', 'silent', error)
      return loadWorldChat()
    }

    if (data) {
      const messages: ChatMessage[] = data
        .map((row) => ({
          id: row.id,
          authorName: row.author_name,
          text: row.text,
          createdAt: row.created_at,
        }))
        .toReversed()

      writeJson(CHAT_KEY, messages)
      broadcastNewMessage()
      return messages
    }
  } catch (err) {
    reportError('CHAT_SYNC_FAIL', 'silent', err)
  }
  return loadWorldChat()
}

/**
 * คิวเขียนแบบต่อคิว — กัน race ระหว่างสองแท็บ/บัญชีโพสต์พร้อมกัน
 */
let writeQueue: Promise<ChatMessage[]> = Promise.resolve([])

/** โพสต์ข้อความใหม่เข้าแชทโลก คืนประวัติทั้งหมดหลังโพสต์ */
export async function postWorldChatMessage(
  authorName: string,
  text: string,
): Promise<ChatMessage[]> {
  const session = (await supabase.auth.getSession()).data.session

  if (session?.user) {
    // บันทึกลง Supabase (เซิร์ฟเวอร์จะเป็นผู้แจกจ่ายผ่าน Realtime ไปยังทุกแท็บ/อุปกรณ์)
    const { error } = await supabase.from('world_chat').insert({
      profile_id: session.user.id,
      author_name: authorName,
      text: text,
    })

    if (error) {
      reportError('CHAT_SYNC_FAIL', 'silent', error)
      // หากบันทึกลง Supabase ล้มเหลว ให้บันทึกแบบ Local Fallback แทน
    } else {
      return syncWorldChatFromSupabase()
    }
  }

  // Local fallback ในกรณีไม่ได้เข้าระบบ หรือเกิดความล้มเหลว
  const message: ChatMessage = {
    id: crypto.randomUUID(),
    authorName,
    text,
    createdAt: new Date().toISOString(),
  }

  writeQueue = writeQueue.then(() => {
    const result = [...loadWorldChat(), message].slice(-MAX_MESSAGES)
    writeJson(CHAT_KEY, result)
    broadcastNewMessage()
    return result
  })
  return writeQueue
}

/**
 * แจ้งแท็บอื่นบนเครื่องเดียวกันว่ามีข้อความใหม่ (Local tab broadcast)
 */
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHAT_KEY) : null

function broadcastNewMessage(): void {
  channel?.postMessage('new-message')
}

let realtimeSubscription: unknown = null

/** ฟังข้อความใหม่จากแท็บอื่นและ Realtime backend — คืนฟังก์ชัน unsubscribe */
export function subscribeToWorldChat(onNewMessage: () => void): () => void {
  const handlers: (() => void)[] = []

  // 1. รับข่าวสารจาก BroadcastChannel ในเครื่อง
  if (channel) {
    const localHandler = () => onNewMessage()
    channel.addEventListener('message', localHandler)
    handlers.push(() => {
      channel.removeEventListener('message', localHandler)
    })
  }

  // 2. รับข่าวสารเรียลไทม์จาก Supabase
  supabase.auth
    .getSession()
    .then(({ data: { session } }) => {
      if (session?.user && !realtimeSubscription) {
        // ดึงประวัติแชทเริ่มต้นครั้งแรกเมื่อเชื่อมต่อสำเร็จ
        syncWorldChatFromSupabase()
          .then(() => {
            onNewMessage()
            return null
          })
          .catch((err) => {
            reportError('CHAT_SYNC_FAIL', 'silent', err)
          })

        const sub = supabase
          .channel('public:world_chat')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'world_chat' },
            async () => {
              await syncWorldChatFromSupabase()
              onNewMessage()
            },
          )
          .subscribe()

        realtimeSubscription = sub

        handlers.push(() => {
          if (realtimeSubscription) {
            supabase.removeChannel(sub)
            realtimeSubscription = null
          }
        })
      }
      return null
    })
    .catch((err) => {
      reportError('CHAT_SYNC_FAIL', 'silent', err)
    })

  return () => {
    for (const unsubscribe of handlers) {
      unsubscribe()
    }
  }
}
