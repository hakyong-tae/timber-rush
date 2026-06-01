import { run } from './state.js'
import { t } from './i18n.js'

// Card definitions — names and descriptions are resolved through i18n at
// render time so the language toggle takes effect immediately.
export const CARD_POOL = [
  // ── COMMON ──
  { id:'axe1',      tier:'common',    icon:'🪓', nameKey:'card_axe1_name',     descKey:'card_axe1_desc',     apply: s=>{s.damage+=3} },
  { id:'axe2',      tier:'common',    icon:'⚔️', nameKey:'card_axe2_name',     descKey:'card_axe2_desc',     apply: s=>{s.damage+=5} },
  { id:'log1',      tier:'common',    icon:'🪵', nameKey:'card_log1_name',     descKey:'card_log1_desc',     apply: s=>{s.logMult*=1.5} },
  { id:'gold1',     tier:'common',    icon:'💰', nameKey:'card_gold1_name',    descKey:'card_gold1_desc',    apply: s=>{s.goldMult*=1.5} },
  { id:'auto1',     tier:'common',    icon:'⚙️', nameKey:'card_auto1_name',    descKey:'card_auto1_desc',    apply: s=>{s.autoChopSpeed+=0.5} },
  { id:'log2',      tier:'common',    icon:'🪜', nameKey:'card_log2_name',     descKey:'card_log2_desc',     apply: s=>{s.logMult*=1.8} },
  { id:'xp1',       tier:'common',    icon:'✨', nameKey:'card_xp1_name',      descKey:'card_xp1_desc',      apply: s=>{s.xpMult=(s.xpMult||1)*1.3} },
  // ── UNCOMMON ──
  { id:'crit1',     tier:'uncommon',  icon:'🎯', nameKey:'card_crit1_name',    descKey:'card_crit1_desc',    apply: s=>{s.critChance=(s.critChance||0.15)+0.20} },
  { id:'multi1',    tier:'uncommon',  icon:'🌀', nameKey:'card_multi1_name',   descKey:'card_multi1_desc',   apply: s=>{s.multiHit+=1} },
  { id:'lightning1',tier:'uncommon',  icon:'⚡', nameKey:'card_lightning1_name',descKey:'card_lightning1_desc',apply: s=>{s.lightningChance+=0.2} },
  { id:'freeze1',   tier:'uncommon',  icon:'❄️', nameKey:'card_freeze1_name',  descKey:'card_freeze1_desc',  apply: s=>{s.freezeChance+=0.2} },
  { id:'magnet1',   tier:'uncommon',  icon:'🧲', nameKey:'card_magnet1_name',  descKey:'card_magnet1_desc',  apply: s=>{s.magnetChance+=0.2} },
  { id:'fire1',     tier:'uncommon',  icon:'🔥', nameKey:'card_fire1_name',    descKey:'card_fire1_desc',    apply: s=>{s.fireChance+=0.2} },
  { id:'golden1',   tier:'uncommon',  icon:'💎', nameKey:'card_golden1_name',  descKey:'card_golden1_desc',  apply: s=>{s.goldenChance+=0.15} },
  { id:'auto2',     tier:'uncommon',  icon:'🤖', nameKey:'card_auto2_name',    descKey:'card_auto2_desc',    apply: s=>{s.autoChopSpeed+=1.0} },
  { id:'dmg_mult',  tier:'uncommon',  icon:'💥', nameKey:'card_dmg_mult_name', descKey:'card_dmg_mult_desc', apply: s=>{s.damage=Math.ceil(s.damage*1.5)} },
  // ── RARE ──
  { id:'crit_power', tier:'rare',     icon:'💥', nameKey:'card_crit_power_name',descKey:'card_crit_power_desc',apply: s=>{s.critMult=(s.critMult||1.0)+0.8} },
  { id:'double_log',tier:'rare',      icon:'🌲', nameKey:'card_double_log_name',descKey:'card_double_log_desc',apply: s=>{s.logMult*=2;s.goldMult*=2} },
  { id:'storm',     tier:'rare',      icon:'⛈️', nameKey:'card_storm_name',    descKey:'card_storm_desc',    apply: s=>{s.hasStormKing=true;s.lightningChance+=0.15} },
  { id:'frostfire', tier:'rare',      icon:'🌡️', nameKey:'card_frostfire_name',descKey:'card_frostfire_desc',apply: s=>{s.hasFrostFire=true;s.fireChance+=0.1;s.freezeChance+=0.1} },
  { id:'berserker', tier:'rare',      icon:'😡', nameKey:'card_berserker_name',descKey:'card_berserker_desc',apply: s=>{s.damage*=2;s.autoChopSpeed+=1} },
  { id:'tycoon',    tier:'rare',      icon:'🏆', nameKey:'card_tycoon_name',   descKey:'card_tycoon_desc',   apply: s=>{s.logMult*=1.5;s.goldMult*=1.5;s.hasTimberTycoon=true} },
  // ── LEGENDARY ──
  { id:'godaxe',    tier:'legendary', icon:'⚡🪓',nameKey:'card_godaxe_name',  descKey:'card_godaxe_desc',   apply: s=>{s.damage*=5;s.lightningChance+=0.4} },
  { id:'timewarp',  tier:'legendary', icon:'⏳', nameKey:'card_timewarp_name', descKey:'card_timewarp_desc', apply: s=>{s.autoChopSpeed*=3} },
  { id:'goldrush',  tier:'legendary', icon:'🌟', nameKey:'card_goldrush_name', descKey:'card_goldrush_desc', apply: s=>{s.goldMult*=5;s.xpMult=(s.xpMult||1)*2} },
  // ── ROBOT (stackable, unlocks round 10+) ──
  {
    id: 'robot_collector', tier: 'uncommon', icon: '🤖',
    nameKey: 'card_robot_collector_name',
    descKey: 'card_robot_collector_desc',
    stackable: true,    // can be picked multiple times
    minRound: 10,       // only appears from round 10 onwards
    maxStack: 10,       // hide once player has 10 robots
    apply: s => { s.robotCount = Math.min((s.robotCount || 0) + 1, 10) },
  },
]

// Convenience accessors for i18n.
export function cardName(card) { return t(card.nameKey) }
export function cardDesc(card) { return t(card.descKey) }

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
