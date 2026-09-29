import { useEffect } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import GamePage from './pages/GamePage.jsx'
import HelpPage from './pages/HelpPage.jsx'
import HomePage from './pages/HomePage.jsx'
import './styles/tailwind.css'
import './styles/style.css'
import './styles/home-enhancements.css'
import './styles/game-enhancements.css'

// L'original positionnait les classes de mise en page sur <body> page par page
// (index.html, game.html, help.html). On reproduit ce comportement par route.
const BODY_CLASSES = {
  '/': 'page-shell',
  '/jeu': 'page-shell page-shell--game',
  '/aide': 'page-shell page-shell--help',
}

function BodyClassSync() {
  const { pathname } = useLocation()

  useEffect(() => {
    document.body.className = BODY_CLASSES[pathname] ?? 'page-shell'
  }, [pathname])

  return null
}

export default function App() {
  return (
    <HashRouter>
      <BodyClassSync />
      <Routes>
        <Route element={<HomePage />} path="/" />
        <Route element={<GamePage />} path="/jeu" />
        <Route element={<HelpPage />} path="/aide" />
        <Route element={<HomePage />} path="*" />
      </Routes>
    </HashRouter>
  )
}
