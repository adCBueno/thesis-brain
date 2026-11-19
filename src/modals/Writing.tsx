import { useMemo, useRef, useState } from 'react'
import { ConfirmButton, CopyButton, Modal, Seg, ThemeChip } from '../components/common'
import { buildSynthesisPrompt, getAI, paragraphPart, synthesize } from '../lib/ai'
import { t } from '../lib/i18n'
import { update, useAppState } from '../lib/store'
import { cite, downloadText, exportMd, noteUsed, PARA_STATUS, secLabel, sourceById, themeById, uid } from '../lib/utils'
import type { Note, ParaStatus } from '../types'
import { useUI } from '../ui'

/* ---------- Theme workspace: notes of one theme -> synthesis -> paragraph ---------- */
export function ThemeModal({ id }: { id: string }) {
  const st = useAppState()
  const { close, go } = useUI()
  const theme = themeById(st, id)
  const notes = st.notes.filter((n) => n.themeIds.includes(id))
  const [picked, setPicked] = useState<string[]>(() => notes.map((n) => n.id))
  const [lang, setLang] = useState<'en' | 'es'>('en')
  const [section, setSection] = useState<string>(st.outline[0]?.id ?? '__new')
  const [ai, setAi] = useState<{ state: 'idle' | 'loading' | 'done' | 'error'; text: string }>({ state: 'idle', text: '' })
  const abort = useRef<AbortController | null>(null)
  const hasKey = !!getAI().apiKey

  const bySource = useMemo(() => {
    const m = new Map<string, Note[]>()
    notes.forEach((n) => m.set(n.sourceId, [...(m.get(n.sourceId) || []), n]))
    return [...m.entries()]
  }, [notes])

  if (!theme) return null

  const prompt = buildSynthesisPrompt(
    theme.name,
    notes
      .filter((n) => picked.includes(n.id))
      .map((n) => ({ citation: n.sourceId ? cite(sourceById(st, n.sourceId)) : "author's own idea", loc: n.loc, quote: n.kind === 'quote', text: n.text, mine: n.mine })),
    lang,
  )

  const generate = async () => {
    if (!picked.length) return
    abort.current?.abort()
    abort.current = new AbortController()
    setAi({ state: 'loading', text: '' })
    try {
      const text = await synthesize(prompt, abort.current.signal)
      setAi({ state: 'done', text })
    } catch (e) {
      setAi({ state: 'error', text: (e as Error).message })
    }
  }

  const createParagraph = () => {
    const text = ai.state === 'done' ? paragraphPart(ai.text) : ''
    update((d) => {
      let sec = d.outline.find((x) => x.id === section)
      if (!sec) {
        sec = { id: uid(), title: theme.name, note: '', paras: [] }
        d.outline.push(sec)
      }
      sec.paras.push({ id: uid(), text, noteIds: picked, sourceIds: [], status: text ? 'draft' : 'idea' })
      return t('Nuevo párrafo en “{sec}” a partir del tema {theme}', { sec: sec.title, theme: theme.name })
    })
    close()
    go('borrador')
  }

  return (
    <Modal wide>
      <h2>
        <ThemeChip t={theme} /> {t('Escribir sobre este tema')}
      </h2>
      <p className="meta">{t('{n} fichas de {s} fuentes. Pregúntate: ¿en qué coinciden? ¿en qué discrepan? ¿qué nadie ha estudiado todavía (tu gap)?', { n: notes.length, s: bySource.length })}</p>
      <div style={{ maxHeight: 320, overflow: 'auto', border: '1px solid var(--line)', borderRadius: 12, padding: '6px 12px' }}>
        {bySource.length ? (
          bySource.map(([sid, arr]) => (
            <div key={sid || '_'} style={{ padding: '6px 0' }}>
              <div className="cite">{sid ? cite(sourceById(st, sid)) : t('💭 Ideas mías')}</div>
              {arr.map((n) => (
                <label key={n.id} style={{ display: 'flex', gap: 8, padding: '3px 0', fontSize: 14, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    style={{ width: 'auto', marginTop: 4 }}
                    checked={picked.includes(n.id)}
                    onChange={(e) => setPicked(e.target.checked ? [...picked, n.id] : picked.filter((x) => x !== n.id))}
                  />
                  <span>
                    {n.text}
                    {n.mine && <span className="meta"> 💭 {n.mine}</span>}
                    {noteUsed(st, n.id) && <span className="meta"> · {t('ya usada')}</span>}
                  </span>
                </label>
              ))}
            </div>
          ))
        ) : (
          <div className="meta">{t('Sin fichas en este tema.')}</div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16, boxShadow: 'none' }}>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <b style={{ flex: '1 1 200px' }}>{t('✨ Borrador de síntesis con IA')}</b>
          <select value={lang} onChange={(e) => setLang(e.target.value as 'en' | 'es')} style={{ flex: '0 0 120px' }} title={t('Idioma del párrafo')}>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
          <CopyButton text={prompt} label={t('Copiar prompt')} className="btn sm" />
          {hasKey && (
            <button className="btn sm primary" style={{ flex: '0 0 auto' }} disabled={ai.state === 'loading' || !picked.length} onClick={generate}>
              {ai.state === 'loading' ? t('Generando…') : t('Generar')}
            </button>
          )}
        </div>
        <div className="meta" style={{ marginTop: 6 }}>
          {t('Usa solo las fichas marcadas, organiza por idea (no autor por autor) y cita (Autor, Año).')}{' '}
          {hasKey ? t('Es un punto de partida: reescríbelo con tu voz.') : t('Sin API key: copia el prompt y pégalo en Claude, o configura tu key en ⚙️ Datos y ajustes.')}
        </div>
        {ai.state !== 'idle' && <div className="ai-out">{ai.state === 'loading' ? t('Pensando…') : ai.text}</div>}
        {ai.state === 'done' && (
          <div className="meta" style={{ marginTop: 6 }}>
            {t('Si creas el párrafo abajo, se usará este texto (sin los bullets) como borrador.')}
          </div>
        )}
      </div>

      <label className="f">{t('Convertir en párrafo dentro de…')}</label>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <select value={section} onChange={(e) => setSection(e.target.value)} style={{ flex: '1 1 220px' }}>
          {st.outline.map((s, i) => (
            <option key={s.id} value={s.id}>
              §{i + 1} {s.title}
            </option>
          ))}
          <option value="__new">{t('+ Nueva sección “{name}”', { name: theme.name })}</option>
        </select>
        <button className="btn primary" style={{ flex: '0 0 auto' }} onClick={createParagraph}>
          {t('Crear párrafo con las fichas marcadas')}
        </button>
      </div>
      <div className="mfoot">
        <button className="btn ghost" onClick={close}>
          {t('Cerrar')}
        </button>
      </div>
    </Modal>
  )
}

/* ---------- Rename / recolor / delete themes ---------- */
export function ThemesModal() {
  const st = useAppState()
  const { close } = useUI()
  const [rows, setRows] = useState(() => st.themes.map((th) => ({ ...th })))
  const save = () => {
    update((d) => {
      rows.forEach((r) => {
        const th = d.themes.find((x) => x.id === r.id)
        if (th) {
          th.name = r.name.trim() || th.name
          th.color = r.color
        }
      })
      return t('Editaste los temas')
    })
    close()
  }
  const remove = (id: string) => {
    update((d) => {
      d.themes = d.themes.filter((th) => th.id !== id)
      d.notes.forEach((n) => (n.themeIds = n.themeIds.filter((x) => x !== id)))
      d.sources.forEach((s) => (s.themeIds = s.themeIds.filter((x) => x !== id)))
      return t('Eliminaste un tema')
    })
    setRows(rows.filter((r) => r.id !== id))
  }
  return (
    <Modal>
      <h2>{t('Editar temas')}</h2>
      <div className="list">
        {rows.length ? (
          rows.map((r, i) => (
            <div key={r.id} className="row">
              <input type="color" value={r.color} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)))} style={{ flex: '0 0 46px', padding: 2, height: 38 }} />
              <input value={r.name} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <span className="meta" style={{ flex: '0 0 auto' }}>
                {t('{n} fichas', { n: st.notes.filter((n) => n.themeIds.includes(r.id)).length })}
              </span>
              <span style={{ flex: '0 0 auto' }}>
                <ConfirmButton className="btn sm ghost danger" onConfirm={() => remove(r.id)}>
                  🗑️
                </ConfirmButton>
              </span>
            </div>
          ))
        ) : (
          <div className="meta">{t('Aún no hay temas.')}</div>
        )}
      </div>
      <div className="mfoot">
        <button className="btn ghost" onClick={close}>
          {t('Cancelar')}
        </button>
        <button className="btn primary" onClick={save}>
          {t('Guardar')}
        </button>
      </div>
    </Modal>
  )
}

/* ---------- Section ---------- */
export function SectionModal({ i }: { i?: number }) {
  const st = useAppState()
  const { close } = useUI()
  const existing = i != null ? st.outline[i] : undefined
  const [title, setTitle] = useState(existing?.title ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [err, setErr] = useState(false)
  const save = () => {
    const name = title.trim()
    if (!name) {
      setErr(true)
      return
    }
    update((d) => {
      if (existing) {
        Object.assign(d.outline[i!], { title: name, note: note.trim() })
        return t('Editaste la sección {name}', { name })
      }
      d.outline.push({ id: uid(), title: name, note: note.trim(), paras: [] })
      return t('Nueva sección: {name}', { name })
    })
    close()
  }
  return (
    <Modal>
      <h2>{existing ? t('Editar sección') : t('Nueva sección')}</h2>
      <label className="f">{t('Título')}</label>
      <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('Ej: Related Work')} style={err ? { borderColor: '#c0392b' } : undefined} />
      <label className="f">{t('🎯 ¿Qué tiene que lograr esta sección? (opcional)')}</label>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('Ej: mostrar que nadie ha evaluado X en contexto Y')} />
      <div className="mfoot">
        {existing && (
          <ConfirmButton
            onConfirm={() => {
              update((d) => {
                d.outline.splice(i!, 1)
                return t('Eliminaste la sección {name}', { name: existing.title })
              })
              close()
            }}
          >
            {t('Eliminar sección')}
          </ConfirmButton>
        )}
        <span className="sp" />
        <button className="btn ghost" onClick={close}>
          {t('Cancelar')}
        </button>
        <button className="btn primary" onClick={save}>
          {t('Guardar')}
        </button>
      </div>
    </Modal>
  )
}

/* ---------- Paragraph ---------- */
export function ParaModal({ si, pi }: { si: number; pi?: number }) {
  const st = useAppState()
  const { close } = useUI()
  const sec = st.outline[si]
  const existing = pi != null ? sec?.paras[pi] : undefined
  const [text, setText] = useState(existing?.text ?? '')
  const [status, setStatus] = useState<ParaStatus>(existing?.status ?? 'idea')
  const [noteIds, setNoteIds] = useState<string[]>(existing?.noteIds ?? [])
  const [sourceIds, setSourceIds] = useState<string[]>(existing?.sourceIds ?? [])
  const [q, setQ] = useState('')
  const initial = useRef(existing?.noteIds ?? [])

  if (!sec) return null

  const ql = q.toLowerCase()
  const notes = st.notes
    .slice()
    .sort((a, b) => Number(initial.current.includes(b.id)) - Number(initial.current.includes(a.id)) || b.created - a.created)
    .filter((n) => !ql || [n.text, n.mine, cite(sourceById(st, n.sourceId)), ...n.themeIds.map((x) => themeById(st, x)?.name || '')].join(' ').toLowerCase().includes(ql))

  const save = () => {
    update((d) => {
      const s = d.outline[si]
      const obj = { text: text.trim(), status, noteIds, sourceIds }
      if (existing) {
        Object.assign(s.paras[pi!], obj)
        return t('Editaste {p} de “{sec}”', { p: secLabel(si, pi), sec: s.title })
      }
      s.paras.push({ id: uid(), ...obj })
      return t('Nuevo párrafo en “{sec}”', { sec: s.title })
    })
    close()
  }

  return (
    <Modal wide>
      <h2>
        §{si + 1} {sec.title} · {existing ? `¶${pi! + 1}` : t('nuevo párrafo')}
      </h2>
      <label className="f">{t('Texto (o la idea principal / topic sentence)')}</label>
      <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 170 }} placeholder={t('Empieza por la idea central del párrafo. Escribir feo está permitido.')} />
      <label className="f">{t('Estado')}</label>
      <Seg<ParaStatus> options={(Object.keys(PARA_STATUS) as ParaStatus[]).map((x) => [x, t(PARA_STATUS[x][0])])} value={status} onChange={setStatus} />
      <label className="f">{t('Fichas que respaldan este párrafo')}</label>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Filtrar fichas…')} style={{ marginBottom: 6 }} />
      <div className="pick-list">
        {notes.length ? (
          notes.map((n) => (
            <label key={n.id}>
              <input type="checkbox" checked={noteIds.includes(n.id)} onChange={(e) => setNoteIds(e.target.checked ? [...noteIds, n.id] : noteIds.filter((x) => x !== n.id))} />
              <span>
                <span className="cite">{cite(sourceById(st, n.sourceId))}</span> {n.text.slice(0, 150)}
              </span>
            </label>
          ))
        ) : (
          <div className="meta" style={{ padding: 10 }}>
            {st.notes.length ? t('Ninguna ficha coincide.') : t('Aún no hay fichas.')}
          </div>
        )}
      </div>
      <label className="f">{t('Otras fuentes citadas (sin ficha)')}</label>
      <div>
        {st.sources
          .filter((s) => s.status !== 'dropped' && s.status !== 'inbox')
          .map((s) => (
            <span
              key={s.id}
              className={'chip pick' + (sourceIds.includes(s.id) ? ' on' : '')}
              onClick={() => setSourceIds(sourceIds.includes(s.id) ? sourceIds.filter((x) => x !== s.id) : [...sourceIds, s.id])}
            >
              {cite(s)}
            </span>
          ))}
      </div>
      <div className="mfoot">
        {existing && (
          <ConfirmButton
            onConfirm={() => {
              update((d) => {
                d.outline[si].paras.splice(pi!, 1)
                return t('Eliminaste un párrafo')
              })
              close()
            }}
          >
            {t('Eliminar')}
          </ConfirmButton>
        )}
        <span className="sp" />
        <button className="btn ghost" onClick={close}>
          {t('Cancelar')}
        </button>
        <button className="btn primary" onClick={save}>
          {t('Guardar')}
        </button>
      </div>
    </Modal>
  )
}

/* ---------- Export ---------- */
export function ExportModal() {
  const st = useAppState()
  const { close } = useUI()
  const md = exportMd(st)
  return (
    <Modal wide>
      <h2>{t('📤 Exportar borrador')}</h2>
      <p className="meta">{t('Markdown con las fuentes de cada párrafo y una lista de referencias simple. Pégalo en Overleaf, Word o Docs, y ajusta el estilo de citas que pida tu universidad.')}</p>
      <textarea readOnly value={md} style={{ minHeight: 320, font: '13px ui-monospace,monospace' }} />
      <div className="mfoot">
        <button className="btn ghost" onClick={close}>
          {t('Cerrar')}
        </button>
        <button className="btn" onClick={() => downloadText('thesis-draft.md', md, 'text/markdown')}>
          {t('Descargar .md')}
        </button>
        <CopyButton text={md} />
      </div>
    </Modal>
  )
}
