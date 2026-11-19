import { Head, Seg, usePersisted } from '../components/common'
import { useAppState } from '../lib/store'
import { startTimer, stopTimer, useTimer, type TimerMode } from '../lib/timer'
import { cite, countCitaQ, isoDate, noteUsed, notesOf, STATUS, todoSort } from '../lib/utils'
import { TodoRow } from './Pendientes'
import type { State, Status } from '../types'
import { useUI, type ModalSpec } from '../ui'
import type { View } from '../types'

type Suggestion = { icon: string; title: string; meta: string; action: { view: View } | { modal: ModalSpec } }

function suggestions(s: State): Suggestion[] {
  const out: Suggestion[] = []
  const inbox = s.sources.filter((x) => x.status === 'inbox')
  if (!s.sources.length) out.push({ icon: '🧹', title: 'Vacía tus tabs aquí', meta: 'Pega todos los links de una vez y cierra las pestañas sin culpa.', action: { modal: { kind: 'bulk' } } })
  if (inbox.length)
    out.push({ icon: '📥', title: `Clasifica ${inbox.length} fuente${inbox.length > 1 ? 's' : ''} de la bandeja`, meta: '30 segundos cada una: ¿por qué la abriste? ¿es prioridad?', action: { view: 'fuentes' } })
  const reading = s.sources.filter((x) => x.status === 'reading')
  reading.slice(0, 2).forEach((x) => out.push({ icon: '👀', title: `Sigue con ${cite(x)}`, meta: x.title, action: { modal: { kind: 'source', id: x.id } } }))
  if (!reading.length) {
    const next = s.sources.filter((x) => x.status === 'toread').sort((a, b) => b.priority - a.priority || a.added - b.added)[0]
    if (next) out.push({ icon: '📖', title: `Empieza a leer ${cite(next)}`, meta: next.why || next.title, action: { modal: { kind: 'source', id: next.id } } })
  }
  const readNoNotes = s.sources.filter((x) => x.status === 'read' && !notesOf(s, x.id).length)
  if (readNoNotes.length)
    out.push({
      icon: '🗂️',
      title: `${readNoNotes.length} leído${readNoNotes.length > 1 ? 's' : ''} sin fichas`,
      meta: `Ej: ${cite(readNoNotes[0])}. Saca 2–3 ideas antes de olvidarlas.`,
      action: { modal: { kind: 'source', id: readNoNotes[0].id } },
    })
  const ready = s.themes
    .map((t) => ({ t, n: s.notes.filter((n) => n.themeIds.includes(t.id) && !noteUsed(s, n.id)).length }))
    .filter((x) => x.n >= 3)
    .sort((a, b) => b.n - a.n)[0]
  if (ready) out.push({ icon: '✍️', title: `“${ready.t.name}” está listo para escribir`, meta: `${ready.n} fichas que aún no usas en el borrador.`, action: { modal: { kind: 'theme', id: ready.t.id } } })
  const pend = countCitaQ(s)
  if (pend) out.push({ icon: '🔖', title: `${pend} [CITA?] pendiente${pend > 1 ? 's' : ''} en el borrador`, meta: 'Busca la fuente en Fichas y vincúlala al párrafo.', action: { view: 'borrador' } })
  if (s.sources.length && !s.outline.length) out.push({ icon: '🧱', title: 'Arma el esqueleto del borrador', meta: 'Solo títulos de secciones. Escribir feo también cuenta.', action: { view: 'borrador' } })
  return out.slice(0, 5)
}

const SEGS: [Status, string][] = [
  ['inbox', 'var(--muted)'],
  ['toread', 'var(--yellow)'],
  ['reading', 'var(--blue)'],
  ['read', 'var(--green)'],
  ['done', 'var(--accent)'],
]

const mmss = (ms: number) => `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`

export function Hoy() {
  const s = useAppState()
  const { open, go } = useUI()
  const timer = useTimer()
  const [mode, setMode] = usePersisted<TimerMode>('tb-tmode', 'leer')
  const [mins, setMins] = usePersisted<number>('tb-tmins', 25)
  const total = s.sources.filter((x) => x.status !== 'dropped').length
  const count = (k: Status) => s.sources.filter((x) => x.status === k).length
  const paras = s.outline.reduce((a, x) => a + x.paras.length, 0)
  const done = s.outline.reduce((a, x) => a + x.paras.filter((p) => p.status === 'done').length, 0)
  const sug = suggestions(s)
  // Pendientes for today: important or due today/overdue first, otherwise the next few.
  const openTodos = s.todos.filter((t) => !t.done && t.kind === 'todo').sort(todoSort)
  const urgent = openTodos.filter((t) => t.important || (t.due && t.due <= isoDate()))
  const todayTodos = (urgent.length ? urgent : openTodos).slice(0, 4)

  return (
    <>
      <Head title="Hola 👋" sub="Un paso pequeño a la vez. No tienes que tenerlo todo en la cabeza: para eso está esto." />
      <div className="grid g2">
        <div className="card">
          <div className="row">
            <h2 style={{ margin: 0 }}>📍 Dónde me quedé</h2>
            <button className="btn sm" style={{ flex: '0 0 auto' }} onClick={() => open({ kind: 'parking' })}>
              Editar
            </button>
          </div>
          <div style={{ marginTop: 10 }}>
            {s.parking ? (
              <div className="parking">{s.parking}</div>
            ) : (
              <div className="meta">Al terminar cada sesión, déjale una nota a tu yo de mañana: qué estabas pensando y qué sigue. Así retomar no cuesta nada.</div>
            )}
          </div>
          <label className="f">Siguiente micro-paso</label>
          {s.next ? <div style={{ fontWeight: 600 }}>👉 {s.next}</div> : <div className="meta">Algo que quepa en 25 min. Ej: “leer §3 de Smith 2021 y sacar 3 fichas”.</div>}
        </div>

        <div className="card">
          <h2>⏱️ Bloque de foco</h2>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <div style={{ flex: '0 0 auto' }}>
              <Seg options={[['leer', '📖 Leer'], ['escribir', '✍️ Escribir']]} value={mode} onChange={setMode} />
            </div>
            <div style={{ flex: '0 0 auto' }}>
              <Seg options={[['25', '25 min'], ['50', '50 min']]} value={String(mins)} onChange={(v) => setMins(Number(v))} />
            </div>
          </div>
          <div className="timer" style={{ margin: '16px 0 12px' }}>
            {timer.running ? mmss(timer.left) : `${String(mins).padStart(2, '0')}:00`}
          </div>
          {timer.running ? (
            <div>
              <span className="meta">{timer.running.mode === 'leer' ? '📖 Leyendo' : '✍️ Escribiendo'}… nada de redes 🙃 </span>
              <button className="btn sm" onClick={stopTimer}>
                Parar
              </button>
            </div>
          ) : (
            <div>
              {timer.justFinished && <div style={{ marginBottom: 8 }}>🎉 ¡Bloque completo! Estira, toma agua y actualiza “dónde me quedé”.</div>}
              <button className="btn primary" onClick={() => startTimer(mode, mins)}>
                Empezar
              </button>
            </div>
          )}
          <div className="tip">
            Separa bloques de <b>leer</b> y de <b>escribir</b>. Si al escribir te falta una referencia, pon <b>[CITA?]</b> y sigue: la app te las recuerda después.
          </div>
        </div>
      </div>

      <div className="grid g2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="row">
            <h2 style={{ margin: 0 }}>✨ Para hoy</h2>
            <button className="btn sm ghost" style={{ flex: '0 0 auto' }} onClick={() => open({ kind: 'todo' })} title="Atajo: tecla T">
              + Anotar
            </button>
          </div>
          {todayTodos.length > 0 && (
            <div className="todo-list compact" style={{ margin: '10px 0 6px' }}>
              {todayTodos.map((t) => (
                <TodoRow key={t.id} t={t} />
              ))}
              {openTodos.length > todayTodos.length && (
                <button className="btn sm ghost" style={{ alignSelf: 'flex-start' }} onClick={() => go('pendientes')}>
                  Ver los {openTodos.length} pendientes →
                </button>
              )}
            </div>
          )}
          {sug.length ? (
            sug.map((x, i) => (
              <div key={i} className="sugg" onClick={() => ('view' in x.action ? go(x.action.view) : open(x.action.modal))}>
                <span className="ic">{x.icon}</span>
                <div>
                  <div style={{ fontWeight: 600 }}>{x.title}</div>
                  <div className="meta">{x.meta}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="meta">Todo al día. ¡Bien ahí! 🎉</div>
          )}
        </div>
        <div className="card">
          <h2>📈 Progreso</h2>
          <div className="row" style={{ textAlign: 'center', marginBottom: 14 }}>
            <div>
              <div className="stat">{total}</div>
              <div className="meta">fuentes</div>
            </div>
            <div>
              <div className="stat">{s.notes.length}</div>
              <div className="meta">fichas</div>
            </div>
            <div>
              <div className="stat">
                {done}/{paras}
              </div>
              <div className="meta">párrafos listos</div>
            </div>
          </div>
          {total ? (
            <>
              <div className="bar">
                {SEGS.map(([k, col]) => (
                  <span key={k} style={{ width: `${(count(k) / total) * 100}%`, background: col }} />
                ))}
              </div>
              <div className="legend">
                {SEGS.map(([k, col]) => (
                  <span key={k}>
                    <span className="dot" style={{ background: col }} /> {STATUS[k][1]} {count(k)}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="meta">Aún sin fuentes. Empieza vaciando tus tabs.</div>
          )}
          <div className="meta" style={{ marginTop: 16 }}>
            Atajos: <span className="kbd">N</span> nueva ficha · <span className="kbd">T</span> anotar pendiente/idea · <span className="kbd">Ctrl/⌘ + Enter</span> guardar · <span className="kbd">Esc</span> cerrar
          </div>
        </div>
      </div>
    </>
  )
}
