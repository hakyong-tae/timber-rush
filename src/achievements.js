import { persist, run } from './state.js'
import { t } from './i18n.js'

// Static metadata — id, icon, and `check` predicate. User-facing strings are
// resolved at render time through i18n so the language toggle takes effect
// without rebuilding this list.
export const ACHIEVEMENTS = [
  { id:'first_chop',   icon:'🪓', nameKey:'ach_first_chop_name',   descKey:'ach_first_chop_desc',   check: p=>p.totalChops>=1 },
  { id:'chop10',       icon:'💪', nameKey:'ach_chop10_name',       descKey:'ach_chop10_desc',       check: p=>p.totalChops>=10 },
  { id:'chop100',      icon:'🌟', nameKey:'ach_chop100_name',      descKey:'ach_chop100_desc',      check: p=>p.totalChops>=100 },
  { id:'chop1000',     icon:'🏅', nameKey:'ach_chop1000_name',     descKey:'ach_chop1000_desc',     check: p=>p.totalChops>=1000 },
  { id:'level5',       icon:'⬆️', nameKey:'ach_level5_name',       descKey:'ach_level5_desc',       check: p=>p.bestLevel>=5 },
  { id:'level10',      icon:'🔝', nameKey:'ach_level10_name',      descKey:'ach_level10_desc',      check: p=>p.bestLevel>=10 },
  { id:'level15',      icon:'👑', nameKey:'ach_level15_name',      descKey:'ach_level15_desc',      check: p=>p.bestLevel>=15 },
  { id:'run3',         icon:'🔄', nameKey:'ach_run3_name',         descKey:'ach_run3_desc',         check: p=>p.totalRuns>=3 },
  { id:'run10',        icon:'♾️', nameKey:'ach_run10_name',        descKey:'ach_run10_desc',        check: p=>p.totalRuns>=10 },
  { id:'logs1000',     icon:'🪵', nameKey:'ach_logs1000_name',     descKey:'ach_logs1000_desc',     check: p=>p.totalLogsEarned>=1000 },
  { id:'gold500',      icon:'💰', nameKey:'ach_gold500_name',      descKey:'ach_gold500_desc',      check: p=>p.totalGoldEarned>=500 },
  { id:'tree3',        icon:'🌲', nameKey:'ach_tree3_name',        descKey:'ach_tree3_desc',        check: (_,r)=>r.treesCleared>=3 },
  { id:'tree5',        icon:'🌳', nameKey:'ach_tree5_name',        descKey:'ach_tree5_desc',        check: (_,r)=>r.treesCleared>=5 },
  { id:'legendary',    icon:'🌟', nameKey:'ach_legendary_name',    descKey:'ach_legendary_desc',    check: (_,r)=>r.cards.some(id=>['godaxe','timewarp','goldrush'].includes(id)) },
  { id:'frostfire',    icon:'🌡️', nameKey:'ach_frostfire_name',    descKey:'ach_frostfire_desc',    check: (_,r)=>r.hasFrostFire && r.fireChance>0 && r.freezeChance>0 },
  { id:'stormking',    icon:'⛈️', nameKey:'ach_stormking_name',    descKey:'ach_stormking_desc',    check: (_,r)=>r.hasStormKing },
  { id:'big_spender',  icon:'🤑', nameKey:'ach_big_spender_name',  descKey:'ach_big_spender_desc',  check: p=>p.totalGoldSpent>=50 },
  { id:'skill_master', icon:'🧠', nameKey:'ach_skill_master_name', descKey:'ach_skill_master_desc', check: p=>Object.keys(p.skillLevels).length>=5 },
  { id:'tycoon',       icon:'🏆', nameKey:'ach_tycoon_name',       descKey:'ach_tycoon_desc',       check: (_,r)=>r.hasTimberTycoon },
  { id:'auto_master',  icon:'🤖', nameKey:'ach_auto_master_name',  descKey:'ach_auto_master_desc',  check: (_,r)=>r.autoChopSpeed>=3 },
]

// Convenience accessors that resolve the current-language name/desc.
export function achName(ach) { return t(ach.nameKey) }
export function achDesc(ach) { return t(ach.descKey) }

export function checkAchievements(onUnlock) {
  ACHIEVEMENTS.forEach(ach => {
    if (!persist.achievements.has(ach.id)) {
      if (ach.check(persist, run)) {
        persist.achievements.add(ach.id)
        if (onUnlock) onUnlock(ach)
      }
    }
  })
}

export function renderAchievements() {
  const grid = document.getElementById('ach-grid')
  const label = document.getElementById('ach-progress-label')
  if (!grid) return

  const done = persist.achievements.size
  label.textContent = t('achProgress', done, ACHIEVEMENTS.length)

  grid.innerHTML = ''
  ACHIEVEMENTS.forEach(ach => {
    const unlocked = persist.achievements.has(ach.id)
    const div = document.createElement('div')
    div.className = `ach${unlocked ? ' done' : ''}`
    div.innerHTML = `
      <div class="a-icon">${unlocked ? ach.icon : '🔒'}</div>
      <div class="a-body">
        <div class="a-name">${achName(ach)}</div>
        <div class="a-desc">${unlocked ? achDesc(ach) : '???'}</div>
      </div>
    `
    grid.appendChild(div)
  })
}
