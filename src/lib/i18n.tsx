import { Fragment, useSyncExternalStore, type ReactNode } from 'react'
import { en } from '../locales/en'
import { sv } from '../locales/sv'

/**
 * Tiny gettext-style i18n.
 * The Spanish text is the key (Spanish is the source language), so the code stays readable:
 *   t('Fuentes')                      -> "Sources" / "Källor"
 *   t('{n} fichas', { n: 3 })         -> placeholders in {braces}
 *   tp(n, '{n} ficha', '{n} fichas')  -> singular / plural
 *   rich('Pulsa <kbd>N</kbd>')        -> <b>, <i> and <kbd> tags become elements
 * A unit test checks that every key used in the code exists in every dictionary.
 */
export type Lang = 'es' | 'en' | 'sv'

export const LANGS: Record<Lang, { label: string; flag: string; locale: string }> = {
  es: { label: 'Español', flag: '🇪🇸', locale: 'es-ES' },
  en: { label: 'English', flag: '🇬🇧', locale: 'en-GB' },
  sv: { label: 'Svenska', flag: '🇸🇪', locale: 'sv-SE' },
}

export const DICTS: Record<Exclude<Lang, 'es'>, Record<string, string>> = { en, sv }

const KEY = 'tb-lang'
const isLang = (x: unknown): x is Lang => typeof x === 'string' && x in LANGS

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (isLang(saved)) return saved
  } catch {
    /* ignore */
  }
  const prefs = typeof navigator !== 'undefined' ? navigator.languages || [navigator.language] : []
  for (const p of prefs) {
    const code = (p || '').slice(0, 2).toLowerCase()
    if (isLang(code)) return code
  }
  return 'en'
}

let lang: Lang = detect()
const subs = new Set<() => void>()
if (typeof document !== 'undefined') document.documentElement.lang = lang

export const getLang = () => lang
export const locale = () => LANGS[lang].locale

export function setLang(l: Lang) {
  lang = l
  try {
    localStorage.setItem(KEY, l)
  } catch {
    /* ignore */
  }
  if (typeof document !== 'undefined') document.documentElement.lang = l
  subs.forEach((f) => f())
}

export function useLang(): Lang {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb)
      return () => {
        subs.delete(cb)
      }
    },
    () => lang,
  )
}

/** Marks a string as a translation key without translating it yet (for lists rendered later with t()). */
export const k = (key: string) => key

type Vars = Record<string, string | number>

export function t(key: string, vars?: Vars): string {
  let s = lang === 'es' ? key : (DICTS[lang][key] ?? key)
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m))
  return s
}

export function tp(n: number, one: string, other: string, vars?: Vars): string {
  return t(n === 1 ? one : other, { n, ...vars })
}

/** Like t(), but turns <b>…</b>, <i>…</i> and <kbd>…</kbd> into elements. */
export function rich(key: string, vars?: Vars): ReactNode {
  const s = t(key, vars)
  const parts = s.split(/(<(?:b|i|kbd)>.*?<\/(?:b|i|kbd)>)/g)
  return parts.map((p, i) => {
    const m = p.match(/^<(b|i|kbd)>(.*)<\/\1>$/)
    if (!m) return <Fragment key={i}>{p}</Fragment>
    if (m[1] === 'kbd')
      return (
        <span key={i} className="kbd">
          {m[2]}
        </span>
      )
    return m[1] === 'b' ? <b key={i}>{m[2]}</b> : <i key={i}>{m[2]}</i>
  })
}
