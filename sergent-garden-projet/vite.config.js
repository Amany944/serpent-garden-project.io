import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
const REPO_NAME = 'serpent-garden-project.io'

export default defineConfig(({ mode }) => ({
  // GitHub Pages sert le site depuis un sous-chemin :
  // https://<utilisateur>.github.io/serpent-garden-project.io/
  base: mode === 'production' ? `/${REPO_NAME}/` : '/',
  plugins: [react()],
  server: {
    proxy: {
      // Relaye les appels a l'API PHP vers le serveur PHP local (`npm run api`),
      // qui sert le dossier api/ comme racine.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
}))
