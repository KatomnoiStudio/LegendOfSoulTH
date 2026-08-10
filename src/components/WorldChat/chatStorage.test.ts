import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
  on: vi.fn(),
  subscribe: vi.fn(),
  select: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
}))

vi.mock('../../lib/supabaseClient', () => ({
  getSupabase: () => ({
    from: mocks.from,
    rpc: mocks.rpc,
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
  }),
}))

import { loadWorldChat, postWorldChatMessage, subscribeToWorldChat } from './chatStorage'

describe('server-authoritative World Chat adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.limit.mockResolvedValue({ data: [], error: null })
    mocks.order.mockReturnValue({ limit: mocks.limit })
    mocks.select.mockReturnValue({ order: mocks.order })
    mocks.from.mockReturnValue({ select: mocks.select })
    mocks.rpc.mockResolvedValue({ data: [], error: null })
    mocks.subscribe.mockReturnValue({ topic: 'world-chat-messages' })
    mocks.on.mockReturnValue({ subscribe: mocks.subscribe })
    mocks.channel.mockReturnValue({ on: mocks.on })
    mocks.removeChannel.mockResolvedValue('ok')
  })

  it('loads the newest 200 rows and maps server field names oldest-first', async () => {
    mocks.limit.mockResolvedValue({
      data: [
        {
          id: 'new',
          author_name: 'ใหม่',
          text: 'สอง',
          created_at: '2026-08-09T00:00:02.000Z',
        },
        {
          id: 'old',
          author_name: 'เก่า',
          text: 'หนึ่ง',
          created_at: '2026-08-09T00:00:01.000Z',
        },
      ],
      error: null,
    })

    const messages = await loadWorldChat()

    expect(mocks.from).toHaveBeenCalledWith('world_chat_messages')
    expect(mocks.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(mocks.limit).toHaveBeenCalledWith(200)
    expect(messages.map((message) => message.id)).toEqual(['old', 'new'])
    expect(messages[0]).toEqual({
      id: 'old',
      authorName: 'เก่า',
      text: 'หนึ่ง',
      createdAt: '2026-08-09T00:00:01.000Z',
    })
  })

  it('posts only message text through RPC and reloads server-owned author/time', async () => {
    await postWorldChatMessage('สวัสดี')

    expect(mocks.rpc).toHaveBeenCalledWith('post_world_chat_message', { p_text: 'สวัสดี' })
    expect(mocks.from).toHaveBeenCalledWith('world_chat_messages')
  })

  it('subscribes to INSERT events and removes the same channel on unsubscribe', async () => {
    const onNewMessage = vi.fn()
    const unsubscribe = subscribeToWorldChat(onNewMessage)
    await vi.waitFor(() => expect(mocks.channel).toHaveBeenCalledWith('world-chat-messages'))

    expect(mocks.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'world_chat_messages' },
      onNewMessage,
    )

    unsubscribe()
    expect(mocks.removeChannel).toHaveBeenCalledWith({ topic: 'world-chat-messages' })
  })
})
