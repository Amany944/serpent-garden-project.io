import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const HELP_ICONS = {
  1: 'fa-solid fa-bullseye',
  2: 'fa-solid fa-border-all',
  3: 'fa-solid fa-gamepad',
  4: 'fa-solid fa-trophy',
  5: 'fa-solid fa-chart-line',
  6: 'fa-solid fa-lightbulb',
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderHelpText(text) {
  const lines = text.split(/\r?\n/)
  const parts = []
  let listBuffer = []
  let asciiBuffer = []

  function flushList() {
    if (!listBuffer.length) {
      return
    }
    parts.push('<ul class="help-list">' + listBuffer.join('') + '</ul>')
    listBuffer = []
  }

  function flushAscii() {
    if (!asciiBuffer.length) {
      return
    }
    parts.push('<pre class="help-ascii">' + escapeHtml(asciiBuffer.join('\n')) + '</pre>')
    asciiBuffer = []
  }

  lines.forEach((line) => {
    const trimmed = line.trim()
    const sectionMatch = trimmed.match(/^(\d+)\.\s+(.+)$/)
    const listMatch = trimmed.match(/^-+\s+(.+)$/)
    const isAsciiLine = /^[|+\- ]+$/.test(line) && trimmed.length > 0

    if (sectionMatch) {
      flushList()
      flushAscii()
      const number = Number(sectionMatch[1])
      const iconClass = HELP_ICONS[number] || 'fa-solid fa-book-open'
      parts.push(
        '<section class="help-section">' +
          '<h2 class="help-section__title">' +
            '<span class="help-section__icon" aria-hidden="true"><i class="' + iconClass + '"></i></span>' +
            '<span>' + escapeHtml(sectionMatch[1] + '. ' + sectionMatch[2]) + '</span>' +
          '</h2>' +
        '</section>',
      )
      return
    }

    if (isAsciiLine) {
      flushList()
      asciiBuffer.push(line)
      return
    }

    flushAscii()

    if (!trimmed) {
      flushList()
      return
    }

    if (listMatch) {
      listBuffer.push('<li>' + escapeHtml(listMatch[1]) + '</li>')
      return
    }

    parts.push('<p>' + escapeHtml(trimmed) + '</p>')
  })

  flushList()
  flushAscii()

  return parts.join('')
}

/**
 * Page d'aide - portage fidele de `Serpent-Garden/help.html`
 * (rendu du guide depuis help.txt conservé a l'identique).
 */
export default function HelpPage() {
  const contentRef = useRef(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    fetch('help.txt')
      .then((response) => response.text())
      .then((text) => {
        if (active && contentRef.current) {
          contentRef.current.innerHTML = renderHelpText(text)
        }
      })
      .catch(() => {
        if (active) {
          setError(true)
        }
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <>
      <main className="help-layout">
        <section className="help-card">
          <p className="eyebrow">Documentation</p>
          <h1>Comment jouer</h1>
          <section className="help-visual" aria-labelledby="helpVisualTitle">
            <div className="help-visual__header">
              <h2 id="helpVisualTitle" className="section-title">
                Illustration du terrain
              </h2>
              <p className="help-visual__intro">
                Voici une vue simple pour comprendre la zone de jeu, le serpent et la pomme.
              </p>
            </div>
            <div className="help-board-demo" aria-label="Illustration du terrain de jeu">
              <div className="help-board-demo__outside help-board-demo__outside--top" aria-hidden="true"></div>
              <div className="help-board-demo__middle">
                <div className="help-board-demo__outside help-board-demo__outside--side" aria-hidden="true"></div>
                <div className="help-board-demo__playfield">
                  <span className="help-board-demo__label help-board-demo__label--top">
                    Terrain vert : zone jouable
                  </span>
                  <div className="help-board-demo__snake" aria-hidden="true">
                    <span className="help-board-demo__segment"></span>
                    <span className="help-board-demo__segment"></span>
                    <span className="help-board-demo__segment"></span>
                    <span className="help-board-demo__head"></span>
                  </div>
                  <span className="help-board-demo__snake-note">Serpent</span>
                  <span className="help-board-demo__apple" aria-hidden="true"></span>
                  <span className="help-board-demo__apple-note">Pomme a manger</span>
                </div>
                <div className="help-board-demo__outside help-board-demo__outside--side" aria-hidden="true"></div>
              </div>
              <div className="help-board-demo__outside help-board-demo__outside--bottom">
                Si le serpent touche le bord, la partie s&apos;arrete.
              </div>
            </div>
            <div className="help-legend" aria-label="Legende de l illustration">
              <div>
                <span className="help-legend__swatch help-legend__swatch--safe"></span> Zone verte :
                tu peux circuler
              </div>
              <div>
                <span className="help-legend__swatch help-legend__swatch--danger"></span> Bord /
                zone grise : collision = fin
              </div>
              <div>
                <span className="help-legend__swatch help-legend__swatch--apple"></span> Pomme :
                donne des points et allonge le serpent
              </div>
            </div>
          </section>
          <div ref={contentRef} className="help-content">
            {error
              ? 'Le fichier help.txt est indisponible pour le moment.'
              : 'Chargement du guide...'}
          </div>
          <Link className="menu-button menu-button--primary help-back" to="/">
            Retour accueil
          </Link>
        </section>
      </main>

      <footer className="help-footer">
        @2026 Christ Amany MBOUNGOU | tous droits réservés 06 722 1312 .
      </footer>
    </>
  )
}
