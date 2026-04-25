export class Upgrade {
  constructor({ name, icon, baseCost, costScale, maxLevel, hidden, descFn, buyFn }) {
    this.name = name
    this.icon = icon
    this.baseCost = baseCost
    this.costScale = costScale
    this.maxLevel = maxLevel || Infinity
    this.hidden = hidden || false
    this._desc = descFn
    this._buy = buyFn
    this.level = 0
    this.unlocked = !hidden
  }

  currentCost() {
    return Math.floor(this.baseCost * Math.pow(this.costScale, this.level))
  }

  desc() { return this._desc(this.level) }

  buy(state) {
    if (this.level >= this.maxLevel) return
    this._buy(state, this.level)
    this.level++
  }
}

export class UpgradeSystem {
  constructor(state) {
    this.all = [
      new Upgrade({
        name: '도끼 강화',
        icon: '🪓',
        baseCost: 10,
        costScale: 1.6,
        descFn: (lv) => `타격 데미지 +1 (현재: ${1 + lv})`,
        buyFn: (s) => { s.damage += 1 },
      }),
      new Upgrade({
        name: '날카로운 날',
        icon: '⚡',
        baseCost: 50,
        costScale: 2.0,
        maxLevel: 10,
        descFn: (lv) => `데미지 +3 (현재: ${1 + lv * 3})`,
        buyFn: (s) => { s.damage += 3 },
      }),
      new Upgrade({
        name: '통나무 전문가',
        icon: '🪵',
        baseCost: 30,
        costScale: 1.8,
        maxLevel: 10,
        descFn: (lv) => `통나무 획득량 +1 (현재: ×${1 + lv})`,
        buyFn: (s) => { s.logMultiplier += 1 },
      }),
      new Upgrade({
        name: '금맥 발견',
        icon: '💎',
        baseCost: 40,
        costScale: 1.9,
        maxLevel: 10,
        descFn: (lv) => `골드 획득량 +1 (현재: ×${1 + lv})`,
        buyFn: (s) => { s.goldMultiplier += 1 },
      }),
      new Upgrade({
        name: '자동 벌목기',
        icon: '🤖',
        baseCost: 200,
        costScale: 3.0,
        maxLevel: 8,
        descFn: (lv) => lv === 0
          ? '자동으로 나무를 벱니다 (0.5회/초)'
          : `자동벌목 속도 +0.5회/초 (현재: ${0.5 + lv * 0.5}회/초)`,
        buyFn: (s) => { s.autoChopSpeed += 0.5 },
      }),
      new Upgrade({
        name: '폭발 도끼',
        icon: '💥',
        baseCost: 500,
        costScale: 2.5,
        maxLevel: 5,
        descFn: (lv) => `타격 데미지 ×2 (현재: 스택 ${lv})`,
        buyFn: (s) => { s.damage *= 2 },
      }),
      new Upgrade({
        name: '황금 도끼',
        icon: '🏆',
        baseCost: 1000,
        costScale: 3.5,
        maxLevel: 5,
        descFn: (lv) => `골드 배수 ×2 (현재: ×${Math.pow(2, lv)})`,
        buyFn: (s) => { s.goldMultiplier *= 2 },
      }),
      new Upgrade({
        name: '번개 도끼',
        icon: '⚡🪓',
        baseCost: 2000,
        costScale: 4.0,
        maxLevel: 3,
        hidden: true,
        descFn: (lv) => `10% 확률로 데미지 10배 (레벨 ${lv + 1})`,
        buyFn: (s) => { s.damage += 10 },
      }),
    ]

    // Unlock hidden upgrades when enough gold spent
    this._watchState(state)
  }

  _watchState(state) {
    const autoCheck = setInterval(() => {
      if (state.gold >= 500) {
        const thunder = this.all.find(u => u.name === '번개 도끼')
        if (thunder) thunder.unlocked = true
      }
    }, 1000)
  }
}
