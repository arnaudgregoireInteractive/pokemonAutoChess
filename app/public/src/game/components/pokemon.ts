import Phaser, { GameObjects } from "phaser"
import { SetSchema } from "@colyseus/schema"
import Lifebar from "./life-bar"
import DraggableObject from "./draggable-object"
import PokemonDetail from "./pokemon-detail"
import ItemsContainer from "./items-container"
import { transformAttackCoordinate } from "../../pages/utils/utils"
import {
  IPokemon,
  IPokemonEntity,
  instanceofPokemonEntity,
  Emotion,
  AttackSprite,
  AttackSpriteScale
} from "../../../../types"
import MoveToPlugin from "phaser3-rex-plugins/plugins/moveto-plugin"
import MoveTo from "phaser3-rex-plugins/plugins/moveto"
import GameScene from "../scenes/game-scene"
import {
  AttackType,
  Orientation,
  PokemonActionState,
  SpriteType,
  PokemonTint,
  Rarity,
  Team
} from "../../../../types/enum/Game"
import { Ability } from "../../../../types/enum/Ability"
import { Passive } from "../../../../types/enum/Passive"
import PowerBar from "./power-bar"
import { Synergy } from "../../../../types/enum/Synergy"
import { Pkm } from "../../../../types/enum/Pokemon"
import { clamp, min } from "../../../../utils/number"
import {
  DEFAULT_CRIT_CHANCE,
  DEFAULT_CRIT_DAMAGE
} from "../../../../types/Config"
import { DebugScene } from "../scenes/debug-scene"
import { preferences } from "../../preferences"
import { values } from "../../../../utils/schemas"
import { displayAbility } from "./abilities-animations"

export default class Pokemon extends DraggableObject {
  evolution: Pkm
  rarity: Rarity
  emotion: Emotion
  shiny: boolean
  index: string
  id: string
  hp: number
  range: number
  critChance: number
  atk: number
  def: number
  speDef: number
  attackType: AttackType
  atkSpeed: number
  targetX: number | null
  targetY: number | null
  skill: Ability
  passive: Passive
  positionX: number
  positionY: number
  attackSprite: AttackSprite
  team: number | undefined
  critDamage: number
  ap: number
  life: number | undefined
  shield: number | undefined
  projectile: GameObjects.Sprite | undefined
  itemsContainer: ItemsContainer
  orientation: Orientation
  action: PokemonActionState
  moveManager: MoveTo
  rangeType: string
  types = new Set<Synergy>()
  lifebar: Lifebar | undefined
  detail: PokemonDetail | undefined
  pp: number | undefined
  maxPP: number
  powerbar: PowerBar | undefined
  sprite: GameObjects.Sprite
  shadow: GameObjects.Sprite
  wound: GameObjects.Sprite | undefined
  burn: GameObjects.Sprite | undefined
  sleep: GameObjects.Sprite | undefined
  silence: GameObjects.Sprite | undefined
  freeze: GameObjects.Sprite | undefined
  confusion: GameObjects.Sprite | undefined
  paralysis: GameObjects.Sprite | undefined
  armorReduction: GameObjects.Sprite | undefined
  charm: GameObjects.Sprite | undefined
  flinch: GameObjects.Sprite | undefined
  curse: GameObjects.Sprite | undefined
  magmaStorm: GameObjects.Sprite | undefined
  poison: GameObjects.Sprite | undefined
  protect: GameObjects.Sprite | undefined
  resurection: GameObjects.Sprite | undefined
  runeProtect: GameObjects.Sprite | undefined
  spikeArmor: GameObjects.Sprite | undefined
  magicBounce: GameObjects.Sprite | undefined
  electricField: GameObjects.Sprite | undefined
  psychicField: GameObjects.Sprite | undefined
  grassField: GameObjects.Sprite | undefined
  fairyField: GameObjects.Sprite | undefined
  light: GameObjects.Sprite | undefined
  stars: number
  playerId: string
  shouldShowTooltip: boolean
  flip: boolean
  animationLocked: boolean /* will prevent another anim to play before current one is completed */

  constructor(
    scene: GameScene | DebugScene,
    x: number,
    y: number,
    pokemon: IPokemonEntity | IPokemon,
    playerId: string,
    inBattle: boolean,
    flip: boolean
  ) {
    super(scene, x, y, 75, 75, playerId !== scene.uid)
    this.flip = flip
    this.playerId = playerId
    this.shouldShowTooltip = true
    this.stars = pokemon.stars
    this.evolution = instanceofPokemonEntity(pokemon)
      ? Pkm.DEFAULT
      : (pokemon as IPokemon).evolution
    this.emotion = pokemon.emotion
    this.shiny = pokemon.shiny
    this.height = 0
    this.width = 0
    this.index = pokemon.index
    this.name = pokemon.name
    this.rarity = pokemon.rarity
    this.id = pokemon.id
    this.hp = pokemon.hp
    this.range = pokemon.range
    this.critChance = DEFAULT_CRIT_CHANCE
    this.atk = pokemon.atk
    this.def = pokemon.def
    this.speDef = pokemon.speDef
    this.attackType = pokemon.attackType
    this.types = new Set(values(pokemon.types))
    this.maxPP = pokemon.maxPP
    this.atkSpeed = pokemon.atkSpeed
    this.targetX = null
    this.targetY = null
    this.skill = pokemon.skill
    this.passive = pokemon.passive
    this.positionX = pokemon.positionX
    this.positionY = pokemon.positionY
    this.attackSprite = pokemon.attackSprite
    if (this.range > 1) {
      this.rangeType = "range"
    } else {
      this.rangeType = "melee"
    }
    const m = <MoveToPlugin>scene.plugins.get("rexMoveTo")
    this.moveManager = m.add(this, {
      speed: 300,
      rotateToTarget: false
    })

    const p = <IPokemonEntity>pokemon
    if (p.orientation) {
      this.orientation = p.orientation
      this.action = p.action
    } else {
      this.orientation = Orientation.DOWNLEFT
      this.action = PokemonActionState.WALK
    }

    const textureIndex = scene.textures.exists(this.index) ? this.index : "0000"
    this.sprite = new GameObjects.Sprite(
      scene,
      0,
      0,
      textureIndex,
      `${PokemonTint.NORMAL}/${PokemonActionState.IDLE}/${SpriteType.ANIM}/${Orientation.DOWN}/0000`
    )
    this.sprite.setDepth(3)
    //this.sprite.setOrigin(0,0);
    this.sprite.setScale(2, 2)
    this.sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.animationLocked = false
      const g = <GameScene>scene
      // go back to idle anim if no more animation in queue
      g.animationManager?.animatePokemon(this, pokemon.action, this.flip)
    })
    this.height = this.sprite.height
    this.width = this.sprite.width
    this.itemsContainer = new ItemsContainer(
      scene,
      p.items ?? new SetSchema(),
      this.width / 2 + 25,
      -35,
      this.id,
      playerId
    )
    this.shadow = new GameObjects.Sprite(scene, 0, 5, textureIndex)
    //this.shadow.setOrigin(0,0);
    this.shadow.setScale(2, 2)
    scene.add.existing(this.shadow)
    this.add(this.shadow)
    if (instanceofPokemonEntity(pokemon)) {
      if (p.status.light) {
        this.addLight()
      }
      if (p.status.electricField) {
        this.addElectricField()
      }
      if (p.status.psychicField) {
        this.addPsychicField()
      }
      if (p.status.grassField) {
        this.addGrassField()
      }
      if (p.status.fairyField) {
        this.addFairyField()
      }
    }
    scene.add.existing(this.sprite)
    this.add(this.itemsContainer)

    if (instanceofPokemonEntity(pokemon)) {
      this.setLifeBar(p, scene)
      this.setPowerBar(p, scene)
      //this.setEffects(p, scene);
    }
    this.add(this.sprite)
    this.draggable = playerId === scene.uid && !inBattle
    if (instanceofPokemonEntity(pokemon)) {
      const p = <IPokemonEntity>pokemon
      this.pp = p.pp
      this.team = p.team
      this.shield = p.shield
      this.life = p.life
      this.critDamage = p.critDamage
      this.ap = p.ap
      this.critChance = p.critChance
    } else {
      this.critDamage = DEFAULT_CRIT_DAMAGE
      this.ap = 0
      this.critChance = DEFAULT_CRIT_CHANCE
    }
    this.setDepth(5)

    // prevents persisting details between game transitions
    const s = <GameScene>this.scene
    if (s.lastPokemonDetail) {
      s.lastPokemonDetail.closeDetail()
      s.lastPokemonDetail = undefined
    }
  }

  get isOnBench(): boolean {
    return this.positionY === 0
  }

  updateTooltipPosition() {
    if (this.detail) {
      if (this.input && preferences.showDetailsOnHover) {
        this.detail.setPosition(
          this.input.localX + 200,
          min(0)(this.input.localY - 175)
        )
        return
      }

      const absX = this.x + this.detail.width / 2 + 40
      const minX = this.detail.width / 2
      const maxX = window.innerWidth - this.detail.width / 2
      const absY = this.y - this.detail.height / 2 - 40
      const minY = this.detail.height / 2
      const maxY = window.innerHeight - this.detail.height / 2
      const [x, y] = [
        clamp(absX, minX, maxX) - this.x,
        clamp(absY, minY, maxY) - this.y
      ]
      this.detail.setPosition(x, y)
    }
  }

  destroy(fromScene?: boolean | undefined): void {
    super.destroy(fromScene)
    this.closeDetail()
  }

  closeDetail() {
    if (this.detail) {
      this.detail.dom.remove()
      this.remove(this.detail, true)
      this.detail = undefined
    }
  }

  openDetail() {
    const s = <GameScene>this.scene
    if (s.lastPokemonDetail && s.lastPokemonDetail != this) {
      s.lastPokemonDetail.closeDetail()
      s.lastPokemonDetail = undefined
    }

    this.detail = new PokemonDetail(
      this.scene,
      0,
      0,
      this.name,
      this.rarity,
      this.life || this.hp,
      this.atk,
      this.def,
      this.speDef,
      this.range,
      this.atkSpeed,
      this.critChance,
      this.critDamage,
      this.ap,
      this.pp || this.maxPP,
      this.types,
      this.skill,
      this.passive,
      this.emotion,
      this.shiny,
      this.index,
      this.stars,
      this.evolution
    )
    this.detail.setPosition(
      this.detail.width / 2 + 40,
      min(0)(-this.detail.height / 2 - 40)
    )

    this.detail.removeInteractive()
    this.add(this.detail)
    s.lastPokemonDetail = this
  }

  onPointerDown(pointer: Phaser.Input.Pointer) {
    super.onPointerDown(pointer)
    if (
      this.shouldShowTooltip &&
      !preferences.showDetailsOnHover &&
      pointer.rightButtonDown() &&
      this.scene &&
      !this.detail
    ) {
      this.openDetail()
    } else {
      this.closeDetail()
    }
  }

  onPointerUp(): void {
    super.onPointerUp()
    if (
      this.shouldShowTooltip &&
      preferences.showDetailsOnHover &&
      !this.detail
    ) {
      this.openDetail()
    }
  }

  onPointerOut(): void {
    super.onPointerOut()
    if (this.shouldShowTooltip && preferences.showDetailsOnHover) {
      this.closeDetail()
    }
  }

  onPointerOver(pointer) {
    super.onPointerOver(pointer)

    if (
      preferences.showDetailsOnHover &&
      this.shouldShowTooltip &&
      this.detail == null &&
      !pointer.leftButtonDown() // we're dragging another pokemon
    ) {
      this.openDetail()
    }
  }

  attackAnimation() {
    if (this.projectile) {
      this.projectile.destroy()
    }

    const isRange = this.range > 1
    const startX = isRange ? this.positionX : this.targetX
    const startY = isRange ? this.positionY : this.targetY

    if (startX && startY) {
      const coordinates = transformAttackCoordinate(startX, startY, this.flip)

      this.projectile = this.scene.add.sprite(
        coordinates[0],
        coordinates[1],
        "attacks",
        `${this.attackSprite}/000.png`
      )
      const scale = AttackSpriteScale[this.attackSprite]
      this.projectile.setScale(scale[0], scale[1])
      this.projectile.setDepth(6)
      this.projectile.anims.play(`${this.attackSprite}`)

      if (!isRange) {
        this.projectile?.once(
          Phaser.Animations.Events.ANIMATION_COMPLETE,
          () => {
            this.projectile?.destroy()
          }
        )
      } else if (
        this.targetX &&
        this.targetY &&
        this.targetX != -1 &&
        this.targetY != -1
      ) {
        const coordinatesTarget = transformAttackCoordinate(
          this.targetX,
          this.targetY,
          this.flip
        )

        // logger.debug(`Shooting a projectile to (${this.targetX},${this.targetY})`);
        this.scene.tweens.add({
          targets: this.projectile,
          x: coordinatesTarget[0],
          y: coordinatesTarget[1],
          ease: "Linear",
          duration: this.atkSpeed ? 1000 / this.atkSpeed : 1500,
          onComplete: () => {
            if (this.projectile) {
              this.projectile.destroy()
            }
          }
        })
      }
    }
  }

  deathAnimation() {
    this.life = 0
    if (this.lifebar) {
      this.lifebar.setAmount(this.life)
    }

    if (this.projectile) {
      this.projectile.destroy()
    }

    this.scene.add.tween({
      targets: [this],
      ease: "Linear",
      duration: 1500,
      delay: 0,
      alpha: {
        getStart: () => 1,
        getEnd: () => 0
      },
      onComplete: () => {
        this.destroy()
      }
    })
  }

  resurectAnimation() {
    if (this.lifebar) {
      this.lifebar.setAmount(0)
    }

    const resurectAnim = this.scene.add.sprite(0, -10, "RESURECT", "000")
    resurectAnim.setDepth(7)
    resurectAnim.setScale(2, 2)
    resurectAnim.anims.play("RESURECT")
    resurectAnim.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      resurectAnim.destroy()
    })

    this.add(resurectAnim)
  }

  displayAnimation(anim: string) {
    return displayAbility(
      this.scene as GameScene,
      [],
      anim,
      this.orientation,
      this.positionX,
      this.positionY,
      this.targetX ?? -1,
      this.targetY ?? -1,
      this.flip
    )
  }

  fishingAnimation() {
    this.displayAnimation("FISHING")
    this.sprite.once(Phaser.Animations.Events.ANIMATION_REPEAT, () => {
      const g = <GameScene>this.scene
      g.animationManager?.animatePokemon(
        this,
        PokemonActionState.IDLE,
        this.flip
      )
    })
  }

  specialAttackAnimation(group: Phaser.GameObjects.Group, ultCount: number) {
    if (this.skill && this.skill === Ability.GROWTH) {
      this.sprite.setScale(2 + 0.5 * ultCount)
    }
  }

  setLifeBar(pokemon: IPokemonEntity, scene: Phaser.Scene) {
    if (pokemon.life !== undefined) {
      this.lifebar = new Lifebar(
        scene,
        0,
        this.height / 2 + 6,
        60,
        pokemon.life + pokemon.shield,
        pokemon.shield,
        pokemon.team as Team,
        this.flip
      )
      this.lifebar.setAmount(pokemon.life)
      this.lifebar.setShieldAmount(pokemon.shield)
      this.add(this.lifebar)
    }
  }

  setPowerBar(pokemon: IPokemonEntity, scene: Phaser.Scene) {
    if (pokemon.pp !== undefined) {
      this.powerbar = new PowerBar(
        scene,
        0,
        this.height / 2 + 12,
        60,
        pokemon.maxPP
      )
      this.powerbar.setAmount(pokemon.pp)
      this.add(this.powerbar)
    }
  }

  addWound() {
    if (!this.wound) {
      this.wound = this.scene.add
        .sprite(0, -30, "status", "WOUND/000.png")
        .setScale(2)
      this.wound.anims.play("WOUND")
      this.add(this.wound)
    }
  }

  removeWound() {
    if (this.wound) {
      this.remove(this.wound, true)
      this.wound = undefined
    }
  }

  addBurn() {
    if (!this.burn) {
      this.burn = this.scene.add
        .sprite(0, -30, "status", "BURN/000.png")
        .setScale(2)
      this.burn.anims.play("BURN")
      this.add(this.burn)
    }
  }

  removeBurn() {
    if (this.burn) {
      this.remove(this.burn, true)
      this.burn = undefined
    }
  }

  addSleep() {
    if (!this.sleep) {
      this.sleep = this.scene.add
        .sprite(0, -30, "status", "SLEEP/000.png")
        .setScale(2)
      this.sleep.anims.play("SLEEP")
      this.add(this.sleep)
    }
  }

  removeSleep() {
    if (this.sleep) {
      this.remove(this.sleep, true)
      this.sleep = undefined
    }
  }

  addSilence() {
    if (!this.silence) {
      this.silence = this.scene.add
        .sprite(0, -30, "status", "SILENCE/000.png")
        .setScale(2)
      this.silence.anims.play("SILENCE")
      this.add(this.silence)
    }
  }

  removeSilence() {
    if (this.silence) {
      this.remove(this.silence, true)
      this.silence = undefined
    }
  }

  addFreeze() {
    if (!this.freeze) {
      this.freeze = this.scene.add
        .sprite(0, 0, "status", "FREEZE/000.png")
        .setScale(2)
      this.freeze.anims.play("FREEZE")
      this.add(this.freeze)
    }
  }

  removeFreeze() {
    if (this.freeze) {
      this.remove(this.freeze, true)
      this.freeze = undefined
    }
  }

  addConfusion() {
    if (!this.confusion) {
      this.confusion = this.scene.add
        .sprite(0, -30, "status", "CONFUSION/000.png")
        .setScale(2)
      this.confusion.anims.play("CONFUSION")
      this.add(this.confusion)
    }
  }

  removeConfusion() {
    if (this.confusion) {
      this.remove(this.confusion, true)
      this.confusion = undefined
    }
  }

  addParalysis() {
    if (!this.paralysis) {
      this.paralysis = this.scene.add
        .sprite(0, -30, "status", "PARALYSIS/000.png")
        .setScale(2)
      this.paralysis.anims.play("PARALYSIS")
      this.add(this.paralysis)
    }
  }

  removeParalysis() {
    if (this.paralysis) {
      this.remove(this.paralysis, true)
      this.paralysis = undefined
    }
  }

  addArmorReduction() {
    if (!this.armorReduction) {
      this.armorReduction = this.scene.add
        .sprite(0, -40, "status", "ARMOR_REDUCTION/000.png")
        .setScale(2)
      this.armorReduction.anims.play("ARMOR_REDUCTION")
      this.add(this.armorReduction)
    }
  }

  removeArmorReduction() {
    if (this.armorReduction) {
      this.remove(this.armorReduction, true)
      this.armorReduction = undefined
    }
  }

  addCharm() {
    if (!this.charm) {
      this.charm = this.scene.add
        .sprite(0, -40, "status", "CHARM/000.png")
        .setScale(2)
      this.charm.anims.play("CHARM")
      this.add(this.charm)
    }
  }

  removeCharm() {
    if (this.charm) {
      this.remove(this.charm, true)
      this.charm = undefined
    }
  }

  addFlinch() {
    if (!this.flinch) {
      this.flinch = this.scene.add
        .sprite(0, -40, "status", "FLINCH/000.png")
        .setScale(2)
      this.flinch.anims.play("FLINCH")
      this.add(this.flinch)
    }
  }

  removeFlinch() {
    if (this.flinch) {
      this.remove(this.flinch, true)
      this.flinch = undefined
    }
  }

  addCurse() {
    if (!this.curse) {
      this.curse = this.scene.add
        .sprite(0, -65, "status", "CURSE/000.png")
        .setScale(1.5)
      this.curse.anims.play("CURSE")
      this.add(this.curse)
    }
  }

  removeCurse() {
    if (this.curse) {
      this.remove(this.curse, true)
      this.curse = undefined
    }
  }

  addPoison() {
    if (!this.poison) {
      this.poison = this.scene.add
        .sprite(0, -30, "status", "POISON/000.png")
        .setScale(2)
      this.poison.anims.play("POISON")
      this.add(this.poison)
    }
  }

  removePoison() {
    if (this.poison) {
      this.remove(this.poison, true)
      this.poison = undefined
    }
  }

  addProtect() {
    if (!this.protect) {
      this.protect = this.scene.add
        .sprite(0, -30, "status", "PROTECT/000.png")
        .setScale(2)
      this.protect.anims.play("PROTECT")
      this.add(this.protect)
    }
  }

  removeProtect() {
    if (this.protect) {
      this.remove(this.protect, true)
      this.protect = undefined
    }
  }

  addResurection() {
    if (!this.resurection) {
      this.resurection = this.scene.add
        .sprite(0, -45, "status", "RESURECTION/000.png")
        .setScale(2)
      this.resurection.anims.play("RESURECTION")
      this.add(this.resurection)
    }
  }

  removeResurection() {
    if (this.resurection) {
      this.remove(this.resurection, true)
      this.resurection = undefined
    }
  }

  addRuneProtect() {
    if (!this.runeProtect) {
      this.runeProtect = this.scene.add
        .sprite(0, -40, "status", "RUNE_PROTECT/000.png")
        .setScale(2)
      this.runeProtect.anims.play("RUNE_PROTECT")
      this.add(this.runeProtect)
    }
  }

  removeRuneProtect() {
    if (this.runeProtect) {
      this.remove(this.runeProtect, true)
      this.runeProtect = undefined
    }
  }

  addSpikeArmor() {
    if (!this.spikeArmor) {
      this.spikeArmor = this.scene.add
        .sprite(0, -5, "abilities", `${Ability.SPIKE_ARMOR}/000.png`)
        .setScale(2)
      this.spikeArmor.anims.play(Ability.SPIKE_ARMOR)
      this.add(this.spikeArmor)
    }
  }

  removeSpikeArmor() {
    if (this.spikeArmor) {
      this.remove(this.spikeArmor, true)
      this.spikeArmor = undefined
    }
  }

  addMagicBounce() {
    if (!this.magicBounce) {
      this.magicBounce = this.scene.add
        .sprite(0, -5, "abilities", `${Ability.SPIKE_ARMOR}/000.png`)
        .setScale(2)
        .setTint(0xffa0ff)
      this.magicBounce.anims.play(Ability.MAGIC_BOUNCE)
      this.add(this.magicBounce)
    }
  }

  removeMagicBounce() {
    if (this.magicBounce) {
      this.remove(this.magicBounce, true)
      this.magicBounce = undefined
    }
  }

  addLight() {
    this.light = this.scene.add
      .sprite(0, 0, "abilities", "LIGHT_CELL/000.png")
      .setDepth(0)
      .setScale(1.5, 1.5)
    this.light.anims.play("LIGHT_CELL")
    this.add(this.light)
  }

  addElectricField() {
    if (!this.electricField) {
      this.electricField = this.scene.add
        .sprite(0, 10, "status", `ELECTRIC_FIELD/000.png`)
        .setDepth(0)
        .setScale(1.5)
      this.electricField.anims.play("ELECTRIC_FIELD")
      this.add(this.electricField)
    }
  }

  removeElectricField() {
    if (this.electricField) {
      this.remove(this.electricField, true)
      this.electricField = undefined
    }
  }

  addGrassField() {
    if (!this.grassField) {
      this.grassField = this.scene.add
        .sprite(0, 10, "abilities", `GRASSY_FIELD/000.png`)
        .setDepth(0)
        .setScale(2)
      this.scene.add.existing(this.grassField)
      this.grassField.anims.play("GRASSY_FIELD")
      this.add(this.grassField)
    }
  }

  removeGrassField() {
    if (this.grassField) {
      this.remove(this.grassField, true)
      this.grassField = undefined
    }
  }

  addFairyField() {
    if (!this.fairyField) {
      this.fairyField = this.scene.add
        .sprite(0, 10, "status", `FAIRY_FIELD/000.png`)
        .setDepth(0)
        .setScale(1)
      this.fairyField.anims.play("FAIRY_FIELD")
      this.add(this.fairyField)
    }
  }

  removeFairyField() {
    if (this.fairyField) {
      this.remove(this.fairyField, true)
      this.fairyField = undefined
    }
  }

  addPsychicField() {
    if (!this.psychicField) {
      this.psychicField = this.scene.add
        .sprite(0, 10, "status", `PSYCHIC_FIELD/000.png`)
        .setDepth(0)
        .setScale(1)
      this.psychicField.anims.play("PSYCHIC_FIELD")
      this.add(this.psychicField)
    }
  }

  removePsychicField() {
    if (this.psychicField) {
      this.remove(this.psychicField, true)
      this.psychicField = undefined
    }
  }
}
