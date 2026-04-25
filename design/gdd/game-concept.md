# Game Concept: Timber Rush

> **Genre**: Incremental Clicker / Idle Roguelite
> **Platform**: Web (Browser, Verse8)
> **Engine**: PixiJS v7 + Vite
> **Target Session**: 5–30 minutes

## Elevator Pitch

나무를 베어 자원을 모으고, 업그레이드를 쌓아 더 강해지는 인크리멘탈 클리커. 매 라운드 더 거대한 나무가 등장하고, 스킬트리로 플레이 스타일을 선택할 수 있다.

## Core Loop

```
클릭(나무 벌목) → 통나무/골드 획득 → 업그레이드 구매 → 더 강한 도끼
                                              ↓
                                      스킬트리 해금 → 새로운 플레이 스타일
                                              ↓
                                   나무 HP 0 → 쓰러짐 → 더 큰 나무 스폰 (라운드 상승)
```

## Game Pillars

1. **만족스러운 타격감** — 클릭 한 번에 파티클, 흔들림, 사운드가 즉각 반응
2. **끝없는 성장** — 숫자가 계속 커지고, 업그레이드가 새로운 업그레이드를 열어줌
3. **선택의 의미** — 스킬트리에서 데미지 vs 골드 vs 자동화 중 하나를 골라야 함

## MDA Aesthetics Target

- **Primary**: Sensation (타격 피드백), Fellowship (숫자 성장 공유)
- **Secondary**: Achievement (라운드 클리어, 스킬 해금)

## Player Fantasy

> "나는 전설의 나무꾼이다. 내 도끼 한 번에 산이 흔들린다."

## Scope (MVP)

- 나무 5티어 (어린 나무 → 신목)
- 업그레이드 7종
- 스킬트리 9개 노드
- 자동벌목 시스템
- 캐릭터 애니메이션 (나무꾼)
