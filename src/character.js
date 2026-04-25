import { Graphics, Container } from 'pixi.js'

const SKIN = 0xf4a261
const SHIRT = 0x2563eb
const PANTS = 0x1e3a5f
const BOOT = 0x3b1f0a
const HAIR = 0x4b2c0a
const AXE_HANDLE = 0x8B5E3C
const AXE_HEAD = 0xaaaaaa

export class Character {
  constructor(stage) {
    this.stage = stage
    this.root = new Container()
    stage.addChild(this.root)

    this.cx = 200
    this.cy = 400
    this.facing = 1 // 1=right, -1=left

    // Animation state
    this.state = 'idle'
    this.idleTimer = 0
    this.swingTimer = 0
    this.swingDuration = 18 // frames
    this.swingPhase = 0 // 0=raise, 1=strike, 2=return

    this._build()
  }

  _build() {
    this.root.removeChildren()

    const s = 1.4 // scale

    // --- Legs ---
    this.legsContainer = new Container()
    const lLeg = new Graphics()
    lLeg.beginFill(PANTS)
    lLeg.drawRect(-10 * s, 0, 9 * s, 20 * s)
    lLeg.endFill()
    lLeg.beginFill(BOOT)
    lLeg.drawRect(-10 * s, 18 * s, 12 * s, 6 * s)
    lLeg.endFill()
    this.legsContainer.addChild(lLeg)

    const rLeg = new Graphics()
    rLeg.beginFill(PANTS)
    rLeg.drawRect(1 * s, 0, 9 * s, 20 * s)
    rLeg.endFill()
    rLeg.beginFill(BOOT)
    rLeg.drawRect(-1 * s, 18 * s, 12 * s, 6 * s)
    rLeg.endFill()
    this.legsContainer.addChild(rLeg)
    this.legsContainer.y = 18 * s
    this.root.addChild(this.legsContainer)

    // --- Body ---
    const body = new Graphics()
    body.beginFill(SHIRT)
    body.drawRect(-11 * s, 0, 22 * s, 20 * s)
    body.endFill()
    // Belt
    body.beginFill(0x7c3f00)
    body.drawRect(-11 * s, 17 * s, 22 * s, 4 * s)
    body.endFill()
    body.y = -2 * s
    this.root.addChild(body)

    // --- Left Arm (static, hanging) ---
    const leftArm = new Graphics()
    leftArm.beginFill(SHIRT)
    leftArm.drawRect(-5 * s, 0, 7 * s, 14 * s)
    leftArm.endFill()
    leftArm.beginFill(SKIN)
    leftArm.drawRect(-4 * s, 13 * s, 6 * s, 6 * s)
    leftArm.endFill()
    leftArm.x = -16 * s
    leftArm.y = -2 * s
    this.root.addChild(leftArm)

    // --- Right Arm + Axe (animated) ---
    this.armPivot = new Container()
    this.armPivot.x = 11 * s
    this.armPivot.y = -2 * s

    const rightArm = new Graphics()
    rightArm.beginFill(SHIRT)
    rightArm.drawRect(-3 * s, 0, 7 * s, 14 * s)
    rightArm.endFill()
    rightArm.beginFill(SKIN)
    rightArm.drawRect(-2 * s, 13 * s, 6 * s, 6 * s)
    rightArm.endFill()
    this.armPivot.addChild(rightArm)

    // Axe handle
    const handle = new Graphics()
    handle.beginFill(AXE_HANDLE)
    handle.drawRect(-2 * s, 14 * s, 4 * s, 22 * s)
    handle.endFill()
    this.armPivot.addChild(handle)

    // Axe head
    const axeHead = new Graphics()
    axeHead.beginFill(AXE_HEAD)
    axeHead.moveTo(0, 32 * s)
    axeHead.lineTo(14 * s, 24 * s)
    axeHead.lineTo(16 * s, 40 * s)
    axeHead.lineTo(0, 38 * s)
    axeHead.closePath()
    axeHead.endFill()
    axeHead.beginFill(0x888888)
    axeHead.drawRect(0, 32 * s, 3 * s, 6 * s)
    axeHead.endFill()
    this.armPivot.addChild(axeHead)

    this.root.addChild(this.armPivot)

    // --- Head ---
    const headContainer = new Container()
    headContainer.y = -24 * s

    const head = new Graphics()
    head.beginFill(SKIN)
    head.drawEllipse(0, 0, 11 * s, 12 * s)
    head.endFill()
    // Hair
    head.beginFill(HAIR)
    head.drawEllipse(0, -7 * s, 11 * s, 7 * s)
    head.endFill()
    // Eyes
    head.beginFill(0x000000)
    head.drawCircle(4 * s, 1 * s, 2 * s)
    head.endFill()
    // Mouth smile
    head.lineStyle(1.5, 0x333333)
    head.arc(3 * s, 5 * s, 3 * s, 0.2, Math.PI - 0.2)

    headContainer.addChild(head)
    this.root.addChild(headContainer)

    // Rest arm angle
    this.armPivot.rotation = -0.3
    this.restRotation = -0.3
    this.strikeRotation = 1.1
  }

  reposition(treeX, treeY, canvasWidth) {
    // Position character to the left of tree, but keep within canvas bounds
    const offset = Math.min(130, treeX * 0.55)
    this.cx = treeX - offset
    this.cy = treeY + 10
    this.root.x = this.cx
    this.root.y = this.cy
  }

  swing(onImpact) {
    if (this.state === 'swing') return
    this.state = 'swing'
    this.swingTimer = 0
    this.swingPhase = 0
    this._onImpact = onImpact
  }

  update(delta) {
    this.idleTimer += delta

    if (this.state === 'idle') {
      // Subtle bob
      this.root.y = this.cy + Math.sin(this.idleTimer * 0.05) * 1.5
      // Arm gently rests
      this.armPivot.rotation = this.restRotation + Math.sin(this.idleTimer * 0.04) * 0.05
    }

    if (this.state === 'swing') {
      this.swingTimer += delta
      const raise = 6, strike = 5, ret = 10
      const total = raise + strike + ret

      if (this.swingTimer < raise) {
        // Raise arm back
        const t = this.swingTimer / raise
        this.armPivot.rotation = this.restRotation - t * 1.2
      } else if (this.swingTimer < raise + strike) {
        // Swing forward fast
        const t = (this.swingTimer - raise) / strike
        this.armPivot.rotation = (this.restRotation - 1.2) + t * (this.strikeRotation - (this.restRotation - 1.2))
        // Impact callback at midpoint
        if (t >= 0.5 && !this._impactFired) {
          this._impactFired = true
          if (this._onImpact) this._onImpact()
        }
      } else if (this.swingTimer < total) {
        // Return to rest
        const t = (this.swingTimer - raise - strike) / ret
        this.armPivot.rotation = this.strikeRotation - t * (this.strikeRotation - this.restRotation)
      } else {
        this.armPivot.rotation = this.restRotation
        this.state = 'idle'
        this._impactFired = false
      }
    }
  }
}
