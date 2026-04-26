import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { CreatorProvider } from './context/CreatorContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <CreatorProvider>
        <App />
      </CreatorProvider>
    </HashRouter>
  </StrictMode>,
)
