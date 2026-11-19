import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { useLang } from './lib/i18n'
import { replaceState, setOnChange } from './lib/store'
import { loadInitial, scheduleSave } from './lib/storage'
import { initTimer } from './lib/timer'
import './styles.css'

// Re-mount the whole UI when the language changes, so every text is re-rendered.
function Root() {
  const lang = useLang()
  return <App key={lang} />
}

loadInitial().then((state) => {
  replaceState(state, false)
  setOnChange(scheduleSave)
  initTimer()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Root />
    </StrictMode>,
  )
})
