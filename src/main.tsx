import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { repo } from './data/repository'
import './index.css'

// Garantiza que existan los ajustes iniciales antes de mostrar la interfaz.
repo
  .getSettings()
  .catch((error) => console.error('No se pudo iniciar el almacenamiento local de Hilo', error))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </StrictMode>,
    )
  })
