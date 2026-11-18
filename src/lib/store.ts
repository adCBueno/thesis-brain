import { useSyncExternalStore } from 'react'
import type { State } from '../types'
import { blank } from './utils'

/**
 * Tiny global store. The whole app state is one serialisable object,
 * so persisting it (IndexedDB / a JSON file) is a single write.
 */
let state: State = blank()
const subs = new Set<() => void>()
let onChange: ((s: State) => void) | null = null

export const getState = () => state

export function setOnChange(fn: (s: State) => void) {
  onChange = fn
}

export function replaceState(next: State, persist = true) {
  state = next
  subs.forEach((f) => f())
  if (persist) onChange?.(state)
}

/**
 * Immutable update: `fn` mutates a draft copy. If it returns a string
 * (or `msg` is given) that text is added to the activity log ("Rastro").
 */
export function update(fn: (draft: State) => string | null | void, msg?: string) {
  const draft = structuredClone(state)
  const ret = fn(draft)
  const text = typeof ret === 'string' ? ret : msg
  draft.updated = Date.now()
  if (text) {
    draft.log.unshift({ t: draft.updated, m: text })
    draft.log = draft.log.slice(0, 1000)
  }
  replaceState(draft)
}

function subscribe(cb: () => void) {
  subs.add(cb)
  return () => {
    subs.delete(cb)
  }
}

export function useAppState(): State {
  return useSyncExternalStore(subscribe, getState)
}
