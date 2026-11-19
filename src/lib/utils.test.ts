import { beforeAll, describe, expect, it } from 'vitest'
import { setLang } from './i18n'

// These tests check the Spanish (source) texts.
beforeAll(() => setLang('es'))
import type { Source, State } from '../types'
import { blank, cite, countCitaQ, exportMd, firstAuthor, normalize, paraSources, parseLine, setSourceStatus } from './utils'

const src = (over: Partial<Source> = {}): Source => ({
  id: 's1',
  title: 'A Study of Things',
  authors: '',
  year: '',
  url: '',
  kind: 'paper',
  status: 'toread',
  why: '',
  priority: 2,
  themeIds: [],
  added: 0,
  ...over,
})

describe('firstAuthor / cite', () => {
  it('handles "Last, First; ..." lists', () => {
    expect(firstAuthor('Smith, J.; Doe, A.')).toBe('Smith')
    expect(cite(src({ authors: 'Smith, J.; Doe, A.', year: '2021' }))).toBe('Smith et al., 2021')
  })
  it('handles "First Last and ..." lists', () => {
    expect(firstAuthor('John Smith and Ann Doe')).toBe('Smith')
  })
  it('single author has no et al.', () => {
    expect(cite(src({ authors: 'Ann Doe', year: '2019' }))).toBe('Doe, 2019')
  })
  it('falls back to the title', () => {
    expect(cite(src())).toBe('A Study of…')
    expect(cite(undefined)).toBe('idea propia')
  })
})

describe('parseLine', () => {
  it('detects papers by domain and pulls a year from the title', () => {
    const s = parseLine('https://arxiv.org/abs/2401.00001 Cool Paper 2024')!
    expect(s.kind).toBe('paper')
    expect(s.url).toBe('https://arxiv.org/abs/2401.00001')
    expect(s.title).toBe('Cool Paper 2024')
    expect(s.year).toBe('2024')
    expect(s.status).toBe('inbox')
  })
  it('builds a title from the URL when there is none', () => {
    const s = parseLine('https://www.example.com/blog/how-to-write')!
    expect(s.kind).toBe('web')
    expect(s.title).toBe('example.com — how to write')
  })
  it('treats plain titles as papers and skips blank lines', () => {
    expect(parseLine('A Survey on X (2022)')!.kind).toBe('paper')
    expect(parseLine('   ')).toBeNull()
  })
})

describe('status + draft helpers', () => {
  it('stamps reading dates', () => {
    const s = src()
    expect(setSourceStatus(s, 'reading')).toMatch(/Empezaste/)
    expect(s.startedAt).toBeTypeOf('number')
    setSourceStatus(s, 'read')
    expect(s.readAt).toBeTypeOf('number')
    expect(setSourceStatus(s, 'read')).toBeNull()
  })

  it('links paragraphs to sources via notes and exports markdown', () => {
    const st: State = {
      ...blank(),
      sources: [src({ authors: 'Smith, J.', year: '2021' }), src({ id: 's2', authors: 'Lee, K.', year: '2020', title: 'Other' })],
      notes: [{ id: 'n1', sourceId: 's1', loc: '', kind: 'para', text: 'x', mine: '', themeIds: [], created: 0 }],
      outline: [{ id: 'sec', title: 'Background', note: '', paras: [{ id: 'p', text: 'Hello [CITA?]', noteIds: ['n1'], sourceIds: ['s2'], status: 'draft' }] }],
    }
    expect(paraSources(st, st.outline[0].paras[0]).sort()).toEqual(['s1', 's2'])
    expect(countCitaQ(st)).toBe(1)
    const md = exportMd(st)
    expect(md).toContain('## 1. Background')
    expect(md).toContain('(Smith, 2021)')
    expect(md.indexOf('Lee, K.')).toBeLessThan(md.indexOf('Smith, J.')) // references sorted
  })

  it('normalize fills missing fields from old backups', () => {
    const s = normalize({ v: 1, sources: [{ id: 'a', title: 't' }], outline: [{ id: 'o', title: 'T', paras: [{ id: 'p' }] }] })
    expect(s.sources[0].themeIds).toEqual([])
    expect(s.outline[0].paras[0].noteIds).toEqual([])
    expect(s.notes).toEqual([])
  })
})

describe('todos', () => {
  it('sorts open ⭐ first, then by due date, then newest; done last', async () => {
    const { todoSort } = await import('./utils')
    const base = { kind: 'todo' as const, sourceId: '', sectionId: '', due: '', important: false, done: false }
    const list = [
      { ...base, id: 'old', text: 'old', created: 1 },
      { ...base, id: 'new', text: 'new', created: 5 },
      { ...base, id: 'due', text: 'due', created: 2, due: '2026-11-20' },
      { ...base, id: 'star', text: 'star', created: 0, important: true },
      { ...base, id: 'done', text: 'done', created: 9, done: true, doneAt: 10 },
    ]
    expect(list.sort(todoSort).map((t) => t.id)).toEqual(['star', 'due', 'new', 'old', 'done'])
  })
  it('normalize adds an empty todo list to old backups', () => {
    expect(normalize({ v: 1, sources: [] }).todos).toEqual([])
  })
})
