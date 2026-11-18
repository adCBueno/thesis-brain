import type { NoteKind, Paragraph, ParaStatus, Source, State, Status } from '../types'

export const uid = () => Math.random().toString(36).slice(2, 10)

export const COLORS = ['#c4552d', '#3f7a63', '#3d5f8f', '#a67c10', '#8a4f9e', '#2f8a99', '#b5476b', '#6b7a2f']

export const STATUS: Record<Status, [string, string]> = {
  inbox: ['📥', 'Bandeja'],
  toread: ['📚', 'Por leer'],
  reading: ['👀', 'Leyendo'],
  read: ['✅', 'Leído'],
  done: ['🧩', 'Sintetizado'],
  dropped: ['🗑️', 'Descartado'],
}

export const KIND: Record<NoteKind, [string, string]> = {
  para: ['Paráfrasis', 'b-para'],
  quote: ['Cita textual', 'b-quote'],
  idea: ['Idea mía', 'b-idea'],
}

export const PARA_STATUS: Record<ParaStatus, [string, string]> = {
  idea: ['💡 idea', 'b-idea'],
  draft: ['📝 borrador', 'b-quote'],
  done: ['✅ listo', 'b-para'],
}

export function blank(): State {
  return { v: 1, sources: [], themes: [], notes: [], outline: [], log: [], parking: '', next: '', updated: 0 }
}

/** Fill in missing fields so older backups (including the prototype's) keep working. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalize(raw: any): State {
  const b = blank()
  const s = { ...b, ...(raw || {}) }
  s.v = 1
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  s.sources = (s.sources || []).map((x: any) => ({ authors: '', year: '', url: '', why: '', priority: 2, kind: 'paper', status: 'toread', added: Date.now(), ...x, themeIds: x.themeIds || [] }))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  s.notes = (s.notes || []).map((x: any) => ({ sourceId: '', loc: '', kind: 'para', mine: '', created: Date.now(), ...x, themeIds: x.themeIds || [] }))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  s.outline = (s.outline || []).map((x: any) => ({
    note: '',
    ...x,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    paras: (x.paras || []).map((p: any) => ({ text: '', status: 'idea', ...p, noteIds: p.noteIds || [], sourceIds: p.sourceIds || [] })),
  }))
  s.log = s.log || []
  s.themes = s.themes || []
  return s as State
}

const AUTHOR_SPLIT = /;| and | & /

/** "Smith, J.; Doe, A." -> "Smith" · "John Smith and Ann Doe" -> "Smith" */
export function firstAuthor(authors?: string): string {
  const a = (authors || '').trim()
  if (!a) return ''
  const first = a.split(AUTHOR_SPLIT)[0].trim()
  if (first.includes(',')) return first.split(',')[0].trim()
  const words = first.split(/\s+/)
  return words[words.length - 1]
}

/** Short in-text citation: "Smith et al., 2021" */
export function cite(s?: Source | null): string {
  if (!s) return 'idea propia'
  const fa = firstAuthor(s.authors)
  const multi = AUTHOR_SPLIT.test(s.authors || '')
  const name = fa ? fa + (multi ? ' et al.' : '') : (s.title || 'Sin título').split(/\s+/).slice(0, 3).join(' ') + '…'
  return name + (s.year ? ', ' + s.year : '')
}

export const sourceById = (st: State, id?: string) => (id ? st.sources.find((x) => x.id === id) : undefined)
export const themeById = (st: State, id?: string) => (id ? st.themes.find((x) => x.id === id) : undefined)
export const notesOf = (st: State, sid: string) => st.notes.filter((n) => n.sourceId === sid)

/** All sources a paragraph rests on: from its notes plus the ones cited directly. */
export function paraSources(st: State, p: Paragraph): string[] {
  const set = new Set(p.sourceIds || [])
  for (const nid of p.noteIds || []) {
    const n = st.notes.find((x) => x.id === nid)
    if (n?.sourceId) set.add(n.sourceId)
  }
  return [...set].filter((id) => st.sources.some((s) => s.id === id))
}

export function parasUsing(st: State, sid: string) {
  const out: { si: number; pi: number; title: string; text: string }[] = []
  st.outline.forEach((sec, si) =>
    sec.paras.forEach((p, pi) => {
      if (paraSources(st, p).includes(sid)) out.push({ si, pi, title: sec.title, text: p.text })
    }),
  )
  return out
}

export const noteUsed = (st: State, nid: string) => st.outline.some((sec) => sec.paras.some((p) => p.noteIds.includes(nid)))
export const secLabel = (si: number, pi?: number) => `§${si + 1}${pi != null ? ' ¶' + (pi + 1) : ''}`

export function countCitaQ(st: State): number {
  let n = 0
  st.outline.forEach((sec) => sec.paras.forEach((p) => (n += (p.text.match(/\[CITA\?\]/gi) || []).length)))
  return n
}

export const PAPER_RX =
  /arxiv|doi\.org|dl\.acm|ieeexplore|springer|sciencedirect|scholar\.google|researchgate|semanticscholar|wiley|tandfonline|mdpi|nature\.com|jstor|\.pdf($|\?|#)|openreview|aclanthology|diva-portal|ssrn|pubmed|ncbi|elsevier|sagepub/i

/** One pasted line (URL and/or title) -> an inbox source. */
export function parseLine(line: string): Source | null {
  const l = line.trim()
  if (!l) return null
  const m = l.match(/https?:\/\/\S+/)
  let url = ''
  let title = l
  if (m) {
    url = m[0]
    title = l.replace(url, '').replace(/^[\s\-–|:•]+|[\s\-–|:•]+$/g, '')
    if (!title) {
      try {
        const u = new URL(url)
        const last = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || '')
          .replace(/[-_+]+/g, ' ')
          .replace(/\.(pdf|html?)$/i, '')
        title = u.hostname.replace(/^www\./, '') + (last ? ' — ' + last : '')
      } catch {
        title = url
      }
    }
  }
  const ym = title.match(/\b(19|20)\d{2}\b/)
  return {
    id: uid(),
    title,
    url,
    authors: '',
    year: ym ? ym[0] : '',
    kind: !url || PAPER_RX.test(url) ? 'paper' : 'web',
    status: 'inbox',
    why: '',
    priority: 2,
    themeIds: [],
    added: Date.now(),
  }
}

/** Change status, stamp reading dates, and return a log message (or null). Mutates `s`. */
export function setSourceStatus(s: Source, st: Status): string | null {
  const prev = s.status
  s.status = st
  if (st === prev) return null
  if (st === 'reading') {
    s.startedAt = s.startedAt || Date.now()
    return `Empezaste a leer ${cite(s)} 👀`
  }
  if (st === 'read' || st === 'done') {
    s.readAt = s.readAt || Date.now()
    s.startedAt = s.startedAt || s.readAt
    return st === 'read' ? `Terminaste de leer ${cite(s)} ✅` : `Sintetizaste ${cite(s)} 🧩`
  }
  if (st === 'dropped') return `Descartaste ${cite(s)}`
  if (st === 'toread') return `${cite(s)} → Por leer`
  return null
}

/** Draft as Markdown: each paragraph followed by its sources, plus a reference list. */
export function exportMd(st: State): string {
  let md = ''
  const used = new Set<string>()
  st.outline.forEach((sec, si) => {
    md += `## ${si + 1}. ${sec.title}\n\n`
    sec.paras.forEach((p) => {
      const ids = paraSources(st, p)
      ids.forEach((i) => used.add(i))
      md += (p.text || '_(párrafo pendiente)_') + '\n'
      if (ids.length) md += `\n*Fuentes: ${ids.map((i) => '(' + cite(sourceById(st, i)) + ')').join('; ')}*\n`
      md += '\n'
    })
  })
  const refs = [...used]
    .map((i) => sourceById(st, i))
    .filter((s): s is Source => !!s)
    .sort((a, b) => (firstAuthor(a.authors) || a.title).localeCompare(firstAuthor(b.authors) || b.title))
  if (refs.length) {
    md += '## References\n\n' + refs.map((s) => `- ${s.authors || '[autores?]'} (${s.year || 's.f.'}). ${s.title}.${s.url ? ' ' + s.url : ''}`).join('\n') + '\n'
  }
  return md
}

export const fmtTime = (t: number) => new Date(t).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
export const fmtDate = (t: number) => new Date(t).toLocaleDateString('es', { day: 'numeric', month: 'short' })
export function fmtDay(t: number, now = new Date()): string {
  const d = new Date(t)
  const y = new Date(now)
  y.setDate(now.getDate() - 1)
  if (d.toDateString() === now.toDateString()) return 'Hoy'
  if (d.toDateString() === y.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function downloadText(filename: string, text: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
