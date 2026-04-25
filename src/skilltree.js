import { persist } from './state.js'

export const SKILL_NODES = [
  { id:'axe',        icon:'🪓', name:'도끼 강화 I',    maxLv:5, baseCost:50,  costScale:2.0, currency:'logs', desc: lv=>`데미지 +${lv*2}` },
  { id:'log_expert', icon:'🪵', name:'통나무 전문가',  maxLv:5, baseCost:40,  costScale:1.8, currency:'logs', desc: lv=>`통나무 +${lv*50}%` },
  { id:'gold_digger',icon:'💰', name:'금맥 탐사',      maxLv:5, baseCost:60,  costScale:2.0, currency:'gold', desc: lv=>`골드 +${lv*50}%` },
  { id:'autopilot',  icon:'🤖', name:'자동 조종',      maxLv:4, baseCost:120, costScale:2.5, currency:'logs', desc: lv=>`자동벌목 +${lv*0.3}회/초` },
  { id:'storm_caller',icon:'⚡',name:'폭풍 부름이',    maxLv:3, baseCost:200, costScale:3.0, currency:'gold', desc: lv=>`번개 로그 확률 +${lv*10}%` },
  { id:'time_warper', icon:'❄️',name:'시간 왜곡자',    maxLv:3, baseCost:200, costScale:3.0, currency:'gold', desc: lv=>`얼음 로그 확률 +${lv*10}%` },
  { id:'fire_master', icon:'🔥',name:'불꽃 마스터',    maxLv:3, baseCost:180, costScale:2.8, currency:'gold', desc: lv=>`불 로그 확률 +${lv*10}%` },
  { id:'gold_sense',  icon:'💎',name:'황금 감각',      maxLv:3, baseCost:150, costScale:2.5, currency:'gold', desc: lv=>`황금 로그 확률 +${lv*8}%` },
  { id:'xp_boost',    icon:'✨',name:'경험 증폭',      maxLv:3, baseCost:80,  costScale:2.2, currency:'logs', desc: lv=>`XP 획득 +${lv*20}%` },
  { id:'workers',     icon:'👷',name:'자동 벌목꾼',   maxLv:4, baseCost:300, costScale:3.0, currency:'logs', desc: lv=>`벌목꾼 ${lv}명 자동 배치` },
  { id:'round_time',  icon:'⏱️',name:'라운드 연장',   maxLv:4, baseCost:120, costScale:2.0, currency:'logs', desc: lv=>`라운드 시간 +${lv*5}초` },
  { id:'crit_chance', icon:'🎯',name:'예리한 감각',   maxLv:5, baseCost:80,  costScale:2.0, currency:'logs', desc: lv=>`치명타 확률 +${lv*10}%` },
  { id:'crit_power',  icon:'💥',name:'파괴적 일격',   maxLv:5, baseCost:150, costScale:2.5, currency:'gold', desc: lv=>`치명타 배율 ×${(1+lv*0.8).toFixed(1)} → 통나무 최대 ${Math.floor(Math.pow(2,(1+lv*0.8)-1))+1}개` },
  // ── 통나무 폭발 브랜치 ──
  { id:'log_burst',   icon:'🌪️',name:'통나무 폭발',   maxLv:5, baseCost:100, costScale:2.2, currency:'logs', desc: lv=>`벌목 시 통나무 +${lv*2}개 (치명타 무관)` },
  { id:'log_chain',   icon:'🔗',name:'연쇄 분열',     maxLv:4, baseCost:200, costScale:2.8, currency:'gold', desc: lv=>`통나무 1개당 ${lv*20}% 확률로 1개 추가 연쇄` },
  // ── 로봇 강화 ──
  { id:'robot_init',  icon:'🤖',name:'로봇 선배치',   maxLv:5, baseCost:400, costScale:3.0, currency:'gold', desc: lv=>`런 시작 시 로봇 ${lv}대 자동 배치` },
  { id:'robot_speed', icon:'⚡',name:'로봇 가속',      maxLv:3, baseCost:200, costScale:2.5, currency:'logs', desc: lv=>`로봇 이동속도 +${lv*35}%` },
  { id:'robot_range', icon:'🔍',name:'로봇 탐지기',   maxLv:3, baseCost:180, costScale:2.2, currency:'gold', desc: lv=>`로봇 수집 범위 +${lv*25}%` },
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
    const currentDesc = lv > 0 ? `현재: ${node.desc(lv)}` : ''
    const nextDesc    = maxed ? '' : `→ ${node.desc(lv + 1)}`
    div.innerHTML = `
      <div class="s-icon">${node.icon}</div>
      <div class="s-name">${node.name}</div>
      <div class="s-lv">Lv ${lv}/${node.maxLv}</div>
      <div class="s-desc">${nextDesc}${currentDesc && nextDesc ? '<br>' : ''}${currentDesc}</div>
      ${maxed ? '<div class="s-cost" style="color:#4ade80">✓ 최대</div>'
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
