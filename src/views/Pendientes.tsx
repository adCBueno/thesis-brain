import { useState } from 'react'
import { Empty, Head, Seg, usePersisted } from '../components/common'
import { rich, t, tp } from '../lib/i18n'
import { update, useAppState } from '../lib/store'
import { cite, isoDate, relDay, sourceById, todoSort, uid } from '../lib/utils'
import type { Todo, TodoKind } from '../types'
import { useUI } from '../ui'

type Filter = 'all' | TodoKind

export function toggleTodo(id: string) {
  update((d) => {
    const item = d.todos.find((x) => x.id === id)
    if (!item) return
    item.done = !item.done
    item.doneAt = item.done ? Date.now() : undefined
    return item.done ? `✓ ${item.text.slice(0, 70)}` : null
  })
}

const short = (s: string) => `${s.slice(0, 60)}${s.length > 60 ? '…' : ''}`
export const todoLogText = (kind: TodoKind, text: string) => (kind === 'idea' ? t('💡 Idea: “{text}”', { text: short(text) }) : t('✅ Pendiente: “{text}”', { text: short(text) }))

export function TodoRow({ t: todo }: { t: Todo }) {
  const s = useAppState()
  const { open } = useUI()
  const today = isoDate()
  const src = sourceById(s, todo.sourceId)
  const si = s.outline.findIndex((x) => x.id === todo.sectionId)
  const overdue = !todo.done && todo.due && todo.due < today
  return (
    <div className={'todo-row' + (todo.done ? ' done' : '')}>
      <input
        type="checkbox"
        className="todo-check"
        checked={todo.done}
        onChange={() => toggleTodo(todo.id)}
        title={todo.done ? t('Marcar como pendiente') : t('Marcar como hecho')}
      />
      <div className="todo-body" onClick={() => open({ kind: 'todo', id: todo.id })}>
        <div className="todo-text">
          {todo.kind === 'idea' && '💡 '}
          {todo.text}
        </div>
        {(todo.due || src || si >= 0) && (
          <div className="meta">
            {todo.due && <span className={overdue ? 'overdue' : todo.due === today && !todo.done ? 'due-today' : ''}>📅 {relDay(todo.due)}</span>}
            {src && <span> · 📄 {cite(src)}</span>}
            {si >= 0 && (
              <span>
                {' '}
                · ✍️ §{si + 1} {s.outline[si].title}
              </span>
            )}
          </div>
        )}
      </div>
      {!todo.done && (
        <div className="todo-actions">
          {todo.kind === 'idea' && (
            <>
              <button className="btn sm ghost" title={t('Convertir en ficha')} onClick={() => open({ kind: 'note', text: todo.text, sourceId: todo.sourceId || undefined, fromTodo: todo.id })}>
                {t('→ Ficha')}
              </button>
              <button className="btn sm ghost" title={t('Convertir en pendiente')} onClick={() => update((d) => void (d.todos.find((x) => x.id === todo.id)!.kind = 'todo'))}>
                {t('→ Pendiente')}
              </button>
            </>
          )}
          <button
            className={'btn sm ghost star' + (todo.important ? ' on' : '')}
            title={todo.important ? t('Quitar importante') : t('Marcar como importante')}
            onClick={() => update((d) => void (d.todos.find((x) => x.id === todo.id)!.important = !todo.important))}
          >
            {todo.important ? '⭐' : '☆'}
          </button>
        </div>
      )}
    </div>
  )
}

export function Pendientes() {
  const s = useAppState()
  const [filter, setFilter] = usePersisted<Filter>('tb-todo-filter', 'all')
  const [kind, setKind] = usePersisted<TodoKind>('tb-todo-kind', 'todo')
  const [text, setText] = useState('')
  const [showDone, setShowDone] = useState(false)

  const add = () => {
    const value = text.trim()
    if (!value) return
    update(
      (d) => void d.todos.push({ id: uid(), text: value, kind, done: false, important: false, due: '', sourceId: '', sectionId: '', created: Date.now() }),
      todoLogText(kind, value),
    )
    setText('')
  }

  const list = s.todos.filter((x) => filter === 'all' || x.kind === filter).sort(todoSort)
  const openItems = list.filter((x) => !x.done)
  const done = list.filter((x) => x.done)
  const countOpen = (k?: TodoKind) => s.todos.filter((x) => !x.done && (!k || x.kind === k)).length

  return (
    <>
      <Head title={t('Pendientes')} sub={t('Anota ideas y pendientes al vuelo, sin salir de lo que estás haciendo. Desde cualquier vista: tecla T.')} />
      <div className="card capture">
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          <div style={{ flex: '0 0 auto' }}>
            <Seg<TodoKind>
              options={[
                ['todo', t('✅ Pendiente')],
                ['idea', t('💡 Idea')],
              ]}
              value={kind}
              onChange={setKind}
            />
          </div>
          <input
            className="capture-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
            placeholder={kind === 'idea' ? t('Se me ocurrió que… (Enter para guardar)') : t('Tengo que… (Enter para guardar)')}
            style={{ flex: '1 1 300px' }}
          />
          <button className="btn primary" style={{ flex: '0 0 auto' }} onClick={add} disabled={!text.trim()}>
            {t('Añadir')}
          </button>
        </div>
      </div>

      <div className="toolbar" style={{ marginTop: 16 }}>
        <Seg<Filter>
          options={[
            ['all', t('Todo ({n})', { n: countOpen() })],
            ['todo', t('✅ Pendientes ({n})', { n: countOpen('todo') })],
            ['idea', t('💡 Ideas ({n})', { n: countOpen('idea') })],
          ]}
          value={filter}
          onChange={setFilter}
        />
      </div>

      {!s.todos.length ? (
        <Empty icon="📝">
          {rich('<b>Tu libreta de bolsillo.</b> ¿Se te ocurrió algo mientras leías o escribías? Anótalo aquí y sigue, sin perder el hilo.')}
          <br />
          {t('Las ideas después se convierten en fichas con un clic.')}
        </Empty>
      ) : (
        <>
          {openItems.length ? (
            <div className="todo-list">
              {openItems.map((x) => (
                <TodoRow key={x.id} t={x} />
              ))}
            </div>
          ) : (
            <div className="meta" style={{ padding: '10px 2px' }}>
              {t('Nada pendiente por aquí. 🎉')}
            </div>
          )}
          {done.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div className="row">
                <button className="btn sm ghost" style={{ flex: '0 0 auto' }} onClick={() => setShowDone(!showDone)}>
                  {showDone ? '▾' : '▸'} {t('Hechos ({n})', { n: done.length })}
                </button>
                {showDone && (
                  <button
                    className="btn sm ghost danger"
                    style={{ flex: '0 0 auto', marginLeft: 'auto' }}
                    onClick={() =>
                      update(
                        (d) => void (d.todos = d.todos.filter((x) => !(x.done && (filter === 'all' || x.kind === filter)))),
                        tp(done.length, 'Limpiaste {n} hecho', 'Limpiaste {n} hechos'),
                      )
                    }
                  >
                    {t('Borrar hechos')}
                  </button>
                )}
              </div>
              {showDone && (
                <div className="todo-list" style={{ marginTop: 6 }}>
                  {done.map((x) => (
                    <TodoRow key={x.id} t={x} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  )
}
