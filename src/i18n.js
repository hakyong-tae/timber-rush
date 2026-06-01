// ── i18n: single source of truth for all visible game strings ──
//
// English is the default. Korean is selectable via the in-game Settings panel.
// Other modules import `t(key)` for current-language lookup, and may call
// `subscribe(fn)` to be notified when the language changes (so they can
// rebuild any cached DOM content / re-render dynamic UI).

const STRINGS = {
  en: {
    // ── Generic UI ──
    settings:         'Settings',
    language:         'Language',
    selectLang:       'Select Language',
    volume:           'Volume',
    sfxVolume:        'SFX Volume',
    nowPlaying:       'Now Playing',
    playlist:         'Playlist',
    noTracks:         'Add mp3 files to src/assets/bgm/ folder',
    danger:           'Danger Zone',
    giveUp:           '🏳️ Give Up Run',
    close:            '✕ Close',
    or:               'or',
    use:              'Use',
    move:             'Move',
    menu:             'MENU',

    // ── Rotate overlay ──
    rotateTitle:      'Please rotate your device',
    rotateBody1:      'Please rotate your device to landscape',
    rotateBody2:      'This game requires landscape orientation',

    // ── Card / level-up overlay ──
    levelUp:          '⬆️ LEVEL UP!',
    levelUpSub:       (lv) => `Level ${lv} reached — pick a card`,

    // ── Round end overlay ──
    round:            'Round',
    chopResult:       '🪵 Chop Result',
    upgrade:          '⬆️ Upgrade',
    nextRound:        '▶ Next Round',
    nextRoundStart:   '▶ Start Next Round',

    // ── Upgrade panel ──
    upgradeTitle:     '⬆️ Upgrade',
    upgradeSub:       'Choose permanent upgrades between rounds',
    tabSkill:         '🌳 Skills',
    tabTeam:          '👷 Team',
    tabAch:           '🏆 Achievements',
    teamHint:         'Hire automatic lumberjacks to chop trees automatically (lasts the run)',
    achProgress:      (done, total) => `${done} / ${total} unlocked`,

    // ── Team tab ──
    lumberjack:       'Lumberjack',
    statusSkill:      'Skill Tree',
    statusHired:      'Hired ✓',
    statusLocked:     'Locked',
    statusCost:       (cost) => `🪵 ${cost} logs`,
    btnHire:          'Hire',
    btnInsuff:        '🪵 Not enough',

    // ── Run end overlay ──
    runEndTitle:      '🎉 World Tree Felled!',
    runEndSub:        'Run complete',
    runEndChop:       '🪓 Run Ended!',
    runEndStats:      (n, rd, m, s) => `Run ${n} · Round ${rd} · ${m}m ${s}s`,
    statBestLevel:    'Best Level',
    statLogsEarned:   'Logs Earned',
    statGoldEarned:   'Gold Earned',
    statTotalChops:   'Total Chops',
    chopCountUnit:    'x',
    levelPrefix:      'Lv.',
    newRun:           '🪓 New Run',
    viewUpgrade:      '⬆️ View Upgrades',

    // ── Round end stat rows ──
    roundLogsEarned:  '🪵 Logs Earned',
    roundGoldEarned:  '💰 Gold Earned',
    roundChopCount:   '🪓 Chops',

    // ── Tier names ──
    tier_common:      'Common',
    tier_uncommon:    'Uncommon',
    tier_rare:        'Rare',
    tier_legendary:   'Legendary',

    // ── Confirm dialogs ──
    confirmGiveUp:    'Give up this run?',

    // ── Achievement notification ──
    achUnlocked:      '🏆 Achievement Unlocked!',

    // ── Canvas HUD / status ──
    autoChopping:     '🪓 Auto-Chopping',
    timeUp:           "TIME'S UP!",
    statusFrozen:     'Frozen',
    statusBurning:    'Burning',

    // ── Float texts (gameplay) ──
    critHit:          (count) => `💥 CRIT! ×${count}`,
    goldenLog:        'Golden Log!',
    lightningProc:    '⚡ Lightning Strike!',
    chainLightning:   '⚡⚡⚡ Chain Lightning!',
    freeze5x:         '❄️ 5x Collection!',
    magnetBulk:       (n) => `🧲 +${n} bulk collected!`,
    burnStart:        '🔥 Burning!',
    explode:          '💥 Explosion!',
    bonusGold:        (g) => `🎉 Bonus +${g} gold!`,

    // ── Debug ──
    dbgRoundEnd:      '🛠 Round End',
    dbgLevel:         (lv) => `🛠 Level ${lv}`,
    dbgAllMax:        '🛠 ALL SKILLS MAX',

    // ── Skill node descriptions: current/next prefix ──
    skillCurrent:     (desc) => `Current: ${desc}`,
    skillMaxed:       '✓ MAX',

    // ── Skill names + descriptions ──
    skill_axe_name:        'Axe Upgrade I',
    skill_axe_desc:        (lv) => `Damage +${lv * 2}`,
    skill_log_expert_name: 'Log Expert',
    skill_log_expert_desc: (lv) => `Logs +${lv * 50}%`,
    skill_gold_digger_name:'Gold Prospector',
    skill_gold_digger_desc:(lv) => `Gold +${lv * 50}%`,
    skill_autopilot_name:  'Autopilot',
    skill_autopilot_desc:  (lv) => `Auto-chop +${lv * 0.3}/sec`,
    skill_storm_caller_name:'Storm Caller',
    skill_storm_caller_desc:(lv) => `Lightning log chance +${lv * 10}%`,
    skill_time_warper_name:'Time Warper',
    skill_time_warper_desc:(lv) => `Ice log chance +${lv * 10}%`,
    skill_fire_master_name:'Fire Master',
    skill_fire_master_desc:(lv) => `Fire log chance +${lv * 10}%`,
    skill_gold_sense_name: 'Golden Sense',
    skill_gold_sense_desc: (lv) => `Golden log chance +${lv * 8}%`,
    skill_xp_boost_name:   'XP Amplifier',
    skill_xp_boost_desc:   (lv) => `XP gain +${lv * 20}%`,
    skill_workers_name:    'Auto Lumberjacks',
    skill_workers_desc:    (lv) => `Auto-deploy ${lv} worker${lv === 1 ? '' : 's'}`,
    skill_round_time_name: 'Round Extender',
    skill_round_time_desc: (lv) => `Round time +${lv * 5}s`,
    skill_crit_chance_name:'Sharp Senses',
    skill_crit_chance_desc:(lv) => `Crit chance +${lv * 10}%`,
    skill_crit_power_name: 'Devastating Blow',
    skill_crit_power_desc: (lv) => `Crit multi ×${(1 + lv * 0.8).toFixed(1)} → up to ${Math.floor(Math.pow(2, (1 + lv * 0.8) - 1)) + 1} logs`,
    skill_log_burst_name:  'Log Burst',
    skill_log_burst_desc:  (lv) => `+${lv * 2} logs per chop (ignores crit)`,
    skill_log_chain_name:  'Chain Split',
    skill_log_chain_desc:  (lv) => `${lv * 20}% chance per log to spawn an extra`,
    skill_robot_init_name: 'Robot Pre-Deploy',
    skill_robot_init_desc: (lv) => `Start run with ${lv} robot${lv === 1 ? '' : 's'}`,
    skill_robot_speed_name:'Robot Speed',
    skill_robot_speed_desc:(lv) => `Robot speed +${lv * 35}%`,
    skill_robot_range_name:'Robot Detector',
    skill_robot_range_desc:(lv) => `Robot collect range +${lv * 25}%`,

    // ── Card names + descriptions ──
    card_axe1_name:        'Sharp Blade',
    card_axe1_desc:        'Damage +3',
    card_axe2_name:        'Steel Axe',
    card_axe2_desc:        'Damage +5',
    card_log1_name:        'Log Collector',
    card_log1_desc:        'Logs gained +50%',
    card_gold1_name:       'Gold Collector',
    card_gold1_desc:       'Gold gained +50%',
    card_auto1_name:       'Auto Handle',
    card_auto1_desc:       'Auto-chop +0.5/sec',
    card_log2_name:        'Roomy Pack',
    card_log2_desc:        'Logs gained +80%',
    card_xp1_name:         'Training',
    card_xp1_desc:         'XP gain +30%',
    card_crit1_name:       'Keen Edge',
    card_crit1_desc:       'Crit chance +20%',
    card_multi1_name:      'Multi-Strike',
    card_multi1_desc:      '+1 strike per click',
    card_lightning1_name:  'Storm Bond',
    card_lightning1_desc:  'Lightning log chance +20%',
    card_freeze1_name:     'Frost Bond',
    card_freeze1_desc:     'Ice log chance +20%',
    card_magnet1_name:     'Magnet Charm',
    card_magnet1_desc:     'Magnet log chance +20%',
    card_fire1_name:       'Flame Axe',
    card_fire1_desc:       'Fire log chance +20%',
    card_golden1_name:     'Gold Instinct',
    card_golden1_desc:     'Golden log chance +15%',
    card_auto2_name:       'Automation II',
    card_auto2_desc:       'Auto-chop +1.0/sec',
    card_dmg_mult_name:    'Furious Axe',
    card_dmg_mult_desc:    'Damage ×1.5',
    card_crit_power_name:  'Devastating Blow',
    card_crit_power_desc:  'Crit multi +0.8 (logs 2x faster)',
    card_double_log_name:  'Double Harvest',
    card_double_log_desc:  'Logs & Gold ×2',
    card_storm_name:       'Storm King',
    card_storm_desc:       'Chain lightning ×3',
    card_frostfire_name:   'Flame Glacier',
    card_frostfire_desc:   'Fire+Ice synergy: explosion!',
    card_berserker_name:   'Berserker',
    card_berserker_desc:   'Damage ×2 + Auto +1',
    card_tycoon_name:      'Timber Tycoon',
    card_tycoon_desc:      'All multipliers ×1.5',
    card_godaxe_name:      'Axe of the Gods',
    card_godaxe_desc:      'Damage ×5 + Lightning +40%',
    card_timewarp_name:    'Time Warp',
    card_timewarp_desc:    'Auto-chop ×3',
    card_goldrush_name:    'Gold Rush',
    card_goldrush_desc:    'Gold ×5 + XP ×2',
    card_robot_collector_name: 'Robot Collector',
    card_robot_collector_desc: 'Auto-collect log robot +1 (max 10)',

    // ── Achievement names + descriptions ──
    ach_first_chop_name:   'First Chop',
    ach_first_chop_desc:   'Chop a tree for the first time',
    ach_chop10_name:       'Apprentice Lumberjack',
    ach_chop10_desc:       '10 total chops',
    ach_chop100_name:      'Skilled Lumberjack',
    ach_chop100_desc:      '100 total chops',
    ach_chop1000_name:     'Legendary Lumberjack',
    ach_chop1000_desc:     '1000 total chops',
    ach_level5_name:       'Level 5 Reached',
    ach_level5_desc:       'Reach level 5 in a run',
    ach_level10_name:      'Level 10 Reached',
    ach_level10_desc:      'Reach level 10 in a run',
    ach_level15_name:      'Level Master',
    ach_level15_desc:      'Reach level 15 in a run',
    ach_run3_name:         '3 Runs Complete',
    ach_run3_desc:         'Complete 3 runs',
    ach_run10_name:        'Run Addict',
    ach_run10_desc:        'Complete 10 runs',
    ach_logs1000_name:     'Log Tycoon',
    ach_logs1000_desc:     'Earn 1000 logs total',
    ach_gold500_name:      'Gold 500',
    ach_gold500_desc:      'Earn 500 gold total',
    ach_tree3_name:        'Forest Pioneer',
    ach_tree3_desc:        'Fell 3 trees in one run',
    ach_tree5_name:        'Forest Destroyer',
    ach_tree5_desc:        'Fell 5 trees in one run',
    ach_legendary_name:    'Legendary Card',
    ach_legendary_desc:    'Obtain a legendary card',
    ach_frostfire_name:    'Flame Glacier',
    ach_frostfire_desc:    'Trigger the Flame Glacier synergy',
    ach_stormking_name:    'Storm King',
    ach_stormking_desc:    'Obtain the Storm King card',
    ach_big_spender_name:  'Golden Hand',
    ach_big_spender_desc:  'Spend 50 gold',
    ach_skill_master_name: 'Skill Master',
    ach_skill_master_desc: 'Unlock 5 skill tree nodes',
    ach_tycoon_name:       'Timber King',
    ach_tycoon_desc:       'Obtain the Timber Tycoon card',
    ach_auto_master_name:  'Automation Master',
    ach_auto_master_desc:  'Auto-chop speed 3 or higher',

    // ── Tree type names + descriptions ──
    tree_basic_name:       'Basic Tree',
    tree_basic_desc:       'An ordinary tree',
    tree_golden_name:      'Golden Tree',
    tree_golden_desc:      'Drops many golden logs',
    tree_frozen_name:      'Ice Tree',
    tree_frozen_desc:      'Always frozen. Drops many ice logs',
    tree_venom_name:       'Venom Tree',
    tree_venom_desc:       'Drops many magnet logs',
    tree_fire_name:        'Fire Tree',
    tree_fire_desc:        'Always burning. Drops many fire logs',
    tree_shadow_name:      'Shadow Tree',
    tree_shadow_desc:      'Drops many explosive logs',
  },

  ko: {
    // ── Generic UI ──
    settings:         '설정',
    language:         '언어 / Language',
    selectLang:       '언어 선택',
    volume:           '볼륨',
    sfxVolume:        '효과음 볼륨',
    nowPlaying:       '현재 재생',
    playlist:         '플레이리스트',
    noTracks:         'src/assets/bgm/ 폴더에 mp3 파일을 넣어주세요',
    danger:           '위험',
    giveUp:           '🏳️ 런 포기',
    close:            '✕ 닫기',
    or:               '또는',
    use:              '사용',
    move:             '이동',
    menu:             '설정',

    // ── Rotate overlay ──
    rotateTitle:      '화면을 가로로 돌려주세요',
    rotateBody1:      'Please rotate your device to landscape',
    rotateBody2:      '이 게임은 가로 화면 전용입니다',

    // ── Card / level-up overlay ──
    levelUp:          '⬆️ LEVEL UP!',
    levelUpSub:       (lv) => `레벨 ${lv} 달성 — 카드를 선택하세요`,

    // ── Round end overlay ──
    round:            '라운드',
    chopResult:       '🪵 벌목 결과',
    upgrade:          '⬆️ 업그레이드',
    nextRound:        '▶ 다음 라운드',
    nextRoundStart:   '▶ 다음 라운드 시작',

    // ── Upgrade panel ──
    upgradeTitle:     '⬆️ 업그레이드',
    upgradeSub:       '라운드 사이 영구 강화를 선택하세요',
    tabSkill:         '🌳 스킬',
    tabTeam:          '👷 팀',
    tabAch:           '🏆 업적',
    teamHint:         '자동 벌목꾼을 고용해 나무를 자동 벌채합니다 (런 지속)',
    achProgress:      (done, total) => `${done} / ${total} 달성`,

    // ── Team tab ──
    lumberjack:       '벌목꾼',
    statusSkill:      '스킬 트리',
    statusHired:      '고용됨 ✓',
    statusLocked:     '잠금',
    statusCost:       (cost) => `🪵 ${cost} 로그`,
    btnHire:          '고용하기',
    btnInsuff:        '🪵 부족',

    // ── Run end overlay ──
    runEndTitle:      '🎉 신목 벌채 완료!',
    runEndSub:        '런 종료',
    runEndChop:       '🪓 벌목 종료!',
    runEndStats:      (n, rd, m, s) => `런 ${n} · 라운드 ${rd} · ${m}분 ${s}초`,
    statBestLevel:    '최고 레벨',
    statLogsEarned:   '획득한 통나무',
    statGoldEarned:   '획득한 골드',
    statTotalChops:   '총 도끼질',
    chopCountUnit:    '회',
    levelPrefix:      'Lv.',
    newRun:           '🪓 새 런 시작',
    viewUpgrade:      '⬆️ 업그레이드 보기',

    // ── Round end stat rows ──
    roundLogsEarned:  '🪵 획득한 통나무',
    roundGoldEarned:  '💰 획득한 골드',
    roundChopCount:   '🪓 도끼질 횟수',

    // ── Tier names ──
    tier_common:      '일반',
    tier_uncommon:    '고급',
    tier_rare:        '희귀',
    tier_legendary:   '전설',

    // ── Confirm dialogs ──
    confirmGiveUp:    '런을 포기하시겠습니까?',

    // ── Achievement notification ──
    achUnlocked:      '🏆 업적 달성!',

    // ── Canvas HUD / status ──
    autoChopping:     '🪓 자동 벌목 중',
    timeUp:           '종료!',
    statusFrozen:     '빙결',
    statusBurning:    '연소',

    // ── Float texts (gameplay) ──
    critHit:          (count) => `💥 치명타! ×${count}`,
    goldenLog:        '황금 통나무!',
    lightningProc:    '⚡ 번개 발동!',
    chainLightning:   '⚡⚡⚡ 연쇄 번개!',
    freeze5x:         '❄️ 5배 수집!',
    magnetBulk:       (n) => `🧲 +${n}개 일괄 수집!`,
    burnStart:        '🔥 연소 시작!',
    explode:          '💥 폭발!',
    bonusGold:        (g) => `🎉 보너스 +${g}골드!`,

    // ── Debug ──
    dbgRoundEnd:      '🛠 라운드 종료',
    dbgLevel:         (lv) => `🛠 레벨 ${lv}`,
    dbgAllMax:        '🛠 ALL SKILLS MAX',

    // ── Skill node descriptions: current/next prefix ──
    skillCurrent:     (desc) => `현재: ${desc}`,
    skillMaxed:       '✓ 최대',

    // ── Skill names + descriptions ──
    skill_axe_name:        '도끼 강화 I',
    skill_axe_desc:        (lv) => `데미지 +${lv * 2}`,
    skill_log_expert_name: '통나무 전문가',
    skill_log_expert_desc: (lv) => `통나무 +${lv * 50}%`,
    skill_gold_digger_name:'금맥 탐사',
    skill_gold_digger_desc:(lv) => `골드 +${lv * 50}%`,
    skill_autopilot_name:  '자동 조종',
    skill_autopilot_desc:  (lv) => `자동벌목 +${lv * 0.3}회/초`,
    skill_storm_caller_name:'폭풍 부름이',
    skill_storm_caller_desc:(lv) => `번개 로그 확률 +${lv * 10}%`,
    skill_time_warper_name:'시간 왜곡자',
    skill_time_warper_desc:(lv) => `얼음 로그 확률 +${lv * 10}%`,
    skill_fire_master_name:'불꽃 마스터',
    skill_fire_master_desc:(lv) => `불 로그 확률 +${lv * 10}%`,
    skill_gold_sense_name: '황금 감각',
    skill_gold_sense_desc: (lv) => `황금 로그 확률 +${lv * 8}%`,
    skill_xp_boost_name:   '경험 증폭',
    skill_xp_boost_desc:   (lv) => `XP 획득 +${lv * 20}%`,
    skill_workers_name:    '자동 벌목꾼',
    skill_workers_desc:    (lv) => `벌목꾼 ${lv}명 자동 배치`,
    skill_round_time_name: '라운드 연장',
    skill_round_time_desc: (lv) => `라운드 시간 +${lv * 5}초`,
    skill_crit_chance_name:'예리한 감각',
    skill_crit_chance_desc:(lv) => `치명타 확률 +${lv * 10}%`,
    skill_crit_power_name: '파괴적 일격',
    skill_crit_power_desc: (lv) => `치명타 배율 ×${(1 + lv * 0.8).toFixed(1)} → 통나무 최대 ${Math.floor(Math.pow(2, (1 + lv * 0.8) - 1)) + 1}개`,
    skill_log_burst_name:  '통나무 폭발',
    skill_log_burst_desc:  (lv) => `벌목 시 통나무 +${lv * 2}개 (치명타 무관)`,
    skill_log_chain_name:  '연쇄 분열',
    skill_log_chain_desc:  (lv) => `통나무 1개당 ${lv * 20}% 확률로 1개 추가 연쇄`,
    skill_robot_init_name: '로봇 선배치',
    skill_robot_init_desc: (lv) => `런 시작 시 로봇 ${lv}대 자동 배치`,
    skill_robot_speed_name:'로봇 가속',
    skill_robot_speed_desc:(lv) => `로봇 이동속도 +${lv * 35}%`,
    skill_robot_range_name:'로봇 탐지기',
    skill_robot_range_desc:(lv) => `로봇 수집 범위 +${lv * 25}%`,

    // ── Card names + descriptions ──
    card_axe1_name:        '날카로운 날',
    card_axe1_desc:        '데미지 +3',
    card_axe2_name:        '강철 도끼',
    card_axe2_desc:        '데미지 +5',
    card_log1_name:        '통나무 수집',
    card_log1_desc:        '통나무 획득 +50%',
    card_gold1_name:       '금화 수집',
    card_gold1_desc:       '골드 획득 +50%',
    card_auto1_name:       '자동 손잡이',
    card_auto1_desc:       '자동벌목 +0.5/초',
    card_log2_name:        '넉넉한 가방',
    card_log2_desc:        '통나무 획득 +80%',
    card_xp1_name:         '수련',
    card_xp1_desc:         'XP 획득 +30%',
    card_crit1_name:       '예리한 날',
    card_crit1_desc:       '치명타 확률 +20%',
    card_multi1_name:      '다중 타격',
    card_multi1_desc:      '클릭당 타격 +1회',
    card_lightning1_name:  '번개 친화',
    card_lightning1_desc:  '번개 로그 확률 +20%',
    card_freeze1_name:     '얼음 친화',
    card_freeze1_desc:     '얼음 로그 확률 +20%',
    card_magnet1_name:     '자석 부적',
    card_magnet1_desc:     '자석 로그 확률 +20%',
    card_fire1_name:       '불꽃 도끼',
    card_fire1_desc:       '불 로그 확률 +20%',
    card_golden1_name:     '황금 감각',
    card_golden1_desc:     '황금 로그 확률 +15%',
    card_auto2_name:       '자동화 II',
    card_auto2_desc:       '자동벌목 +1.0/초',
    card_dmg_mult_name:    '분노의 도끼',
    card_dmg_mult_desc:    '데미지 ×1.5',
    card_crit_power_name:  '파괴적 일격',
    card_crit_power_desc:  '치명타 배율 +0.8 (통나무 2배 증가)',
    card_double_log_name:  '더블 수확',
    card_double_log_desc:  '통나무 & 골드 ×2',
    card_storm_name:       '폭풍왕',
    card_storm_desc:       '번개 연쇄 3회',
    card_frostfire_name:   '화염 빙하',
    card_frostfire_desc:   '불+얼음 시너지: 폭발!',
    card_berserker_name:   '광전사',
    card_berserker_desc:   '데미지 ×2 + 자동 +1',
    card_tycoon_name:      '목재왕',
    card_tycoon_desc:      '모든 배수 ×1.5',
    card_godaxe_name:      '신의 도끼',
    card_godaxe_desc:      '데미지 ×5 + 번개 +40%',
    card_timewarp_name:    '시간 왜곡',
    card_timewarp_desc:    '자동벌목 ×3',
    card_goldrush_name:    '골드 러쉬',
    card_goldrush_desc:    '골드 ×5 + XP ×2',
    card_robot_collector_name: '로봇 수집기',
    card_robot_collector_desc: '통나무를 자동 수집하는 로봇 +1대 (최대 10대)',

    // ── Achievement names + descriptions ──
    ach_first_chop_name:   '첫 벌목',
    ach_first_chop_desc:   '처음으로 나무를 벴다',
    ach_chop10_name:       '벌목 입문',
    ach_chop10_desc:       '총 10번 벌채',
    ach_chop100_name:      '숙련 벌목꾼',
    ach_chop100_desc:      '총 100번 벌채',
    ach_chop1000_name:     '전설의 벌목꾼',
    ach_chop1000_desc:     '총 1000번 벌채',
    ach_level5_name:       '레벨 5 달성',
    ach_level5_desc:       '런에서 레벨 5 달성',
    ach_level10_name:      '레벨 10 달성',
    ach_level10_desc:      '런에서 레벨 10 달성',
    ach_level15_name:      '레벨 마스터',
    ach_level15_desc:      '런에서 레벨 15 달성',
    ach_run3_name:         '3런 완주',
    ach_run3_desc:         '3번의 런 완주',
    ach_run10_name:        '런 중독',
    ach_run10_desc:        '10번의 런 완주',
    ach_logs1000_name:     '통나무 부자',
    ach_logs1000_desc:     '통나무 1000개 획득',
    ach_gold500_name:      '골드 500',
    ach_gold500_desc:      '골드 500 획득',
    ach_tree3_name:        '숲 개척자',
    ach_tree3_desc:        '한 런에 나무 3그루 벌채',
    ach_tree5_name:        '숲의 파괴자',
    ach_tree5_desc:        '한 런에 나무 5그루 벌채',
    ach_legendary_name:    '전설 카드',
    ach_legendary_desc:    '전설 등급 카드 획득',
    ach_frostfire_name:    '화염 빙하',
    ach_frostfire_desc:    '화염 빙하 시너지 발동',
    ach_stormking_name:    '폭풍왕',
    ach_stormking_desc:    '폭풍왕 카드 획득',
    ach_big_spender_name:  '황금 손',
    ach_big_spender_desc:  '골드 50 소비',
    ach_skill_master_name: '스킬 마스터',
    ach_skill_master_desc: '스킬 트리 5개 해금',
    ach_tycoon_name:       '목재왕',
    ach_tycoon_desc:       '목재왕 카드 획득',
    ach_auto_master_name:  '자동화 달인',
    ach_auto_master_desc:  '자동벌목 속도 3 이상',

    // ── Tree type names + descriptions ──
    tree_basic_name:       '기본 나무',
    tree_basic_desc:       '평범한 나무',
    tree_golden_name:      '황금 나무',
    tree_golden_desc:      '황금 통나무가 많이 나온다',
    tree_frozen_name:      '얼음 나무',
    tree_frozen_desc:      '항상 얼어있다. 얼음 통나무가 많이 나온다',
    tree_venom_name:       '독 나무',
    tree_venom_desc:       '자석 통나무가 많이 나온다',
    tree_fire_name:        '불꽃 나무',
    tree_fire_desc:        '항상 불타고 있다. 불 통나무가 많이 나온다',
    tree_shadow_name:      '암흑 나무',
    tree_shadow_desc:      '폭발 통나무가 많이 나온다',
  },
}

// ── Runtime state ──
const DEFAULT_LANG = 'en'
let _current = localStorage.getItem('gameLanguage') || DEFAULT_LANG
if (_current !== 'en' && _current !== 'ko') _current = DEFAULT_LANG

const _subscribers = new Set()

// Lookup current-language string by key. Accepts extra args for function-valued
// entries (e.g. `t('skill_axe_desc', 3)` → "Damage +6"). Falls back to English
// if missing on the current locale, then to the raw key if still missing.
export function t(key, ...args) {
  const dict     = STRINGS[_current] || STRINGS[DEFAULT_LANG]
  const fallback = STRINGS[DEFAULT_LANG]
  const v = dict[key] !== undefined ? dict[key] : fallback[key]
  if (v === undefined) return key
  return typeof v === 'function' ? v(...args) : v
}

// Current language code ('en' | 'ko').
export function getLanguage() { return _current }

// Switch language, persist to localStorage, and notify subscribers.
export function setLanguage(lang) {
  if (lang !== 'en' && lang !== 'ko') return
  if (lang === _current) return
  _current = lang
  localStorage.setItem('gameLanguage', lang)
  _subscribers.forEach(fn => { try { fn(lang) } catch (e) { console.error('[i18n]', e) } })
}

// Register a callback to run on language change. Returns an unsubscribe fn.
export function subscribe(fn) {
  _subscribers.add(fn)
  return () => _subscribers.delete(fn)
}
