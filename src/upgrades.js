import { t } from './i18n.js'

// NOTE: this module is currently unused by main.js (legacy code). It is kept
// for compatibility but all user-facing strings now route through i18n.
//
// Upgrades expose `name`/`desc` as getters so the active language is reflected
// even if an Upgrade instance is created once and held for the lifetime of
// the run.

export class Upgrade {
  constructor({ nameKey, icon, baseCost, costScale, maxLevel, hidden, descFn, buyFn }) {
    this.nameKey = nameKey
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

  get name() { return t(this.nameKey) }

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
        nameKey: 'skill_axe_name',
        icon: '🪓',
        baseCost: 10,
        costScale: 1.6,
        descFn: (lv) => `${t('skillCurrent', `+${1 + lv}`)}`,
        buyFn: (s) => { s.damage += 1 },
      }),
      new Upgrade({
        nameKey: 'card_crit1_name',
        icon: '⚡',
        baseCost: 50,
        costScale: 2.0,
        maxLevel: 10,
        descFn: (lv) => `${t('skillCurrent', `+${1 + lv * 3}`)}`,
        buyFn: (s) => { s.damage += 3 },
      }),
      new Upgrade({
        nameKey: 'skill_log_expert_name',
        icon: '🪵',
        baseCost: 30,
        costScale: 1.8,
        maxLevel: 10,
        descFn: (lv) => `${t('skillCurrent', `×${1 + lv}`)}`,
        buyFn: (s) => { s.logMultiplier += 1 },
      }),
      new Upgrade({
        nameKey: 'skill_gold_digger_name',
        icon: '💎',
        baseCost: 40,
        costScale: 1.9,
        maxLevel: 10,
        descFn: (lv) => `${t('skillCurrent', `×${1 + lv}`)}`,
        buyFn: (s) => { s.goldMultiplier += 1 },
      }),
      new Upgrade({
        nameKey: 'skill_autopilot_name',
        icon: '🤖',
        baseCost: 200,
        costScale: 3.0,
        maxLevel: 8,
        descFn: (lv) => `${t('skillCurrent', `${0.5 + lv * 0.5}/s`)}`,
        buyFn: (s) => { s.autoChopSpeed += 0.5 },
      }),
      new Upgrade({
        nameKey: 'card_dmg_mult_name',
        icon: '💥',
        baseCost: 500,
        costScale: 2.5,
        maxLevel: 5,
        descFn: (lv) => `${t('skillCurrent', `×${Math.pow(2, lv)}`)}`,
        buyFn: (s) => { s.damage *= 2 },
      }),
      new Upgrade({
        nameKey: 'card_goldrush_name',
        icon: '🏆',
        baseCost: 1000,
        costScale: 3.5,
        maxLevel: 5,
        descFn: (lv) => `${t('skillCurrent', `×${Math.pow(2, lv)}`)}`,
        buyFn: (s) => { s.goldMultiplier *= 2 },
      }),
      new Upgrade({
        nameKey: 'card_godaxe_name',
        icon: '⚡🪓',
        baseCost: 2000,
        costScale: 4.0,
        maxLevel: 3,
        hidden: true,
        descFn: (lv) => `Lv ${lv + 1}`,
        buyFn: (s) => { s.damage += 10 },
      }),
    ]

    // Unlock hidden upgrades when enough gold spent
    this._watchState(state)
  }

  _watchState(state) {
    const autoCheck = setInterval(() => {
      if (state.gold >= 500) {
        const thunder = this.all.find(u => u.nameKey === 'card_godaxe_name')
        if (thunder) thunder.unlocked = true
      }
    }, 1000)
  }
}
