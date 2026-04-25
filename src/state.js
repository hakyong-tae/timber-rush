// ── Persistent State (survives runs) ──
export const persist = {
  logs: 0,
  gold: 0,
  totalRuns: 0,
  totalChops: 0,
  totalLogsEarned: 0,
  totalGoldEarned: 0,
  bestLevel: 1,
  bestTreesCleared: 0,
  skillLevels: {}, // id -> level
  achievements: new Set(),
  autoEnabled: false,
}

// ── Run State (reset each run) ──
export const run = {
  level: 1,
  xp: 0,
  xpToNext: 80,
  cards: [],        // picked card ids this run
  treesCleared: 0,
  runNum: 1,
  // derived stats (base + skill bonuses + card bonuses)
  damage: 1,
  logMult: 1,
  goldMult: 1,
  autoChopSpeed: 0,
  multiHit: 1,
  lightningChance: 0,
  freezeChance: 0,
  magnetChance: 0,
  fireChance: 0,
  goldenChance: 0,
  // auto workers
  autoWorkers: 0,
  hiredWorkers: 0,   // bought via Team tab this run (resets each run)
  // robot collectors
  robotCount: 0,     // # of log-collecting robots (earned via card, stacks)
  robotSpeed:  1.0,  // 이동속도 배율 (스킬로 증가)
  robotRadius: 1.0,  // 수집 범위 배율 (스킬로 증가)
  // synergies
  hasFrostFire: false,
  hasStormKing: false,
  hasTimberTycoon: false,
  bonusRoundTime: 0,   // extra seconds per round (from skill tree)
  // ── 치명타 시스템 ──
  critChance: 0.15,    // 기본 15% 치명타 확률 (카드/스킬로 증가)
  critMult:   1.0,     // 치명타 배율 — 지수 스케일로 로그 개수 결정
  // ── 통나무 폭발 브랜치 ──
  logBurst:   0,       // 벌목 시 무조건 추가되는 통나무 개수 (치명타 무관)
  logChain:   0,       // 통나무 1개당 추가 연쇄 확률 (0.0~1.0)
}

export function resetRun() {
  run.level = 1
  run.xp = 0
  run.xpToNext = 80
  run.cards = []
  run.treesCleared = 0

  // Base stats (from skill tree)
  const sk = persist.skillLevels
  run.damage = 1 + (sk['axe'] || 0) * 2
  run.logMult = 1 + (sk['log_expert'] || 0) * 0.5
  run.goldMult = 1 + (sk['gold_digger'] || 0) * 0.5
  run.autoChopSpeed = (sk['autopilot'] || 0) * 0.3
  run.hiredWorkers  = 0
  run.autoWorkers   = (sk['workers']   || 0)
  run.robotCount  = (sk['robot_init']  || 0)       // 스킬 보유 시 런 시작부터 배치
  run.robotSpeed  = 1.0 + (sk['robot_speed']  || 0) * 0.35
  run.robotRadius = 1.0 + (sk['robot_range']  || 0) * 0.25
  run.multiHit = 1
  run.lightningChance = (sk['storm_caller'] || 0) * 0.1
  run.freezeChance = (sk['time_warper'] || 0) * 0.1
  run.magnetChance = 0
  run.fireChance = (sk['fire_master'] || 0) * 0.1
  run.goldenChance = (sk['gold_sense'] || 0) * 0.08
  run.hasFrostFire = false
  run.hasStormKing = false
  run.hasTimberTycoon = false
  run.bonusRoundTime = (sk['round_time'] || 0) * 5   // +5초 per level
  run.critChance = 0.15 + (sk['crit_chance'] || 0) * 0.10
  run.critMult   = 1.0  + (sk['crit_power']  || 0) * 0.80
  run.logBurst   = (sk['log_burst'] || 0) * 2        // 레벨당 +2개 고정 추가
  run.logChain   = (sk['log_chain'] || 0) * 0.20     // 레벨당 +20% 연쇄 확률
}

export function addXP(amount) {
  run.xp += amount
  let leveled = false
  while (run.xp >= run.xpToNext) {
    run.xp -= run.xpToNext
    run.level++
    run.xpToNext = Math.floor(80 * Math.pow(1.35, run.level - 1))
    leveled = true
  }
  if (run.level > persist.bestLevel) persist.bestLevel = run.level
  return leveled
}
