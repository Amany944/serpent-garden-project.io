import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { createSnakeGame } from '../game/snakeGame.js'
import { apiSaveScore, apiStats } from '../lib/api.js'

/**
 * Page de jeu - portage fidele de `Serpent-Garden/game.html`
 * et de `Serpent-Garden/assets/js/game.js`.
 */
export default function GamePage() {
  const canvasRef = useRef(null)
  const boardFrameRef = useRef(null)
  const messageRef = useRef(null)
  const gameRef = useRef(null)
  const resizeObserverRef = useRef(null)

  const [status, setStatus] = useState({ score: 0, bestScore: 0, previousScore: 0 })
  const [pauseSync, setPauseSync] = useState({
    pauseHidden: true,
    resumeHidden: true,
    badgeHidden: true,
  })
  const [timeValue, setTimeValue] = useState('00:00:00')
  const [overlay, setOverlay] = useState(null)

  const saveScore = useCallback((score) => apiSaveScore(score), [])

  useEffect(() => {
    let active = true

    const setMessage = ({ text, html }) => {
      const node = messageRef.current
      if (!node || !active) {
        return
      }
      if (html !== undefined) {
        node.innerHTML = html
      } else {
        node.textContent = text
      }
    }

    const game = createSnakeGame({
      canvas: canvasRef.current,
      boardFrame: boardFrameRef.current,
      saveScore,
      callbacks: {
        onStats: (next) => {
          if (active) {
            setStatus(next)
          }
        },
        onMessage: setMessage,
        onOverlay: (patch) => {
          if (active) {
            setOverlay((current) => ({ ...current, ...patch }))
          }
        },
        onOverlayReset: () => {
          if (active) {
            setOverlay(null)
          }
        },
        onPauseSync: (next) => {
          if (active) {
            setPauseSync(next)
          }
        },
        onTime: (formatted) => {
          if (active) {
            setTimeValue(formatted)
          }
        },
      },
    })
    gameRef.current = game

    apiStats()
      .then((payload) => {
        if (!active) {
          return
        }
        const stats = payload.stats || {}
        game.initStats(stats.previous_score ?? 0, stats.best_score ?? 0)
        game.resize({ rerender: false })
        // Ne reinitialise pas si le joueur a deja lance une partie pendant
        // le chargement des stats (sinon la partie en cours serait perdue).
        if (!game.isStarted()) {
          game.reset()
        }
      })
      .catch(() => {
        if (!active) {
          return
        }
        game.initStats(0, 0)
        game.resize({ rerender: false })
        if (!game.isStarted()) {
          game.reset()
        }
      })

    const handleResize = () => {
      game.resize()
    }
    window.addEventListener('resize', handleResize)

    if (window.ResizeObserver && boardFrameRef.current) {
      const observer = new ResizeObserver(handleResize)
      observer.observe(boardFrameRef.current)
      resizeObserverRef.current = observer
    }

    const handleKeyDown = (event) => {
      const map = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
        w: 'up',
        s: 'down',
        a: 'left',
        d: 'right',
      }

      const name = map[event.key]
      if (name) {
        event.preventDefault()
        game.setDirection(name)
      }
    }
    document.addEventListener('keydown', handleKeyDown)

    const handleBeforeUnload = () => {
      game.dispose()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      active = false
      game.dispose()
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      resizeObserverRef.current?.disconnect()
      resizeObserverRef.current = null
      gameRef.current = null
    }
  }, [saveScore])

  return (
    <>
      <header className="game-topbar">
        <div className="game-brand">
          <p className="game-brand__kicker">Arcade en direct</p>
          <h1 className="game-brand__title">Serpent Garden</h1>
          <p className="game-brand__text">
            Mouvement rapide , interface claire, plein écran adapté pour écran Desktop.
          </p>
        </div>
        <div className="game-stats">
          <Link
            className="justify-center w-full back-link game-btn game-btn--back sm:w-auto sm:justify-start"
            to="/"
          >
            <i className="fa-solid fa-house"></i>
            <span>Retour accueil</span>
          </Link>
          <div className="justify-between w-full status-pill status-pill--compact sm:w-auto sm:justify-start">
            <span>Score</span>
            <strong>{status.score}</strong>
          </div>
          <div className="justify-between w-full status-pill status-pill--compact sm:w-auto sm:justify-start">
            <span>Meilleur</span>
            <strong>{status.bestScore}</strong>
          </div>
          <div className="justify-between w-full status-pill status-pill--compact sm:w-auto sm:justify-start">
            <span>Ancien</span>
            <strong>{status.previousScore}</strong>
          </div>
        </div>
      </header>

      <main className="h-full min-h-0 gap-3 game-layout md:gap-4">
      <section className="w-full p-2 board-shell sm:p-3 md:p-4">
        <div className="p-2 board-frame sm:p-2 md:p-3" ref={boardFrameRef}>
          <canvas
            ref={canvasRef}
            className="snake-canvas"
            width="128"
            height="640"
            aria-label="Zone de jeu"
          />
          <div className="pause-badge" hidden={pauseSync.badgeHidden}>
            Jeu en pause
          </div>
        </div>
        <div
          className="py-2 mt-2 text-sm game-message sm:text-base md:mt-3 md:py-3"
          ref={messageRef}
        >
          Clique sur <strong>Rejouer</strong> ou <strong>Nouveau jeux</strong> pour lancer la
          partie.
        </div>
        <div className="game-time-probe" aria-label="Temps de jeu">
          <button
            className="game-time-probe__button"
            type="button"
            aria-label="Afficher le temps de jeu"
            title="Afficher le temps de jeu"
            onClick={() => gameRef.current?.refreshTimeProbe()}
          ></button>
          <output className="game-time-probe__value">{timeValue}</output>
        </div>
      </section>

      <aside className="w-full control-stack" aria-label="Controle du serpent">
        <button
          className="w-full direction-button direction-button--up game-btn game-btn--arrow"
          type="button"
          aria-label="Monter"
          onClick={() => gameRef.current?.setDirection('up')}
        >
          <i className="fa-solid fa-arrow-up"></i>
        </button>
        <div className="w-full direction-row">
          <button
            className="direction-button game-btn game-btn--arrow"
            type="button"
            aria-label="Aller a gauche"
            onClick={() => gameRef.current?.setDirection('left')}
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <button
            className="direction-button game-btn game-btn--arrow"
            type="button"
            aria-label="Descendre"
            onClick={() => gameRef.current?.setDirection('down')}
          >
            <i className="fa-solid fa-arrow-down"></i>
          </button>
          <button
            className="direction-button game-btn game-btn--arrow"
            type="button"
            aria-label="Aller a droite"
            onClick={() => gameRef.current?.setDirection('right')}
          >
            <i className="fa-solid fa-arrow-right"></i>
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2 control-actions sm:gap-3">
          <button
            className="w-full text-sm sm:text-base menu-button menu-button--primary game-btn game-btn--primary game-btn--desktop-half"
            type="button"
            onClick={() => gameRef.current?.start()}
          >
            <i className=" fa-solid fa-rotate-right"></i>
            <span>Nouveau jeux</span>
          </button>
          <button
            className="w-full text-sm sm:text-base menu-button menu-button--primary game-btn game-btn--primary game-btn--desktop-half"
            type="button"
            hidden={pauseSync.pauseHidden}
            onClick={() => gameRef.current?.pause()}
          >
            <i className="fa-solid fa-pause"></i>
            <span>Mettre en pause</span>
          </button>
          <button
            className="w-full text-sm sm:text-base menu-button menu-button--primary game-btn game-btn--primary game-btn--desktop-half"
            type="button"
            hidden={pauseSync.resumeHidden}
            onClick={() => gameRef.current?.resume()}
          >
            <span>Reprendre la partie</span>
          </button>
        </div>
      </aside>

      {overlay?.visible && (
        <section className="score-overlay is-open" data-visible="true">
          <div
            className="score-panel score-panel--gameover w-full max-w-[760px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gameOverTitle"
          >
            <p className="score-kicker">Partie terminée</p>
            <h2 id="gameOverTitle">Partie terminée, cher gameur !.</h2>
            <p className="score-note">{overlay.reason}</p>
            <p className="score-note score-note--time">
              {overlay.recentText ?? 'Cette recente partie a dure 00 min 00 s.'}
            </p>
            <div className="score-meta score-meta--wide">
              <div>
                <span>Nouveau score</span>
                <strong>{status.score}</strong>
              </div>
              <div>
                <span>Ancien score</span>
                <strong>{status.previousScore}</strong>
              </div>
              <div>
                <span>Meilleur score</span>
                <strong>{status.bestScore}</strong>
              </div>
            </div>
            <p className="score-note score-note--highlight">{overlay.bestMessage ?? ''}</p>
            <div className="flex flex-col gap-3 score-actions sm:flex-row">
              <button
                className="w-full menu-button menu-button--primary game-btn game-btn--primary game-btn--desktop-half"
                type="button"
                onClick={() => gameRef.current?.start()}
              >
                <i className="fa-solid fa-play"></i>
                <span>Rejouer</span>
              </button>
              <Link
                className="w-full text-center menu-button game-btn game-btn--back"
                to="/"
              >
                <i className="fa-solid fa-house"></i>
                <span>Accueil</span>
              </Link>
            </div>
          </div>
        </section>
      )}
    </main>
    </>
  )
}
