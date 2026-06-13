import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'

// Placeholder until the auth layer + screens land (next steps).
function Placeholder() {
  return (
    <div style={{ fontFamily: 'system-ui', padding: '2rem' }}>
      <h1>TennisOS</h1>
      <p>Scaffold is up. Auth, screens, and theming come next.</p>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Placeholder />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
