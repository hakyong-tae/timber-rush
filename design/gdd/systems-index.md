# Systems Index: Timber Rush

> Last Updated: 2026-04-22
> Total Systems: 6 | Designed: 0 | Approved: 0

## Progress Tracker

| Phase | Systems | Designed | Approved |
|-------|---------|----------|----------|
| MVP   | 6       | 0        | 0        |

---

## System Map

| Priority | System | Layer | Category | Status | Design Doc | Depends On |
|----------|--------|-------|----------|--------|------------|------------|
| 1 | **Chop System** | Foundation | Combat / Core Mechanic | Not Started | — | — |
| 2 | **Resource System** | Foundation | Economy | Not Started | — | Chop System |
| 3 | **Tree System** | Foundation | Level/World | Not Started | — | Chop System |
| 4 | **Upgrade System** | Player-facing | Progression | Not Started | — | Resource System |
| 5 | **Skill Tree System** | Player-facing | Progression | Not Started | — | Upgrade System, Resource System |
| 6 | **Character System** | Player-facing | Animation | Not Started | — | Chop System |

---

## System Descriptions

### 1. Chop System (Priority 1)
- **What it does**: 플레이어 클릭/자동 벌목 입력을 받아 데미지를 계산하고 나무에 적용
- **Player interaction**: Active (click) + Passive (auto-chop when unlocked)
- **Key outputs**: damage value → Tree System, chop event → Resource System, Character System

### 2. Resource System (Priority 2)
- **What it does**: 통나무·골드 수집, 배수 계산, 화면에 파티클 표시
- **Player interaction**: Passive (auto-collect)
- **Key outputs**: logs count, gold count → Upgrade System, Skill Tree System

### 3. Tree System (Priority 3)
- **What it does**: 나무 HP 관리, 티어별 나무 스폰, 쓰러짐 애니메이션, 라운드 진행
- **Player interaction**: Passive (visual target)
- **Key outputs**: tree HP percent → UI, fell event → Resource System (bonus), round number

### 4. Upgrade System (Priority 4)
- **What it does**: 골드로 즉시 구매하는 반복 강화. 레벨당 비용 스케일링 적용
- **Player interaction**: Active (buy button)
- **Key outputs**: damage, logMultiplier, goldMultiplier, autoChopSpeed → Chop System, Resource System

### 5. Skill Tree System (Priority 5)
- **What it does**: 골드로 한 번만 해금하는 노드 트리. 선행 스킬 필요
- **Player interaction**: Active (one-time purchase per node)
- **Key outputs**: permanent stat boosts, unlocked abilities → Chop System, Resource System

### 6. Character System (Priority 6)
- **What it does**: 나무꾼 캐릭터 렌더링, idle/swing/impact 애니메이션
- **Player interaction**: Passive (visual feedback)
- **Key outputs**: swing animation sync with chop event
