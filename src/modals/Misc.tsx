import { useState } from 'react'
import { ConfirmButton, Modal } from '../components/common'
import { getAI, setAI } from '../lib/ai'
import { isStandalone, promptInstall, useCanInstall } from '../lib/pwa'
import { getState, replaceState, update, useAppState } from '../lib/store'
import { connectNewFile, disconnectFile, fsSupported, openExistingFile, useSync } from '../lib/storage'
import { blank, downloadText, normalize } from '../lib/utils'
import type { State } from '../types'
import { useUI } from '../ui'

export function ParkingModal() {
  const st = useAppState()
  const { close } = useUI()
  const [parking, setParking] = useState(st.parking)
  const [next, setNext] = useState(st.next)
  return (
    <Modal>
      <h2>📍 Dónde me quedé</h2>
      <p className="meta">Escríbele a tu yo de mañana: ¿qué estabas pensando? ¿qué ibas a hacer después? (Truco: deja una frase a medias; retomar se vuelve mucho más fácil.)</p>
      <textarea autoFocus value={parking} onChange={(e) => setParking(e.target.value)} style={{ minHeight: 140 }} />
      <label className="f">Siguiente micro-paso (≤ 25 min)</label>
      <input value={next} onChange={(e) => setNext(e.target.value)} placeholder="Ej: sacar 3 fichas de la §4 de Pérez 2023" />
      <div className="mfoot">
        <button className="btn ghost" onClick={close}>
          Cancelar
        </button>
        <button
          className="btn primary"
          onClick={() => {
            update((d) => {
              d.parking = parking.trim()
              d.next = next.trim()
              return 'Actualizaste “dónde me quedé” 📍'
            })
            close()
          }}
        >
          Guardar
        </button>
      </div>
    </Modal>
  )
}

function InstallSection() {
  const canInstall = useCanInstall()
  if (isStandalone())
    return (
      <div className="settings-sec">
        <label className="f">📲 App instalada</label>
        <p className="meta" style={{ marginTop: 0 }}>
          Estás usando Thesis Brain como app, en su propia ventana. Funciona sin internet y se actualiza sola (te avisa antes).
        </p>
      </div>
    )
  return (
    <div className="settings-sec">
      <label className="f">📲 Instalar como app</label>
      <p className="meta" style={{ marginTop: 0 }}>
        Ábrela en su propia ventana, con ícono en el Dock o la barra de tareas, fuera de tus tabs. Funciona sin internet.
      </p>
      {canInstall ? (
        <button className="btn sm primary" onClick={() => void promptInstall()}>
          Instalar Thesis Brain
        </button>
      ) : (
        <ul className="meta" style={{ margin: 0, paddingLeft: 18 }}>
          <li>
            <b>Chrome / Edge:</b> ícono de instalar (⊕) a la derecha de la barra de direcciones, o menú ⋮ → “Instalar Thesis Brain”.
          </li>
          <li>
            <b>Safari (Mac):</b> Archivo → Añadir al Dock.
          </li>
          <li>
            <b>iPhone / iPad:</b> Compartir → Añadir a pantalla de inicio.
          </li>
        </ul>
      )}
    </div>
  )
}

export function DataModal() {
  const { close } = useUI()
  const sync = useSync()
  const [msg, setMsg] = useState('')
  const [pending, setPending] = useState<State | null>(null)
  const [ai, setAi] = useState(getAI)
  const [aiSaved, setAiSaved] = useState(false)

  const run = async (fn: () => Promise<void>) => {
    setMsg('')
    try {
      await fn()
    } catch (e) {
      const err = e as Error
      if (err.name !== 'AbortError') setMsg('⚠️ ' + err.message)
    }
  }

  const onImportFile = async (file?: File) => {
    if (!file) return
    try {
      const obj = JSON.parse(await file.text())
      if (!obj || !obj.v || !Array.isArray(obj.sources)) throw new Error()
      setPending(normalize(obj))
      setMsg('')
    } catch {
      setMsg('⚠️ Ese archivo no es un respaldo válido de Thesis Brain.')
    }
  }

  return (
    <Modal>
      <h2>⚙️ Datos y ajustes</h2>
      <p className="meta">
        Todo vive en <b>tu</b> navegador (IndexedDB): no hay servidor ni cuentas. Para no depender de un solo navegador, conecta un archivo o exporta respaldos.
      </p>

      <InstallSection />

      <div className="settings-sec">
        <label className="f">📁 Sincronizar con un archivo</label>
        {fsSupported ? (
          <>
            <p className="meta" style={{ marginTop: 0 }}>
              {sync.kind === 'file' ? (
                <>
                  Guardando automáticamente en <b>{sync.fileName}</b>.
                </>
              ) : (
                'Guarda cada cambio en un .json de tu disco. Si lo pones en iCloud Drive, Dropbox, OneDrive o un repo de git, lo abres desde otra compu con “Abrir archivo existente”.'
              )}
            </p>
            <div className="toolbar">
              <button className="btn sm primary" onClick={() => run(() => connectNewFile(getState()))}>
                Crear archivo nuevo
              </button>
              <button
                className="btn sm"
                onClick={() =>
                  run(async () => {
                    const data = await openExistingFile()
                    replaceState(data)
                    setMsg('✓ Archivo abierto y conectado.')
                  })
                }
              >
                Abrir archivo existente
              </button>
              {sync.kind !== 'local' && sync.kind !== 'error' && (
                <button className="btn sm ghost" onClick={() => run(disconnectFile)}>
                  Desconectar
                </button>
              )}
            </div>
          </>
        ) : (
          <p className="meta" style={{ marginTop: 0 }}>
            Tu navegador no soporta guardar directo en un archivo (funciona en Chrome y Edge). Usa exportar / importar.
          </p>
        )}
      </div>

      <div className="settings-sec">
        <label className="f">💾 Respaldo manual</label>
        <div className="toolbar">
          <button className="btn sm" onClick={() => downloadText(`thesis-brain-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(getState(), null, 1), 'application/json')}>
            Descargar respaldo (.json)
          </button>
          <label className="btn sm">
            Importar respaldo…
            <input type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={(e) => onImportFile(e.target.files?.[0])} />
          </label>
        </div>
        {pending && (
          <div className="banner" style={{ margin: '4px 0 0' }}>
            <span>
              Respaldo con {pending.sources.length} fuentes y {pending.notes.length} fichas. Reemplazará lo que tienes ahora.
            </span>
            <ConfirmButton
              className="btn sm primary"
              onConfirm={() => {
                replaceState({ ...pending, updated: Date.now() })
                setPending(null)
                setMsg('✓ Respaldo importado.')
              }}
            >
              Reemplazar todo
            </ConfirmButton>
          </div>
        )}
      </div>

      <div className="settings-sec">
        <label className="f">✨ IA para síntesis (opcional)</label>
        <p className="meta" style={{ marginTop: 0 }}>
          Pega tu API key de Anthropic (console.anthropic.com). Se guarda solo en este navegador y se envía directo a api.anthropic.com. Sin key, puedes usar “Copiar prompt” y pegarlo en Claude.
        </p>
        <div className="row">
          <input type="password" value={ai.apiKey} onChange={(e) => setAi({ ...ai, apiKey: e.target.value })} placeholder="sk-ant-…" autoComplete="off" />
          <input value={ai.model} onChange={(e) => setAi({ ...ai, model: e.target.value })} style={{ flex: '0 0 190px' }} title="Modelo" />
          <button
            className="btn sm"
            style={{ flex: '0 0 auto' }}
            onClick={() => {
              setAI({ apiKey: ai.apiKey.trim(), model: ai.model.trim() || 'claude-sonnet-5-5' })
              setAiSaved(true)
              setTimeout(() => setAiSaved(false), 1500)
            }}
          >
            {aiSaved ? '✓ Guardado' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="settings-sec">
        <label className="f">🧨 Empezar de cero</label>
        <ConfirmButton
          className="btn sm ghost danger"
          onConfirm={() => {
            replaceState({ ...blank(), updated: Date.now() })
            close()
          }}
        >
          Borrar todos los datos de este navegador
        </ConfirmButton>
      </div>

      {msg && <p className="meta">{msg}</p>}
      <div className="mfoot">
        <button className="btn primary" onClick={close}>
          Listo
        </button>
      </div>
    </Modal>
  )
}
