import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './screens/screens.css'
import './sim/sim.css'
import './focus.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Dev-only handles for inspecting state from the browser console.
if (import.meta.env.DEV) {
  void Promise.all([import('./store/project'), import('./store/ui'), import('./sim/session')]).then(([pr, ui, se]) => {
    Object.assign(window, { __project: pr.useProject, __ui: ui.useUI, __session: se.useSession })
  })
}
