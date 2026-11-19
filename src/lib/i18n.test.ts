import { afterAll, describe, expect, it } from 'vitest'
import { en } from '../locales/en'
import { sv } from '../locales/sv'
import { getLang, setLang, t, tp } from './i18n'

// Every source file as raw text (Vite feature), except tests, the dictionaries and i18n itself.
const files = import.meta.glob(['../**/*.{ts,tsx}', '!../**/*.test.ts', '!../locales/**', '!./i18n.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const STR = "'((?:[^'\\\\]|\\\\.)*)'"
const single = new RegExp(`\\b(?:t|rich|k)\\(\\s*${STR}`, 'g')
const plural = new RegExp(`\\btp\\([^,]+,\\s*${STR}\\s*,\\s*${STR}`, 'g')
const unescape = (s: string) => s.replace(/\\(.)/g, '$1')

const used = new Set<string>()
for (const src of Object.values(files)) {
  for (const m of src.matchAll(single)) used.add(unescape(m[1]))
  for (const m of src.matchAll(plural)) {
    used.add(unescape(m[1]))
    used.add(unescape(m[2]))
  }
}

const dicts = { en, sv }
const shape = (s: string) => [...(s.match(/\{\w+\}|<\/?\w+>/g) || [])].sort().join(' ')

describe('translations', () => {
  it('found the keys in the code', () => {
    expect(used.size).toBeGreaterThan(300)
  })
  for (const [name, dict] of Object.entries(dicts)) {
    it(`${name}: every text used in the app is translated`, () => {
      expect([...used].filter((k) => !(k in dict))).toEqual([])
    })
    it(`${name}: no leftover translations for texts that no longer exist`, () => {
      expect(Object.keys(dict).filter((k) => !used.has(k))).toEqual([])
    })
    it(`${name}: placeholders {x} and tags <b> match the Spanish text`, () => {
      expect(Object.entries(dict).filter(([k, v]) => shape(k) !== shape(v))).toEqual([])
    })
  }
})

describe('t / tp', () => {
  const before = getLang()
  afterAll(() => setLang(before))
  it('translates, interpolates and pluralises', () => {
    setLang('es')
    expect(t('Fuentes')).toBe('Fuentes')
    expect(tp(1, '{n} ficha', '{n} fichas')).toBe('1 ficha')
    setLang('en')
    expect(t('Fuentes')).toBe('Sources')
    expect(tp(3, '{n} ficha', '{n} fichas')).toBe('3 notes')
    setLang('sv')
    expect(t('Empieza a leer {s}', { s: 'Smith, 2021' })).toBe('Börja läsa Smith, 2021')
    expect(t('a text that is not a key')).toBe('a text that is not a key')
  })
})
