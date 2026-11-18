import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { replaceState, setOnChange } from './lib/store'
import { loadInitial, scheduleSave } from './lib/storage'
import { initTimer } from './lib/timer'
import './styles.css'

loadInitial().then((state) => {
  replaceState(state, false)
  setOnChange(scheduleSave)
  initTimer()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
