import { describe, it, expect } from 'vitest'
import { parseCommand, needsLLM } from '../src/services/commandParser'

describe('parseCommand - delete', () => {
  it('deletes last shape by default', () => {
    expect(parseCommand('删除')).toEqual([{ action: 'delete', filters: { last: true } }])
  })

  it('deletes last shape explicitly', () => {
    expect(parseCommand('删除最后一个图形')).toEqual([{ action: 'delete', filters: { last: true } }])
  })

  it('deletes by color, shape and position', () => {
    expect(parseCommand('删掉左上角的红方块')).toEqual([{
      action: 'delete',
      filters: { color: '#ef4444', shape: 'rect', position: '左上角' }
    }])
  })

  it('deletes all matching color', () => {
    expect(parseCommand('删除所有红色的图形')).toEqual([{
      action: 'delete',
      filters: { color: '#ef4444', all: true }
    }])
  })

  it('deletes all matching shape', () => {
    expect(parseCommand('把所有圆都删掉')).toEqual([{
      action: 'delete',
      filters: { shape: 'circle', all: true }
    }])
  })

  it('does not need LLM for delete commands', () => {
    expect(needsLLM('删除')).toBe(false)
    expect(needsLLM('删除所有红色的图形')).toBe(false)
    expect(needsLLM('把所有圆都删掉')).toBe(false)
  })
})
