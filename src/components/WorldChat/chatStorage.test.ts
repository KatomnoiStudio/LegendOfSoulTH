/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadWorldChat, postWorldChatMessage, subscribeToWorldChat } from './chatStorage'
import { supabase } from '../../lib/supabaseClient'

vi.mock('../../lib/supabaseClient', () => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  }

  return {
    supabase: {
      auth: {
        getSession: vi.fn(),
      },
      from: vi.fn(),
      channel: vi.fn(() => mockChannel),
      removeChannel: vi.fn(),
    },
  }
})

describe('World Chat Server-Authoritative Persistence (#28)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('falls back to local storage when there is no active Supabase session', async () => {
    // Mock getSession returning null user
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    })

    const initial = loadWorldChat()
    expect(initial).toEqual([])

    const updated = await postWorldChatMessage('จอมยุทธน้อย', 'สวัสดีทุกคน')
    expect(updated.length).toBe(1)
    expect(updated[0].authorName).toBe('จอมยุทธน้อย')
    expect(updated[0].text).toBe('สวัสดีทุกคน')

    const loaded = loadWorldChat()
    expect(loaded).toEqual(updated)
  })

  it('posts message to Supabase when authenticated session exists', async () => {
    // Mock authenticated user session
    const mockSession = {
      user: { id: 'mock-user-uuid' },
      access_token: 'token',
      refresh_token: 'refresh',
    } as any

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    })

    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    const mockSelect = vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'msg-uuid-123',
              author_name: 'ราชาวานร',
              text: 'ข้ามาแล้ว!',
              created_at: '2026-08-09T00:00:00.000Z',
            },
          ],
          error: null,
        }),
      }),
    })

    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === 'world_chat') {
        return {
          insert: mockInsert,
          select: mockSelect,
        } as any
      }
      return {} as any
    })

    const result = await postWorldChatMessage('ราชาวานร', 'ข้ามาแล้ว!')
    expect(mockInsert).toHaveBeenCalledWith({
      profile_id: 'mock-user-uuid',
      author_name: 'ราชาวานร',
      text: 'ข้ามาแล้ว!',
    })
    expect(result.length).toBe(1)
    expect(result[0].text).toBe('ข้ามาแล้ว!')
  })

  it('subscribes to realtime supabase updates and BroadcastChannel', async () => {
    const mockSession = {
      user: { id: 'mock-user-uuid' },
    } as any

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    })

    const callback = vi.fn()
    const unsubscribe = subscribeToWorldChat(callback)
    expect(unsubscribe).toBeDefined()

    // Clean up channel mock on unsubscribe
    unsubscribe()
  })
})
