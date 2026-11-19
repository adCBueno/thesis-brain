import { Empty, Head, highlightCitaQ } from '../components/common'
import { k, rich, t, tp } from '../lib/i18n'
import { update, useAppState } from '../lib/store'
import { cite, PARA_STATUS, paraSources, sourceById, uid } from '../lib/utils'
import { useUI } from '../ui'

const SKELETON: [string, string][] = [
  ['Introduction', k('Problema, motivación, research questions, contribución')],
  ['Background & Related Work', k('Conceptos clave y qué se ha hecho; termina en el gap')],
  ['Research Methodology', k('Cómo respondes cada RQ y por qué así')],
  ['Results', k('Qué encontraste, sin interpretar todavía')],
  ['Analysis & Discussion', k('Qué significa, comparado con la literatura')],
  ['Threats to Validity', k('Limitaciones y cómo las mitigaste')],
  ['Conclusions & Future Work', k('Respuesta corta a cada RQ y qué sigue')],
]

function swap<T>(arr: T[], i: number, j: number) {
  if (j < 0 || j >= arr.length) return false
  ;[arr[i], arr[j]] = [arr[j], arr[i]]
  return true
}

export function Borrador() {
  const s = useAppState()
  const { open } = useUI()
  return (
    <>
      <Head title={t('Borrador')} sub={t('Cada párrafo sabe de qué fichas y papers viene. Clic en una cita para ver de dónde salió.')} />
      <div className="toolbar">
        <button className="btn primary" onClick={() => open({ kind: 'section' })}>
          {t('+ Sección')}
        </button>
        <button className="btn" onClick={() => open({ kind: 'export' })}>
          {t('📤 Exportar borrador')}
        </button>
        <span className="meta">{rich('Escribe <b>[CITA?]</b> donde falte una referencia y sigue.')}</span>
      </div>

      {!s.outline.length ? (
        <Empty icon="🧱">
          {rich('<b>Empieza por el esqueleto.</b> Solo títulos; el contenido llega después.')}
          <div style={{ marginTop: 14 }}>
            <button
              className="btn primary"
              onClick={() =>
                update((d) => {
                  SKELETON.forEach(([title, note]) => d.outline.push({ id: uid(), title, note: t(note), paras: [] }))
                  return t('Creaste el esqueleto del borrador 🧱')
                })
              }
            >
              {t('Usar esqueleto típico de tesis de máster')}
            </button>{' '}
            <button className="btn" onClick={() => open({ kind: 'section' })}>
              {t('Crear mi propia sección')}
            </button>
          </div>
        </Empty>
      ) : (
        s.outline.map((sec, si) => (
          <div key={sec.id} className="card" style={{ marginBottom: 16 }}>
            <div className="row">
              <h2 style={{ margin: 0 }}>
                §{si + 1} {sec.title}
              </h2>
              <div style={{ flex: '0 0 auto' }}>
                <button className="btn sm ghost" title={t('Subir sección')} onClick={() => update((d) => void swap(d.outline, si, si - 1))}>
                  ↑
                </button>
                <button className="btn sm ghost" title={t('Bajar sección')} onClick={() => update((d) => void swap(d.outline, si, si + 1))}>
                  ↓
                </button>
                <button className="btn sm ghost" title={t('Editar')} onClick={() => open({ kind: 'section', i: si })}>
                  ✎
                </button>
              </div>
            </div>
            {sec.note && <div className="meta">🎯 {sec.note}</div>}
            <div style={{ marginTop: 8 }}>
              {sec.paras.map((p, pi) => {
                const sids = paraSources(s, p)
                const [label, cls] = PARA_STATUS[p.status] || PARA_STATUS.idea
                return (
                  <div key={p.id} className="para">
                    <div className="pnum">¶{pi + 1}</div>
                    <div>
                      <div className={'ptext' + (p.text ? '' : ' empty-p')} style={{ cursor: 'text' }} onClick={() => open({ kind: 'para', si, pi })}>
                        {p.text ? highlightCitaQ(p.text) : t('Párrafo vacío: clic para escribir')}
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <span className={'badge ' + cls}>{t(label)}</span>{' '}
                        {sids.map((id) => (
                          <span key={id} className="chip pick" onClick={() => open({ kind: 'source', id })}>
                            📄 {cite(sourceById(s, id))}
                          </span>
                        ))}{' '}
                        {p.noteIds.length > 0 && (
                          <span className="meta">{tp(p.noteIds.length, '{n} ficha', '{n} fichas')}</span>
                        )}
                      </div>
                    </div>
                    <div className="pact">
                      <button className="btn sm ghost" title={t('Subir')} onClick={() => update((d) => void swap(d.outline[si].paras, pi, pi - 1))}>
                        ↑
                      </button>
                      <button className="btn sm ghost" title={t('Bajar')} onClick={() => update((d) => void swap(d.outline[si].paras, pi, pi + 1))}>
                        ↓
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            <button className="btn sm" style={{ marginTop: 8 }} onClick={() => open({ kind: 'para', si })}>
              {t('+ Párrafo')}
            </button>
          </div>
        ))
      )}
    </>
  )
}
