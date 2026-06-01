import { persist } from './state.js'
import { t } from './i18n.js'

// Skill node metadata. `nameKey` resolves through i18n; `descKey` is also an
// i18n key but the underlying string is a function of the level (so we call
// t(descKey, lv) at render time).
export const SKILL_NODES = [
  { id:'axe',        icon:'🪓', nameKey:'skill_axe_name',         descKey:'skill_axe_desc',         maxLv:5, baseCost:50,  costScale:2.0, currency:'logs' },
  { id:'log_expert', icon:'🪵', nameKey:'skill_log_expert_name',  descKey:'skill_log_expert_desc',  maxLv:5, baseCost:40,  costScale:1.8, currency:'logs' },
  { id:'gold_digger',icon:'💰', nameKey:'skill_gold_digger_name', descKey:'skill_gold_digger_desc', maxLv:5, baseCost:60,  costScale:2.0, currency:'gold' },
  { id:'autopilot',  icon:'🤖', nameKey:'skill_autopilot_name',   descKey:'skill_autopilot_desc',   maxLv:4, baseCost:120, costScale:2.5, currency:'logs' },
  { id:'storm_caller',icon:'⚡', nameKey:'skill_storm_caller_name',descKey:'skill_storm_caller_desc',maxLv:3, baseCost:200, costScale:3.0, currency:'gold' },
  { id:'time_warper', icon:'❄️', nameKey:'skill_time_warper_name',descKey:'skill_time_warper_desc', maxLv:3, baseCost:200, costScale:3.0, currency:'gold' },
  { id:'fire_master', icon:'🔥', nameKey:'skill_fire_master_name',descKey:'skill_fire_master_desc', maxLv:3, baseCost:180, costScale:2.8, currency:'gold' },
  { id:'gold_sense',  icon:'💎', nameKey:'skill_gold_sense_name', descKey:'skill_gold_sense_desc',  maxLv:3, baseCost:150, costScale:2.5, currency:'gold' },
  { id:'xp_boost',    icon:'✨', nameKey:'skill_xp_boost_name',   descKey:'skill_xp_boost_desc',    maxLv:3, baseCost:80,  costScale:2.2, currency:'logs' },
  { id:'workers',     icon:'👷', nameKey:'skill_workers_name',    descKey:'skill_workers_desc',     maxLv:4, baseCost:300, costScale:3.0, currency:'logs' },
  { id:'round_time',  icon:'⏱️', nameKey:'skill_round_time_name', descKey:'skill_round_time_desc',  maxLv:4, baseCost:120, costScale:2.0, currency:'logs' },
  { id:'crit_chance', icon:'🎯', nameKey:'skill_crit_chance_name',descKey:'skill_crit_chance_desc', maxLv:5, baseCost:80,  costScale:2.0, currency:'logs' },
  { id:'crit_power',  icon:'💥', nameKey:'skill_crit_power_name', descKey:'skill_crit_power_desc',  maxLv:5, baseCost:150, costScale:2.5, currency:'gold' },
  // ── 통나무 폭발 브랜치 ──
  { id:'log_burst',   icon:'🌪️', nameKey:'skill_log_burst_name',  descKey:'skill_log_burst_desc',   maxLv:5, baseCost:100, costScale:2.2, currency:'logs' },
  { id:'log_chain',   icon:'🔗', nameKey:'skill_log_chain_name',  descKey:'skill_log_chain_desc',   maxLv:4, baseCost:200, costScale:2.8, currency:'gold' },
  // ── 로봇 강화 ──
  { id:'robot_init',  icon:'🤖', nameKey:'skill_robot_init_name', descKey:'skill_robot_init_desc',  maxLv:5, baseCost:400, costScale:3.0, currency:'gold' },
  { id:'robot_speed', icon:'⚡', nameKey:'skill_robot_speed_name',descKey:'skill_robot_speed_desc', maxLv:3, baseCost:200, costScale:2.5, currency:'logs' },
  { id:'robot_range', icon:'🔍', nameKey:'skill_robot_range_name',descKey:'skill_robot_range_desc', maxLv:3, baseCost:180, costScale:2.2, currency:'gold' },
]

export function renderSkillTree() {
  const grid = document.getElementById('skill-grid')
  const logsEl = document.getElementById('st-logs')
  const goldEl = document.getElementById('st-gold')
  if (!grid) return

  logsEl.textContent = fmt(persist.logs)
  goldEl.textContent = fmt(persist.gold)

  grid.innerHTML = ''
  SKILL_NODES.forEach(node => {
    const lv = persist.skillLevels[node.id] || 0
    const maxed = lv >= node.maxLv
    const cost = maxed ? 0 : Math.floor(node.baseCost * Math.pow(node.costScale, lv))
    const currency = node.currency
    const canAfford = maxed ? false : (currency === 'logs' ? persist.logs >= cost : persist.gold >= cost)

    const div = document.createElement('div')
    div.className = `skill-node${maxed ? ' unlocked' : (canAfford ? '' : ' locked')}`
    const currentDesc = lv > 0 ? t('skillCurrent', t(node.descKey, lv)) : ''
    const nextDesc    = maxed ? '' : `→ ${t(node.descKey, lv + 1)}`
    div.innerHTML = `
      <div class="s-icon">${node.icon}</div>
      <div class="s-name">${t(node.nameKey)}</div>
      <div class="s-lv">Lv ${lv}/${node.maxLv}</div>
      <div class="s-desc">${nextDesc}${currentDesc && nextDesc ? '<br>' : ''}${currentDesc}</div>
      ${maxed ? `<div class="s-cost" style="color:#4ade80">${t('skillMaxed')}</div>`
               : `<div class="s-cost">${currency==='logs'?'🪵':'💰'} ${fmt(cost)}</div>`}
    `
    if (!maxed && canAfford) {
      div.addEventListener('click', () => {
        if (currency === 'logs') persist.logs -= cost
        else persist.gold -= cost
        persist.skillLevels[node.id] = lv + 1
        if (!persist.totalGoldSpent) persist.totalGoldSpent = 0
        if (currency === 'gold') persist.totalGoldSpent += cost
        renderSkillTree()
      })
    }
    grid.appendChild(div)
  })
}

function fmt(n) {
  if (n >= 1e6) return (n/1e6).toFixed(1)+'M'
  if (n >= 1e3) return (n/1e3).toFixed(1)+'K'
  return Math.floor(n)
}
