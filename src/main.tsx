import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { SuburbsIndex } from './pages/SuburbsIndex.tsx'
import { SuburbPage } from './pages/SuburbPage.tsx'
import { Calculators } from './pages/Calculators.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/suburbs" element={<SuburbsIndex />} />
        <Route path="/suburbs/:slug" element={<SuburbPage />} />
        <Route path="/calculators" element={<Calculators />} />
        <Route path="/calculators/:slug" element={<Calculators />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
