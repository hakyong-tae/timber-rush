import { run } from './state.js'

// ── 스프라이트 임포트 ──
import srcBasic  from './assets/tree_basic.webp'
import srcGolden from './assets/tree_golden.webp'
import srcFrozen from './assets/tree_frozen.webp'
import srcVenom  from './assets/tree_venom.webp'
import srcFire   from './assets/tree_fire.webp'
import srcShadow from './assets/tree_shadow.webp'

// ── 스프라이트 로더 (배경 제거) ──
const _sprites = {}   // key → { canvas, nw, nh }

function _loadSprite(key, src) {
  const img = new Image()
  img.onload = () => {
    const oc = document.createElement('canvas')
    oc.width  = img.naturalWidth
    oc.height = img.naturalHeight
    const c2 = oc.getContext('2d')
    c2.drawImage(img, 0, 0)
    const id = c2.getImageData(0, 0, oc.width, oc.height)
    const d  = id.data
    const W = img.naturalWidth, H = img.naturalHeight

    // 4개 코너 샘플
    const corners = [
      { r:d[0],          g:d[1],          b:d[2],          a:d[3]          },           // top-left
      { r:d[(W-1)*4],    g:d[(W-1)*4+1],  b:d[(W-1)*4+2],  a:d[(W-1)*4+3]  },           // top-right
      { r:d[(H-1)*W*4],  g:d[(H-1)*W*4+1],b:d[(H-1)*W*4+2],a:d[(H-1)*W*4+3] },          // bottom-left
      { r:d[((H-1)*W+(W-1))*4], g:d[((H-1)*W+(W-1))*4+1], b:d[((H-1)*W+(W-1))*4+2], a:d[((H-1)*W+(W-1))*4+3] }, // bottom-right
    ]

    // 이미 투명 배경이면 그대로 사용
    if (corners.some(c => c.a < 128)) {
      _sprites[key] = { canvas: oc, nw: W, nh: H }
      return
    }

    // 코너색을 배경으로 간주
    const bg = corners[0]
    // 마젠타(분홍) 배경이면 tolerance 더 높게
    const isMagenta = bg.r > 160 && bg.g < 100 && bg.b > 160
    const tol = isMagenta ? 120 : 50

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i+1], b = d[i+2]
      if (Math.abs(r-bg.r)<=tol && Math.abs(g-bg.g)<=tol && Math.abs(b-bg.b)<=tol)
        d[i+3] = 0
    }
    c2.putImageData(id, 0, 0)
    _sprites[key] = { canvas: oc, nw: W, nh: H }
  }
  img.src = src
}

_loadSprite('basic',  srcBasic)
_loadSprite('golden', srcGolden)
_loadSprite('frozen', srcFrozen)
_loadSprite('venom',  srcVenom)
_loadSprite('fire',   srcFire)
_loadSprite('shadow', srcShadow)

// ── 특수 나무 타입 정의 ──
export const TREE_TYPES = {
  basic:  { key:'basic',  name:'기본 나무', emoji:'🌲',
    bonusType: null,      unlockRound: 1,  desc:'평범한 나무' },
  golden: { key:'golden', name:'황금 나무', emoji:'✨',
    bonusType: 'golden',  unlockRound: 6,  desc:'황금 통나무가 많이 나온다' },
  frozen: { key:'frozen', name:'얼음 나무', emoji:'❄️',
    bonusType: 'freeze',  unlockRound: 8,  desc:'항상 얼어있다. 얼음 통나무가 많이 나온다' },
  venom:  { key:'venom',  name:'독 나무',   emoji:'☠️',
    bonusType: 'magnet',  unlockRound: 12, desc:'자석 통나무가 많이 나온다' },
  fire:   { key:'fire',   name:'불꽃 나무', emoji:'🔥',
    bonusType: 'fire',    unlockRound: 15, desc:'항상 불타고 있다. 불 통나무가 많이 나온다' },
  shadow: { key:'shadow', name:'암흑 나무', emoji:'💀',
    bonusType: 'explosive', unlockRound: 20, desc:'폭발 통나무가 많이 나온다' },
}

export function getAvailableTreeTypes(round) {
  return Object.values(TREE_TYPES).filter(t => t.unlockRound <= round)
}

export function pickTreeType(round) {
  const available = getAvailableTreeTypes(round)
  if (available.length === 1) return 'basic'   // round 1-5: 기본만 존재

  // round 6+: 절대 이전 타입으로 되돌아가지 않음
  // 현재 라운드에서 가장 최근 해금된 특수 나무를 항상 사용
  const specials = available.filter(t => t.key !== 'basic')
  return specials[specials.length - 1].key
  // 결과: 1-5=basic, 6-7=golden, 8-11=frozen, 12-14=venom, 15-19=fire, 20+=shadow
}

export const LOG_TYPES = {
  normal:    { color:'#3a2010', glow:null,      icon:null },
  golden:    { color:'#c89010', glow:'#FFD700', icon:'💎' },
  lightning: { color:'#a89000', glow:'#FFE000', icon:'⚡' },
  freeze:    { color:'#5a9ab0', glow:'#87CEEB', icon:'❄️' },
  magnet:    { color:'#a84080', glow:'#FF69B4', icon:'🧲' },
  fire:      { color:'#8a2200', glow:'#FF4500', icon:'🔥' },
  explosive: { color:'#7a3000', glow:'#FF8C00', icon:'💥' },
}

export class Tree {
  constructor(ctx, cw, ch, typeKey = 'basic') {
    this.ctx      = ctx
    this.typeKey  = typeKey
    this._typeData = TREE_TYPES[typeKey] || TREE_TYPES.basic
    this.shakeX   = 0
    this.shakeTimer = 0
    this.frozen   = false; this.frozenTimer = 0
    this.burning  = false; this.burnTimer   = 0; this.burnDamage = 0
    this._segPool = []
    this._buildSegPool()
    this.resize(cw, ch)
    this._applyTypeEffects()
  }

  _applyTypeEffects() {
    if (this.typeKey === 'frozen') { this.frozen  = true; this.frozenTimer = Infinity }
    if (this.typeKey === 'fire')   { this.burning = true; this.burnTimer   = Infinity; this.burnDamage = 1 }
  }

  _buildSegPool() {
    this._segPool = Array.from({ length: 24 }, () => ({ type: this._rollType() }))
    this._nextSeg = 0
  }

  _rollType() {
    // 나무 타입 보너스 — 30% 확률로 해당 타입 강제
    const bt = this._typeData?.bonusType
    if (bt && Math.random() < 0.30) return bt

    const r  = Math.random()
    const lc = Math.min(run.lightningChance || 0, 0.5)
    const fc = Math.min(run.freezeChance   || 0, 0.45)
    const mc = Math.min(run.magnetChance   || 0, 0.45)
    const fi = Math.min(run.fireChance     || 0, 0.45)
    const gc = Math.min(run.goldenChance   || 0, 0.35)
    let cum = 0
    if (r < (cum += gc * 0.5 + 0.03))  return 'golden'
    if (r < (cum += lc * 0.4 + 0.04))  return 'lightning'
    if (r < (cum += fc * 0.4 + 0.03))  return 'freeze'
    if (r < (cum += mc * 0.4 + 0.03))  return 'magnet'
    if (r < (cum += fi * 0.4 + 0.03))  return 'fire'
    if (r < (cum += 0.03))              return 'explosive'
    return 'normal'
  }

  resize(cw, ch) {
    this.cw = cw; this.ch = ch
    this.cx     = cw / 2
    this.baseY  = ch * 0.87          // 스프라이트 하단 = 그라운드 라인 (더 아래로)
    this.trunkH = ch * 0.87          // 캐릭터 위치 계산용
    this.trunkW = 80
  }

  get name()  { return this._typeData.name }
  get emoji() { return this._typeData.emoji }

  // 현재 캔버스에서 실제로 렌더되는 나무 높이 (스프라이트 종횡비 반영)
  get renderHeight() {
    const sp = _sprites[this.typeKey] || _sprites['basic']
    if (!sp) return this.ch * 0.82
    const scale = Math.min((this.cw * 0.80) / sp.nw, (this.ch * 0.89) / sp.nh)
    return sp.nh * scale
  }

  // 현재 캔버스에서 실제로 렌더되는 나무 너비 (로봇 순찰 범위용)
  get renderWidth() {
    const sp = _sprites[this.typeKey] || _sprites['basic']
    if (!sp) return this.cw * 0.60
    const scale = Math.min((this.cw * 0.80) / sp.nw, (this.ch * 0.89) / sp.nh)
    return sp.nw * scale
  }

  peekSpecial() {
    return this._segPool[this._nextSeg % this._segPool.length]?.type || 'normal'
  }
  advanceSeg() {
    this._nextSeg++
    if (this._nextSeg >= this._segPool.length) this._buildSegPool()
  }

  chop() {
    const segType = this.peekSpecial()
    this.advanceSeg()
    this.shakeTimer = 10
    return { special: segType !== 'normal' ? segType : null, segType }
  }

  update(delta) {
    this.shakeTimer = Math.max(0, this.shakeTimer - delta)
    this.shakeX = this.shakeTimer > 0 ? Math.sin(this.shakeTimer * 2.2) * 5 : 0
    // 타입 고정 상태 유지
    if (this.typeKey === 'frozen') this.frozen  = true
    if (this.typeKey === 'fire')   this.burning = true
    // 일반 상태이상 타이머
    if (this.frozen  && this.frozenTimer  !== Infinity) { this.frozenTimer  -= delta; if (this.frozenTimer  <= 0) this.frozen  = false }
    if (this.burning && this.burnTimer    !== Infinity) { this.burnTimer    -= delta; if (this.burnTimer    <= 0) this.burning = false }
  }

  draw() {
    const ctx = this.ctx
    const sx  = this.shakeX
    const sp  = _sprites[this.typeKey] || _sprites['basic']

    ctx.save()
    ctx.translate(this.cx + sx, this.baseY)

    if (sp) {
      // 캔버스 안에 딱 맞게 — 가로는 80%, 세로는 그라운드까지
      const maxW = this.cw * 0.80
      const maxH = this.ch * 0.82
      const scale  = Math.min(maxW / sp.nw, maxH / sp.nh)
      const renderW = sp.nw * scale
      const renderH = sp.nh * scale
      // 하단을 그라운드(baseY)에 맞춤 — translate이 이미 baseY
      ctx.drawImage(sp.canvas, -renderW / 2, -renderH, renderW, renderH)
    } else {
      ctx.fillStyle = '#3a1a08'
      ctx.fillRect(-40, -this.ch * 0.75, 80, this.ch * 0.75)
    }

    // 얼음 크리스탈 오버레이
    if (this.frozen) {
      const fH = this.ch * 0.80
      ctx.fillStyle = 'rgba(100,180,220,0.10)'
      ctx.fillRect(-this.cw * 0.4, -fH, this.cw * 0.8, fH)
      ctx.strokeStyle = 'rgba(135,206,235,0.45)'; ctx.lineWidth = 1.5
      for (let ic = 0; ic < 6; ic++) {
        const ix = -this.cw * 0.15 + ic * this.cw * 0.06
        const iy = -fH * (0.2 + ic * 0.12)
        ctx.beginPath(); ctx.moveTo(ix-5, iy); ctx.lineTo(ix+5, iy); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(ix, iy-5); ctx.lineTo(ix, iy+5); ctx.stroke()
      }
    }

    ctx.restore()

    // 나무 타입 배지 제거 — 스프라이트 자체로 충분히 구분됨
  }

  _drawTypeBadge() {
    const ctx  = this.ctx
    const td   = this._typeData
    const gY   = this.ch * 0.80
    const label = `${td.emoji} ${td.name}`
    ctx.font = 'bold 12px "Segoe UI"'
    const tw = ctx.measureText(label).width
    const bw = tw + 20, bh = 22
    const bx = this.cx - bw / 2, by = gY - 34

    ctx.fillStyle = 'rgba(0,0,0,0.65)'
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 6); ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(label, this.cx, by + bh / 2)
  }

  isNearTrunk(px) {
    return Math.abs(px - this.cx) < this.trunkW * 0.9 + 55
  }

  triggerLightning(cb) { if (cb) for (let i = 0; i < 3; i++) cb() }
  triggerFreeze(dur = 240) {
    if (this.typeKey !== 'frozen') { this.frozen = true; this.frozenTimer = dur }
  }
  triggerFire(dmg, dur = 300) {
    if (this.typeKey !== 'fire') { this.burning = true; this.burnTimer = dur; this.burnDamage = dmg }
  }
  triggerExplosive() {}
}
