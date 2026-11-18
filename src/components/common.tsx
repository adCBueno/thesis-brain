import { useEffect, useRef, useState, type ReactNode } from 'react'
import { getState, replaceState, update, useAppState } from '../lib/store'
import { reconnectFile, useSync } from '../lib/storage'
import { COLORS, uid } from '../lib/utils'
import type { Theme } from '../types'
import { useUI } from '../ui'

export function Head({ title, sub }: { title: ReactNode; sub: ReactNode }) {
  const sync = useSync()
  const { open } = useUI()
  const label =
    sync.kind === 'local'
      ? '💾 Guardado en este navegador'
      : sync.kind === 'file'
        ? `📁 Sincronizado con ${sync.fileName}`
        : sync.kind === 'needs-permission'
          ? `⚠️ Reconecta ${sync.fileName}`
          : `⚠️ ${sync.message}`
  const reconnect = async () => {
    const newer = await reconnectFile(getState())
    if (newer) replaceState(newer)
  }
  return (
    <>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div>
          <h1>{title}</h1>
          <p className="sub">{sub}</p>
        </div>
        <button className="sync btn ghost sm" style={{ flex: '0 0 auto' }} onClick={() => open({ kind: 'data' })} title="Datos y ajustes">
          {label}
        </button>
      </div>
      {sync.kind === 'needs-permission' && (
        <div className="banner">
          <span>
            📁 El navegador necesita tu permiso otra vez para seguir guardando en <b>{sync.fileName}</b>. Mientras tanto, todo se guarda en el navegador.
          </span>
          <button className="btn sm primary" onClick={reconnect}>
            Reconectar
          </button>
        </div>
      )}
    </>
  )
}

export function Modal({ wide, children }: { wide?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        const b = ref.current?.querySelector<HTMLButtonElement>('.mfoot .btn.primary')
        if (b) {
          e.preventDefault()
          b.click()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <div className="ov show">
      <div ref={ref} className={'modal' + (wide ? ' wide' : '')} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  )
}

export function ThemeChip({ t }: { t?: Theme }) {
  if (!t) return null
  return (
    <span className="chip">
      <span className="dot" style={{ background: t.color }} />
      {t.name}
    </span>
  )
}

export function ThemePicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const s = useAppState()
  const [name, setName] = useState('')
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  const add = () => {
    const n = name.trim()
    if (!n) return
    const existing = s.themes.find((x) => x.name.toLowerCase() === n.toLowerCase())
    const id = existing?.id ?? uid()
    if (!existing) update((d) => void d.themes.push({ id, name: n, color: COLORS[d.themes.length % COLORS.length] }))
    if (!value.includes(id)) onChange([...value, id])
    setName('')
  }
  return (
    <div>
      {s.themes.map((t) => (
        <span key={t.id} className={'chip pick' + (value.includes(t.id) ? ' on' : '')} onClick={() => toggle(t.id)}>
          <span className="dot" style={{ background: t.color }} />
          {t.name}
        </span>
      ))}
      <div className="row" style={{ gap: 6, marginTop: 6 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder="Nuevo tema (ej: “evaluation metrics”)"
          style={{ maxWidth: 320 }}
        />
        <button type="button" className="btn sm" style={{ flex: '0 0 auto' }} onClick={add}>
          + Tema
        </button>
      </div>
    </div>
  )
}

export function Seg<T extends string>({ options, value, onChange }: { options: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map(([v, label]) => (
        <button key={v} type="button" className={value === v ? 'on' : ''} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  )
}

/** Two-click destructive button: "Eliminar" -> "¿Seguro?" -> action. */
export function ConfirmButton({ onConfirm, children, className = 'btn ghost danger' }: { onConfirm: () => void; children: ReactNode; className?: string }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3500)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <button type="button" className={className} onClick={() => (armed ? onConfirm() : setArmed(true))}>
      {armed ? '¿Seguro? Clic otra vez' : children}
    </button>
  )
}

export function CopyButton({ text, label = 'Copiar', className = 'btn primary' }: { text: string; label?: string; className?: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle')
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setState('ok')
        } catch {
          setState('fail')
        }
        setTimeout(() => setState('idle'), 2000)
      }}
    >
      {state === 'ok' ? '¡Copiado! ✓' : state === 'fail' ? 'No se pudo copiar' : label}
    </button>
  )
}

export function Empty({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="empty">
      <div style={{ fontSize: 34 }}>{icon}</div>
      {children}
    </div>
  )
}

/** useState persisted in localStorage (for filters and small UI prefs). */
export function usePersisted<T>(key: string, initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw == null ? initial : (JSON.parse(raw) as T)
    } catch {
      return initial
    }
  })
  const set = (nv: T) => {
    setV(nv)
    try {
      localStorage.setItem(key, JSON.stringify(nv))
    } catch {
      /* ignore */
    }
  }
  return [v, set]
}

export function highlightCitaQ(text: string): ReactNode[] {
  return text.split(/(\[CITA\?\])/gi).map((part, i) =>
    /^\[CITA\?\]$/i.test(part) ? (
      <mark key={i} className="cq">
        {part}
      </mark>
    ) : (
      part
    ),
  )
}
