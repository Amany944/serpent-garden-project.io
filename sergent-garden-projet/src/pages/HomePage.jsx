import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { apiStats } from '../lib/api.js'

const MODE_TITLES = {
  previous: 'Ancien score',
  latest: 'Nouveau score',
  best: 'Meilleur score',
}

/**
 * Page d'accueil - portage fidele de `Serpent-Garden/index.html`
 * et de `Serpent-Garden/assets/js/home.js`.
 */
export default function HomePage() {
  const overlayRef = useRef(null)
  const rootRef = useRef(null)

  useEffect(() => {
    let active = true

    const openOverlay = () => {
      overlayRef.current?.classList.add('is-open')
      overlayRef.current?.setAttribute('aria-hidden', 'false')
    }

    const closeOverlayPanel = () => {
      overlayRef.current?.classList.remove('is-open')
      overlayRef.current?.setAttribute('aria-hidden', 'true')
    }

    const renderRecent = (listNode, list) => {
      listNode.innerHTML = ''

      if (!list.length) {
        const item = document.createElement('li')
        item.textContent = 'Aucun score recent pour le moment.'
        listNode.appendChild(item)
        return
      }

      list.forEach((entry) => {
        const item = document.createElement('li')
        const date = document.createElement('span')
        date.textContent = entry.created_at
        const score = document.createElement('strong')
        score.textContent = entry.score
        item.append(date, score)
        listNode.appendChild(item)
      })
    }

    const refreshStats = async (mode) => {
      const overlay = overlayRef.current
      if (!overlay || !active) {
        return
      }

      const titleNode = overlay.querySelector('[data-score-title]')
      const valueNode = overlay.querySelector('[data-score-value]')
      const noteNode = overlay.querySelector('[data-score-note]')
      const metaNodes = {
        previous: overlay.querySelector('[data-meta-previous]'),
        latest: overlay.querySelector('[data-meta-latest]'),
        best: overlay.querySelector('[data-meta-best]'),
      }
      const recentNode = overlay.querySelector('[data-recent-scores]')

      titleNode.textContent = MODE_TITLES[mode]

      try {
        const payload = await apiStats()
        if (!active) {
          return
        }
        const stats = payload.stats || {}
        const valueByMode = {
          previous: stats.previous_score ?? 0,
          latest: stats.last_score ?? 0,
          best: stats.best_score ?? 0,
        }

        valueNode.textContent = valueByMode[mode]
        noteNode.textContent =
          mode === 'best'
            ? 'Le record est conserve en base de donnees et recupere a chaque visite.'
            : 'Le score est lu directement depuis la base de donnees SQLite.'
        metaNodes.previous.textContent = stats.previous_score ?? 0
        metaNodes.latest.textContent = stats.last_score ?? 0
        metaNodes.best.textContent = stats.best_score ?? 0
        renderRecent(recentNode, payload.recent_scores || [])
      } catch (error) {
        if (!active) {
          return
        }
        valueNode.textContent = 'N/A'
        noteNode.textContent =
          error?.message || 'Impossible de joindre le backend PHP pour le moment.'
        recentNode.innerHTML = '<li>Le service de score est indisponible.</li>'
      }

      openOverlay()
    }

    const handleModeClick = (event) => {
      const button = event.target.closest('[data-score-mode]')
      if (button) {
        refreshStats(button.dataset.scoreMode)
      }
    }

    const handleCloseClick = (event) => {
      if (event.target.closest('[data-score-close]')) {
        closeOverlayPanel()
      }
    }

    const handleOverlayClick = (event) => {
      if (event.target === overlayRef.current) {
        closeOverlayPanel()
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeOverlayPanel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    const root = rootRef.current
    root?.addEventListener('click', handleModeClick)
    root?.addEventListener('click', handleCloseClick)
    const overlay = overlayRef.current
    overlay?.addEventListener('click', handleOverlayClick)

    return () => {
      active = false
      document.removeEventListener('keydown', handleKeyDown)
      root?.removeEventListener('click', handleModeClick)
      root?.removeEventListener('click', handleCloseClick)
      overlay?.removeEventListener('click', handleOverlayClick)
    }
  }, [])

  return (
    <main
      className="home-layout grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6"
      ref={rootRef}
    >
      <section className="hero-card p-5 sm:p-6 md:p-8">
        <div className="hero-copy">
          <p className="eyebrow">Arcade HTML / JS / PHP</p>
          <h1>Serpent Garden</h1>
          <p className="hero-text">
            Dirige le serpent, mange les pommes vertes, evite les bords et garde ton meilleur score
            en memoire.
          </p>
        </div>

        <div className="snake-preview w-full" aria-hidden="true">
          <div className="snake-preview__body snake-preview__body--tail"></div>
          <div className="snake-preview__body snake-preview__body--tail"></div>
          <div className="snake-preview__body snake-preview__body--tail"></div>
          <div className="snake-preview__body snake-preview__body--tail"></div>
          <div className="snake-preview__body snake-preview__body--body"></div>
          <div className="snake-preview__head">
            <span className="eye eye--left"></span>
            <span className="eye eye--right"></span>
            <span className="mouth"></span>
          </div>
        </div>
      </section>

      <section className="menu-card p-5 sm:p-6 md:p-8">
        <h2 className="section-title">Menu principal</h2>
        <div className="menu-stack">
          <Link className="menu-button menu-button--primary w-full text-center" to="/jeu">
            Nouveau Jeux
          </Link>
          <button className="menu-button w-full" data-score-mode="previous" type="button">
            <span className="menu-button__text">
              <span className="menu-button__label">Ancien score</span>
              <span className="menu-button__hint">ta dernière partie</span>
            </span>
          </button>
          <button className="menu-button w-full" data-score-mode="latest" type="button">
            <span className="menu-button__text">
              <span className="menu-button__label">Nouveau score</span>
              <span className="menu-button__hint">dernier enregistrement</span>
            </span>
          </button>
          <button className="menu-button w-full" data-score-mode="best" type="button">
            <span className="menu-button__text">
              <span className="menu-button__label">Meilleur score</span>
              <span className="menu-button__hint">record en base</span>
            </span>
          </button>
        </div>

        <div className="menu-footer">
          <Link className="help-link" to="/aide">
            Aide / documentation
          </Link>
        </div>
      </section>

      <section className="score-overlay" ref={overlayRef} aria-hidden="true">
        <div
          className="score-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="scoreTitle"
        >
          <button
            className="score-close"
            data-score-close
            type="button"
            aria-label="Fermer"
          >
            &times;
          </button>
          <p className="score-kicker">Zone de score</p>
          <h2 id="scoreTitle" data-score-title>
            Score
          </h2>
          <p className="score-value" data-score-value>
            0
          </p>
          <p className="score-note" data-score-note>
            Aucune partie n&apos;a encore ete enregistree.
          </p>

          <div className="score-meta">
            <div>
              <span>Ancien score</span>
              <strong data-meta-previous>0</strong>
            </div>
            <div>
              <span>Nouveau score</span>
              <strong data-meta-latest>0</strong>
            </div>
            <div>
              <span>Meilleur score</span>
              <strong data-meta-best>0</strong>
            </div>
          </div>

          <div className="recent-box">
            <h3>Scores recents</h3>
            <ul data-recent-scores className="recent-list"></ul>
          </div>
        </div>
      </section>
    </main>
  )
}
