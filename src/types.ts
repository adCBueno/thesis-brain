export type Status = 'inbox' | 'toread' | 'reading' | 'read' | 'done' | 'dropped'
export type NoteKind = 'para' | 'quote' | 'idea'
export type ParaStatus = 'idea' | 'draft' | 'done'
export type View = 'hoy' | 'fuentes' | 'fichas' | 'matriz' | 'borrador' | 'rastro'

export interface Source {
  id: string
  title: string
  authors: string
  year: string
  url: string
  kind: 'paper' | 'web'
  status: Status
  /** Why I opened it / why it matters. The single most useful field for triage. */
  why: string
  /** 3 = high, 2 = medium, 1 = low */
  priority: number
  themeIds: string[]
  added: number
  startedAt?: number
  readAt?: number
}

export interface Theme {
  id: string
  name: string
  color: string
}

export interface Note {
  id: string
  /** '' = my own idea, not tied to a source */
  sourceId: string
  /** page / section, e.g. "p. 4, §3.2" */
  loc: string
  kind: NoteKind
  text: string
  /** my comment: agreement, contradiction, where it goes in the thesis */
  mine: string
  themeIds: string[]
  created: number
}

export interface Paragraph {
  id: string
  text: string
  noteIds: string[]
  /** sources cited without a note */
  sourceIds: string[]
  status: ParaStatus
}

export interface Section {
  id: string
  title: string
  note: string
  paras: Paragraph[]
}

export interface LogEntry {
  t: number
  m: string
}

export interface State {
  v: 1
  sources: Source[]
  themes: Theme[]
  notes: Note[]
  outline: Section[]
  log: LogEntry[]
  parking: string
  next: string
  updated: number
}
