import { describe, expect, it } from 'vitest'
import {
  fieldTypeHasDateValidation,
  fieldTypeHasMultiSelectValidation,
  fieldTypeHasNumberValidation,
  fieldTypeHasOptions,
  fieldTypeHasTextValidation,
  fieldTypeHasValidation,
} from '@/lib/domain/event-fields'

describe('event-fields metadata helpers', () => {
  it('reports option-backed field types correctly', () => {
    expect(fieldTypeHasOptions('select')).toBe(true)
    expect(fieldTypeHasOptions('radio')).toBe(true)
    expect(fieldTypeHasOptions('multi_select')).toBe(true)
    expect(fieldTypeHasOptions('multi_select_toggle')).toBe(true)
    expect(fieldTypeHasOptions('text')).toBe(false)
  })

  it('reports text validation support correctly', () => {
    expect(fieldTypeHasTextValidation('text')).toBe(true)
    expect(fieldTypeHasTextValidation('textarea')).toBe(true)
    expect(fieldTypeHasTextValidation('email')).toBe(true)
    expect(fieldTypeHasTextValidation('phone')).toBe(true)
    expect(fieldTypeHasTextValidation('number')).toBe(false)
  })

  it('reports number and multi-select validation support correctly', () => {
    expect(fieldTypeHasNumberValidation('number')).toBe(true)
    expect(fieldTypeHasNumberValidation('text')).toBe(false)

    expect(fieldTypeHasMultiSelectValidation('multi_select')).toBe(true)
    expect(fieldTypeHasMultiSelectValidation('multi_select_toggle')).toBe(true)
    expect(fieldTypeHasMultiSelectValidation('radio')).toBe(false)
  })

  it('reports date validation support correctly', () => {
    expect(fieldTypeHasDateValidation('date')).toBe(true)
    expect(fieldTypeHasDateValidation('datetime')).toBe(true)
    expect(fieldTypeHasDateValidation('text')).toBe(false)
  })

  it('reports whether a field type has any validation options', () => {
    expect(fieldTypeHasValidation('text')).toBe(true)
    expect(fieldTypeHasValidation('number')).toBe(true)
    expect(fieldTypeHasValidation('multi_select')).toBe(true)
    expect(fieldTypeHasValidation('multi_select_toggle')).toBe(true)
    expect(fieldTypeHasValidation('date')).toBe(true)
    expect(fieldTypeHasValidation('datetime')).toBe(true)
    expect(fieldTypeHasValidation('checkbox')).toBe(false)
  })
})
