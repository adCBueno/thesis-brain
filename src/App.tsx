import { useCallback, useEffect, useMemo, useState } from 'react'
import { Nav } from './components/Nav'
import { PwaBanner } from './components/PwaBanner'
import { ModalHost } from './modals'
import type { View } from './types'
import { UIContext, VIEWS, type ModalSpec, type UI } from './ui'
import { Borrador } from './views/Borrador'
import { Fichas } from './views/Fichas'
import { Fuentes } from './views/Fuentes'
import { Hoy } from './views/Hoy'
import { Matriz } from './views/Matriz'
import { Rastro } from './views/Rastro'

function initialView(): View {
  const h = location.hash.slice(1) as View
  if (VIEWS.includes(h)) return h
  const saved = localStorage.getItem('tb-view') as View | null
  return saved && VIEWS.includes(saved) ? saved : 'hoy'
}

const isTyping = () => /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')

export default function App() {
  const [view, setView] = useState<View>(initialView)
  // `key` forces a fresh modal component even when reopening the same kind (e.g. "save & add another").
  const [modal, setModal] = useState<{ spec: ModalSpec; key: number } | null>(null)

  const go = useCallback((v: View) => {
    setView(v)
    localStorage.setItem('tb-view', v)
    if (location.hash.slice(1) !== v) history.replaceState(null, '', '#' + v)
    window.scrollTo(0, 0)
  }, [])

  const ui: UI = useMemo(
    () => ({
      open: (spec) => setModal({ spec, key: Date.now() + Math.random() }),
      close: () => setModal(null),
      go,
    }),
    [go],
  )

  // App shortcut / deep link: ?new=note opens a new note right away.
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('new') === 'note') {
      ui.open({ kind: 'note' })
      history.replaceState(null, '', location.pathname + location.hash)
    }
  }, [ui])

  useEffect(() => {
    const onHash = () => {
      const v = location.hash.slice(1) as View
      if (VIEWS.includes(v)) setView(v)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modal && e.key === 'Escape') {
        setModal(null)
        return
      }
      if (!modal && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'n' && !isTyping()) {
        e.preventDefault()
        ui.open({ kind: 'note' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modal, ui])

  return (
    <UIContext.Provider value={ui}>
      <div className="app">
        <Nav view={view} />
        <main>
          {view === 'hoy' && <Hoy />}
          {view === 'fuentes' && <Fuentes />}
          {view === 'fichas' && <Fichas />}
          {view === 'matriz' && <Matriz />}
          {view === 'borrador' && <Borrador />}
          {view === 'rastro' && <Rastro />}
        </main>
      </div>
      <button className="btn primary fab" title="Atajo: tecla N" onClick={() => ui.open({ kind: 'note' })}>
        ✚ Ficha
      </button>
      {modal && <ModalHost key={modal.key} spec={modal.spec} />}
      <PwaBanner />
    </UIContext.Provider>
  )
}
