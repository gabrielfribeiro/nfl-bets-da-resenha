import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function formatTrackTitle(filename) {
  const nameWithoutExt = filename.replace(/\.(mp3|wav|ogg|m4a)$/i, '')
  return nameWithoutExt
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getTrackEmoji(name) {
  const lower = name.toLowerCase()
  if (lower.includes('rock') || lower.includes('guitar')) return '🎸'
  if (lower.includes('pagode') || lower.includes('samba')) return '🪕'
  if (lower.includes('piseiro') || lower.includes('forro')) return '🎹'
  if (lower.includes('funk')) return '🔊'
  if (lower.includes('nfl')) return '🏈'
  return '🎵'
}

function audioScannerPlugin() {
  const audioDir = path.resolve(__dirname, 'public/audio')

  function scanAndWritePlaylist() {
    try {
      if (!fs.existsSync(audioDir)) {
        fs.mkdirSync(audioDir, { recursive: true })
      }
      const files = fs
        .readdirSync(audioDir)
        .filter((f) => /\.(mp3|wav|ogg|m4a)$/i.test(f))
        .sort((a, b) => a.localeCompare(b))

      const playlist = files.map((file, idx) => {
        const title = formatTrackTitle(file)
        return {
          id: `track-${idx}-${file.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          filename: file,
          title,
          emoji: getTrackEmoji(title),
          src: `/audio/${encodeURIComponent(file)}`,
        }
      })

      const manifestPath = path.join(audioDir, 'playlist.json')
      fs.writeFileSync(manifestPath, JSON.stringify(playlist, null, 2), 'utf-8')
      return playlist
    } catch (err) {
      console.error('[AudioScannerPlugin] Erro ao escanear pasta public/audio:', err)
      return []
    }
  }

  return {
    name: 'vite-audio-scanner',
    buildStart() {
      scanAndWritePlaylist()
    },
    configureServer(server) {
      // Gera na inicialização
      scanAndWritePlaylist()

      // Endpoint dinâmico que sempre re-escaneia ao ser consultado
      server.middlewares.use('/api/playlist', (req, res) => {
        const playlist = scanAndWritePlaylist()
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-cache')
        res.end(JSON.stringify(playlist))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), audioScannerPlugin()],
  base: './',
})
