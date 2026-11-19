import { useSyncExternalStore } from 'react'
import { t } from './i18n'
import { update } from './store'

export type TimerMode = 'leer' | 'escribir'
type Running = { end: number; mode: TimerMode; mins: number }
type Snapshot = { running: Running | null; left: number; justFinished: boolean }

const KEY = 'tb-timer'
function read(): Running | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null')
  } catch {
    return null
  }
}
function save(r: Running | null) {
  try {
    if (r) localStorage.setItem(KEY, JSON.stringify(r))
    else localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

let running: Running | null = typeof localStorage !== 'undefined' ? read() : null
let justFinished = false
let snap: Snapshot = { running, left: 0, justFinished }
const subs = new Set<() => void>()
let iv: number | undefined

function emit() {
  snap = { running, left: running ? Math.max(0, running.end - Date.now()) : 0, justFinished }
  subs.forEach((f) => f())
}

function tick() {
  if (!running) {
    window.clearInterval(iv)
    iv = undefined
    return
  }
  if (Date.now() >= running.end) {
    const r = running
    running = null
    justFinished = true
    save(null)
    update(() => (r.mode === 'leer' ? t('Bloque de {n} min leyendo 📖', { n: r.mins }) : t('Bloque de {n} min escribiendo ✍️', { n: r.mins })))
  }
  emit()
}

function ensureTick() {
  if (iv === undefined) iv = window.setInterval(tick, 1000)
}

export function startTimer(mode: TimerMode, mins: number) {
  running = { end: Date.now() + mins * 60_000, mode, mins }
  justFinished = false
  save(running)
  ensureTick()
  emit()
}

export function stopTimer() {
  running = null
  save(null)
  emit()
}

/** Call once at startup so a timer started before a reload keeps running. */
export function initTimer() {
  if (running) {
    ensureTick()
    tick()
  }
}

export function useTimer(): Snapshot {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb)
      return () => {
        subs.delete(cb)
      }
    },
    () => snap,
  )
}
