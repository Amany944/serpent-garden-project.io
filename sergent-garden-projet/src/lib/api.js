const API_BASE = 'api/score.php'

function ensureLocalServer() {
  if (window.location.protocol === 'file:') {
    throw new Error('Ouvre le projet via un serveur local, par exemple http://localhost/serpent-garden/.')
  }
}

async function apiGet(path) {
  ensureLocalServer()
  const response = await fetch(path, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return response.json()
}

async function apiPost(path, data) {
  ensureLocalServer()
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return response.json()
}

export async function apiStats() {
  return apiGet(`${API_BASE}?action=stats`)
}

export async function apiSaveScore(score) {
  return apiPost(API_BASE, { score })
}
