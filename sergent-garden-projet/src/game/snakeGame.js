const GRID = 80
const BASE_TICK_MS = 180
const MIN_TICK_MS = 108
const APPLES_PER_SPEED_STEP = 10
const TICK_REDUCTION_PER_STEP = 12

const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

/**
 * Moteur de jeu Snake, independant du framework.
 * Portage fidele de `Serpent-Garden/assets/js/game.js` : la logique de jeu,
 * le rendu canvas et les constantes sont conserves a l'identique. Seules les
 * ecritures directes dans le DOM sont remplacees par des callbacks, ce qui
 * permet aux composants React de rester maitres de l'affichage.
 */
export function createSnakeGame({ canvas, boardFrame, saveScore, callbacks }) {
  const { onStats, onMessage, onOverlay, onOverlayReset, onPauseSync, onTime } = callbacks
  const ctx = canvas.getContext('2d')

  let CELL = canvas.width / GRID
  let BOARD_SIZE = canvas.width

  const STATE = {
    snake: [],
    direction: DIRECTIONS.right,
    nextDirection: DIRECTIONS.right,
    apple: { x: 0, y: 0 },
    score: 0,
    previousScore: 0,
    bestScore: 0,
    timer: null,
    currentTick: BASE_TICK_MS,
    timeStartedAt: 0,
    elapsedMs: 0,
    running: false,
    paused: false,
    gameOver: false,
    started: false,
  }

  function fillRoundRect(x, y, size, color, radius = 2) {
    ctx.fillStyle = color
    const px = x * CELL
    const py = y * CELL
    const s = size * CELL
    const r = Math.min(radius, s / 2)

    ctx.beginPath()
    ctx.moveTo(px + r, py)
    ctx.lineTo(px + s - r, py)
    ctx.quadraticCurveTo(px + s, py, px + s, py + r)
    ctx.lineTo(px + s, py + s - r)
    ctx.quadraticCurveTo(px + s, py + s, px + s - r, py + s)
    ctx.lineTo(px + r, py + s)
    ctx.quadraticCurveTo(px, py + s, px, py + s - r)
    ctx.lineTo(px, py + r)
    ctx.quadraticCurveTo(px, py, px + r, py)
    ctx.closePath()
    ctx.fill()
  }

  function opposite(a, b) {
    return a.x + b.x === 0 && a.y + b.y === 0
  }

  function cloneDirection(dir) {
    return { x: dir.x, y: dir.y }
  }

  function formatGameTime(totalMs) {
    const totalSeconds = Math.max(0, Math.floor(totalMs / 1000))
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
    const seconds = String(totalSeconds % 60).padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
  }

  function formatRecentGameDuration(totalMs) {
    const totalSeconds = Math.max(0, Math.floor(totalMs / 1000))
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${String(hours).padStart(2, '0')} h ${String(minutes).padStart(2, '0')} min ${String(seconds).padStart(2, '0')} s`
    }

    return `${String(minutes).padStart(2, '0')} min ${String(seconds).padStart(2, '0')} s`
  }

  function getElapsedGameMs() {
    if (!STATE.started) {
      return STATE.elapsedMs
    }

    if (STATE.timeStartedAt) {
      return STATE.elapsedMs + (Date.now() - STATE.timeStartedAt)
    }

    return STATE.elapsedMs
  }

  function updateTimeProbeDisplay() {
    onTime(formatGameTime(getElapsedGameMs()))
  }

  function startGameClock() {
    STATE.timeStartedAt = Date.now()
    updateTimeProbeDisplay()
  }

  function stopGameClock() {
    if (STATE.timeStartedAt) {
      STATE.elapsedMs += Date.now() - STATE.timeStartedAt
      STATE.timeStartedAt = 0
    }
    updateTimeProbeDisplay()
  }

  function resizeCanvas({ rerender = true } = {}) {
    if (!boardFrame) {
      return
    }

    const styles = window.getComputedStyle(boardFrame)
    const paddingX = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight)
    const paddingY = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom)
    const usableWidth = Math.max(1, Math.floor(boardFrame.clientWidth - paddingX))
    const usableHeight = Math.max(1, Math.floor(boardFrame.clientHeight - paddingY))
    const usableSize = Math.max(1, Math.floor(Math.min(usableWidth, usableHeight)))
    const dpr = window.devicePixelRatio || 1

    BOARD_SIZE = usableSize
    CELL = BOARD_SIZE / GRID

    canvas.style.width = `${BOARD_SIZE}px`
    canvas.style.height = `${BOARD_SIZE}px`
    canvas.width = Math.floor(BOARD_SIZE * dpr)
    canvas.height = Math.floor(BOARD_SIZE * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    if (rerender && STATE.snake.length) {
      render()
    }
  }

  function getTickMs(score) {
    const speedSteps = Math.floor(score / APPLES_PER_SPEED_STEP)
    return Math.max(MIN_TICK_MS, BASE_TICK_MS - speedSteps * TICK_REDUCTION_PER_STEP)
  }

  function syncSpeed() {
    if (!STATE.started || STATE.gameOver) {
      return
    }

    const desiredTick = getTickMs(STATE.score)

    if (STATE.currentTick === desiredTick) {
      return
    }

    clearInterval(STATE.timer)
    STATE.currentTick = desiredTick
    STATE.timer = setInterval(moveSnake, STATE.currentTick)
  }

  function startTimer() {
    clearInterval(STATE.timer)
    STATE.timer = setInterval(moveSnake, STATE.currentTick)
  }

  function stopTimer() {
    clearInterval(STATE.timer)
    STATE.timer = null
  }

  function syncPauseButtons() {
    onPauseSync({
      pauseHidden: !STATE.started || STATE.gameOver || STATE.paused,
      resumeHidden: !STATE.started || STATE.gameOver || !STATE.paused,
      badgeHidden: !STATE.paused,
    })
  }

  function chooseApplePosition() {
    const occupied = new Set(STATE.snake.map((part) => `${part.x}:${part.y}`))
    const freeCells = []

    for (let y = 0; y < GRID; y += 1) {
      for (let x = 0; x < GRID; x += 1) {
        if (!occupied.has(`${x}:${y}`)) {
          freeCells.push({ x, y })
        }
      }
    }

    if (!freeCells.length) {
      return {
        x: Math.floor(Math.random() * GRID),
        y: Math.floor(Math.random() * GRID),
      }
    }

    return freeCells[Math.floor(Math.random() * freeCells.length)]
  }

  function spawnApple() {
    STATE.apple = chooseApplePosition()
  }

  function initialSnake() {
    const length = 16
    const startX = Math.floor(GRID / 2) - Math.floor(length / 2)
    const startY = Math.floor(GRID / 2)
    const parts = []

    for (let i = 0; i < length; i += 1) {
      parts.push({ x: startX + (length - 1 - i), y: startY })
    }

    return parts
  }

  function updateStatus() {
    onStats({
      score: STATE.score,
      bestScore: STATE.bestScore,
      previousScore: STATE.previousScore,
    })
  }

  function drawBackground() {
    ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE)

    const gradient = ctx.createLinearGradient(0, 0, 0, BOARD_SIZE)
    gradient.addColorStop(0, '#06321a')
    gradient.addColorStop(1, '#02140a')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE)

    ctx.fillStyle = 'rgba(255,255,255,0.025)'
    for (let i = 0; i < GRID; i += 1) {
      if (i % 4 === 0) {
        ctx.fillRect(i * CELL, 0, 1, BOARD_SIZE)
        ctx.fillRect(0, i * CELL, BOARD_SIZE, 1)
      }
    }
  }

  function drawApple() {
    const x = STATE.apple.x * CELL
    const y = STATE.apple.y * CELL

    fillRoundRect(STATE.apple.x, STATE.apple.y, 1, '#67ff73', 2)
    ctx.fillStyle = '#0d5f25'
    ctx.fillRect(x + 3, y + 1, 2, 2)
  }

  function drawSnake() {
    const isGardenTheme = STATE.score > 0

    STATE.snake.forEach((part, index) => {
      if (index === 0) {
        const headColor = isGardenTheme ? '#ef4444' : '#fbbf24'
        fillRoundRect(part.x, part.y, 1, headColor, 2)

        const px = part.x * CELL
        const py = part.y * CELL
        ctx.fillStyle = '#111827'
        ctx.beginPath()
        ctx.arc(px + 2.5, py + 2.5, 0.7, 0, Math.PI * 2)
        ctx.arc(px + 5.5, py + 2.5, 0.7, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(px + 2.5, py + 5.5)
        ctx.lineTo(px + 4, py + 6.2)
        ctx.lineTo(px + 5.5, py + 5.5)
        ctx.strokeStyle = '#111827'
        ctx.lineWidth = 0.8
        ctx.stroke()
        return
      }

      const bodyColor = isGardenTheme ? '#103b22' : '#09090b'
      fillRoundRect(part.x, part.y, 1, bodyColor, 2)
    })
  }

  function render() {
    drawBackground()
    drawApple()
    drawSnake()
  }

  function endGame(reason) {
    if (STATE.gameOver || !STATE.started) {
      return
    }

    stopGameClock()
    const recentGameDuration = formatRecentGameDuration(getElapsedGameMs())
    STATE.gameOver = true
    STATE.running = false
    STATE.paused = false
    stopTimer()
    syncPauseButtons()
    onMessage({ text: reason })
    onOverlay({
      reason,
      recentText: `Cette recente partie a dure ${recentGameDuration}.`,
    })

    saveScore(STATE.score)
      .then((payload) => {
        const stats = payload.stats || {}
        STATE.previousScore = stats.previous_score ?? STATE.previousScore
        STATE.bestScore = stats.best_score ?? STATE.bestScore
        updateStatus()
        onOverlay({
          bestMessage: payload.is_new_record
            ? `🏆 Le plus grand score de ce jeu est : ${STATE.bestScore} 😄`
            : 'Continue a tenter de battre le record.',
        })
      })
      .catch((error) => {
        onOverlay({
          bestMessage: error?.message || 'Le score n a pas pu etre envoye au backend.',
        })
      })
      .finally(() => {
        onOverlay({ visible: true })
        render()
      })
  }

  function moveSnake() {
    if (STATE.gameOver || STATE.paused) {
      return
    }

    if (!STATE.running) {
      STATE.running = true
      onMessage({ text: 'La partie est lancee.' })
    }

    if (!opposite(STATE.nextDirection, STATE.direction)) {
      STATE.direction = cloneDirection(STATE.nextDirection)
    }

    const head = STATE.snake[0]
    const nextHead = {
      x: head.x + STATE.direction.x,
      y: head.y + STATE.direction.y,
    }

    if (nextHead.x < 0 || nextHead.y < 0 || nextHead.x >= GRID || nextHead.y >= GRID) {
      endGame(
        Math.random() > 0.5
          ? 'Votre partie se termine ici, cher gameur.'
          : 'Partie terminee, cher gameur.',
      )
      return
    }

    const willEatApple = nextHead.x === STATE.apple.x && nextHead.y === STATE.apple.y
    const bodyToCheck = willEatApple ? STATE.snake : STATE.snake.slice(0, -1)

    if (bodyToCheck.some((segment) => segment.x === nextHead.x && segment.y === nextHead.y)) {
      endGame('Partie terminee, cher gameur.')
      return
    }

    STATE.snake.unshift(nextHead)

    if (willEatApple) {
      STATE.score += 1
      spawnApple()
      if (STATE.score > STATE.bestScore) {
        STATE.bestScore = STATE.score
      }
      updateStatus()
      syncSpeed()
    } else {
      STATE.snake.pop()
    }

    render()
  }

  function setDirection(name) {
    const direction = DIRECTIONS[name]
    if (!direction) {
      return
    }

    if (STATE.direction.x === 0 && STATE.direction.y === 0) {
      STATE.direction = cloneDirection(direction)
      STATE.nextDirection = cloneDirection(direction)
      return
    }

    if (!opposite(direction, STATE.direction)) {
      STATE.nextDirection = cloneDirection(direction)
    }
  }

  function resetGame() {
    stopTimer()
    STATE.snake = initialSnake()
    STATE.direction = cloneDirection(DIRECTIONS.right)
    STATE.nextDirection = cloneDirection(DIRECTIONS.right)
    spawnApple()
    STATE.score = 0
    STATE.timeStartedAt = 0
    STATE.elapsedMs = 0
    STATE.running = false
    STATE.paused = false
    STATE.gameOver = false
    STATE.started = false
    STATE.currentTick = BASE_TICK_MS
    onOverlayReset()
    onMessage({
      html: 'Clique sur <strong>Rejouer</strong> ou <strong>Nouveau jeux</strong> pour lancer la partie.',
    })
    updateStatus()
    updateTimeProbeDisplay()
    syncPauseButtons()
    render()
  }

  function startGame() {
    resetGame()
    STATE.started = true
    STATE.running = true
    STATE.paused = false
    STATE.currentTick = getTickMs(STATE.score)
    startGameClock()
    startTimer()
    syncPauseButtons()
    onMessage({ html: 'La partie a commence. Observe le serpent se deplacer lentement.' })
  }

  function pauseGame() {
    if (!STATE.started || STATE.gameOver || STATE.paused) {
      return
    }

    stopGameClock()
    STATE.paused = true
    STATE.running = false
    stopTimer()
    syncPauseButtons()
    onMessage({ html: 'Jeu en pause. Clique sur <strong>Reprendre la partie</strong> pour continuer.' })
  }

  function resumeGame() {
    if (!STATE.started || STATE.gameOver || !STATE.paused) {
      return
    }

    STATE.paused = false
    STATE.running = true
    startGameClock()
    startTimer()
    syncPauseButtons()
    onMessage({ html: 'La partie reprend.' })
  }

  function initStats(previousScore, bestScore) {
    STATE.previousScore = previousScore
    STATE.bestScore = bestScore
    updateStatus()
  }

  function isStarted() {
    return STATE.started
  }

  function dispose() {
    stopTimer()
    if (STATE.timeStartedAt) {
      STATE.elapsedMs += Date.now() - STATE.timeStartedAt
      STATE.timeStartedAt = 0
    }
  }

  return {
    start: startGame,
    pause: pauseGame,
    resume: resumeGame,
    reset: resetGame,
    setDirection,
    resize: resizeCanvas,
    refreshTimeProbe: updateTimeProbeDisplay,
    initStats,
    isStarted,
    dispose,
  }
}
