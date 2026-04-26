import { persist, run, resetRun, addXP } from './state.js'
import * as BGM from './bgm.js'
import { Tree, pickTreeType } from './tree.js'
import { drawCards, applyCard, CARD_POOL } from './cards.js'
import { checkAchievements, renderAchievements } from './achievements.js'
import { renderSkillTree, SKILL_NODES } from './skilltree.js'
import lumberjackSrc from './assets/lumberjack.webp'
import robotSrc      from './assets/robot.webp'

// ── Background images — auto-import all bg_*.webp in assets ──
// Adding a new bg_xxx.webp file will be picked up automatically (no code change needed).
const _bgImages = {}
const _bgSrcs = import.meta.glob('./assets/bg_*.webp', { eager: true, import: 'default' })

Object.entries(_bgSrcs).forEach(([path, src]) => {
  const m = path.match(/bg_(\w+)\.webp$/)
  if (!m) return
  const key = m[1]   // e.g. 'basic', 'golden', 'frozen', …
  const img = new Image()
  img.onload = () => { _bgImages[key] = img }
  img.src = src
})

// ── Sound system — pooled Audio so rapid hits never cut off ──
let _sfxVolume = parseFloat(localStorage.getItem('sfx_volume') ?? '0.5')

function _makePool(src, baseVol, size) {
  return {
    pool: Array.from({ length: size }, () => { const a = new Audio(src); a.volume = baseVol * _sfxVolume; return a }),
    baseVol,
    idx: 0,
    play() {
      const a = this.pool[this.idx++ % this.pool.length]
      a.volume = this.baseVol * _sfxVolume
      a.currentTime = 0
      a.play().catch(() => {})
    }
  }
}
const sfxCollect = _makePool(collectSoundSrc, 0.55, 6)
const sfxChop    = _makePool(chopSoundSrc,    0.45, 4)

function playSfxCollect() { sfxCollect.play() }
function playSfxChop()    { sfxChop.play() }

export function setSfxVolume(v) {
  _sfxVolume = Math.max(0, Math.min(1, v))
  localStorage.setItem('sfx_volume', _sfxVolume)
}
export function getSfxVolume() { return _sfxVolume }

// ── Canvas ──
const canvas = document.getElementById('game-canvas')
const ctx = canvas.getContext('2d')

const GAME_RATIO = 16 / 9   // fixed landscape aspect ratio

// HUD 스케일 팩터 — 캔버스 크기 기준으로 모든 HUD 요소 비례 조정
// 기준 해상도: 480×270 (16:9 최소)
let HUD_SCALE = 1

function resizeCanvas() {
  const wrap = document.getElementById('game-wrap')
  const aw = wrap.clientWidth  || window.innerWidth
  const ah = wrap.clientHeight || window.innerHeight

  // Fit inside available area maintaining 16:9, black bars fill the rest
  let gw, gh
  if (aw / ah >= GAME_RATIO) {
    gh = ah; gw = Math.floor(gh * GAME_RATIO)
  } else {
    gw = aw; gh = Math.floor(gw / GAME_RATIO)
  }

  canvas.width  = gw
  canvas.height = gh
  canvas.style.width  = gw + 'px'
  canvas.style.height = gh + 'px'

  // HUD 스케일: 480px 기준, 최소 0.55 최대 1.6 (크게 키울수록 요소 겹침 발생)
  HUD_SCALE = Math.max(0.55, Math.min(1.6, gw / 480))
  XP_BAR_W  = Math.round(26 * HUD_SCALE)   // 50% 축소

  GROUND_Y = gh * 0.87

  // 나무를 먼저 resize → 나무 실제 렌더 높이 기준으로 캐릭터 크기 파생
  if (tree) tree.resize(gw, gh)
  const _tRH = tree ? tree.renderHeight : gh * 0.75
  CHAR_RENDER_H = Math.round(_tRH * 0.20)   // 나무 실제 렌더 높이의 20%
  CHAR_H        = CHAR_RENDER_H
  if (CHAR_FW > 0 && CHAR_FH > 0) {
    CHAR_RENDER_W = Math.round(CHAR_RENDER_H * (CHAR_FW / CHAR_FH))
  }
  CHAR_W     = Math.max(20, Math.round(CHAR_RENDER_H * 0.25))
  CHAR_SPEED = Math.round(gw * 0.18)

  if (char) char.y = GROUND_Y - CHAR_H

  // 이동 버튼 크기를 캔버스 크기에 맞게 동적 조정
  const btnSize = Math.round(Math.max(48, Math.min(88, gw * 0.14))) + 'px'
  const btnFontSize = Math.round(Math.max(20, gw * 0.055)) + 'px'
  document.querySelectorAll('.move-btn').forEach(b => {
    b.style.width  = btnSize
    b.style.height = btnSize
    b.style.fontSize = btnFontSize
  })
}
window.addEventListener('resize', () => resizeCanvas())

// ── Constants ──
let GROUND_Y = 435   // updated dynamically in resizeCanvas (gh * 0.87)
let CHAR_H     = 88          // render height of character sprite
let CHAR_W     = 36          // half-width for collision
let CHAR_SPEED = 230         // px/sec
const LOG_COLLECT_RADIUS = 55
const LOG_MAX_LIFE = 320
let XP_BAR_W   = 52         // left-side wooden XP bar width (동적 — HUD_SCALE로 갱신)
const ROUND_DURATION = 20      // seconds per round

// ── Worker hire costs (logs) — per slot hired within a run ──
const HIRE_COSTS = [100, 300, 700, 1500]


// ── Falling Log ──
class FallingLog {
  constructor(x, y, type, color) {
    this.x   = x
    this.y   = y
    this.vx  = (Math.random() - 0.5) * 6
    this.vy  = -2.5 - Math.random() * 2.5
    this.vr  = (Math.random() - 0.5) * 0.15
    this.rot = (Math.random() - 0.5) * 0.4
    this.type = type
    this.color = color
    this.landed = false
    this.bounces = 0
    this.life = LOG_MAX_LIFE
    this.w = Math.round(CHAR_RENDER_H * 0.55)   // 캐릭터 키의 55%
    this.h = Math.round(this.w * 0.38)           // 통나무 두께 비율 고정
    this._grainSeeds = [Math.random(), Math.random(), Math.random(), Math.random()]
  }

  update(delta) {
    if (!this.landed) {
      this.vy  += 0.5 * delta
      this.x   += this.vx * delta
      this.y   += this.vy * delta
      this.rot += this.vr * delta
      if (this.y + this.h / 2 >= GROUND_Y) {
        this.y = GROUND_Y - this.h / 2
        this.vy *= -0.35
        this.vx *= 0.68
        this.vr *= 0.45
        this.bounces++
        if (Math.abs(this.vy) < 1.4 || this.bounces >= 3) {
          this.landed = true; this.vy = 0; this.vx = 0
          this.rot = (Math.sign(this.rot) * (0.05 + Math.random()*0.08))
        }
      }
    } else {
      this.life -= delta
    }
  }

  get alpha() {
    if (!this.landed) return 1
    return Math.max(0, Math.min(1, this.life / (LOG_MAX_LIFE * 0.3)))
  }
  get isDead() { return this.landed && this.life <= 0 }

  draw(ctx) {
    ctx.save()
    ctx.globalAlpha = this.alpha
    ctx.translate(this.x, this.y)
    ctx.rotate(this.rot)

    const w = this.w, h = this.h
    const c = this.color

    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.30)'
    ctx.beginPath()
    ctx.ellipse(0, h * 0.55, w * 0.5, 4, 0, 0, Math.PI * 2)
    ctx.fill()

    // Main cylinder body
    const bodyGrad = ctx.createLinearGradient(0, -h/2, 0, h/2)
    bodyGrad.addColorStop(0, lightenColor(c, 28))
    bodyGrad.addColorStop(0.4, c)
    bodyGrad.addColorStop(1, darkenColor(c, 28))
    ctx.fillStyle = bodyGrad
    ctx.beginPath()
    ctx.roundRect(-w/2, -h/2, w, h, [0, 0, 3, 3])
    ctx.fill()

    // Bark texture lines
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'
    ctx.lineWidth = 1
    for (let gi = 0; gi < this._grainSeeds.length; gi++) {
      const gy = -h/2 + 3 + gi * (h - 6) / (this._grainSeeds.length - 1)
      const wave = (this._grainSeeds[gi] - 0.5) * 2
      ctx.beginPath()
      ctx.moveTo(-w/2 + 5, gy + wave)
      ctx.bezierCurveTo(-w/6, gy + wave * 0.5, w/6, gy - wave * 0.5, w/2 - 5, gy - wave)
      ctx.stroke()
    }

    // Left end cap (ellipse showing cut rings)
    const endR = h * 0.5
    const endX = -w/2 + 1
    ctx.fillStyle = darkenColor(c, 15)
    ctx.beginPath()
    ctx.ellipse(endX, 0, 5, endR, 0, 0, Math.PI * 2)
    ctx.fill()
    // Ring lines on cut face
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'
    ctx.lineWidth = 0.8
    for (let r2 = 1; r2 <= 3; r2++) {
      ctx.beginPath()
      ctx.ellipse(endX, 0, 5 * (r2/3.5), endR * (r2/3.5), 0, 0, Math.PI * 2)
      ctx.stroke()
    }
    // Heartwood center
    ctx.fillStyle = darkenColor(c, 30)
    ctx.beginPath()
    ctx.ellipse(endX, 0, 2, endR * 0.28, 0, 0, Math.PI * 2)
    ctx.fill()

    // Right end cap
    ctx.fillStyle = darkenColor(c, 12)
    ctx.beginPath()
    ctx.ellipse(w/2 - 1, 0, 5, endR, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'
    ctx.lineWidth = 0.8
    for (let r2 = 1; r2 <= 3; r2++) {
      ctx.beginPath()
      ctx.ellipse(w/2 - 1, 0, 5 * (r2/3.5), endR * (r2/3.5), 0, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.fillStyle = darkenColor(c, 30)
    ctx.beginPath()
    ctx.ellipse(w/2 - 1, 0, 2, endR * 0.28, 0, 0, Math.PI * 2)
    ctx.fill()

    // Collect glow (pulse when player is near)
    if (this.landed && this.life > LOG_MAX_LIFE * 0.45 && this._nearPlayer) {
      const t = Date.now() / 300
      const gAlpha = 0.5 + Math.sin(t) * 0.3
      ctx.strokeStyle = `rgba(74,222,128,${gAlpha})`
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.roundRect(-w/2 - 4, -h/2 - 4, w + 8, h + 8, 6)
      ctx.stroke()
    }

    // Expire flash (last ~3 sec)
    if (this.landed && this.life < 90) {
      const flash = (Math.sin(this.life * 0.28) * 0.5 + 0.5) * 0.85
      ctx.strokeStyle = `rgba(239,68,68,${flash})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(-w/2 - 3, -h/2 - 3, w + 6, h + 6, 5)
      ctx.stroke()
    }

    // Special type icon — 날아다닐 때만 표시 (착지 후엔 숨김)
    const ICONS = { lightning:'⚡', freeze:'❄️', magnet:'🧲', fire:'🔥', golden:'💎', explosive:'💥' }
    if (ICONS[this.type] && !this.landed) {
      ctx.font = '16px serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(ICONS[this.type], 0, 0)
    }

    // Special glow overlay
    if (this.type !== 'normal') {
      const glows = { lightning:'rgba(255,240,0,0.15)', freeze:'rgba(135,206,235,0.2)',
                      magnet:'rgba(255,105,180,0.18)', fire:'rgba(255,69,0,0.2)',
                      golden:'rgba(255,215,0,0.25)', explosive:'rgba(255,140,0,0.18)' }
      if (glows[this.type]) {
        ctx.fillStyle = glows[this.type]
        ctx.beginPath()
        ctx.roundRect(-w/2, -h/2, w, h, 3)
        ctx.fill()
      }
    }

    ctx.restore()
  }
}

// ── Sprite Sheet ──
let charSprite = null
let charCanvas = null                  // checkerboard-removed offscreen canvas
let CHAR_FW = 0, CHAR_FH = 0          // source frame size (auto-detected)
let CHAR_RENDER_H = 88                 // rendered height in px (updated on resize)
let CHAR_RENDER_W = 88                 // rendered width  (updated after load)
const CHAR_ANIM = {
  idle: { row: 0, frames: 4, speed: 5  },
  walk: { row: 1, frames: 6, speed: 9  },
  chop: { row: 2, frames: 4, speed: 0  }, // 4 frames, synced to swing timer
}

// Remove sprite background by auto-detecting background type from corner pixel.
// Handles magenta/hot-pink (R high, G low, B high) or neutral grey checkerboard.
function removeCheckerboard(img) {
  const oc  = document.createElement('canvas')
  oc.width  = img.naturalWidth
  oc.height = img.naturalHeight
  const c2  = oc.getContext('2d')
  c2.drawImage(img, 0, 0)
  const id = c2.getImageData(0, 0, oc.width, oc.height)
  const d  = id.data

  // Sample corner to detect background type
  const bgR = d[0], bgG = d[1], bgB = d[2]
  const isMagenta = bgR > 150 && bgG < 80 && bgB > 150

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i+1], b = d[i+2]
    let remove = false

    if (isMagenta) {
      // Magenta/hot-pink family: R high AND G low AND B high
      // Safe: red shirt B~24 (fails b>130), skin G~133 (fails g<100), axe R<150 or G>100
      remove = r > 150 && g < 100 && b > 130
    } else {
      // Neutral grey/white checkerboard: R≈G≈B and not dark
      const spread = Math.max(r, g, b) - Math.min(r, g, b)
      remove = spread <= 12 && r > 80
    }

    if (remove) d[i + 3] = 0
  }

  c2.putImageData(id, 0, 0)
  return oc
}

;(function loadCharSprite() {
  charSprite = new Image()
  charSprite.onload = () => {
    CHAR_FW = charSprite.naturalWidth  / 6
    CHAR_FH = charSprite.naturalHeight / 3
    CHAR_RENDER_W = CHAR_RENDER_H * (CHAR_FW / CHAR_FH)
    charCanvas = removeCheckerboard(charSprite)
  }
  charSprite.src = lumberjackSrc
})()

// ── Lumberjack Character ──
const char = {
  x: 80, y: 0,
  facing: 1,        // 1=right, -1=left
  moveDir: 0,
  chopCooldown: 0,
  state: 'idle',    // idle | walk | swing
  animTimer: 0,
  animFrame: 0,     // sprite sheet frame counter
  swingTimer: 0,
  armAngle: -0.3,
  legPhase: 0,
  _impactFired: false,
}

// ── Game State ──
let tree, fallingLogs = [], particles = [], floatTexts = []
let gamePhase = 'running'  // running | card_select | round_end | run_end
let achNotif = null
let lastTime = 0

// ── Tutorial state ──
const tut = {
  moveTimer:  360,   // frames to show movement hint (6 sec @ 60fps)
  moveDone:   false, // dismissed once player moves
  chopHinted: false, // chop hint shown once near tree
  chopTimer:  0,     // frames to show chop hint
}
let runTimer    = ROUND_DURATION  // per-round countdown (seconds)
let totalRunTime = 0              // total seconds played this run
let roundNum    = 1               // current round number
let roundStats  = { logsEarned: 0, goldEarned: 0, chopCount: 0 }
let screenShake = 0  // pixels

// ── Auto Workers ──
const WORKER_SLOTS = [
  { side: -1, hFrac: 0.40 },  // mid-left
  { side:  1, hFrac: 0.40 },  // mid-right
  { side: -1, hFrac: 0.65 },  // upper-left
  { side:  1, hFrac: 0.65 },  // upper-right
]

class AutoWorker {
  constructor(slotIdx) {
    this.slot      = WORKER_SLOTS[slotIdx % WORKER_SLOTS.length]
    this.chopTimer = slotIdx * 22       // stagger so they don't all chop at once
    this.chopInterval = 72              // frames between chops
    this.state     = 'idle'
    this.animFrame = Math.random() * 4
    this.swingTimer = 0
    this.facing    = -this.slot.side   // always face toward trunk
  }

  get pos() {
    const renderH = tree.trunkH * 0.88
    const renderW = renderH * (1370 / 768)
    const x = tree.cx + this.slot.side * (renderW * 0.48 + CHAR_RENDER_W * 0.28)
    const y = GROUND_Y - tree.trunkH * this.slot.hFrac
    return { x, y }
  }

  update(delta) {
    if (tree.falling || gamePhase !== 'running') return
    if (this.state === 'chop') {
      this.swingTimer += delta
      if (this.swingTimer >= 22) {
        this.state = 'idle'
        this.swingTimer = 0
        const dmg = Math.max(1, run.damage * 0.6)
        const result = tree.chop(dmg)
        const { y } = this.pos
        spawnFallingLog(tree.cx, y, result.segType || 'normal', calcCritCount())
      }
    } else {
      this.animFrame += 0.12 * delta
      this.chopTimer -= delta
      if (this.chopTimer <= 0) {
        this.chopTimer = this.chopInterval
        this.state = 'chop'
        this.swingTimer = 0
      }
    }
  }

  draw() {
    if (!charCanvas || CHAR_FW === 0) return
    const { x, y } = this.pos
    const rW = CHAR_RENDER_W * 0.80
    const rH = CHAR_RENDER_H * 0.80
    ctx.save()
    ctx.translate(x, y)

    // Wooden platform
    const pW = 68, pH = 10
    const pg = ctx.createLinearGradient(0, 0, 0, pH)
    pg.addColorStop(0, '#9a6030'); pg.addColorStop(1, '#4e2808')
    ctx.fillStyle = pg
    ctx.beginPath(); ctx.roundRect(-pW/2, 0, pW, pH, 3); ctx.fill()
    ctx.strokeStyle = '#2c1000'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.roundRect(-pW/2, 0, pW, pH, 3); ctx.stroke()
    // Plank grain lines
    ctx.strokeStyle = 'rgba(0,0,0,0.20)'; ctx.lineWidth = 1
    ;[-16, -5, 6, 17].forEach(lx => {
      ctx.beginPath(); ctx.moveTo(lx, 1); ctx.lineTo(lx, pH - 1); ctx.stroke()
    })
    // Rope to trunk wall
    ctx.strokeStyle = 'rgba(110,65,20,0.55)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'
    const ropeSide = -this.slot.side * pW / 2
    ctx.beginPath()
    ctx.moveTo(ropeSide, 2)
    ctx.quadraticCurveTo(ropeSide * 0.4, -16, ropeSide * 0.1, -4)
    ctx.stroke()

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.beginPath(); ctx.ellipse(0, 3, rW * 0.30, 5, 0, 0, Math.PI*2); ctx.fill()

    // Sprite (mirror to face tree)
    if (this.facing < 0) ctx.scale(-1, 1)
    let row, frameIndex
    if (this.state === 'chop') {
      row = 2
      frameIndex = Math.min(3, Math.floor((this.swingTimer / 22) * 4))
    } else {
      row = 0
      frameIndex = Math.floor(this.animFrame) % CHAR_ANIM.idle.frames
    }
    ctx.drawImage(charCanvas,
      frameIndex * CHAR_FW, row * CHAR_FH, CHAR_FW, CHAR_FH,
      -rW / 2, -rH, rW, rH)

    ctx.restore()
  }
}

let _autoWorkers = []
function syncWorkers() {
  const need = Math.min(4, (persist.skillLevels['workers'] || 0) + (run.hiredWorkers || 0))
  while (_autoWorkers.length < need) _autoWorkers.push(new AutoWorker(_autoWorkers.length))
  if (_autoWorkers.length > need) _autoWorkers.length = need
}

// ── Robot sprite sheet ──
// 레이아웃: 9컬럼 × 4행, 프레임 크기 153×192px, 배경 마젠타
// ── 로봇 단일 이미지 — 마젠타 배경 제거 후 캐싱 ──
let _robotCanvas = null   // 배경 제거된 offscreen canvas

const _robotSrcImg = new Image()
_robotSrcImg.onload = () => {
  const W = _robotSrcImg.naturalWidth, H = _robotSrcImg.naturalHeight
  const oc  = document.createElement('canvas')
  oc.width  = W; oc.height = H
  const oc2 = oc.getContext('2d')
  oc2.drawImage(_robotSrcImg, 0, 0)
  const imgData = oc2.getImageData(0, 0, W, H)
  const d       = imgData.data

  // 마젠타 배경 제거
  const bg  = { r: d[0], g: d[1], b: d[2] }
  const tol = 90
  for (let i = 0; i < d.length; i += 4) {
    if (Math.abs(d[i]-bg.r) <= tol && Math.abs(d[i+1]-bg.g) <= tol && Math.abs(d[i+2]-bg.b) <= tol)
      d[i+3] = 0
  }
  oc2.putImageData(imgData, 0, 0)

  // 불투명 픽셀 바운딩박스 계산 → 여백 자동 크롭
  let minX = W, maxX = 0, minY = H, maxY = 0
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (d[(y * W + x) * 4 + 3] > 10) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  // 크롭된 캔버스 생성
  const cw = maxX - minX + 1, ch = maxY - minY + 1
  const cropped  = document.createElement('canvas')
  cropped.width  = cw
  cropped.height = ch
  cropped.getContext('2d').drawImage(oc, minX, minY, cw, ch, 0, 0, cw, ch)
  _robotCanvas = cropped
}
_robotSrcImg.src = robotSrc

// ── Log-Collecting Robot ──
class LogRobot {
  constructor(idx) {
    this.idx        = idx
    // 나무 중심 좌우에 stagger 배치
    this.dir        = idx % 2 === 0 ? 1 : -1
    this.x          = tree ? tree.cx + this.dir * (40 + idx * 55) : canvas.width / 2
    this.speed      = (90 + idx * 14) * (run.robotSpeed  || 1.0)
    this.animTimer  = idx * 25
    this.collectRadius = (LOG_COLLECT_RADIUS + 10) * (run.robotRadius || 1.0)
    // Beam / spark effect when collecting
    this._sparkTimer = 0
    this._sparks     = []
  }

  // 나무 중심 기준 순찰 범위 (나무 렌더 너비의 약 50%)
  get _patrolRange() {
    if (!tree) return canvas.width * 0.25
    return Math.max(80, (tree.renderWidth || canvas.width * 0.40) * 0.50)
  }

  update(delta) {
    if (gamePhase !== 'running') return

    // 나무 중심 좌우를 왔다갔다
    this.x += this.dir * this.speed * (delta / 60)
    const cx   = tree ? tree.cx : canvas.width / 2
    const half = this._patrolRange
    const minX = Math.max(XP_BAR_W + CHAR_W + 4, cx - half)
    const maxX = Math.min(canvas.width - CHAR_W - 4, cx + half)
    if (this.x <= minX) { this.x = minX; this.dir = 1 }
    if (this.x >= maxX) { this.x = maxX; this.dir = -1 }

    this.animTimer += delta

    // Spark decay
    this._sparkTimer = Math.max(0, this._sparkTimer - delta)
    for (let i = this._sparks.length - 1; i >= 0; i--) {
      const s = this._sparks[i]
      s.x += s.vx * delta; s.y += s.vy * delta; s.life -= 0.04 * delta
      if (s.life <= 0) this._sparks.splice(i, 1)
    }

    // Collect nearby landed logs
    for (let i = fallingLogs.length - 1; i >= 0; i--) {
      const log = fallingLogs[i]
      if (!log.landed) continue
      if (Math.abs(log.x - this.x) < this.collectRadius) {
        // Spawn collection sparks
        this._sparkTimer = 12
        for (let k = 0; k < 5; k++) {
          this._sparks.push({
            x: log.x, y: log.y,
            vx: (Math.random() - 0.5) * 4, vy: -1 - Math.random() * 3,
            life: 1, color: '#00ffb0'
          })
        }
        collectLog(log)
        fallingLogs.splice(i, 1)
      }
    }
  }

  draw() {
    const h  = CHAR_RENDER_H
    const bob = Math.sin(this.animTimer * 0.0025) * 3

    if (_robotCanvas) {
      const rh = h * 0.84
      const rw = rh * (_robotCanvas.width / _robotCanvas.height)
      // 발이 땅에 닿도록: 이미지 하단을 GROUND_Y보다 rh*0.18만큼 아래에 그려 발을 땅속에 약간 묻힘
      const drawBottom = GROUND_Y + rh * 0.18 + bob
      const drawTop    = drawBottom - rh

      // Ground shadow ellipse (world-space, no flip needed)
      ctx.save()
      ctx.fillStyle = 'rgba(0,0,0,0.28)'
      ctx.beginPath()
      ctx.ellipse(this.x, GROUND_Y + 2, rw * 0.38, 5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      ctx.save()
      if (this.dir < 0) {
        ctx.setTransform(-1, 0, 0, 1, this.x, 0)
      } else {
        ctx.translate(this.x, 0)
      }
      ctx.drawImage(_robotCanvas, -rw / 2, drawTop, rw, rh)
      ctx.restore()
    } else {
      ctx.save()
      ctx.translate(this.x, 0)
      ctx.fillStyle = '#4a8aaa'
      ctx.fillRect(-16, GROUND_Y - h, 32, h)
      ctx.restore()
    }

    ctx.save()
    if (this.dir < 0) {
      ctx.setTransform(-1, 0, 0, 1, this.x, 0)
    } else {
      ctx.translate(this.x, 0)
    }
    // Collection beam indicator (glows when _sparkTimer active)
    if (this._sparkTimer > 0) {
      const beamAlpha = Math.min(1, this._sparkTimer / 8) * 0.7
      ctx.strokeStyle = `rgba(0,255,180,${beamAlpha})`
      ctx.lineWidth = 3
      ctx.setLineDash([4, 3])
      ctx.beginPath()
      ctx.moveTo(0, GROUND_Y - h * 0.50)
      ctx.lineTo(0, GROUND_Y)
      ctx.stroke()
      ctx.setLineDash([])
    }

    ctx.restore()

    // Draw sparks (unflipped, world-space)
    ctx.save()
    for (const s of this._sparks) {
      ctx.globalAlpha = Math.max(0, s.life)
      ctx.fillStyle = s.color
      ctx.beginPath(); ctx.arc(s.x, s.y, 3, 0, Math.PI * 2); ctx.fill()
    }
    ctx.globalAlpha = 1
    ctx.restore()
  }
}

const MAX_ROBOTS = 10
let _robots = []
function syncRobots() {
  const need = Math.min(run.robotCount || 0, MAX_ROBOTS)
  while (_robots.length < need) _robots.push(new LogRobot(_robots.length))
  if (_robots.length > need) _robots.length = need
}

// ── Input ──
const keys = {}
document.addEventListener('keydown', e => {
  if (['ArrowLeft','ArrowRight','a','d','A','D'].includes(e.key)) e.preventDefault()
  keys[e.key] = true

  // ════════════════════════════════════════
  //  DEBUG KEYS (개발용 — 배포 시 제거 가능)
  //  G : 라운드 즉시 종료
  //  H : 레벨 즉시 업
  //  T : 모든 스킬 맥스 + 자원 충전 + 스탯 최대 적용
  // ════════════════════════════════════════
  if (e.key === 'g' || e.key === 'G') {
    if (gamePhase === 'running') {
      runTimer = 0
      spawnFloat(canvas.width / 2, canvas.height * 0.3, '🛠 라운드 종료', '#ff6b6b', 18)
    }
  }

  if (e.key === 'h' || e.key === 'H') {
    if (gamePhase === 'running') {
      const leveled = addXP(run.xpToNext - run.xp)
      if (leveled) {
        spawnFloat(canvas.width / 2, canvas.height * 0.3, `🛠 레벨 ${run.level}`, '#a78bfa', 18)
        triggerLevelUp()
      }
    }
  }

  if (e.key === 't' || e.key === 'T') {
    // 자원 충전
    persist.logs = 999999
    persist.gold = 999999
    // 모든 스킬 맥스
    SKILL_NODES.forEach(n => { persist.skillLevels[n.id] = n.maxLv })
    // 현재 런에도 즉시 반영
    resetRun()
    // 로봇 반영
    _robots = []
    syncRobots()
    spawnFloat(canvas.width / 2, canvas.height * 0.3, '🛠 ALL SKILLS MAX', '#ffd700', 22)
    updateHUD()
  }
})
document.addEventListener('keyup', e => { keys[e.key] = false })

// ── Virtual Joystick ──
;(function initJoystick() {
  const zone  = document.getElementById('joystick-zone')
  const base  = document.getElementById('joystick-base')
  const knob  = document.getElementById('joystick-knob')

  if (!zone || !base || !knob) return

  const DEAD_ZONE   = 10   // px — 이 이내는 입력 무시
  const MAX_RADIUS  = () => base.offsetWidth * 0.40  // 노브 최대 이동 반경

  let activeTouchId = null
  let originX = 0, originY = 0

  function getBaseR() { return base.offsetWidth / 2 }

  function onStart(e) {
    // 오버레이가 열려 있으면 조이스틱 무시
    if (document.querySelector('.overlay.open, #card-overlay.open, #round-end-overlay.open, #upgrade-overlay.open, #runend-overlay.open, #settings-overlay.open')) return

    const touch = e.changedTouches ? e.changedTouches[0] : e
    if (activeTouchId !== null) return
    activeTouchId = touch.identifier ?? -1

    // 터치 위치를 zone 내 좌표로 변환
    const zr = zone.getBoundingClientRect()
    const cx = touch.clientX - zr.left
    const cy = touch.clientY - zr.top
    const bR = getBaseR()

    // base를 터치 위치로 즉시 이동
    base.style.left = (cx - bR) + 'px'
    base.style.top  = (cy - bR) + 'px'
    base.style.bottom = 'auto'
    base.classList.add('active')

    originX = cx
    originY = cy
    knob.style.transform = 'translate(0,0)'
    char.moveDir = 0

    e.preventDefault()
  }

  function onMove(e) {
    if (activeTouchId === null) return
    const touches = e.changedTouches || []
    let touch = null
    for (let i = 0; i < touches.length; i++) {
      if ((touches[i].identifier ?? -1) === activeTouchId) { touch = touches[i]; break }
    }
    if (!touch) touch = e   // mouse fallback

    const zr = zone.getBoundingClientRect()
    const cx = touch.clientX - zr.left
    const cy = touch.clientY - zr.top

    const dx = cx - originX
    const dy = cy - originY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const maxR = MAX_RADIUS()

    const clampDist = Math.min(dist, maxR)
    const angle     = Math.atan2(dy, dx)
    const nx        = Math.cos(angle) * clampDist
    const ny        = Math.sin(angle) * clampDist

    knob.style.transform = `translate(${nx}px, ${ny}px)`

    // 수평 방향 결정 (데드존 포함)
    if (Math.abs(dx) < DEAD_ZONE) {
      char.moveDir = 0
    } else {
      char.moveDir = dx > 0 ? 1 : -1
    }

    e.preventDefault()
  }

  function onEnd(e) {
    const touches = e.changedTouches || []
    let matched = false
    for (let i = 0; i < touches.length; i++) {
      if ((touches[i].identifier ?? -1) === activeTouchId) { matched = true; break }
    }
    if (!matched && e.changedTouches) return   // 다른 터치 종료

    activeTouchId = null
    char.moveDir  = 0
    base.classList.remove('active')
    knob.style.transform = 'translate(0,0)'
  }

  // Touch events (passive:false — preventDefault 필요)
  zone.addEventListener('touchstart',  onStart, { passive: false })
  zone.addEventListener('touchmove',   onMove,  { passive: false })
  zone.addEventListener('touchend',    onEnd,   { passive: false })
  zone.addEventListener('touchcancel', onEnd,   { passive: false })

  // Mouse fallback (데스크탑 테스트용)
  zone.addEventListener('mousedown', onStart)
  window.addEventListener('mousemove', e => { if (activeTouchId !== null) onMove(e) })
  window.addEventListener('mouseup',   e => { if (activeTouchId !== null) onEnd(e)  })
})()

window.startMove = (dir) => { char.moveDir = dir }
window.stopMove  = ()    => { char.moveDir = 0 }

// ── Character Update ──
function updateChar(delta) {
  if (gamePhase !== 'running') return

  let kDir = 0
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) kDir = -1
  if (keys['ArrowRight']|| keys['d'] || keys['D']) kDir = 1

  const moveDir = char.moveDir || kDir

  // ── Movement first ── (setting state to 'walk' prevents auto-chop this frame,
  //   which lets the player walk away from the tree naturally)
  if (moveDir !== 0 && char.state !== 'swing') {
    char.x += moveDir * CHAR_SPEED * (delta / 60)
    char.facing = moveDir
    if (char.state !== 'walk') { char.state = 'walk'; char.legPhase = 0 }
    char.animTimer += delta
    char.legPhase = Math.sin(char.animTimer * 0.22) * 0.5
  } else if (char.state === 'walk') {
    char.state = 'idle'
  }

  // ── Auto-chop: triggers whenever the player is idle and within range ──
  // Moving (state=walk) or mid-swing skips this, so holding a direction walks away.
  if (char.state === 'idle' && char.chopCooldown <= 0) {
    const distToTree = Math.abs(char.x - tree.cx)
    if (distToTree < tree.trunkW + 90) doSwing()
  }

  if (char.chopCooldown > 0) char.chopCooldown -= delta

  // Bounds — don't go behind the left XP bar
  char.x = Math.max(CHAR_W + XP_BAR_W, Math.min(canvas.width - CHAR_W, char.x))
  char.y = GROUND_Y - CHAR_H

  // Swing animation state machine
  if (char.state === 'swing') {
    char.swingTimer += delta
    const raise = 7, strike = 5, ret = 12, total = raise + strike + ret
    if (char.swingTimer < raise) {
      char.armAngle = -0.3 - (char.swingTimer / raise) * 1.3
    } else if (char.swingTimer < raise + strike) {
      const t = (char.swingTimer - raise) / strike
      char.armAngle = -1.6 + t * 2.8
      if (t >= 0.5 && !char._impactFired) {
        char._impactFired = true
        doChop()
      }
    } else if (char.swingTimer < total) {
      const t = (char.swingTimer - raise - strike) / ret
      char.armAngle = 1.2 - t * 1.5
    } else {
      char.armAngle = -0.3
      char.state = 'idle'
    }
  }

  // Advance sprite animation frame
  if (char.state !== 'swing') {
    const anim = char.state === 'walk' ? CHAR_ANIM.walk : CHAR_ANIM.idle
    char.animFrame += anim.speed * (delta / 60)
    if (char.animFrame >= anim.frames) char.animFrame = 0
  }

  // Collect nearby logs
  for (let i = fallingLogs.length - 1; i >= 0; i--) {
    const log = fallingLogs[i]
    log._nearPlayer = log.landed && Math.abs(log.x - char.x) < LOG_COLLECT_RADIUS + 20
    if (log.landed && Math.abs(log.x - char.x) < LOG_COLLECT_RADIUS) {
      collectLog(log)
      fallingLogs.splice(i, 1)
    }
  }
}

function doSwing() {
  if (char.state === 'swing') return
  char.state    = 'swing'
  char.swingTimer = 0
  char._impactFired = false
  // Face toward the tree from whichever side the player is on
  char.facing = char.x < tree.cx ? 1 : -1
}

// ── 치명타 로그 수 계산 ──
// critMult=1.0(100%) → crit 발동 시 extra 1개(total 2)
// critMult=2.0(200%) → extra 2개(total 3), critMult=3.0 → extra 3개 확정(total 4)
// 200~300% 구간: 소수점 = 확률적 반올림 (250%→ 50% 확률로 extra 2 or 3)
function calcCritCount() {
  // 1) 치명타 판정
  const chance = Math.min(1.0, run.critChance || 0.15)
  let count = 1
  if (Math.random() < chance) {
    // critMult 지수 스케일: 1.0→2개, 2.0→4개, 3.0→8개, 4.2→16개+
    const m    = Math.max(1.0, run.critMult || 1.0)
    const base = Math.pow(2, m - 1)
    count = Math.max(2, Math.floor(base) + (Math.random() < (base % 1) ? 1 : 0))
  }

  // 2) log_burst: 치명타 여부 무관하게 무조건 추가
  count += (run.logBurst || 0)

  // 3) log_chain: 현재 count만큼 연쇄 시도 — 각 통나무마다 추가 1개 확률
  const chainChance = run.logChain || 0
  if (chainChance > 0) {
    let bonus = 0
    for (let i = 0; i < count; i++) {
      if (Math.random() < chainChance) bonus++
    }
    count += bonus
  }

  return count
}

// ── Chop (impact frame) ──
function doChop() {
  if (gamePhase !== 'running') return
  char.chopCooldown = 7
  playSfxChop()

  const result = tree.chop(run.damage)

  // Resources from chop
  const gold  = Math.ceil(run.goldMult * (0.5 + Math.random()))
  const xpGain = Math.ceil((run.xpMult || 1) * (8 + run.level))
  persist.gold += gold
  persist.totalGoldEarned += gold
  persist.totalChops++
  roundStats.goldEarned += gold
  roundStats.chopCount++

  // 치명타 판정 후 로그 스폰
  // logMult가 시각적 개수 자체를 곱해줌 — 업그레이드할수록 로그가 폭발적으로 늘어남
  const tx = canvas.width / 2
  const ty = tree.baseY - tree.trunkH * 0.5
  const logCount = calcCritCount()
  spawnFallingLog(tx, ty, result.segType || 'normal', logCount)

  if (logCount > 1) {
    spawnFloat(tx, ty - 44, `💥 치명타! ×${logCount}`, '#ff6b35', 16)
    screenShake = Math.max(screenShake, 3 + Math.min(logCount, 12))
  }

  spawnFloat(tx - 30, ty - 28, `+${gold}💰`, '#fbbf24')
  spawnChips(tx, ty)

  screenShake = Math.max(screenShake, 3)

  const leveled = addXP(xpGain)
  if (leveled) triggerLevelUp()

  checkAchievements(onAchievement)
  updateHUD()
}

const LOG_COLORS = {
  normal:    '#8B5E3C',
  golden:    '#D4A017',
  lightning: '#C8B400',
  freeze:    '#7EC8E3',
  magnet:    '#D4629A',
  fire:      '#CC3300',
  explosive: '#C05000',
}

function spawnFallingLog(x, y, type, count = 1) {
  const color = LOG_COLORS[type] || LOG_COLORS.normal
  const W = canvas.width

  for (let i = 0; i < count; i++) {
    // 기본적으로 좌우 전체로 퍼짐 — count 1개도 랜덤 방향으로 날아감
    // count 많을수록 더 넓게, 적어도 최소 ±W*0.3 보장
    const halfSpread = Math.min(W * 0.48, W * 0.30 + count * (W * 0.018))

    // 균등 분산 + 랜덤 jitter
    const t      = count === 1 ? (Math.random() < 0.5 ? -1 : 1) * (0.3 + Math.random() * 0.7)
                               : (i / (count - 1)) * 2 - 1
    const jitter = (Math.random() - 0.5) * 0.5
    const lx     = x + (t + jitter) * halfSpread

    // count 많을수록 일부 하늘에서 내림
    const fromSky = count >= 6 && i % 3 === 2
    const ly      = fromSky ? -(10 + Math.random() * canvas.height * 0.25) : y

    const log = new FallingLog(lx, ly, type, color)

    if (fromSky) {
      log.vx = (Math.random() - 0.5) * 3
      log.vy = 4 + Math.random() * 4
    } else {
      // 바깥쪽일수록 강하게 날아감, 기본 수평 파워 세게
      const power = 4 + (count / 3)
      log.vx = t * power * (1.2 + Math.random() * 0.8)
      log.vy = -(2 + Math.random() * 3 + count * 0.1)
    }
    log.rotation = Math.random() * Math.PI * 2
    log.rotSpeed = (Math.random() - 0.5) * 0.3

    fallingLogs.push(log)
  }
}

// ── Collect log ──
function collectLog(log) {
  playSfxCollect()
  const logs = Math.max(1, Math.ceil(run.logMult))
  persist.logs += logs
  persist.totalLogsEarned += logs
  roundStats.logsEarned += logs

  spawnFloat(log.x, log.y - 22, `+${logs}🪵`, '#86efac')

  switch (log.type) {
    case 'golden': {
      const bonus = Math.ceil(run.goldMult * 15)
      persist.gold += bonus
      persist.totalGoldEarned += bonus
      spawnFloat(log.x, log.y - 38, `💎 +${bonus}💰`, '#FFD700', 17)
      spawnFloat(log.x, log.y - 54, '황금 통나무!', '#FFD700', 13)
      break
    }
    case 'lightning': {
      spawnFloat(log.x, log.y - 38, '⚡ 번개 발동!', '#FFE000', 15)
      tree.triggerLightning(() => {
        persist.logs += Math.ceil(run.logMult)
        persist.totalLogsEarned += Math.ceil(run.logMult)
        persist.totalChops++
      })
      screenShake = Math.max(screenShake, 8)
      if (run.hasFrostFire && run.fireChance > 0) tree.triggerFire(run.damage * 2, 240)
      if (run.hasStormKing) {
        // Chain lightning x3
        for (let i = 0; i < 2; i++) {
          tree.triggerLightning(() => {
            persist.logs += Math.ceil(run.logMult)
            persist.totalLogsEarned += Math.ceil(run.logMult)
          })
        }
        spawnFloat(log.x, log.y - 52, '⚡⚡⚡ 연쇄 번개!', '#FFE000', 13)
      }
      break
    }
    case 'freeze': {
      spawnFloat(log.x, log.y - 38, '❄️ 5배 수집!', '#87CEEB', 15)
      const origLM = run.logMult, origGM = run.goldMult
      run.logMult *= 5; run.goldMult *= 5
      setTimeout(() => { run.logMult = origLM; run.goldMult = origGM }, 3000)
      break
    }
    case 'magnet': {
      const magLogs = fallingLogs.filter(l => l.landed)
      const magCount = magLogs.length
      magLogs.forEach(l => {
        const bl = Math.max(1, Math.ceil(run.logMult))
        persist.logs += bl
        persist.totalLogsEarned += bl
      })
      fallingLogs = fallingLogs.filter(l => !l.landed)
      spawnFloat(char.x, char.y - 30, `🧲 +${magCount}개 일괄 수집!`, '#FF69B4', 16)
      break
    }
    case 'fire': {
      tree.triggerFire(run.damage * 1.5, 300)
      spawnFloat(log.x, log.y - 38, '🔥 연소 시작!', '#FF4500', 15)
      break
    }
    case 'explosive': {
      tree.triggerExplosive()
      spawnFloat(log.x, log.y - 38, '💥 폭발!', '#FF8C00', 15)
      spawnExplosion(log.x, log.y)
      screenShake = Math.max(screenShake, 12)
      break
    }
  }

  checkAchievements(onAchievement)
  updateHUD()
}

// ── Show Run End (포기 버튼용) ──
function showRunEnd() {
  persist.totalRuns++
  const overlay  = document.getElementById('runend-overlay')
  const title    = document.getElementById('runend-title')
  const sub      = document.getElementById('runend-sub')
  const statsDiv = document.getElementById('runend-stats')

  title.textContent = '🪓 벌목 종료!'
  sub.textContent   = `런 ${run.runNum || 1} · 라운드 ${roundNum} · ${Math.floor(totalRunTime / 60)}분 ${Math.floor(totalRunTime % 60)}초`

  const rows = [
    { label: '최고 레벨',    value: `Lv.${run.level}` },
    { label: '획득한 통나무',value: fmt(persist.totalLogsEarned) },
    { label: '획득한 골드',  value: fmt(persist.totalGoldEarned) },
    { label: '총 도끼질',    value: `${persist.totalChops}회` },
  ]
  statsDiv.innerHTML = rows.map(r =>
    `<div class="runend-stat">${r.label}<span>${r.value}</span></div>`
  ).join('')

  overlay.classList.add('open')
  updateHUD()
}

// ── Level Up ──
function triggerLevelUp() {
  if (persist.bestLevel < run.level) persist.bestLevel = run.level
  gamePhase = 'card_select'
  const cards = drawCards(3, roundNum)   // pass current round so robot card can appear
  showCardSelection(cards)
}

function showCardSelection(cards) {
  const overlay = document.getElementById('card-overlay')
  document.getElementById('card-level-sub').textContent = `레벨 ${run.level} 달성 — 카드를 선택하세요`
  const row = document.getElementById('card-row')
  row.innerHTML = ''
  const tierNames = { common:'일반', uncommon:'고급', rare:'희귀', legendary:'전설' }
  cards.forEach(card => {
    const div = document.createElement('div')
    div.className = `card ${card.tier}`
    div.innerHTML = `
      <div class="c-icon">${card.icon}</div>
      <div class="c-name">${card.name}</div>
      <div class="c-tier">${tierNames[card.tier] || card.tier}</div>
      <div class="c-desc">${card.desc}</div>
    `
    div.addEventListener('click', () => {
      applyCard(card)
      overlay.classList.remove('open')
      // If round timer expired while card was being picked, end the round now
      if (runTimer <= 0) {
        gamePhase = 'round_end'
        onRoundEnd()
      } else {
        gamePhase = 'running'
      }
      updateActiveCards()
      updateHUD()
      checkAchievements(onAchievement)
    })
    row.appendChild(div)
  })
  overlay.classList.add('open')
}

// ── New Run ──
window.startNewRun = function () {
  const rn = (run.runNum || 1) + 1
  document.getElementById('runend-overlay').classList.remove('open')
  document.getElementById('upgrade-overlay').classList.remove('open')
  document.getElementById('round-end-overlay').classList.remove('open')
  resetRun()
  run.runNum = rn
  runTimer = ROUND_DURATION + (run.bonusRoundTime || 0)
  totalRunTime = 0
  roundNum = 1
  roundStats = { logsEarned: 0, goldEarned: 0, chopCount: 0 }
  fallingLogs = []; particles = []; floatTexts = []
  _autoWorkers = []
  _robots = []
  tree = new Tree(ctx, canvas.width, canvas.height, 'basic')  // 런 시작은 항상 기본
  char.x = Math.max(XP_BAR_W + CHAR_W + 20, canvas.width / 2 - 140)
  char.state = 'idle'
  char.chopCooldown = 0
  gamePhase = 'running'
  tut.chopHinted = false; tut.chopTimer = 0
  updateActiveCards(); updateHUD()
}

// ── Overlays ──
window.closeOverlay = id => document.getElementById(id).classList.remove('open')

// ── Round End ──
function onRoundEnd() {
  const numEl = document.getElementById('re-round-num')
  const statsDiv = document.getElementById('re-stats')
  if (numEl) numEl.textContent = roundNum
  if (statsDiv) {
    const rows = [
      { label: '🪵 획득한 통나무', value: `+${roundStats.logsEarned}` },
      { label: '💰 획득한 골드',   value: `+${roundStats.goldEarned}` },
      { label: '🪓 도끼질 횟수',   value: `${roundStats.chopCount}회` },
    ]
    statsDiv.innerHTML = rows.map(r =>
      `<div class="runend-stat">${r.label}<span>${r.value}</span></div>`
    ).join('')
  }
  document.getElementById('round-end-overlay').classList.add('open')
}

window.startNextRound = function () {
  if (gamePhase === 'run_end') { startNewRun(); return }
  document.getElementById('round-end-overlay').classList.remove('open')
  document.getElementById('upgrade-overlay').classList.remove('open')
  roundNum++
  runTimer = ROUND_DURATION + (run.bonusRoundTime || 0)
  roundStats = { logsEarned: 0, goldEarned: 0, chopCount: 0 }
  fallingLogs = []; particles = []; floatTexts = []
  // 라운드마다 새 나무 타입 선택
  tree = new Tree(ctx, canvas.width, canvas.height, pickTreeType(roundNum))
  _autoWorkers = []
  syncWorkers()
  _robots = []
  syncRobots()   // robots carry over between rounds via run.robotCount
  gamePhase = 'running'
}

// ── Upgrade Panel ──
window.openUpgradePanel = function (tab = 'skill') {
  document.getElementById('round-end-overlay').classList.remove('open')
  document.getElementById('runend-overlay').classList.remove('open')
  const ov = document.getElementById('upgrade-overlay')
  ov.classList.add('open')
  // Update "next round" button label
  const nb = document.getElementById('upgrade-next-btn')
  if (nb) nb.textContent = '▶ 다음 라운드 시작'
  switchUpgradeTab(tab)
}

window.closeUpgradePanel = function () {
  document.getElementById('upgrade-overlay').classList.remove('open')
  // Re-open the appropriate overlay based on current phase
  if (gamePhase === 'round_end') document.getElementById('round-end-overlay').classList.add('open')
  else if (gamePhase === 'run_end') document.getElementById('runend-overlay').classList.add('open')
}

window.switchUpgradeTab = function (tab, el) {
  // Switch tab buttons
  document.querySelectorAll('.utab').forEach(b => b.classList.remove('active'))
  if (el) el.classList.add('active')
  else {
    const btn = document.getElementById(`utab-btn-${tab}`)
    if (btn) btn.classList.add('active')
  }
  // Switch panes
  document.querySelectorAll('.utab-pane').forEach(p => p.classList.remove('active'))
  const pane = document.getElementById(`utab-${tab}`)
  if (pane) pane.classList.add('active')
  // Render tab content
  if (tab === 'skill') renderSkillTree()
  else if (tab === 'team') renderTeamTab()
  else if (tab === 'ach') { renderAchievements(); }
}

// ── Team Tab ──
function renderTeamTab() {
  const logsEl = document.getElementById('team-logs-display')
  const grid   = document.getElementById('team-grid')
  if (!grid) return
  if (logsEl) logsEl.textContent = fmt(persist.logs)

  const skillWorkers = persist.skillLevels['workers'] || 0
  const hired = run.hiredWorkers || 0
  const total = skillWorkers + hired
  const nextHireIdx = hired  // next hire slot index (0-based)

  grid.innerHTML = ''
  for (let i = 0; i < 4; i++) {
    const isSkillWorker = i < skillWorkers
    const isHired = !isSkillWorker && i < total
    const isActive = i < total
    const isNext = i === total && total < 4
    const isLocked = i > total

    const cost = isNext ? (HIRE_COSTS[hired] ?? 9999) : 0
    const canAfford = isNext && persist.logs >= cost

    const div = document.createElement('div')
    div.className = `team-slot${isActive ? ' active' : ''}${isNext ? ' next-slot' : ''}${isLocked ? ' locked-slot' : ''}`
    div.innerHTML = `
      <div class="ts-icon">${isActive ? '👷' : isNext ? '❓' : '🔒'}</div>
      <div class="ts-name">벌목꾼 ${i + 1}</div>
      <div class="ts-status">${
        isSkillWorker ? '스킬 트리' :
        isHired ? '고용됨 ✓' :
        isNext ? `🪵 ${fmt(cost)} 로그` :
        '잠금'
      }</div>
      ${isNext ? `<button class="hire-btn" onclick="hireWorker()" ${canAfford ? '' : 'disabled'}>${canAfford ? '고용하기' : '🪵 부족'}</button>` : ''}
    `
    grid.appendChild(div)
  }
}
window.renderTeamTab = renderTeamTab

window.hireWorker = function () {
  const hired = run.hiredWorkers || 0
  const total = (persist.skillLevels['workers'] || 0) + hired
  if (total >= 4) return
  const cost = HIRE_COSTS[hired]
  if (cost === undefined || persist.logs < cost) return
  persist.logs -= cost
  run.hiredWorkers = hired + 1
  renderTeamTab()
  // Update logs display in skill tab too
  const logsEl = document.getElementById('st-logs')
  if (logsEl) logsEl.textContent = fmt(persist.logs)
}

// ── Legacy overlay openers (now route through upgrade panel) ──
window.openSkillTree    = () => openUpgradePanel('skill')
window.openAchievements = () => openUpgradePanel('ach')

window.giveUpRun = () => {
  if (gamePhase !== 'running') return
  if (!confirm('런을 포기하시겠습니까?')) return
  gamePhase = 'run_end'
  showRunEnd()
}

// ── BGM 노출 ──
window._bgm = BGM

// 첫 사용자 인터랙션 시 BGM 시작 (브라우저 정책)
let _bgmStarted = false
function _tryStartBgm() {
  if (_bgmStarted) return
  _bgmStarted = true
  BGM.start()
  refreshBgmUI()
}
document.addEventListener('pointerdown', _tryStartBgm, { once: true })
document.addEventListener('keydown',     _tryStartBgm, { once: true })

// ── 언어 시스템 ──
window.gameLanguage = localStorage.getItem('gameLanguage') || 'ko'

const I18N = {
  ko: {
    settings:'설정', language:'언어 / Language', selectLang:'언어 선택',
    volume:'볼륨', sfxVolume:'효과음 볼륨', nowPlaying:'현재 재생', playlist:'플레이리스트',
    noTracks:'src/assets/bgm/ 폴더에 mp3 파일을 넣어주세요',
    danger:'위험', giveUp:'🏳️ 런 포기', close:'✕ 닫기',
  },
  en: {
    settings:'Settings', language:'Language', selectLang:'Select Language',
    volume:'Volume', sfxVolume:'SFX Volume', nowPlaying:'Now Playing', playlist:'Playlist',
    noTracks:'Add mp3 files to src/assets/bgm/ folder',
    danger:'Danger Zone', giveUp:'🏳️ Give Up Run', close:'✕ Close',
  },
}

function _applyI18n() {
  const t = I18N[window.gameLanguage] || I18N.ko
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n')
    if (t[key]) el.textContent = t[key]
  })
  document.querySelectorAll('[data-i18n-btn]').forEach(el => {
    const key = el.getAttribute('data-i18n-btn')
    if (t[key]) el.textContent = t[key]
  })
  document.getElementById('lang-ko').classList.toggle('active', window.gameLanguage === 'ko')
  document.getElementById('lang-en').classList.toggle('active', window.gameLanguage === 'en')
}

window.setLanguage = (lang) => {
  window.gameLanguage = lang
  localStorage.setItem('gameLanguage', lang)
  _applyI18n()
}

// ── Settings Overlay ──
window.openSettings = () => {
  // 게임 중이면 포기 버튼 노출
  const giveupSec = document.getElementById('settings-giveup-section')
  if (giveupSec) giveupSec.style.display = gamePhase === 'running' ? '' : 'none'

  refreshBgmUI()
  _applyI18n()
  document.getElementById('settings-overlay').classList.add('open')
}

window.closeSettings = () => {
  document.getElementById('settings-overlay').classList.remove('open')
}

window.settingsGiveUp = () => {
  closeSettings()
  giveUpRun()
}

window.onBgmVolume = (v) => {
  BGM.setVolume(v / 100)
  document.getElementById('bgm-vol-label').textContent = `${v}%`
  refreshBgmUI()
}

window.onSfxVolume = (v) => {
  setSfxVolume(v / 100)
  document.getElementById('sfx-vol-label').textContent = `${v}%`
}

// BGM 플레이리스트 UI 렌더
window.refreshBgmUI = () => {
  const list = document.getElementById('bgm-playlist-list')
  const nowEl = document.getElementById('bgm-now-playing')
  if (!list) return

  if (nowEl) nowEl.textContent = BGM.getCurrentName()

  // BGM 볼륨 슬라이더 동기화
  const volSlider = document.getElementById('bgm-volume')
  const volLabel  = document.getElementById('bgm-vol-label')
  if (volSlider) {
    const vPct = Math.round(BGM.getVolume() * 100)
    volSlider.value = vPct
    if (volLabel) volLabel.textContent = `${vPct}%`
  }

  // SFX 볼륨 슬라이더 동기화
  const sfxSlider = document.getElementById('sfx-volume')
  const sfxLabel  = document.getElementById('sfx-vol-label')
  if (sfxSlider) {
    const sfxPct = Math.round(getSfxVolume() * 100)
    sfxSlider.value = sfxPct
    if (sfxLabel) sfxLabel.textContent = `${sfxPct}%`
  }

  if (BGM.playlist.length === 0) {
    const t = I18N[window.gameLanguage] || I18N.ko
    list.innerHTML = `<p class="bgm-none">${t.noTracks}</p>`
    return
  }

  list.innerHTML = ''
  BGM.playlist.forEach((track, i) => {
    const div = document.createElement('div')
    div.className = `bgm-track${track === BGM.playlist[i] && track.enabled ? '' : ''}`
    div.style.cssText = 'display:flex;align-items:center;gap:10px;background:#1e2235;border-radius:10px;padding:10px 12px;border:1px solid #2a3050;margin-bottom:6px;'

    // Up / Down
    const btnUp   = document.createElement('button')
    btnUp.className = 'bgm-move'; btnUp.textContent = '▲'; btnUp.title = 'Move up'
    btnUp.onclick = () => { BGM.moveTrack(i, i - 1); refreshBgmUI() }
    btnUp.disabled = i === 0

    const btnDown = document.createElement('button')
    btnDown.className = 'bgm-move'; btnDown.textContent = '▼'; btnDown.title = 'Move down'
    btnDown.onclick = () => { BGM.moveTrack(i, i + 1); refreshBgmUI() }
    btnDown.disabled = i === BGM.playlist.length - 1

    // Name
    const name = document.createElement('span')
    name.style.cssText = 'flex:1;color:#e2e8f0;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'
    if (!track.enabled) name.style.cssText += 'color:#4b5563;text-decoration:line-through;'
    name.textContent = `🎵 ${track.name}`

    // Toggle
    const tog = document.createElement('input')
    tog.type = 'checkbox'; tog.className = 'bgm-toggle'; tog.checked = track.enabled
    tog.onchange = () => { BGM.setTrackEnabled(track.id, tog.checked); refreshBgmUI() }

    div.appendChild(btnUp)
    div.appendChild(btnDown)
    div.appendChild(name)
    div.appendChild(tog)
    list.appendChild(div)
  })
}

// 초기 언어 적용
_applyI18n()

// ── HUD ── (canvas-drawn; DOM function kept for compat with skill tree popup)
function updateHUD() {
  // XP bar + resources + timer are all drawn directly on the canvas each frame.
  // Skill tree popup values are updated by renderSkillTree() when opened.
}
function updateActiveCards() {
  // Cards displayed on canvas in drawCanvasHUD
}
function onAchievement(ach) { achNotif = { name: ach.name, icon: ach.icon, timer: 200 } }
function fmt(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Math.floor(n)
}

// ── Particles / Float Texts ──
function spawnFloat(x, y, text, color, size = 14) {
  floatTexts.push({ x, y, text, color, size, life: 1, vy: -1.4 })
}
function spawnChips(x, y) {
  for (let i = 0; i < 5; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 24, y,
      vx: (Math.random() - 0.5) * 5,
      vy: -2.5 - Math.random() * 3.5,
      life: 1,
      color: Math.random() > 0.4 ? '#8B4513' : '#5a9a3a',
      size: 3 + Math.random() * 4
    })
  }
}
function spawnExplosion(x, y) {
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2
    particles.push({ x, y, vx: Math.cos(a) * 6, vy: Math.sin(a) * 5 - 2, life: 1, color: i % 2 === 0 ? '#FF8C00' : '#FF4500', size: 5 + Math.random()*3 })
  }
}

// ── Color helpers (used in background) ──
function _lerpColor(hex1, hex2, t) {
  const a = parseInt(hex1.slice(1),16), b = parseInt(hex2.slice(1),16)
  const r = ((a>>16)&255) + (((b>>16)&255) - ((a>>16)&255)) * t
  const g = ((a>>8)&255)  + (((b>>8)&255)  - ((a>>8)&255))  * t
  const bl= (a&255)       + ((b&255)        - (a&255))        * t
  return `rgb(${r|0},${g|0},${bl|0})`
}

// ── Draw: Forest Background ──
function drawBackground() {
  const w = canvas.width, h = canvas.height
  const bgImg = _bgImages[tree?.typeKey]

  if (bgImg && bgImg.naturalWidth > 0 && bgImg.naturalHeight > 0 && w > 0 && h > 0) {
    // ── Special tree type: draw background image scaled to fill (cover) ──
    const imgAR = bgImg.naturalWidth / bgImg.naturalHeight
    const canAR = w / h
    let bsx = 0, bsy = 0, bsw = bgImg.naturalWidth, bsh = bgImg.naturalHeight
    if (imgAR > canAR) {
      bsw = bgImg.naturalHeight * canAR
      bsx = (bgImg.naturalWidth - bsw) / 2
    } else {
      bsh = bgImg.naturalWidth / canAR
      bsy = (bgImg.naturalHeight - bsh) / 2
    }
    // Guard against floating-point edge cases
    if (bsw > 0 && bsh > 0) {
      ctx.drawImage(bgImg, bsx, bsy, bsw, bsh, 0, 0, w, h)
    }

    // Solid-ish ground strip — fully opaque so it matches the bg image naturally
    const gGrad = ctx.createLinearGradient(0, GROUND_Y, 0, h)
    gGrad.addColorStop(0,   'rgba(30,55,10,0.92)')
    gGrad.addColorStop(0.15,'rgba(22,45,6,0.97)')
    gGrad.addColorStop(1,   'rgba(10,28,2,1.00)')
    ctx.fillStyle = gGrad; ctx.fillRect(0, GROUND_Y, w, h - GROUND_Y)

    // Ground edge line — crisp boundary
    ctx.fillStyle = 'rgba(100,180,40,0.70)'
    ctx.fillRect(0, GROUND_Y, w, 3)

    // Grass tufts (same style as procedural bg)
    ctx.strokeStyle = '#5a9030'; ctx.lineWidth = 1.5; ctx.lineCap = 'round'
    for (let gx = 4; gx < w; gx += 9 + Math.abs(Math.sin(gx * 0.37)) * 7) {
      const gh = 4 + Math.abs(Math.sin(gx * 0.82)) * 5
      ctx.beginPath(); ctx.moveTo(gx, GROUND_Y + 1); ctx.lineTo(gx - 2, GROUND_Y - gh); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(gx + 3, GROUND_Y + 1); ctx.lineTo(gx + 5, GROUND_Y - gh + 1); ctx.stroke()
    }

    // Tree shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)'
    ctx.beginPath(); ctx.ellipse(w/2, GROUND_Y + 4, 80, 14, 0, 0, Math.PI*2); ctx.fill()
    return
  }

  // === BASIC / FALLBACK: procedural forest background ===

  // SKY — bright misty morning
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y)
  sky.addColorStop(0,   '#a8c4d8')
  sky.addColorStop(0.45,'#bdd4e0')
  sky.addColorStop(1,   '#c8ddc8')
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h)

  // BACKGROUND FOREST TREES — 3 depth layers
  const bgLayers = [
    { xs:[0.04,0.13,0.24,0.36,0.48,0.60,0.72,0.84,0.93], sc:0.50, alpha:0.16, trunk:'#4a6850', crown:'#4a6840' },
    { xs:[0.07,0.18,0.30,0.44,0.56,0.68,0.80,0.90],       sc:0.68, alpha:0.28, trunk:'#3a5840', crown:'#3d6038' },
    { xs:[0.02,0.15,0.32,0.68,0.84,0.97],                  sc:0.88, alpha:0.50, trunk:'#2e4830', crown:'#325435' },
  ]
  bgLayers.forEach(layer => {
    ctx.globalAlpha = layer.alpha
    layer.xs.forEach(xf => _drawForestTree(xf * w, GROUND_Y, layer.sc, layer.trunk, layer.crown))
    ctx.globalAlpha = 1
  })

  // ATMOSPHERIC MIST
  const mist = ctx.createLinearGradient(0, GROUND_Y - 90, 0, GROUND_Y + 20)
  mist.addColorStop(0,   'rgba(190,215,205,0)')
  mist.addColorStop(0.4, 'rgba(190,215,205,0.22)')
  mist.addColorStop(0.8, 'rgba(185,210,200,0.14)')
  mist.addColorStop(1,   'rgba(180,205,195,0.06)')
  ctx.fillStyle = mist; ctx.fillRect(0, GROUND_Y - 90, w, 110)

  // GROUND
  const gGrad = ctx.createLinearGradient(0, GROUND_Y, 0, h)
  gGrad.addColorStop(0,   '#4a7a2e')
  gGrad.addColorStop(0.2, '#3e6828')
  gGrad.addColorStop(1,   '#2a4a18')
  ctx.fillStyle = gGrad; ctx.fillRect(0, GROUND_Y, w, h - GROUND_Y)

  // Ground edge highlight
  ctx.fillStyle = 'rgba(120,200,60,0.30)'
  ctx.fillRect(0, GROUND_Y, w, 4)

  // Grass tufts
  ctx.strokeStyle = '#5a9030'; ctx.lineWidth = 1.5; ctx.lineCap = 'round'
  for (let gx = 4; gx < w; gx += 9 + Math.abs(Math.sin(gx * 0.37)) * 7) {
    const gh = 4 + Math.abs(Math.sin(gx * 0.82)) * 5
    ctx.beginPath(); ctx.moveTo(gx, GROUND_Y + 1); ctx.lineTo(gx - 2, GROUND_Y - gh); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(gx + 3, GROUND_Y + 1); ctx.lineTo(gx + 5, GROUND_Y - gh + 1); ctx.stroke()
  }

  // Tree shadow
  ctx.fillStyle = 'rgba(0,0,0,0.20)'
  ctx.beginPath(); ctx.ellipse(w/2, GROUND_Y + 4, 80, 14, 0, 0, Math.PI*2); ctx.fill()
}

// ── Helper: Pixel-art forest background tree ──
function _drawForestTree(x, baseY, scale, trunkColor, crownColor) {
  const tH = 220 * scale, tW = 14 * scale
  ctx.save()
  ctx.translate(x, baseY)

  // Trunk
  ctx.fillStyle = trunkColor
  ctx.beginPath()
  ctx.moveTo(-tW / 2, 0)
  ctx.lineTo(-tW * 0.22, -tH)
  ctx.lineTo(tW * 0.22, -tH)
  ctx.lineTo(tW / 2, 0)
  ctx.closePath(); ctx.fill()

  // Canopy blobs (layered for depth)
  const cY = -tH * 0.72, cR = 58 * scale
  ctx.fillStyle = crownColor
  ctx.beginPath(); ctx.arc(-cR*0.35, cY + cR*0.10, cR*0.78, 0, Math.PI*2); ctx.fill()
  ctx.beginPath(); ctx.arc( cR*0.35, cY + cR*0.10, cR*0.75, 0, Math.PI*2); ctx.fill()
  ctx.fillStyle = _lerpColor(crownColor, '#7aaa50', 0.3)
  ctx.beginPath(); ctx.arc(0, cY - cR*0.05, cR*0.88, 0, Math.PI*2); ctx.fill()

  // Hanging vines / drooping leaves
  ctx.strokeStyle = crownColor; ctx.lineWidth = 1.8 * scale; ctx.lineCap = 'round'
  for (let b = -3; b <= 3; b++) {
    if (b === 0) continue
    const bx = b * cR * 0.3, by = cY + cR * (0.5 + Math.abs(b) * 0.04)
    ctx.beginPath()
    ctx.moveTo(bx, by)
    ctx.quadraticCurveTo(bx + b * 5 * scale, by + 18 * scale, bx + b * 2 * scale, by + 32 * scale)
    ctx.stroke()
  }

  ctx.restore()
}

// ── Draw: Lumberjack Character (sprite sheet) ──
function drawCharacter() {
  // Pivot point = bottom-centre of character at ground level
  const x = char.x
  const y = char.y + CHAR_H   // = GROUND_Y

  ctx.save()
  ctx.translate(x, y)

  // Ground shadow ellipse — at y=0 (exactly GROUND_Y)
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath()
  ctx.ellipse(0, 0, CHAR_RENDER_W * 0.36, 6, 0, 0, Math.PI * 2)
  ctx.fill()

  // Flip sprite for left-facing
  if (char.facing < 0) ctx.scale(-1, 1)

  if (charCanvas && CHAR_FW > 0) {
    // Determine animation row + frame
    let row, frameIndex
    if (char.state === 'swing') {
      row = 2
      const total = 24   // raise(7) + strike(5) + ret(12)
      frameIndex = Math.min(3, Math.floor((char.swingTimer / total) * 4))
    } else if (char.state === 'walk') {
      row = 1
      frameIndex = Math.floor(char.animFrame) % CHAR_ANIM.walk.frames
    } else {
      row = 0
      frameIndex = Math.floor(char.animFrame) % CHAR_ANIM.idle.frames
    }

    const sx = frameIndex * CHAR_FW
    const sy = row * CHAR_FH

    ctx.drawImage(
      charCanvas,
      sx, sy, CHAR_FW, CHAR_FH,
      -CHAR_RENDER_W / 2, -CHAR_RENDER_H,
      CHAR_RENDER_W, CHAR_RENDER_H
    )
  } else {
    // ── Fallback canvas character (shows while sprite loads) ──
    const f = char.facing
    // Body
    ctx.fillStyle = '#b82018'
    ctx.fillRect(-10, -CHAR_RENDER_H + 10, 20, 45)
    // Head
    ctx.fillStyle = '#c8855a'
    ctx.beginPath(); ctx.ellipse(0, -CHAR_RENDER_H + 10, 10, 11, 0, 0, Math.PI*2); ctx.fill()
    // Hat
    ctx.fillStyle = '#5a3a10'
    ctx.fillRect(-12, -CHAR_RENDER_H - 4, 24, 6)
    ctx.fillRect(-9, -CHAR_RENDER_H - 18, 18, 16)
    // Legs
    ctx.fillStyle = '#2a3a5a'
    ;[[-6, 0], [2, 0]].forEach(([bx]) => {
      ctx.fillRect(bx, -CHAR_RENDER_H + 52, 8, 22)
      ctx.fillStyle = '#2c1e0e'; ctx.fillRect(bx - 1, -CHAR_RENDER_H + 70, 10, 10); ctx.fillStyle = '#2a3a5a'
    })
    // Axe
    ctx.save()
    ctx.translate(f * 14, -CHAR_RENDER_H + 30)
    ctx.rotate(f * char.armAngle)
    ctx.fillStyle = '#b07830'; ctx.fillRect(-2, 0, 4, 26)
    ctx.fillStyle = '#c0ccd8'
    ctx.beginPath()
    ctx.moveTo(0, 4); ctx.lineTo(f * 14, 0); ctx.lineTo(f * 16, 18); ctx.lineTo(0, 16)
    ctx.fill()
    ctx.restore()
  }

  ctx.restore()
}

// ── Draw: Hints ──
function drawHints() {
  const w = canvas.width, h = canvas.height
  const cx = w / 2

  // ── Movement tutorial (first 6 sec or until player moves) ──
  if (!tut.moveDone && tut.moveTimer > 0) {
    tut.moveTimer--
    if (char.moveDir !== 0 || keys['ArrowLeft'] || keys['ArrowRight'] || keys['a'] || keys['A'] || keys['d'] || keys['D']) {
      tut.moveDone = true  // player has moved — dismiss forever
    }
    const alpha = Math.min(1, tut.moveTimer / 40) * 0.92
    ctx.save()
    ctx.globalAlpha = alpha

    // Dark pill background
    const bw = 240, bh = 90, bx = cx - bw / 2, by = GROUND_Y - 160
    ctx.fillStyle = 'rgba(20,24,36,0.82)'
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 12); ctx.fill()
    ctx.strokeStyle = 'rgba(180,200,160,0.25)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 12); ctx.stroke()

    // Title
    ctx.fillStyle = 'rgba(220,230,210,0.90)'
    ctx.font = 'bold 12px "Segoe UI"'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    ctx.fillText('사용', cx, by + 10)

    // Key icons row
    const ky = by + 32, ks = 28  // key y, key size
    const keys2 = ['A', 'D', '←', '→']
    const kx = [cx - 70, cx - 36, cx + 4, cx + 38]
    keys2.forEach((k, i) => {
      // Key box
      ctx.fillStyle = 'rgba(60,70,90,0.90)'
      ctx.beginPath(); ctx.roundRect(kx[i], ky, ks, ks, 5); ctx.fill()
      ctx.strokeStyle = 'rgba(180,200,160,0.50)'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.roundRect(kx[i], ky, ks, ks, 5); ctx.stroke()
      // Key label
      ctx.fillStyle = '#e8ecd8'
      ctx.font = `bold ${k.length > 1 ? 14 : 15}px "Segoe UI"`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(k, kx[i] + ks / 2, ky + ks / 2)
    })
    // "또는" between A/D and arrows
    ctx.fillStyle = 'rgba(180,200,160,0.70)'
    ctx.font = '10px "Segoe UI"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('또는', cx + 2, ky + ks / 2)

    // "이동" label
    ctx.fillStyle = 'rgba(220,230,210,0.85)'
    ctx.font = '11px "Segoe UI"'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    ctx.fillText('이동', cx, ky + ks + 6)

    ctx.restore()
  }

  // ── Uncollected logs indicator ──
  const uncollected = fallingLogs.filter(l => l.landed).length
  if (uncollected > 0) {
    // Arrow pointing to nearest log
    const nearest = fallingLogs.filter(l => l.landed)
      .reduce((a, b) => Math.abs(a.x - char.x) < Math.abs(b.x - char.x) ? a : b)
    const dx = nearest.x - char.x
    const arrowDir = dx > 0 ? 1 : -1
    const pulse = 0.6 + Math.sin(Date.now() / 220) * 0.35
    ctx.save()
    ctx.globalAlpha = pulse
    ctx.fillStyle = '#86efac'
    ctx.font = 'bold 20px Segoe UI'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    // Bouncing arrow above character
    const bounce = Math.sin(Date.now() / 180) * 4
    ctx.fillText(arrowDir > 0 ? '▶' : '◀', char.x + arrowDir * 22, char.y + 10 + bounce)
    ctx.restore()
  }
}

// ── Helper: Wooden box (pixel-art style) ──
function _woodBox(x, y, bw, bh, r = 5) {
  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.40)'
  ctx.beginPath(); ctx.roundRect(x + 3, y + 3, bw, bh, r); ctx.fill()
  // Wood gradient
  const g = ctx.createLinearGradient(x, y, x, y + bh)
  g.addColorStop(0,   '#9a6030')
  g.addColorStop(0.35,'#7a4418')
  g.addColorStop(1,   '#4e2a08')
  ctx.fillStyle = g
  ctx.beginPath(); ctx.roundRect(x, y, bw, bh, r); ctx.fill()
  // Dark border
  ctx.strokeStyle = '#2c1000'; ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.roundRect(x, y, bw, bh, r); ctx.stroke()
  // Inner top highlight
  ctx.strokeStyle = 'rgba(255,210,120,0.22)'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.roundRect(x + 3, y + 3, bw - 6, bh - 6, r - 1); ctx.stroke()
}

// ── Draw: Canvas HUD — wooden pixel-art style ──
function drawCanvasHUD() {
  const w = canvas.width, h = canvas.height
  const S = HUD_SCALE   // 모든 HUD 크기/폰트에 이 배율 적용
  const pct = Math.min(1, run.xp / (run.xpToNext || 1))

  // ─── Left XP wooden column ───
  const barX   = Math.round(5 * S)
  const lvR    = Math.round(11 * S)   // level circle radius (50% 축소)
  const lvCY   = Math.round(20 * S)   // level circle centre y (50% 축소)
  const barTop = lvCY + lvR + Math.round(6 * S)
  const barW   = XP_BAR_W
  const barH   = Math.round((h - barTop - Math.round(14 * S)) * 0.5)   // 길이 50%

  // Column background
  _woodBox(barX, barTop, barW, barH, 6)

  // XP fill (orange-red, from bottom)
  if (pct > 0.01) {
    const fillH = (barH - 10) * pct
    ctx.save()
    ctx.beginPath(); ctx.roundRect(barX + 5, barTop + 5, barW - 10, barH - 10, 4); ctx.clip()
    const fg = ctx.createLinearGradient(0, barTop + barH, 0, barTop + barH - fillH)
    fg.addColorStop(0,   '#8a1500')
    fg.addColorStop(0.5, '#d03010')
    fg.addColorStop(1,   '#f07020')
    ctx.fillStyle = fg
    ctx.fillRect(barX + 5, barTop + barH - 5 - fillH, barW - 10, fillH)
    ctx.fillStyle = 'rgba(255,200,80,0.35)'
    ctx.fillRect(barX + 5, barTop + barH - 5 - fillH, barW - 10, 3)
    ctx.restore()
  }

  // Metal bolt rivets
  const lx2 = barX + Math.round(5 * S), rx2 = barX + barW - Math.round(5 * S)
  const rivetR = Math.max(1, Math.round(2 * S))
  ;[barTop + 12, barTop + barH * 0.35, barTop + barH * 0.68, barTop + barH - 12].forEach(by2 => {
    ;[lx2, rx2].forEach(bx2 => {
      ctx.fillStyle = '#666'; ctx.beginPath(); ctx.arc(bx2, by2, rivetR, 0, Math.PI*2); ctx.fill()
      ctx.fillStyle = '#aaa'; ctx.beginPath(); ctx.arc(bx2 - 1, by2 - 1, rivetR * 0.44, 0, Math.PI*2); ctx.fill()
    })
  })

  // Level circle badge
  const lcx = barX + barW / 2
  ctx.fillStyle = '#2c1000'
  ctx.beginPath(); ctx.arc(lcx, lvCY, lvR + Math.round(4 * S), 0, Math.PI*2); ctx.fill()
  const lvG = ctx.createRadialGradient(lcx - 5, lvCY - 6, 2, lcx, lvCY, lvR)
  lvG.addColorStop(0, '#f07828')
  lvG.addColorStop(1, '#a03808')
  ctx.fillStyle = lvG
  ctx.beginPath(); ctx.arc(lcx, lvCY, lvR, 0, Math.PI*2); ctx.fill()
  ctx.strokeStyle = '#5a2000'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(lcx, lvCY, lvR, 0, Math.PI*2); ctx.stroke()
  ctx.fillStyle = '#fff'
  const lvFontSz = Math.round((run.level >= 10 ? 7 : 8) * S)
  ctx.font = `bold ${lvFontSz}px "Courier New"`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(run.level, lcx, lvCY + 1)

  // ─── Resources box (top-left, right of XP bar) ───
  // 최대 너비: canvas의 23% 또는 스케일값 중 작은 쪽 → 타이머와 절대 안 겹침
  const rsX = barX + barW + Math.round(6 * S)
  const rsW = Math.min(Math.round(180 * S), Math.round(w * 0.23))
  const rsH = Math.min(Math.round(56 * S), Math.round(w * 0.075))
  _woodBox(rsX, 6, rsW, rsH, 6)
  const rsFontSz  = Math.round(Math.min(18 * S, rsH * 0.36))
  const rsIconOff = Math.round(rsW * 0.06)
  const rsTextOff = Math.round(rsW * 0.22)
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.font = `bold ${rsFontSz}px "Courier New"`
  ctx.fillStyle = '#e8e0c0'
  ctx.fillText('🪵', rsX + rsIconOff, 6 + rsH * 0.30)
  ctx.fillStyle = '#fff'
  ctx.fillText(fmt(persist.logs), rsX + rsTextOff, 6 + rsH * 0.30)
  ctx.font = `bold ${Math.round(Math.min(17 * S, rsH * 0.34))}px "Courier New"`
  ctx.fillStyle = '#ffd878'
  ctx.fillText('💰', rsX + rsIconOff, 6 + rsH * 0.72)
  ctx.fillStyle = '#ffd060'
  ctx.fillText(fmt(persist.gold || 0), rsX + rsTextOff, 6 + rsH * 0.72)

  // ─── Settings button (top-right) — 타이머보다 먼저 계산해서 공간 확보 ───
  const pauseS = Math.min(Math.round(40 * S), Math.round(w * 0.07))
  const pauseX = w - pauseS - Math.round(8 * S)

  // ─── Timer box (top-center) — 리소스박스 우측과 설정버튼 좌측 사이에 맞춤 ───
  const tmAvail = pauseX - (rsX + rsW) - Math.round(12 * S)  // 가용 너비
  const tmW = Math.min(Math.round(130 * S), Math.max(80, tmAvail))
  const tmH = Math.min(Math.round(52 * S), Math.round(w * 0.07))
  const tmX = w / 2 - tmW / 2
  _woodBox(tmX, 6, tmW, tmH, 6)
  const secsLeft = Math.ceil(runTimer)
  const isUrgent = runTimer <= 5 && gamePhase === 'running'
  const flashOn  = isUrgent && (Math.floor(Date.now() / 200) % 2 === 0)
  ctx.font = `bold ${Math.round(Math.min(30 * S, tmH * 0.58))}px "Courier New"`
  ctx.fillStyle = flashOn ? '#ff4040' : isUrgent ? '#ff8060' : '#fff'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.shadowColor = isUrgent ? 'rgba(255,80,0,0.6)' : 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = isUrgent ? 8 : 3
  ctx.fillText(gamePhase === 'round_end' ? '종료!' : `0:${secsLeft.toString().padStart(2, '0')}`, w / 2, 6 + tmH / 2)
  ctx.shadowBlur = 0

  // Round badge
  ctx.font = `bold ${Math.round(Math.min(9 * S, 13))}px "Segoe UI"`
  ctx.fillStyle = 'rgba(180,160,255,0.80)'
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  ctx.fillText(`R${roundNum}`, w / 2 + tmW / 2 - Math.round(16 * S), 10)
  _woodBox(pauseX, 8, pauseS, pauseS, 5)
  ctx.fillStyle = '#c0c8e0'
  ctx.font = `${Math.round(Math.min(16 * S, pauseS * 0.45))}px Segoe UI`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('⚙️', pauseX + pauseS / 2, 8 + pauseS * 0.38)
  ctx.font = `bold ${Math.round(Math.min(8 * S, pauseS * 0.22))}px "Segoe UI"`
  ctx.fillStyle = '#8090b0'
  ctx.fillText(window.gameLanguage === 'en' ? 'MENU' : '설정', pauseX + pauseS / 2, 8 + pauseS * 0.75)

  // ─── Bottom-left: chop range indicator ───
  const distToTree = Math.abs(char.x - tree.cx)
  const inRange = distToTree < tree.trunkW + 90
  if (inRange && gamePhase === 'running') {
    const bH2 = Math.round(22 * S), bW2 = Math.round(80 * S)
    const bY2 = h - Math.round(8 * S)
    const bx2 = barX + barW + Math.round(6 * S)
    _woodBox(bx2, bY2 - bH2, bW2, bH2, 4)
    const chopPulse = 0.7 + Math.sin(Date.now() / 140) * 0.3
    ctx.globalAlpha = chopPulse
    ctx.font = `bold ${Math.round(9 * S)}px "Segoe UI"`
    ctx.fillStyle = '#a0ffb0'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('🪓 자동 벌목 중', bx2 + bW2 / 2, bY2 - bH2 / 2)
    ctx.globalAlpha = 1
  }

  // ─── Status effects ───
  let sy = h - 36
  ctx.font = '11px Segoe UI'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
  if (tree?.frozen) {
    ctx.fillStyle = '#87CEEB'
    ctx.fillText(`❄️ 빙결 ${Math.ceil(tree.frozenTimer / 60)}s`, barX + barW + 10, sy); sy -= 16
  }
  if (tree?.burning) {
    ctx.fillStyle = '#FF8050'
    ctx.fillText(`🔥 연소 ${Math.ceil(tree.burnTimer / 60)}s`, barX + barW + 10, sy)
  }
}

// ── Draw: Achievement notification ──
function drawAchievementNotif() {
  if (!achNotif) return
  achNotif.timer--
  const alpha = Math.min(1, achNotif.timer / 40)
  const bw = 230, bh = 46, bx = canvas.width / 2 - bw / 2, by = 56
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = '#1e2235'; ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.fill(); ctx.stroke()
  ctx.fillStyle = '#f59e0b'; ctx.font = '11px Segoe UI'; ctx.textAlign = 'center'
  ctx.fillText('🏆 업적 달성!', canvas.width / 2, by + 17)
  ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Segoe UI'
  ctx.fillText(`${achNotif.icon} ${achNotif.name}`, canvas.width / 2, by + 33)
  ctx.restore()
  if (achNotif.timer <= 0) achNotif = null
}

// ── Color helpers (for log drawing) ──
function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function lightenColor(hex, amt) {
  try {
    const [r, g, b] = hexToRgb(hex)
    return `rgb(${Math.min(255,r+amt)},${Math.min(255,g+amt)},${Math.min(255,b+amt)})`
  } catch { return hex }
}
function darkenColor(hex, amt) {
  try {
    const [r, g, b] = hexToRgb(hex)
    return `rgb(${Math.max(0,r-amt)},${Math.max(0,g-amt)},${Math.max(0,b-amt)})`
  } catch { return hex }
}

// ── Game Loop ──
function loop(ts) {
  // Schedule next frame FIRST so the loop never dies from an exception
  requestAnimationFrame(loop)

  try { _loopFrame(ts) } catch(err) { console.error('[loop]', err) }
}

function _loopFrame(ts) {
  const rawDelta = lastTime ? (ts - lastTime) / 16.67 : 1
  const delta = Math.min(rawDelta, 4)
  lastTime = ts

  // Screen shake decay
  if (screenShake > 0) screenShake *= 0.75

  // 스프라이트 로드 후 캐릭터 크기 자동 보정 (나무 실제 렌더 높이 기준)
  if (tree) {
    const _target = Math.round(tree.renderHeight * 0.20)
    if (_target > 10 && _target !== CHAR_RENDER_H) {
      CHAR_RENDER_H = _target
      CHAR_H = _target
      if (CHAR_FW > 0 && CHAR_FH > 0)
        CHAR_RENDER_W = Math.round(CHAR_RENDER_H * (CHAR_FW / CHAR_FH))
      CHAR_W = Math.max(20, Math.round(CHAR_RENDER_H * 0.25))
      if (char) char.y = GROUND_Y - CHAR_H
    }
  }

  // Round countdown timer — only ticks during active play
  if (gamePhase === 'running') {
    const dt = delta / 60
    runTimer = Math.max(0, runTimer - dt)
    totalRunTime += dt
    if (runTimer <= 0) {
      gamePhase = 'round_end'
      onRoundEnd()
    }
  }

  // Apply screen shake
  const sx = screenShake > 0.3 ? (Math.random() - 0.5) * screenShake * 2 : 0
  const sy = screenShake > 0.3 ? (Math.random() - 0.5) * screenShake     : 0
  ctx.save()
  ctx.translate(sx, sy)

  ctx.clearRect(-20, -20, canvas.width + 40, canvas.height + 40)
  drawBackground()

  // Draw game world when not on full run-end screen
  const isGameVisible = gamePhase !== 'run_end'
  const isGameActive  = gamePhase === 'running' || gamePhase === 'card_select'

  if (isGameVisible) {
    if (isGameActive) {
      updateChar(delta)

      // Burn tick — 불타는 나무는 주기적으로 로그를 뱉음
      if (tree.burning && Math.random() < 0.02 * delta) {
        const tx = canvas.width / 2
        const ty = tree.baseY - tree.trunkH * 0.5
        spawnFallingLog(tx, ty, 'fire')
      }

      tree.update(delta)
    }

    tree.draw()

    // Auto workers
    syncWorkers()
    _autoWorkers.forEach(w => { if (isGameActive) w.update(delta); w.draw() })

    // Log-collecting robots
    syncRobots()
    _robots.forEach(r => { if (isGameActive) r.update(delta); r.draw() })

    // Falling logs
    for (let i = fallingLogs.length - 1; i >= 0; i--) {
      const log = fallingLogs[i]
      if (!log) continue
      if (isGameActive) {
        log.update(delta)
        // log may have been removed from fallingLogs by a robot/worker during update
        if (fallingLogs[i] !== log) continue
        if (log.isDead) { fallingLogs.splice(i, 1); continue }
      }
      log.draw(ctx)
    }

    drawCharacter()

    // Particles
    ctx.save()
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      if (isGameActive) {
        p.vy += 0.22 * delta; p.x += p.vx * delta; p.y += p.vy * delta; p.life -= 0.028 * delta
      }
      ctx.globalAlpha = Math.max(0, p.life)
      ctx.fillStyle = p.color
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
      if (p.life <= 0) particles.splice(i, 1)
    }
    ctx.restore()

    // Float texts
    for (let i = floatTexts.length - 1; i >= 0; i--) {
      const t = floatTexts[i]
      if (isGameActive) { t.y += t.vy * delta; t.life -= 0.022 * delta }
      ctx.save()
      ctx.globalAlpha = Math.max(0, t.life)
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.font = `bold ${t.size}px Segoe UI`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
      ctx.fillText(t.text, t.x + 1, t.y + 1)
      ctx.fillStyle = t.color
      ctx.fillText(t.text, t.x, t.y)
      ctx.restore()
      if (t.life <= 0) floatTexts.splice(i, 1)
    }

    if (isGameActive) drawHints()
    drawCanvasHUD()
    drawAchievementNotif()
  }

  ctx.restore()  // end screen shake
}

// ── Init ──
resetRun()
resizeCanvas()
tree = new Tree(ctx, canvas.width, canvas.height, 'basic')
char.x = Math.max(XP_BAR_W + CHAR_W + 20, canvas.width / 2 - 140)
char.y = GROUND_Y - CHAR_H
runTimer = ROUND_DURATION + (run.bonusRoundTime || 0)
totalRunTime = 0
roundNum = 1
roundStats = { logsEarned: 0, goldEarned: 0, chopCount: 0, treesCleared: 0 }
updateHUD(); updateActiveCards()
setInterval(() => { updateHUD(); checkAchievements(onAchievement) }, 350)

// ── Canvas click → HUD buttons ──
canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect()
  const scx = canvas.width / rect.width
  const scy = canvas.height / rect.height
  const cx = (e.clientX - rect.left) * scx
  const cy = (e.clientY - rect.top)  * scy
  const w = canvas.width
  // 설정 button (top-right) — HUD_SCALE 기반 히트박스
  const _ps = Math.round(40 * HUD_SCALE)
  const _px = w - _ps - Math.round(8 * HUD_SCALE)
  if (cx >= _px && cx <= w - 4 && cy >= 4 && cy <= 8 + _ps + 4) window.openSettings()
})

requestAnimationFrame(loop)
