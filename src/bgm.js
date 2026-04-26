// ── BGM Player ──
// src/assets/bgm/ 폴더에 mp3 파일을 넣으면 자동으로 플레이리스트에 추가됩니다.

const _srcs = import.meta.glob('./assets/bgm/*.ogg', { eager: true, import: 'default' })

export const playlist = []

// Order doesn't strictly matter, but typically we want to play them randomly or sequentially
Object.entries(_srcs).forEach(([path, src]) => {
  const raw  = path.match(/([^/]+)\.ogg$/)?.[1] || path
  // snake_case / kebab-case → 보기 좋게 변환
  const name = raw.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  playlist.push({ id: raw, name, src, enabled: true, audio: null })
})

// localStorage에서 순서/활성화 상태 복원
try {
  const saved = JSON.parse(localStorage.getItem('bgm_playlist') || '[]')
  if (saved.length > 0) {
    // 순서 복원
    saved.forEach((sv, si) => {
      const idx = playlist.findIndex(t => t.id === sv.id)
      if (idx !== -1) {
        playlist[idx].enabled = sv.enabled
        // 저장된 순서로 재정렬
        const [item] = playlist.splice(idx, 1)
        playlist.splice(si, 0, item)
      }
    })
  }
} catch {}

let _currentIdx = 0
let _volume     = parseFloat(localStorage.getItem('bgm_volume') || '0.5')
let _started    = false

function _getEnabled() {
  return playlist.filter(t => t.enabled)
}

function _stopAll() {
  playlist.forEach(t => {
    if (t.audio) { t.audio.pause(); t.audio.currentTime = 0 }
  })
}

function _playIdx(enabledIdx) {
  const enabled = _getEnabled()
  if (enabled.length === 0) return
  _currentIdx = ((enabledIdx % enabled.length) + enabled.length) % enabled.length
  const track  = enabled[_currentIdx]

  _stopAll()

  if (!track.audio) {
    track.audio        = new Audio(track.src)
    track.audio.volume = _volume
    track.audio.onended = () => next()
  }
  track.audio.currentTime = 0
  track.audio.volume      = _volume
  track.audio.play().catch(() => {})
}

export function start() {
  if (_started || _getEnabled().length === 0) return
  _started = true
  _playIdx(0)
}

export function next() {
  _playIdx(_currentIdx + 1)
}

export function prev() {
  _playIdx(_currentIdx - 1)
}

export function setVolume(v) {
  _volume = Math.max(0, Math.min(1, v))
  localStorage.setItem('bgm_volume', _volume)
  playlist.forEach(t => { if (t.audio) t.audio.volume = _volume })
}

export function getVolume() { return _volume }

export function getCurrentName() {
  const enabled = _getEnabled()
  if (enabled.length === 0) return '—'
  return enabled[_currentIdx % enabled.length]?.name || '—'
}

export function setTrackEnabled(id, val) {
  const t = playlist.find(t => t.id === id)
  if (!t) return
  t.enabled = val
  if (!val && t.audio && !t.audio.paused) next()
  savePersist()
}

export function moveTrack(fromIdx, toIdx) {
  if (fromIdx === toIdx) return
  const [item] = playlist.splice(fromIdx, 1)
  playlist.splice(toIdx, 0, item)
  savePersist()
}

export function savePersist() {
  localStorage.setItem('bgm_playlist', JSON.stringify(
    playlist.map(t => ({ id: t.id, enabled: t.enabled }))
  ))
}
