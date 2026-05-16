import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const savedTheme = localStorage.getItem('theme')
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
const theme =
  savedTheme === 'light' || savedTheme === 'dark'
    ? savedTheme
    : prefersDark
      ? 'dark'
      : 'light'
document.documentElement.setAttribute('data-theme', theme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
