import { createContext, useContext } from 'react'
import type { View } from './types'

export type ModalSpec =
  | { kind: 'source'; id?: string }
  | { kind: 'note'; id?: string; sourceId?: string; themeId?: string }
  | { kind: 'para'; si: number; pi?: number }
  | { kind: 'section'; i?: number }
  | { kind: 'theme'; id: string }
  | { kind: 'cell'; sid: string; tid: string }
  | { kind: 'themes' }
  | { kind: 'bulk' }
  | { kind: 'dropped' }
  | { kind: 'export' }
  | { kind: 'data' }
  | { kind: 'parking' }

export interface UI {
  open: (m: ModalSpec) => void
  close: () => void
  go: (v: View) => void
}

export const UIContext = createContext<UI | null>(null)

export function useUI(): UI {
  const ui = useContext(UIContext)
  if (!ui) throw new Error('useUI outside provider')
  return ui
}

export const VIEWS: View[] = ['hoy', 'fuentes', 'fichas', 'matriz', 'borrador', 'rastro']
