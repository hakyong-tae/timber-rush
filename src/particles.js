import { Graphics, Text, TextStyle, Container } from 'pixi.js'
import { t } from './i18n.js'

class Particle {
  constructor(stage, x, y, text, color, vx, vy) {
    this.stage = stage
    this.life = 1.0
    this.decay = 0.018 + Math.random() * 0.012

    this.label = new Text(text, new TextStyle({
      fontSize: 18 + Math.random() * 8,
      fontWeight: 'bold',
      fill: color,
      dropShadow: true,
      dropShadowDistance: 2,
      dropShadowColor: '#000',
    }))
    this.label.anchor.set(0.5)
    this.label.x = x
    this.label.y = y
    this.vx = vx
    this.vy = vy
    this.gravity = 0.15
    stage.addChild(this.label)
  }

  update(delta) {
    this.vy += this.gravity * delta
    this.label.x += this.vx * delta
    this.label.y += this.vy * delta
    this.life -= this.decay * delta
    this.label.alpha = this.life
    this.label.scale.set(0.8 + this.life * 0.4)
  }

  isDead() { return this.life <= 0 }

  destroy() { this.stage.removeChild(this.label) }
}

class ChipParticle {
  constructor(stage, x, y) {
    this.stage = stage
    this.life = 1.0
    this.g = new Graphics()
    this.g.beginFill(Math.random() > 0.5 ? 0x8B4513 : 0x4ade80)
    const size = 4 + Math.random() * 6
    this.g.drawRect(-size / 2, -size / 2, size, size)
    this.g.endFill()
    this.g.x = x + (Math.random() - 0.5) * 30
    this.g.y = y
    this.vx = (Math.random() - 0.5) * 5
    this.vy = -3 - Math.random() * 4
    this.vr = (Math.random() - 0.5) * 0.2
    stage.addChild(this.g)
  }

  update(delta) {
    this.vy += 0.2 * delta
    this.g.x += this.vx * delta
    this.g.y += this.vy * delta
    this.g.rotation += this.vr * delta
    this.life -= 0.025 * delta
    this.g.alpha = this.life
  }

  isDead() { return this.life <= 0 }
  destroy() { this.stage.removeChild(this.g) }
}

export class ParticleSystem {
  constructor(stage) {
    this.stage = stage
    this.particles = []
  }

  spawnLog(x, y, count) {
    for (let i = 0; i < Math.min(count, 3); i++) {
      this.particles.push(new Particle(
        this.stage, x, y,
        `🪵 +${count}`,
        '#86efac',
        (Math.random() - 0.5) * 3,
        -4 - Math.random() * 3
      ))
    }
  }

  spawnGold(x, y, amount) {
    this.particles.push(new Particle(
      this.stage, x, y,
      `💰 +${amount}`,
      '#fbbf24',
      (Math.random() - 0.5) * 2,
      -3 - Math.random() * 2
    ))
  }

  spawnChipEffect(x, y) {
    for (let i = 0; i < 5; i++) {
      this.particles.push(new ChipParticle(this.stage, x, y))
    }
  }

  spawnBigReward(x, y, gold) {
    this.particles.push(new Particle(
      this.stage, x, y,
      t('bonusGold', gold),
      '#f59e0b',
      0,
      -6
    ))
  }

  update(delta) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.update(delta)
      if (p.isDead()) {
        p.destroy()
        this.particles.splice(i, 1)
      }
    }
  }
}
