import { run } from './state.js'

export const CARD_POOL = [
  // ── COMMON ──
  { id:'axe1',      tier:'common',    icon:'🪓', name:'날카로운 날',     desc:'데미지 +3',            apply: s=>{s.damage+=3} },
  { id:'axe2',      tier:'common',    icon:'⚔️', name:'강철 도끼',       desc:'데미지 +5',            apply: s=>{s.damage+=5} },
  { id:'log1',      tier:'common',    icon:'🪵', name:'통나무 수집',     desc:'통나무 획득 +50%',      apply: s=>{s.logMult*=1.5} },
  { id:'gold1',     tier:'common',    icon:'💰', name:'금화 수집',       desc:'골드 획득 +50%',        apply: s=>{s.goldMult*=1.5} },
  { id:'auto1',     tier:'common',    icon:'⚙️', name:'자동 손잡이',     desc:'자동벌목 +0.5/초',      apply: s=>{s.autoChopSpeed+=0.5} },
  { id:'log2',      tier:'common',    icon:'🪜', name:'넉넉한 가방',     desc:'통나무 획득 +80%',      apply: s=>{s.logMult*=1.8} },
  { id:'xp1',       tier:'common',    icon:'✨', name:'수련',            desc:'XP 획득 +30%',         apply: s=>{s.xpMult=(s.xpMult||1)*1.3} },
  // ── UNCOMMON ──
  { id:'crit1',     tier:'uncommon',  icon:'🎯', name:'예리한 날',       desc:'치명타 확률 +20%',      apply: s=>{s.critChance=(s.critChance||0.15)+0.20} },
  { id:'multi1',    tier:'uncommon',  icon:'🌀', name:'다중 타격',       desc:'클릭당 타격 +1회',      apply: s=>{s.multiHit+=1} },
  { id:'lightning1',tier:'uncommon',  icon:'⚡', name:'번개 친화',       desc:'번개 로그 확률 +20%',   apply: s=>{s.lightningChance+=0.2} },
  { id:'freeze1',   tier:'uncommon',  icon:'❄️', name:'얼음 친화',       desc:'얼음 로그 확률 +20%',   apply: s=>{s.freezeChance+=0.2} },
  { id:'magnet1',   tier:'uncommon',  icon:'🧲', name:'자석 부적',       desc:'자석 로그 확률 +20%',   apply: s=>{s.magnetChance+=0.2} },
  { id:'fire1',     tier:'uncommon',  icon:'🔥', name:'불꽃 도끼',       desc:'불 로그 확률 +20%',     apply: s=>{s.fireChance+=0.2} },
  { id:'golden1',   tier:'uncommon',  icon:'💎', name:'황금 감각',       desc:'황금 로그 확률 +15%',   apply: s=>{s.goldenChance+=0.15} },
  { id:'auto2',     tier:'uncommon',  icon:'🤖', name:'자동화 II',       desc:'자동벌목 +1.0/초',      apply: s=>{s.autoChopSpeed+=1.0} },
  { id:'dmg_mult',  tier:'uncommon',  icon:'💥', name:'분노의 도끼',     desc:'데미지 ×1.5',           apply: s=>{s.damage=Math.ceil(s.damage*1.5)} },
  // ── RARE ──
  { id:'crit_power', tier:'rare',     icon:'💥', name:'파괴적 일격',     desc:'치명타 배율 +0.8 (통나무 2배 증가)',  apply: s=>{s.critMult=(s.critMult||1.0)+0.8} },
  { id:'double_log',tier:'rare',      icon:'🌲', name:'더블 수확',       desc:'통나무 & 골드 ×2',      apply: s=>{s.logMult*=2;s.goldMult*=2} },
  { id:'storm',     tier:'rare',      icon:'⛈️', name:'폭풍왕',          desc:'번개 연쇄 3회',         apply: s=>{s.hasStormKing=true;s.lightningChance+=0.15} },
  { id:'frostfire', tier:'rare',      icon:'🌡️', name:'화염 빙하',       desc:'불+얼음 시너지: 폭발!', apply: s=>{s.hasFrostFire=true;s.fireChance+=0.1;s.freezeChance+=0.1} },
  { id:'berserker', tier:'rare',      icon:'😡', name:'광전사',          desc:'데미지 ×2 + 자동 +1',   apply: s=>{s.damage*=2;s.autoChopSpeed+=1} },
  { id:'tycoon',    tier:'rare',      icon:'🏆', name:'목재왕',          desc:'모든 배수 ×1.5',        apply: s=>{s.logMult*=1.5;s.goldMult*=1.5;s.hasTimberTycoon=true} },
  // ── LEGENDARY ──
  { id:'godaxe',    tier:'legendary', icon:'⚡🪓',name:'신의 도끼',       desc:'데미지 ×5 + 번개 +40%', apply: s=>{s.damage*=5;s.lightningChance+=0.4} },
  { id:'timewarp',  tier:'legendary', icon:'⏳', name:'시간 왜곡',       desc:'자동벌목 ×3',           apply: s=>{s.autoChopSpeed*=3} },
  { id:'goldrush',  tier:'legendary', icon:'🌟', name:'골드 러쉬',       desc:'골드 ×5 + XP ×2',       apply: s=>{s.goldMult*=5;s.xpMult=(s.xpMult||1)*2} },
  // ── ROBOT (stackable, unlocks round 10+) ──
  {
    id: 'robot_collector', tier: 'uncommon', icon: '🤖',
    name: '로봇 수집기',
    desc: '통나무를 자동 수집하는 로봇 +1대 (최대 10대)',
    stackable: true,    // can be picked multiple times
    minRound: 10,       // only appears from round 10 onwards
    maxStack: 10,       // hide once player has 10 robots
    apply: s => { s.robotCount = Math.min((s.robotCount || 0) + 1, 10) },
  },
]

const TIER_WEIGHT = { common: 55, uncommon: 30, rare: 12, legendary: 3 }

export function drawCards(count=3, curRound=1) {
  // Weight-based random draw; stackable cards can repeat; minRound gates
  const available = CARD_POOL.filter(c => {
    if (c.minRound && curRound < c.minRound) return false
    if (!c.stackable && run.cards.includes(c.id)) return false
    if (c.maxStack !== undefined && (run.robotCount || 0) >= c.maxStack) return false
    return true
  })
  if (available.length === 0) return CARD_POOL.slice(0, count)

  const drawn = []
  const pool = [...available]

  // ── 라운드 10 첫 진입: 로봇 카드 무조건 1장 보장 (최대 10대 미만일 때만) ──
  if (curRound === 10 && (run.robotCount || 0) < 10) {
    const robotCard = CARD_POOL.find(c => c.id === 'robot_collector')
    if (robotCard) {
      drawn.push(robotCard)
      const idx = pool.findIndex(c => c.id === 'robot_collector')
      if (idx !== -1) pool.splice(idx, 1)
    }
  }

  const remaining = count - drawn.length
  for (let i = 0; i < remaining && pool.length > 0; i++) {
    const totalWeight = pool.reduce((s, c) => s + TIER_WEIGHT[c.tier], 0)
    let r = Math.random() * totalWeight
    for (let j = 0; j < pool.length; j++) {
      r -= TIER_WEIGHT[pool[j].tier]
      if (r <= 0) {
        drawn.push(pool[j])
        if (!pool[j].stackable) pool.splice(j, 1)
        break
      }
    }
  }

  // Higher level = better cards
  if (run.level >= 5 && drawn.every(c => c.tier === 'common')) {
    const unc = pool.find(c => c.tier === 'uncommon' || c.tier === 'rare')
    if (unc) { drawn.splice(drawn.length - 1, 1, unc) }
  }

  return drawn
}

export function applyCard(card) {
  if (!card.stackable) run.cards.push(card.id)  // stackable cards stay in the pool
  card.apply(run)
}
