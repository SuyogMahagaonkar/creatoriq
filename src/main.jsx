import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { CreatorProvider } from './context/CreatorContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename="/creatoriq">
      <CreatorProvider>
        <App />
      </CreatorProvider>
    </BrowserRouter>
  </StrictMode>,
)
