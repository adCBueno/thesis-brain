import { del, get, set } from 'idb-keyval'
import { t } from './i18n'
import { useSyncExternalStore } from 'react'
import type { State } from '../types'
import { blank, normalize } from './utils'

/**
 * Local-first persistence:
 *  1. Always: IndexedDB in this browser (survives reloads, works offline).
 *  2. Optional: a JSON file on disk via the File System Access API (Chrome/Edge).
 *     Put that file in iCloud Drive / Dropbox / OneDrive / a git repo to sync between machines.
 *  3. Always available: manual JSON export / import.
 */

export type SyncStatus =
  | { kind: 'local' }
  | { kind: 'file'; fileName: string }
  | { kind: 'needs-permission'; fileName: string }
  | { kind: 'error'; message: string }

const STATE_KEY = 'tb-state'
const HANDLE_KEY = 'tb-file-handle'
const JSON_TYPE: FilePickerAcceptType = { description: 'Thesis Brain JSON', accept: { 'application/json': ['.json'] } }

let handle: FileSystemFileHandle | null = null
let status: SyncStatus = { kind: 'local' }
const subs = new Set<() => void>()

function setStatus(s: SyncStatus) {
  status = s
  subs.forEach((f) => f())
}

export const getSync = () => status
export function useSync(): SyncStatus {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb)
      return () => {
        subs.delete(cb)
      }
    },
    () => status,
  )
}

export const fsSupported = typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function'

async function readHandle(h: FileSystemFileHandle): Promise<State | null> {
  try {
    const txt = await (await h.getFile()).text()
    if (!txt.trim()) return null
    const obj = JSON.parse(txt)
    return obj && obj.v ? normalize(obj) : null
  } catch {
    return null
  }
}

export async function loadInitial(): Promise<State> {
  let s: State | undefined
  try {
    const raw = await get(STATE_KEY)
    if (raw) s = normalize(raw)
  } catch {
    setStatus({ kind: 'error', message: t('IndexedDB no disponible (¿modo incógnito?)') })
  }
  try {
    const raw = localStorage.getItem(BACKUP_KEY)
    if (raw) {
      const backup = normalize(JSON.parse(raw))
      if (!s || backup.updated > s.updated) s = backup
    }
  } catch {
    /* ignore a corrupt backup */
  }
  try {
    handle = (await get<FileSystemFileHandle>(HANDLE_KEY)) ?? null
  } catch {
    handle = null
  }
  if (handle) {
    const perm = (await handle.queryPermission?.({ mode: 'readwrite' })) ?? 'prompt'
    if (perm === 'granted') {
      const fromFile = await readHandle(handle)
      if (fromFile && (!s || fromFile.updated > s.updated)) s = fromFile
      setStatus({ kind: 'file', fileName: handle.name })
    } else {
      setStatus({ kind: 'needs-permission', fileName: handle.name })
    }
  }
  // Ask the browser not to evict our data under storage pressure.
  try {
    await navigator.storage?.persist?.()
  } catch {
    /* ignore */
  }
  return s ?? blank()
}

let timer: number | undefined
let firstPendingAt = 0
let pending: State | null = null
const BACKUP_KEY = 'tb-state-backup'
const DEBOUNCE_MS = 300
const MAX_WAIT_MS = 1500

export function scheduleSave(s: State) {
  // Synchronous safety copy: survives a reload/close that happens before the async IndexedDB write.
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(s))
  } catch {
    /* quota exceeded on huge libraries: IndexedDB still has it */
  }
  pending = s
  const now = Date.now()
  if (!firstPendingAt) firstPendingAt = now
  window.clearTimeout(timer)
  const wait = now - firstPendingAt >= MAX_WAIT_MS ? 0 : DEBOUNCE_MS
  timer = window.setTimeout(flush, wait)
}

export async function flush() {
  if (!pending) return
  const s = pending
  pending = null
  firstPendingAt = 0
  try {
    await set(STATE_KEY, s)
  } catch {
    setStatus({ kind: 'error', message: t('No se pudo guardar en el navegador. Exporta un respaldo.') })
    return
  }
  if (handle && status.kind !== 'needs-permission') {
    try {
      const w = await handle.createWritable()
      await w.write(JSON.stringify(s, null, 1))
      await w.close()
      setStatus({ kind: 'file', fileName: handle.name })
    } catch {
      setStatus({ kind: 'needs-permission', fileName: handle.name })
    }
  } else if (!handle && status.kind !== 'error') {
    setStatus({ kind: 'local' })
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush()
  })
  window.addEventListener('pagehide', () => void flush())
}

/** Create a new JSON file and keep it in sync from now on. */
export async function connectNewFile(current: State) {
  if (!window.showSaveFilePicker) throw new Error(t('Tu navegador no soporta guardar en archivo (usa Chrome o Edge).'))
  const h = await window.showSaveFilePicker({ suggestedName: 'thesis-brain.json', types: [JSON_TYPE] })
  handle = h
  await set(HANDLE_KEY, h)
  setStatus({ kind: 'file', fileName: h.name })
  pending = current
  await flush()
}

/** Open an existing JSON file (e.g. synced from another computer). Returns its data. */
export async function openExistingFile(): Promise<State> {
  if (!window.showOpenFilePicker) throw new Error(t('Tu navegador no soporta abrir archivos así (usa Chrome o Edge).'))
  const [h] = await window.showOpenFilePicker({ types: [JSON_TYPE], multiple: false })
  const data = await readHandle(h)
  if (!data) throw new Error(t('Ese archivo no es un respaldo válido de Thesis Brain.'))
  const perm = (await h.requestPermission?.({ mode: 'readwrite' })) ?? 'granted'
  if (perm !== 'granted') throw new Error(t('Sin permiso de escritura sobre el archivo.'))
  handle = h
  await set(HANDLE_KEY, h)
  setStatus({ kind: 'file', fileName: h.name })
  return data
}

/** Re-grant permission after a browser restart. Returns the file's data if it is newer. */
export async function reconnectFile(current: State): Promise<State | null> {
  if (!handle) return null
  const perm = (await handle.requestPermission?.({ mode: 'readwrite' })) ?? 'granted'
  if (perm !== 'granted') return null
  setStatus({ kind: 'file', fileName: handle.name })
  const fromFile = await readHandle(handle)
  if (fromFile && fromFile.updated > current.updated) return fromFile
  scheduleSave(current)
  return null
}

export async function disconnectFile() {
  handle = null
  await del(HANDLE_KEY)
  setStatus({ kind: 'local' })
}
