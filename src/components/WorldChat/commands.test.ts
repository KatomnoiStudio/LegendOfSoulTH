import { describe, expect, it } from 'vitest'
import { parseCommand, resolveCommandForSender } from './commands'

describe('parseCommand', () => {
  it('grants Erlang by alias or full character id', () => {
    expect(parseCommand('/givecharacter erlang')).toEqual({
      kind: 'give-character',
      characterId: 'spear-warrior',
    })
    expect(parseCommand('/givecharacter spear-warrior')).toEqual({
      kind: 'give-character',
      characterId: 'spear-warrior',
    })
  })

  it('treats empty and ordinary chat as chat, not commands', () => {
    expect(parseCommand('')).toBeNull()
    expect(parseCommand('   ')).toBeNull()
    expect(parseCommand('hello')).toBeNull()
    expect(parseCommand('givecharacter erlang')).toBeNull()
  })

  it('matches command names without case sensitivity', () => {
    expect(parseCommand('/GiveCharacter erlang')).toEqual({
      kind: 'give-character',
      characterId: 'spear-warrior',
    })
  })

  it('rejects deleted and unknown characters', () => {
    expect(parseCommand('/givecharacter monkey-king')?.kind).toBe('error')
    expect(parseCommand('/givecharacter pig-warrior')?.kind).toBe('error')
    expect(parseCommand('/givecharacter pilgrim-monk')?.kind).toBe('error')
    expect(parseCommand('/givecharacter dragon')?.kind).toBe('error')
  })

  it('returns usage when the character is omitted', () => {
    expect(parseCommand('/givecharacter')).toEqual({
      kind: 'error',
      message: expect.stringContaining('/givecharacter'),
    })
  })

  it('rejects unknown commands and supports help', () => {
    expect(parseCommand('/deleteeverything')?.kind).toBe('error')
    expect(parseCommand('/help')).toEqual({ kind: 'help' })
  })
})

describe('resolveCommandForSender', () => {
  it('does not execute commands from non-admin accounts', () => {
    expect(resolveCommandForSender(false, '/givecharacter erlang')).toBeNull()
    expect(resolveCommandForSender(false, '/help')).toBeNull()
  })

  it('allows an admin to grant Erlang', () => {
    expect(resolveCommandForSender(true, '/givecharacter erlang')).toEqual({
      kind: 'give-character',
      characterId: 'spear-warrior',
    })
  })

  it('keeps normal admin messages as ordinary chat', () => {
    expect(resolveCommandForSender(true, 'hello')).toBeNull()
  })
})
