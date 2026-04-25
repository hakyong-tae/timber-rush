import { persist, run } from './state.js'

export const ACHIEVEMENTS = [
  { id:'first_chop',   icon:'🪓', name:'첫 벌목',          desc:'처음으로 나무를 벴다',           check: p=>p.totalChops>=1 },
  { id:'chop10',       icon:'💪', name:'벌목 입문',         desc:'총 10번 벌채',                  check: p=>p.totalChops>=10 },
  { id:'chop100',      icon:'🌟', name:'숙련 벌목꾼',       desc:'총 100번 벌채',                 check: p=>p.totalChops>=100 },
  { id:'chop1000',     icon:'🏅', name:'전설의 벌목꾼',     desc:'총 1000번 벌채',                check: p=>p.totalChops>=1000 },
  { id:'level5',       icon:'⬆️', name:'레벨 5 달성',       desc:'런에서 레벨 5 달성',            check: p=>p.bestLevel>=5 },
  { id:'level10',      icon:'🔝', name:'레벨 10 달성',      desc:'런에서 레벨 10 달성',           check: p=>p.bestLevel>=10 },
  { id:'level15',      icon:'👑', name:'레벨 마스터',       desc:'런에서 레벨 15 달성',           check: p=>p.bestLevel>=15 },
  { id:'run3',         icon:'🔄', name:'3런 완주',          desc:'3번의 런 완주',                 check: p=>p.totalRuns>=3 },
  { id:'run10',        icon:'♾️', name:'런 중독',           desc:'10번의 런 완주',                check: p=>p.totalRuns>=10 },
  { id:'logs1000',     icon:'🪵', name:'통나무 부자',       desc:'통나무 1000개 획득',            check: p=>p.totalLogsEarned>=1000 },
  { id:'gold500',      icon:'💰', name:'골드 500',          desc:'골드 500 획득',                 check: p=>p.totalGoldEarned>=500 },
  { id:'tree3',        icon:'🌲', name:'숲 개척자',         desc:'한 런에 나무 3그루 벌채',       check: (_,r)=>r.treesCleared>=3 },
  { id:'tree5',        icon:'🌳', name:'숲의 파괴자',       desc:'한 런에 나무 5그루 벌채',       check: (_,r)=>r.treesCleared>=5 },
  { id:'legendary',    icon:'🌟', name:'전설 카드',         desc:'전설 등급 카드 획득',           check: (_,r)=>r.cards.some(id=>['godaxe','timewarp','goldrush'].includes(id)) },
  { id:'frostfire',    icon:'🌡️', name:'화염 빙하',         desc:'화염 빙하 시너지 발동',         check: (_,r)=>r.hasFrostFire && r.fireChance>0 && r.freezeChance>0 },
  { id:'stormking',    icon:'⛈️', name:'폭풍왕',           desc:'폭풍왕 카드 획득',              check: (_,r)=>r.hasStormKing },
  { id:'big_spender',  icon:'🤑', name:'황금 손',           desc:'골드 50 소비',                  check: p=>p.totalGoldSpent>=50 },
  { id:'skill_master', icon:'🧠', name:'스킬 마스터',       desc:'스킬 트리 5개 해금',            check: p=>Object.keys(p.skillLevels).length>=5 },
  { id:'tycoon',       icon:'🏆', name:'목재왕',            desc:'목재왕 카드 획득',              check: (_,r)=>r.hasTimberTycoon },
  { id:'auto_master',  icon:'🤖', name:'자동화 달인',       desc:'자동벌목 속도 3 이상',          check: (_,r)=>r.autoChopSpeed>=3 },
]

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
  label.textContent = `${done} / ${ACHIEVEMENTS.length} 달성`

  grid.innerHTML = ''
  ACHIEVEMENTS.forEach(ach => {
    const unlocked = persist.achievements.has(ach.id)
    const div = document.createElement('div')
    div.className = `ach${unlocked ? ' done' : ''}`
    div.innerHTML = `
      <div class="a-icon">${unlocked ? ach.icon : '🔒'}</div>
      <div class="a-body">
        <div class="a-name">${ach.name}</div>
        <div class="a-desc">${unlocked ? ach.desc : '???'}</div>
      </div>
    `
    grid.appendChild(div)
  })
}
