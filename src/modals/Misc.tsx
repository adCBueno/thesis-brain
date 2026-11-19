import { useState } from 'react'
import { ConfirmButton, Modal } from '../components/common'
import { getAI, setAI } from '../lib/ai'
import { LANGS, rich, setLang, t, useLang, type Lang } from '../lib/i18n'
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
      <h2>{t('📍 Dónde me quedé')}</h2>
      <p className="meta">{t('Escríbele a tu yo de mañana: ¿qué estabas pensando? ¿qué ibas a hacer después? (Truco: deja una frase a medias; retomar se vuelve mucho más fácil.)')}</p>
      <textarea autoFocus value={parking} onChange={(e) => setParking(e.target.value)} style={{ minHeight: 140 }} />
      <label className="f">{t('Siguiente micro-paso (≤ 25 min)')}</label>
      <input value={next} onChange={(e) => setNext(e.target.value)} placeholder={t('Ej: sacar 3 fichas de la §4 de Pérez 2023')} />
      <div className="mfoot">
        <button className="btn ghost" onClick={close}>
          {t('Cancelar')}
        </button>
        <button
          className="btn primary"
          onClick={() => {
            update((d) => {
              d.parking = parking.trim()
              d.next = next.trim()
              return t('Actualizaste “dónde me quedé” 📍')
            })
            close()
          }}
        >
          {t('Guardar')}
        </button>
      </div>
    </Modal>
  )
}

function LanguageSection() {
  const lang = useLang()
  return (
    <div className="settings-sec">
      <label className="f">{t('🌍 Idioma')}</label>
      <div className="seg">
        {(Object.keys(LANGS) as Lang[]).map((l) => (
          <button key={l} type="button" className={lang === l ? 'on' : ''} onClick={() => setLang(l)}>
            {LANGS[l].flag} {LANGS[l].label}
          </button>
        ))}
      </div>
      <p className="meta">{t('Cambia los textos de la app y el formato de fechas. Tus fichas y tu borrador quedan como los escribiste.')}</p>
    </div>
  )
}

function InstallSection() {
  const canInstall = useCanInstall()
  if (isStandalone())
    return (
      <div className="settings-sec">
        <label className="f">{t('📲 App instalada')}</label>
        <p className="meta" style={{ marginTop: 0 }}>
          {t('Estás usando Thesis Brain como app, en su propia ventana. Funciona sin internet y se actualiza sola (te avisa antes).')}
        </p>
      </div>
    )
  return (
    <div className="settings-sec">
      <label className="f">{t('📲 Instalar como app')}</label>
      <p className="meta" style={{ marginTop: 0 }}>
        {t('Ábrela en su propia ventana, con ícono en el Dock o la barra de tareas, fuera de tus tabs. Funciona sin internet.')}
      </p>
      {canInstall ? (
        <button className="btn sm primary" onClick={() => void promptInstall()}>
          {t('Instalar Thesis Brain')}
        </button>
      ) : (
        <ul className="meta" style={{ margin: 0, paddingLeft: 18 }}>
          <li>{rich('<b>Chrome / Edge:</b> ícono de instalar (⊕) a la derecha de la barra de direcciones, o menú ⋮ → “Instalar Thesis Brain”.')}</li>
          <li>{rich('<b>Safari (Mac):</b> Archivo → Añadir al Dock.')}</li>
          <li>{rich('<b>iPhone / iPad:</b> Compartir → Añadir a pantalla de inicio.')}</li>
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
      setMsg('⚠️ ' + t('Ese archivo no es un respaldo válido de Thesis Brain.'))
    }
  }

  return (
    <Modal>
      <h2>{t('⚙️ Datos y ajustes')}</h2>
      <p className="meta">{rich('Todo vive en <b>tu</b> navegador (IndexedDB): no hay servidor ni cuentas. Para no depender de un solo navegador, conecta un archivo o exporta respaldos.')}</p>

      <LanguageSection />
      <InstallSection />

      <div className="settings-sec">
        <label className="f">{t('📁 Sincronizar con un archivo')}</label>
        {fsSupported ? (
          <>
            <p className="meta" style={{ marginTop: 0 }}>
              {sync.kind === 'file'
                ? rich('Guardando automáticamente en <b>{f}</b>.', { f: sync.fileName })
                : t('Guarda cada cambio en un .json de tu disco. Si lo pones en iCloud Drive, Dropbox, OneDrive o un repo de git, lo abres desde otra compu con “Abrir archivo existente”.')}
            </p>
            <div className="toolbar">
              <button className="btn sm primary" onClick={() => run(() => connectNewFile(getState()))}>
                {t('Crear archivo nuevo')}
              </button>
              <button
                className="btn sm"
                onClick={() =>
                  run(async () => {
                    const data = await openExistingFile()
                    replaceState(data)
                    setMsg(t('✓ Archivo abierto y conectado.'))
                  })
                }
              >
                {t('Abrir archivo existente')}
              </button>
              {sync.kind !== 'local' && sync.kind !== 'error' && (
                <button className="btn sm ghost" onClick={() => run(disconnectFile)}>
                  {t('Desconectar')}
                </button>
              )}
            </div>
          </>
        ) : (
          <p className="meta" style={{ marginTop: 0 }}>
            {t('Tu navegador no soporta guardar directo en un archivo (funciona en Chrome y Edge). Usa exportar / importar.')}
          </p>
        )}
      </div>

      <div className="settings-sec">
        <label className="f">{t('💾 Respaldo manual')}</label>
        <div className="toolbar">
          <button className="btn sm" onClick={() => downloadText(`thesis-brain-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(getState(), null, 1), 'application/json')}>
            {t('Descargar respaldo (.json)')}
          </button>
          <label className="btn sm">
            {t('Importar respaldo…')}
            <input type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={(e) => onImportFile(e.target.files?.[0])} />
          </label>
        </div>
        {pending && (
          <div className="banner" style={{ margin: '4px 0 0' }}>
            <span>{t('Respaldo con {s} fuentes y {n} fichas. Reemplazará lo que tienes ahora.', { s: pending.sources.length, n: pending.notes.length })}</span>
            <ConfirmButton
              className="btn sm primary"
              onConfirm={() => {
                replaceState({ ...pending, updated: Date.now() })
                setPending(null)
                setMsg(t('✓ Respaldo importado.'))
              }}
            >
              {t('Reemplazar todo')}
            </ConfirmButton>
          </div>
        )}
      </div>

      <div className="settings-sec">
        <label className="f">{t('✨ IA para síntesis (opcional)')}</label>
        <p className="meta" style={{ marginTop: 0 }}>
          {t('Pega tu API key de Anthropic (console.anthropic.com). Se guarda solo en este navegador y se envía directo a api.anthropic.com. Sin key, puedes usar “Copiar prompt” y pegarlo en Claude.')}
        </p>
        <div className="row">
          <input type="password" value={ai.apiKey} onChange={(e) => setAi({ ...ai, apiKey: e.target.value })} placeholder="sk-ant-…" autoComplete="off" />
          <input value={ai.model} onChange={(e) => setAi({ ...ai, model: e.target.value })} style={{ flex: '0 0 190px' }} title={t('Modelo')} />
          <button
            className="btn sm"
            style={{ flex: '0 0 auto' }}
            onClick={() => {
              setAI({ apiKey: ai.apiKey.trim(), model: ai.model.trim() || 'claude-sonnet-5-5' })
              setAiSaved(true)
              setTimeout(() => setAiSaved(false), 1500)
            }}
          >
            {aiSaved ? t('✓ Guardado') : t('Guardar')}
          </button>
        </div>
      </div>

      <div className="settings-sec">
        <label className="f">{t('🧨 Empezar de cero')}</label>
        <ConfirmButton
          className="btn sm ghost danger"
          onConfirm={() => {
            replaceState({ ...blank(), updated: Date.now() })
            close()
          }}
        >
          {t('Borrar todos los datos de este navegador')}
        </ConfirmButton>
      </div>

      {msg && <p className="meta">{msg}</p>}
      <div className="mfoot">
        <button className="btn primary" onClick={close}>
          {t('Listo')}
        </button>
      </div>
    </Modal>
  )
}
