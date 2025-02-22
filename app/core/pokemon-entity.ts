import { Schema, SetSchema, type } from "@colyseus/schema"
import { nanoid } from "nanoid"
import Count from "../models/colyseus-models/count"
import Player from "../models/colyseus-models/player"
import { Pokemon, PokemonClasses } from "../models/colyseus-models/pokemon"
import Status from "../models/colyseus-models/status"
import { SynergyEffects } from "../models/effects"
import PokemonFactory from "../models/pokemon-factory"
import { getPokemonData } from "../models/precomputed/precomputed-pokemon-data"
import { getSellPrice } from "../models/shop"
import {
  AttackSprite,
  Emotion,
  IPokemon,
  IPokemonEntity,
  Title,
  Transfer
} from "../types"
import {
  ARMOR_FACTOR,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  DEFAULT_CRIT_CHANCE,
  DEFAULT_CRIT_POWER,
  MANA_SCARF_MANA,
  ON_ATTACK_MANA,
  SCOPE_LENS_MANA
} from "../types/Config"
import { Ability } from "../types/enum/Ability"
import { Effect } from "../types/enum/Effect"
import {
  AttackType,
  Orientation,
  PokemonActionState,
  Rarity,
  Stat,
  Team
} from "../types/enum/Game"
import {
  Berries,
  Item,
  SynergyGivenByItem,
  SynergyStones
} from "../types/enum/Item"
import { Passive } from "../types/enum/Passive"
import { Pkm, PkmIndex } from "../types/enum/Pokemon"
import { SpecialGameRule } from "../types/enum/SpecialGameRule"
import { Synergy } from "../types/enum/Synergy"
import { Weather } from "../types/enum/Weather"
import { count } from "../utils/array"
import { isOnBench } from "../utils/board"
import { distanceC, distanceM } from "../utils/distance"
import { clamp, min, roundToNDigits } from "../utils/number"
import { chance, pickNRandomIn, pickRandomIn } from "../utils/random"
import { values } from "../utils/schemas"
import AttackingState from "./attacking-state"
import Board, { Cell } from "./board"
import {
  Effect as EffectClass,
  FireHitEffect,
  GrowGroundEffect,
  MonsterKillEffect,
  OnAttackEffect,
  OnHitEffect,
  OnItemGainedEffect,
  OnItemRemovedEffect,
  OnKillEffect
} from "./effect"
import { IdleState } from "./idle-state"
import { ItemEffects, ItemStats } from "./items"
import MovingState from "./moving-state"
import PokemonState from "./pokemon-state"
import Simulation from "./simulation"
import { DelayedCommand, SimulationCommand } from "./simulation-command"

export class PokemonEntity extends Schema implements IPokemonEntity {
  @type("boolean") shiny: boolean
  @type("uint8") positionX: number
  @type("uint8") positionY: number
  @type("string") action = PokemonActionState.WALK
  @type("string") index: string
  @type("string") id: string
  @type("string") orientation = Orientation.DOWNLEFT
  @type("uint16") hp: number
  @type("uint8") pp = 0
  @type("uint8") maxPP: number
  @type("uint16") atk: number
  @type("uint16") def: number
  @type("uint16") speDef: number
  @type("int16") ap = 0
  @type("int16") luck = 0
  @type("uint8") critChance = DEFAULT_CRIT_CHANCE
  @type("float32") critPower = DEFAULT_CRIT_POWER
  @type("uint8") attackType: AttackType
  @type("uint16") life: number
  @type("uint16") shield = 0
  @type("uint8") team: Team
  @type("uint8") range: number
  @type("float32") atkSpeed: number
  @type("int8") targetX = -1
  @type("int8") targetY = -1
  @type("string") attackSprite: AttackSprite
  @type("string") rarity: Rarity
  @type("string") name: Pkm
  @type({ set: "string" }) effects = new SetSchema<Effect>()
  @type({ set: "string" }) items = new SetSchema<Item>()
  @type({ set: "string" }) types = new SetSchema<Synergy>()
  @type("uint8") stars: number
  @type("string") skill: Ability
  @type("string") passive: Passive
  @type(Status) status: Status
  @type(Count) count: Count
  @type("uint16") healDone: number
  @type("string") emotion: Emotion
  cooldown = 500
  oneSecondCooldown = 1000
  state: PokemonState
  simulation: Simulation
  baseAtk: number
  baseDef: number
  baseSpeDef: number
  baseRange: number
  baseHP: number
  dodge: number
  physicalDamage: number
  specialDamage: number
  trueDamage: number
  physicalDamageReduced: number
  specialDamageReduced: number
  shieldDamageTaken: number
  shieldDone: number
  flyingProtection = 0
  grassHealCooldown = 2000
  sandstormDamageTimer = 0
  fairySplashCooldown = 0
  isClone = false
  refToBoardPokemon: IPokemon
  commands = new Array<SimulationCommand>()
  effectsSet = new Set<EffectClass>()

  constructor(
    pokemon: IPokemon,
    positionX: number,
    positionY: number,
    team: number,
    simulation: Simulation
  ) {
    super()
    this.state = new MovingState()
    this.effects = new SetSchema()
    this.items = new SetSchema()
    this.refToBoardPokemon = pokemon
    pokemon.items.forEach((it) => {
      this.items.add(it)
    })
    this.status = new Status(simulation)
    this.count = new Count()
    this.simulation = simulation

    this.id = nanoid()
    this.rarity = pokemon.rarity
    this.positionX = positionX
    this.positionY = positionY
    this.index = pokemon.index
    this.name = pokemon.name
    this.action = PokemonActionState.WALK
    this.orientation = Orientation.DOWNLEFT
    this.baseAtk = pokemon.atk
    this.baseDef = pokemon.def
    this.baseSpeDef = pokemon.speDef
    this.baseRange = pokemon.range
    this.baseHP = pokemon.hp
    this.atk = pokemon.atk
    this.def = pokemon.def
    this.speDef = pokemon.speDef
    this.attackType = pokemon.attackType
    this.hp = pokemon.hp
    this.maxPP = pokemon.maxPP
    this.life = pokemon.hp
    this.atkSpeed = pokemon.atkSpeed
    this.range = pokemon.range
    this.team = team
    this.attackSprite = pokemon.attackSprite
    this.stars = pokemon.stars
    this.skill = pokemon.skill
    this.passive = pokemon.passive
    this.shiny = pokemon.shiny
    this.emotion = pokemon.emotion
    this.ap = pokemon.ap
    this.luck = 0
    this.dodge = 0
    this.physicalDamage = 0
    this.specialDamage = 0
    this.trueDamage = 0
    this.physicalDamageReduced = 0
    this.specialDamageReduced = 0
    this.shieldDamageTaken = 0
    this.healDone = 0
    this.shieldDone = 0

    pokemon.types.forEach((type) => {
      this.types.add(type)
    })
  }

  update(
    dt: number,
    board: Board,
    weather: Weather,
    player: Player | undefined
  ) {
    this.state.update(this, dt, board, weather, player)
  }

  getAttackDelay() {
    return 1000 / this.atkSpeed
  }

  get canMove(): boolean {
    return (
      !this.status.freeze &&
      !this.status.sleep &&
      !this.status.resurecting &&
      !this.status.locked
    )
  }

  get canBeCopied(): boolean {
    return this.passive !== Passive.INANIMATE
  }

  get isGhostOpponent(): boolean {
    return this.simulation.isGhostBattle && this.team === Team.RED_TEAM
  }

  isTargettableBy(
    attacker: IPokemonEntity,
    targetEnemies = true,
    targetAllies = false
  ): boolean {
    return (
      !this.status.resurecting &&
      ((targetAllies && this.team === attacker.team) ||
        (targetEnemies && this.team !== attacker.team) ||
        (attacker.effects.has(Effect.MERCILESS) &&
          attacker.id !== this.id &&
          this.life <= 0.15 * this.hp))
    )
  }

  get player(): Player | undefined {
    const player =
      this.team === Team.BLUE_TEAM
        ? this.simulation.bluePlayer
        : this.simulation.redPlayer
    if (player instanceof Player) {
      return player
    } else {
      return undefined // PvE or ghost player
    }
  }

  get inSpotlight(): boolean {
    if (!this.player) return false
    const { lightX, lightY } = this.player
    const { positionX, positionY } = this.refToBoardPokemon
    return (
      (positionX === lightX && positionY === lightY) ||
      this.items.has(Item.SHINY_STONE) ||
      (this.passive === Passive.CONVERSION && this.types.has(Synergy.LIGHT))
    )
  }

  hasSynergyEffect(synergy: Synergy): boolean {
    return SynergyEffects[synergy].some((effect) => this.effects.has(effect))
  }

  handleDamage(params: {
    damage: number
    board: Board
    attackType: AttackType
    attacker: PokemonEntity | null
    shouldTargetGainMana: boolean
  }) {
    return this.state.handleDamage({ target: this, ...params })
  }

  handleSpecialDamage(
    damage: number,
    board: Board,
    attackType: AttackType,
    attacker: PokemonEntity | null,
    crit: boolean,
    apBoost = true
  ): { death: boolean; takenDamage: number } {
    if (
      this.status.protect ||
      this.status.skydiving ||
      this.status.magicBounce
    ) {
      this.count.spellBlockedCount++
      if (
        this.status.magicBounce &&
        attackType === AttackType.SPECIAL &&
        damage > 0 &&
        attacker &&
        !attacker.items.has(Item.PROTECTIVE_PADS)
      ) {
        const bounceCrit =
          crit ||
          (this.effects.has(Effect.ABILITY_CRIT) &&
            chance(this.critChance, this))
        const bounceDamage = Math.round(
          ([0.5, 1][this.stars - 1] ?? 1) *
            damage *
            (1 + this.ap / 100) *
            (bounceCrit ? this.critPower : 1)
        )
        // not handleSpecialDamage to not trigger infinite loop between two magic bounces
        attacker.handleDamage({
          damage: bounceDamage,
          board,
          attackType: AttackType.SPECIAL,
          attacker: this,
          shouldTargetGainMana: true
        })
      }
      return { death: false, takenDamage: 0 }
    } else {
      let specialDamage =
        damage + (damage * (attacker && apBoost ? attacker.ap : 0)) / 100
      if (attacker && attacker.effects.has(Effect.DOUBLE_DAMAGE)) {
        specialDamage *= 2
        attacker.effects.delete(Effect.DOUBLE_DAMAGE)
      }
      if (crit && attacker && this.items.has(Item.ROCKY_HELMET) === false) {
        specialDamage = Math.round(specialDamage * attacker.critPower)
      }
      if (
        attacker &&
        attacker.items.has(Item.POKEMONOMICON) &&
        attackType === AttackType.SPECIAL
      ) {
        this.status.triggerBurn(3000, this, attacker)
      }
      if (attacker?.passive === Passive.BERSERK) {
        attacker.addAbilityPower(3, attacker, 0, false, false)
      }
      if (
        this.items.has(Item.POWER_LENS) &&
        specialDamage >= 1 &&
        attacker &&
        !attacker.items.has(Item.PROTECTIVE_PADS) &&
        attackType === AttackType.SPECIAL
      ) {
        const damageAfterReduction = damage / (1 + ARMOR_FACTOR * this.speDef)
        const damageBlocked = min(0)(specialDamage - damageAfterReduction)
        attacker.handleDamage({
          damage: Math.round(damageBlocked),
          board,
          attackType: AttackType.SPECIAL,
          attacker: this,
          shouldTargetGainMana: true
        })
      }
      return this.state.handleDamage({
        target: this,
        damage: specialDamage,
        board,
        attackType,
        attacker,
        shouldTargetGainMana: true
      })
    }
  }

  handleHeal(
    heal: number,
    caster: PokemonEntity,
    apBoost: number,
    crit: boolean
  ) {
    return this.state.handleHeal(this, heal, caster, apBoost, crit)
  }

  addShield(
    shield: number,
    caster: IPokemonEntity,
    apBoost: number,
    crit: boolean
  ) {
    return this.state.addShield(this, shield, caster, apBoost, crit)
  }

  changeState(state: PokemonState) {
    this.state.onExit(this)
    this.state = state
    this.state.onEnter(this)
  }

  toMovingState() {
    if (this.passive === Passive.INANIMATE) return
    this.changeState(new MovingState())
  }

  toAttackingState() {
    if (this.passive === Passive.INANIMATE) return
    this.changeState(new AttackingState())
  }

  toIdleState() {
    this.changeState(new IdleState())
  }

  addPP(value: number, caster: IPokemonEntity, apBoost: number, crit: boolean) {
    value = Math.round(
      value *
        (1 + (apBoost * caster.ap) / 100) *
        (crit ? caster.critPower : 1) *
        (this.status.fatigue && value > 0 ? 0.5 : 1)
    )

    if (
      !this.status.silence &&
      !this.status.protect &&
      !this.status.resurecting &&
      !(value < 0 && this.status.tree) // cannot lose PP if tree
    ) {
      this.pp = clamp(this.pp + value, 0, this.maxPP * 2 - 1)
    }
  }

  addCritChance(
    value: number,
    caster: IPokemonEntity,
    apBoost: number,
    crit: boolean
  ) {
    value =
      value * (1 + (apBoost * caster.ap) / 100) * (crit ? caster.critPower : 1)

    // for every 5% crit chance > 100, +10 crit power
    this.critChance += value

    if (this.critChance > 100) {
      const overCritChance = Math.round(this.critChance - 100)
      this.addCritPower(overCritChance * 2, this, 0, false)
      this.critChance = 100
    }
  }

  addCritPower(
    value: number,
    caster: IPokemonEntity,
    apBoost: number,
    crit: boolean
  ) {
    value =
      (value / 100) *
      (1 + (apBoost * caster.ap) / 100) *
      (crit ? caster.critPower : 1)

    this.critPower = min(0)(roundToNDigits(this.critPower + value, 2))
  }

  addMaxHP(
    value: number,
    caster: IPokemonEntity,
    apBoost: number,
    crit: boolean,
    permanent = false
  ) {
    if (this.life <= 0) return
    value =
      value * (1 + (apBoost * caster.ap) / 100) * (crit ? caster.critPower : 1)
    const update = (target: { hp: number }) => {
      target.hp = min(1)(target.hp + value)
    }
    update(this)
    this.life = clamp(this.life + value, 1, this.hp)
    if (permanent && !this.isGhostOpponent) {
      update(this.refToBoardPokemon)
    }
  }

  addDodgeChance(
    value: number,
    caster: IPokemonEntity,
    apBoost: number,
    crit: boolean
  ) {
    value =
      value * (1 + (apBoost * caster.ap) / 100) * (crit ? caster.critPower : 1)
    this.dodge = clamp(this.dodge + value, 0, 0.9)
  }

  addAbilityPower(
    value: number,
    caster: IPokemonEntity,
    apBoost: number,
    crit: boolean,
    permanent = false
  ) {
    value = Math.round(
      value * (1 + (apBoost * caster.ap) / 100) * (crit ? caster.critPower : 1)
    )
    const update = (target: { ap: number }) => {
      target.ap = min(-100)(target.ap + value)
    }
    update(this)
    if (permanent && !this.isGhostOpponent) {
      update(this.refToBoardPokemon)
    }
  }

  addLuck(
    value: number,
    caster: IPokemonEntity,
    apBoost: number,
    crit: boolean,
    permanent = false
  ) {
    value =
      value * (1 + (apBoost * caster.ap) / 100) * (crit ? caster.critPower : 1)
    const update = (target: { luck: number }) => {
      target.luck = min(-100)(target.luck + value)
    }
    update(this)
    if (permanent && !this.isGhostOpponent) {
      update(this.refToBoardPokemon)
    }
  }

  addDefense(
    value: number,
    caster: IPokemonEntity,
    apBoost: number,
    crit: boolean,
    permanent = false
  ) {
    value = Math.round(
      value * (1 + (apBoost * caster.ap) / 100) * (crit ? caster.critPower : 1)
    )
    const update = (target: { def: number }) => {
      target.def = min(0)(target.def + value)
    }
    update(this)
    if (permanent && !this.isGhostOpponent) {
      update(this.refToBoardPokemon)
    }
  }

  addSpecialDefense(
    value: number,
    caster: IPokemonEntity,
    apBoost: number,
    crit: boolean,
    permanent = false
  ) {
    value = Math.round(
      value * (1 + (apBoost * caster.ap) / 100) * (crit ? caster.critPower : 1)
    )
    const update = (target: { speDef: number }) => {
      target.speDef = min(0)(target.speDef + value)
    }
    update(this)
    if (permanent && !this.isGhostOpponent) {
      update(this.refToBoardPokemon)
    }
  }

  addAttack(
    value: number,
    caster: IPokemonEntity,
    apBoost: number,
    crit: boolean,
    permanent = false
  ) {
    value = Math.round(
      value * (1 + (apBoost * caster.ap) / 100) * (crit ? caster.critPower : 1)
    )
    const update = (target: { atk: number }) => {
      target.atk = min(1)(target.atk + value)
    }
    update(this)
    if (permanent && !this.isGhostOpponent) {
      update(this.refToBoardPokemon)
    }
  }

  addAttackSpeed(
    value: number,
    caster: IPokemonEntity,
    apBoost: number,
    crit: boolean,
    permanent = false
  ) {
    if (this.passive === Passive.MELMETAL) {
      this.addAttack(value * 0.5, caster, apBoost, crit, permanent)
    } else {
      value =
        value *
        (1 + (apBoost * caster.ap) / 100) *
        (crit ? caster.critPower : 1)
      const update = (target: { atkSpeed: number }) => {
        const currentAtkSpeedBonus = 100 * (target.atkSpeed / 0.75 - 1)
        const atkSpeedBonus = currentAtkSpeedBonus + value
        target.atkSpeed = clamp(
          roundToNDigits(0.75 * (1 + atkSpeedBonus / 100), 2),
          0.4,
          2.5
        )
      }
      update(this)
      if (permanent && !this.isGhostOpponent) {
        update(this.refToBoardPokemon)
      }
    }
  }

  addItem(item: Item, permanent = false) {
    const type = SynergyGivenByItem[item]
    if (
      this.items.size >= 3 ||
      (SynergyStones.includes(item) && this.types.has(type)) ||
      ((item === Item.EVIOLITE || item === Item.RARE_CANDY) &&
        !this.refToBoardPokemon.hasEvolution) ||
      (item === Item.RARE_CANDY && this.items.has(Item.EVIOLITE))
    ) {
      return
    }
    this.items.add(item)
    this.simulation.applyItemEffect(this, item)
    if (permanent && !this.isGhostOpponent) {
      this.refToBoardPokemon.items.add(item)
    }

    if (type && !this.types.has(type)) {
      this.types.add(type)
      this.simulation.applySynergyEffects(this, type)
    }
  }

  removeItem(item: Item, permanent = false) {
    this.items.delete(item)
    this.removeItemEffect(item)
    if (permanent && !this.isGhostOpponent) {
      this.refToBoardPokemon.items.delete(item)
    }
  }

  removeItemEffect(item: Item) {
    Object.entries(ItemStats[item] ?? {}).forEach(([stat, value]) =>
      this.applyStat(stat as Stat, -value)
    )

    const type = SynergyGivenByItem[item]
    const default_types = getPokemonData(this.name).types
    if (type && !default_types.includes(type)) {
      this.types.delete(type)
      SynergyEffects[type].forEach((effectName) => {
        this.effects.delete(effectName)
        this.effectsSet.forEach((effect) => {
          if (effect.origin === effectName) this.effectsSet.delete(effect)
        })
      })
    }

    ItemEffects[item]
      ?.filter((effect) => effect instanceof OnItemRemovedEffect)
      ?.forEach((effect) => effect.apply(this))
  }

  moveTo(x: number, y: number, board: Board) {
    board.swapValue(this.positionX, this.positionY, x, y)
    this.toMovingState()
    this.cooldown = 100 // for faster retargeting
  }

  skydiveTo(x: number, y: number, board: Board) {
    board.swapValue(this.positionX, this.positionY, x, y)
    this.status.skydiving = true
    this.toMovingState()
    this.cooldown = 1000 // 500ms for flying up and 500ms for skydive anim
  }

  // called after every attack, no matter if it's successful or not
  onAttack({
    target,
    board,
    physicalDamage,
    specialDamage,
    trueDamage,
    totalDamage
  }: {
    target: PokemonEntity
    board: Board
    physicalDamage: number
    specialDamage: number
    trueDamage: number
    totalDamage: number
  }) {
    this.addPP(ON_ATTACK_MANA, this, 0, false)

    this.effectsSet.forEach((effect) => {
      if (effect instanceof OnAttackEffect) {
        effect.apply(this, target, board)
      }
    })

    if (this.items.has(Item.BLUE_ORB)) {
      this.count.staticHolderCount++
      if (this.count.staticHolderCount > 2) {
        this.count.staticHolderCount = 0
        const nbBounces = 2
        const closestEnemies = new Array<PokemonEntity>()
        board.forEach(
          (x: number, y: number, enemy: PokemonEntity | undefined) => {
            if (enemy && this.team !== enemy.team) {
              closestEnemies.push(enemy)
            }
          }
        )
        closestEnemies.sort((a, b) => {
          const distanceA = distanceC(
            a.positionX,
            a.positionY,
            this.positionX,
            this.positionY
          )
          const distanceB = distanceC(
            b.positionX,
            b.positionY,
            this.positionX,
            this.positionY
          )
          return distanceA - distanceB
        })

        let previousTg: PokemonEntity = this
        let tg: PokemonEntity | undefined = target

        for (let i = 0; i < nbBounces; i++) {
          tg = closestEnemies[i]
          if (tg) {
            this.simulation.room.broadcast(Transfer.ABILITY, {
              id: this.simulation.id,
              skill: "LINK_CABLE_link",
              positionX: previousTg.positionX,
              positionY: previousTg.positionY,
              targetX: tg.positionX,
              targetY: tg.positionY
            })
            tg.handleSpecialDamage(10, board, AttackType.SPECIAL, this, false)
            tg.addPP(-20, this, 0, false)
            tg.count.manaBurnCount++
            previousTg = tg
          } else {
            break
          }
        }
      }
    }

    if (this.passive === Passive.DURANT) {
      const bugAllies =
        board.cells.filter(
          (entity) =>
            entity && entity.team === this.team && entity.types.has(Synergy.BUG)
        ).length - 1
      if (bugAllies > 0) {
        target.handleDamage({
          damage: bugAllies,
          board,
          attackType: AttackType.TRUE,
          attacker: this,
          shouldTargetGainMana: true
        })
      }
    }

    if (
      this.name === Pkm.MINIOR_KERNEL_BLUE ||
      this.name === Pkm.MINIOR_KERNEL_GREEN ||
      this.name === Pkm.MINIOR_KERNEL_RED ||
      this.name === Pkm.MINIOR_KERNEL_ORANGE
    ) {
      const cells = board.getAdjacentCells(target.positionX, target.positionY)
      const targets = cells
        .filter((cell) => cell.value && this.team != cell.value.team)
        .map((cell) => cell.value!)
        .concat(target)
      targets.forEach((t) => {
        this.simulation.room.broadcast(Transfer.ABILITY, {
          id: this.simulation.id,
          skill: Ability.SHIELDS_DOWN,
          targetX: t.positionX,
          targetY: t.positionY
        })
        if (this.name === Pkm.MINIOR_KERNEL_BLUE) {
          t.handleDamage({
            damage: Math.ceil(physicalDamage * (1 + this.ap / 100)),
            board,
            attackType: AttackType.SPECIAL,
            attacker: this,
            shouldTargetGainMana: false
          })
        }
        if (this.name === Pkm.MINIOR_KERNEL_RED) {
          t.handleDamage({
            damage: Math.ceil(physicalDamage * 1.5 * (1 + this.ap / 100)),
            board,
            attackType: AttackType.PHYSICAL,
            attacker: this,
            shouldTargetGainMana: false
          })
        }
        if (this.name === Pkm.MINIOR_KERNEL_ORANGE) {
          t.handleDamage({
            damage: Math.ceil(physicalDamage * 0.5 * (1 + this.ap / 100)),
            board,
            attackType: AttackType.TRUE,
            attacker: this,
            shouldTargetGainMana: false
          })
        }
      })
      if (this.name === Pkm.MINIOR_KERNEL_GREEN) {
        cells.forEach((v) => {
          if (v && v.value && v.value.team === this.team) {
            v.value.handleHeal(physicalDamage, this, 1, false)
          }
        })
      }
    }

    if (this.items.has(Item.CHOICE_SCARF) && totalDamage > 0) {
      const cells = board.getAdjacentCells(target.positionX, target.positionY)
      const candidateTargets = cells
        .filter((cell) => cell.value && this.team != cell.value.team)
        .map((cell) => cell.value!)
      candidateTargets.sort((a, b) => a.life - b.life) // target lowest life first

      let targetCount = 1
      candidateTargets.forEach((target) => {
        if (targetCount > 0) {
          let totalTakenDamage = 0
          if (physicalDamage > 0) {
            const { takenDamage } = target.handleDamage({
              damage: Math.ceil(0.5 * physicalDamage),
              board,
              attackType: AttackType.PHYSICAL,
              attacker: this,
              shouldTargetGainMana: true
            })
            totalTakenDamage += takenDamage
          }
          if (specialDamage > 0) {
            const { takenDamage } = target.handleDamage({
              damage: Math.ceil(0.5 * specialDamage),
              board,
              attackType: AttackType.SPECIAL,
              attacker: this,
              shouldTargetGainMana: true
            })
            totalTakenDamage += takenDamage
          }
          if (trueDamage > 0) {
            const { takenDamage } = target.handleDamage({
              damage: Math.ceil(0.5 * trueDamage),
              board,
              attackType: AttackType.TRUE,
              attacker: this,
              shouldTargetGainMana: true
            })
            totalTakenDamage += takenDamage
          }
          this.onHit({
            target,
            board,
            totalTakenDamage,
            physicalDamage,
            specialDamage,
            trueDamage
          })

          targetCount--
        }
      })
    }

    if (this.items.has(Item.MANA_SCARF)) {
      this.addPP(MANA_SCARF_MANA, this, 0, false)
    }

    if (this.items.has(Item.UPGRADE)) {
      this.addAttackSpeed(5, this, 0, false)
      this.count.upgradeCount++
    }

    if (this.items.has(Item.MAGMARIZER)) {
      this.addAttack(1, this, 0, false)
      this.count.magmarizerCount++
    }

    if (this.items.has(Item.ELECTIRIZER) && this.count.attackCount % 3 === 0) {
      target.addPP(-15, this, 0, false)
      target.count.manaBurnCount++
    }

    if (this.effects.has(Effect.TELEPORT_NEXT_ATTACK)) {
      const crit =
        this.effects.has(Effect.ABILITY_CRIT) &&
        chance(this.critChance / 100, this)
      target.handleSpecialDamage(
        [15, 30, 60][this.stars - 1],
        board,
        AttackType.SPECIAL,
        this,
        crit
      )
      this.effects.delete(Effect.TELEPORT_NEXT_ATTACK)
    }

    if (this.effects.has(Effect.SHADOW_PUNCH_NEXT_ATTACK)) {
      const crit =
        this.effects.has(Effect.ABILITY_CRIT) &&
        chance(this.critChance / 100, this)
      target.handleSpecialDamage(
        [30, 60, 120][this.stars - 1],
        board,
        AttackType.SPECIAL,
        this,
        crit
      )
      this.effects.delete(Effect.SHADOW_PUNCH_NEXT_ATTACK)
    }

    if (target.effects.has(Effect.OBSTRUCT)) {
      this.addDefense(-2, target, 0, false)
    }

    if (this.passive === Passive.SHARED_VISION) {
      board.forEach((x: number, y: number, ally: PokemonEntity | undefined) => {
        if (
          ally &&
          ally.passive === Passive.SHARED_VISION &&
          this.team === ally.team &&
          !(this.targetX === ally.positionX && this.targetY === ally.positionY) // do not self inflict damage if ally is confused and targeting you
        ) {
          ally.targetX = this.targetX
          ally.targetY = this.targetY
        }
      })
    }
  }

  // called after every successful basic attack (not dodged or protected)
  onHit({
    target,
    board,
    totalTakenDamage,
    physicalDamage,
    specialDamage,
    trueDamage
  }: {
    target: PokemonEntity
    board: Board
    totalTakenDamage: number
    physicalDamage: number
    specialDamage: number
    trueDamage: number
  }) {
    if (this.passive === Passive.BERRY_EATER) {
      for (const item of target.items.values()) {
        Berries.includes(item) && this.eatBerry(item, target)
      }
    }

    if (target.passive === Passive.PSYDUCK && chance(0.1, this)) {
      target.status.triggerConfusion(3000, target, target)
    }

    if (this.name === Pkm.MINIOR) {
      this.addAttackSpeed(5, this, 1, false)
    }

    if (this.passive === Passive.DREAM_CATCHER && target.status.sleep) {
      const allies = board.cells.filter(
        (p) => p && p.team === this.team && p.id !== this.id
      ) as PokemonEntity[]
      const alliesHit = allies
        .sort(
          (a, b) =>
            distanceM(a.positionX, a.positionY, this.targetX, this.targetY) -
            distanceM(b.positionX, b.positionY, this.targetX, this.targetY)
        )
        .slice(0, 2)

      alliesHit.forEach((ally) => {
        ally.addShield(10, ally, 1, false)
        ally.simulation.room.broadcast(Transfer.ABILITY, {
          id: ally.simulation.id,
          skill: Ability.MOON_DREAM,
          positionX: ally.positionX,
          positionY: ally.positionY
        })
      })
    }

    if (this.items.has(Item.MAGMARIZER)) {
      target.status.triggerBurn(2000, target, this)
    }

    if (this.items.has(Item.ELECTIRIZER) && this.count.attackCount % 3 === 0) {
      target.status.triggerParalysis(2000, target, this)
    }

    // Synergy effects on hit

    this.effectsSet.forEach((effect) => {
      if (effect instanceof OnHitEffect) {
        effect.apply(this, target, board)
      }
    })

    const nbIcyRocks =
      this.player && this.simulation.weather === Weather.SNOW
        ? count(this.player.items, Item.ICY_ROCK)
        : 0
    if (this.types.has(Synergy.ICE) || nbIcyRocks > 0) {
      let freezeChance = 0
      if (this.effects.has(Effect.CHILLY)) {
        freezeChance = 0.2
      } else if (this.effects.has(Effect.FROSTY)) {
        freezeChance = 0.3
      } else if (this.effects.has(Effect.FREEZING)) {
        freezeChance = 0.4
      } else if (this.effects.has(Effect.SHEER_COLD)) {
        freezeChance = 0.4
      }
      freezeChance += nbIcyRocks * 0.05
      if (chance(freezeChance, this)) {
        target.status.triggerFreeze(2000, target)
      }
    }

    if (this.hasSynergyEffect(Synergy.FIRE)) {
      const burnChance = 0.3
      if (chance(burnChance, this)) {
        target.status.triggerBurn(2000, target, this)
      }
    }

    if (this.hasSynergyEffect(Synergy.MONSTER)) {
      const flinchChance = 0.3
      if (chance(flinchChance, this)) {
        target.status.triggerFlinch(3000, target, this)
      }
    }

    if (this.types.has(Synergy.GHOST)) {
      const silenceChance = 0.2
      if (chance(silenceChance, this)) {
        target.status.triggerSilence(2000, target, this)
      }
    }

    let poisonChance = 0
    if (this.effects.has(Effect.POISONOUS)) {
      poisonChance = 0.3
    }
    if (this.effects.has(Effect.VENOMOUS)) {
      poisonChance = 0.6
    }
    if (this.effects.has(Effect.TOXIC)) {
      poisonChance = 1.0
    }
    if (target.player) {
      const nbSmellyClays = count(target.player.items, Item.SMELLY_CLAY)
      poisonChance -= nbSmellyClays * 0.1
    }
    if (poisonChance > 0 && chance(poisonChance, this)) {
      target.status.triggerPoison(4000, target, this)
    }

    if (this.types.has(Synergy.WILD)) {
      const woundChance = 0.25
      if (chance(woundChance, this)) {
        target.status.triggerWound(3000, target, this)
      }
    }

    // Ability effects on hit
    if (
      target.status.spikeArmor &&
      distanceC(
        this.positionX,
        this.positionY,
        target.positionX,
        target.positionY
      ) === 1 &&
      !this.items.has(Item.PROTECTIVE_PADS)
    ) {
      const damage = Math.round(target.def * 0.5 * (1 + target.ap / 100))
      const crit =
        target.effects.has(Effect.ABILITY_CRIT) &&
        chance(target.critChance, this)
      this.status.triggerWound(2000, this, target)
      this.handleSpecialDamage(
        damage,
        board,
        AttackType.SPECIAL,
        target,
        crit,
        true
      )
    }

    if (target.effects.has(Effect.SHELL_TRAP) && physicalDamage > 0) {
      const cells = board.getAdjacentCells(target.positionX, target.positionY)
      const crit =
        target.effects.has(Effect.ABILITY_CRIT) &&
        chance(target.critChance, this)
      target.effects.delete(Effect.SHELL_TRAP)
      this.simulation.room.broadcast(Transfer.ABILITY, {
        id: this.simulation.id,
        skill: "SHELL_TRAP_trigger",
        positionX: target.positionX,
        positionY: target.positionY,
        orientation: target.orientation
      })
      cells.forEach((cell) => {
        if (cell.value && cell.value.team !== target.team) {
          cell.value.handleSpecialDamage(
            100,
            board,
            AttackType.SPECIAL,
            target,
            crit,
            true
          )
        }
      })
    }
  }

  // called whenever the unit deals damage, by basic attack or ability
  onDamageDealt({ target, damage }: { target: PokemonEntity; damage: number }) {
    if (this.hasSynergyEffect(Synergy.HUMAN)) {
      let lifesteal = 0
      if (this.effects.has(Effect.MEDITATE)) {
        lifesteal = 0.25
      } else if (this.effects.has(Effect.FOCUS_ENERGY)) {
        lifesteal = 0.4
      } else if (this.effects.has(Effect.CALM_MIND)) {
        lifesteal = 0.6
      }
      this.handleHeal(Math.ceil(lifesteal * damage), this, 0, false)
    }

    if (this.items.has(Item.SHELL_BELL)) {
      this.handleHeal(Math.ceil(0.33 * damage), this, 0, false)
    }

    if (
      this.simulation.weather === Weather.BLOODMOON &&
      target.status.wound &&
      this.player &&
      this.player.items.includes(Item.BLOOD_STONE)
    ) {
      const nbBloodStones = count(this.player.items, Item.BLOOD_STONE)
      if (nbBloodStones > 0) {
        this.handleHeal(Math.ceil(0.2 * damage), this, 0, false)
      }
    }
  }

  onDamageReceived({
    attacker,
    damage,
    board
  }: {
    attacker: PokemonEntity | null
    damage: number
    board: Board
  }) {
    // Items effects
    if (
      this.items.has(Item.DEFENSIVE_RIBBON) &&
      this.count.defensiveRibbonCount < 20 &&
      damage > 0
    ) {
      this.count.defensiveRibbonCount++
      if (this.count.defensiveRibbonCount % 2 === 0) {
        this.addAttack(1, this, 0, false)
        this.addDefense(2, this, 0, false)
        this.addAttackSpeed(5, this, 0, false)
      }
    }

    if (
      this.items.has(Item.SMOKE_BALL) &&
      this.life > 0 &&
      this.life < 0.4 * this.hp
    ) {
      const cells = board.getAdjacentCells(this.positionX, this.positionY)
      cells.forEach((cell) => {
        if (cell.value && cell.value.team !== this.team) {
          cell.value.status.triggerParalysis(4000, cell.value, this)
          cell.value.status.triggerBlinded(4000, cell.value)
        }
      })
      this.simulation.room.broadcast(Transfer.ABILITY, {
        id: this.simulation.id,
        skill: "SMOKE_BALL",
        positionX: this.positionX,
        positionY: this.positionY
      })
      this.removeItem(Item.SMOKE_BALL)
      this.flyAway(board)
    }

    if (this.items.has(Item.ABSORB_BULB) && this.life < 0.5 * this.hp) {
      const damage = this.physicalDamageReduced + this.specialDamageReduced
      this.simulation.room.broadcast(Transfer.ABILITY, {
        id: this.simulation.id,
        skill: Ability.EXPLOSION,
        positionX: this.positionX,
        positionY: this.positionY
      })
      board.getAdjacentCells(this.positionX, this.positionY).forEach((cell) => {
        if (cell.value && cell.value.team !== this.team) {
          cell.value.handleSpecialDamage(
            damage,
            board,
            AttackType.SPECIAL,
            this,
            false,
            false
          )
        }
      })
      this.removeItem(Item.ABSORB_BULB)
    }

    // Flying protection
    if (
      this.flyingProtection > 0 &&
      this.life > 0 &&
      this.canMove &&
      !this.status.paralysis
    ) {
      const pcLife = this.life / this.hp

      if (this.effects.has(Effect.TAILWIND) && pcLife < 0.2) {
        this.flyAway(board)
        this.flyingProtection--
      } else if (this.effects.has(Effect.FEATHER_DANCE) && pcLife < 0.2) {
        this.status.triggerProtect(2000)
        this.flyAway(board)
        this.flyingProtection--
      } else if (this.effects.has(Effect.MAX_AIRSTREAM)) {
        if (
          (this.flyingProtection === 2 && pcLife < 0.5) ||
          (this.flyingProtection === 1 && pcLife < 0.2)
        ) {
          this.status.triggerProtect(2000)
          this.flyAway(board)
          this.flyingProtection--
        }
      } else if (this.effects.has(Effect.SKYDIVE)) {
        if (
          (this.flyingProtection === 2 && pcLife < 0.5) ||
          (this.flyingProtection === 1 && pcLife < 0.2)
        ) {
          const destination =
            board.getFarthestTargetCoordinateAvailablePlace(this)
          if (destination) {
            this.status.triggerProtect(2000)
            this.simulation.room.broadcast(Transfer.ABILITY, {
              id: this.simulation.id,
              skill: "FLYING_TAKEOFF",
              positionX: this.positionX,
              positionY: this.positionY,
              targetX: destination.target.positionX,
              targetY: destination.target.positionY
            })
            this.skydiveTo(destination.x, destination.y, board)
            this.targetX = destination.target.positionX
            this.targetY = destination.target.positionY
            this.flyingProtection--
            this.commands.push(
              new DelayedCommand(() => {
                this.simulation.room.broadcast(Transfer.ABILITY, {
                  id: this.simulation.id,
                  skill: "FLYING_SKYDIVE",
                  positionX: destination.x,
                  positionY: destination.y,
                  targetX: destination.target.positionX,
                  targetY: destination.target.positionY
                })
              }, 500)
            )
            this.commands.push(
              new DelayedCommand(() => {
                if (destination.target?.hp > 0) {
                  destination.target.handleSpecialDamage(
                    1.5 * this.atk,
                    board,
                    AttackType.PHYSICAL,
                    this,
                    chance(this.critChance, this)
                  )
                }
              }, 1000)
            )
          }
        }
      }
    }

    // Fighting knockback
    if (
      this.count.fightingBlockCount > 0 &&
      this.count.fightingBlockCount % 10 === 0 &&
      distanceC(this.positionX, this.positionY, this.targetX, this.targetY) ===
        1
    ) {
      const targetAtContact = board.getValue(this.targetX, this.targetY)
      const destination = this.state.getNearestAvailablePlaceCoordinates(
        this,
        board,
        4
      )
      if (destination && targetAtContact) {
        targetAtContact.shield = 0
        targetAtContact.handleDamage({
          damage: this.atk,
          board,
          attackType: AttackType.PHYSICAL,
          attacker: this,
          shouldTargetGainMana: true
        })
        targetAtContact.moveTo(destination.x, destination.y, board)
      }
    }

    // Berries trigger
    const berry = values(this.items).find(
      (item) => Berries.includes(item) || item === Item.BERRY_JUICE
    )
    if (berry && this.life > 0 && this.life < 0.5 * this.hp) {
      this.eatBerry(berry)
    }

    // Reduce sleep duration
    if (this.status.sleepCooldown > 0) {
      this.status.sleepCooldown -= 300
    }

    // Reduce charm duration
    if (this.status.charmCooldown > 0 && attacker === this.status.charmOrigin) {
      this.status.charmCooldown -= 500
    }

    // Other passives
    if (this.passive === Passive.MIMIKYU && this.life / this.hp < 0.5) {
      this.index = PkmIndex[Pkm.MIMIKYU_BUSTED]
      this.name = Pkm.MIMIKYU_BUSTED
      this.passive = Passive.MIMIKYU_BUSTED
      this.addAttack(10, this, 0, false)
      this.status.triggerProtect(2000)
    }

    if (this.passive === Passive.DARMANITAN && this.life < 0.3 * this.hp) {
      this.index = PkmIndex[Pkm.DARMANITAN_ZEN]
      this.name = Pkm.DARMANITAN_ZEN
      this.passive = Passive.DARMANITAN_ZEN
      this.skill = Ability.TRANSE
      this.pp = 0
      this.effects.add(Effect.ZEN_MODE)
      const destination = board.getTeleportationCell(
        this.positionX,
        this.positionY
      )
      if (destination) this.moveTo(destination.x, destination.y, board)
      this.status.tree = true
      this.toIdleState()
      this.addAttack(-10, this, 0, false)
      this.addDefense(5, this, 0, false)
      this.addSpecialDefense(5, this, 0, false)
    }

    if (
      (this.passive === Passive.ZYGARDE10 ||
        this.passive === Passive.ZYGARDE50) &&
      this.life < 0.3 * this.hp
    ) {
      this.handleHeal(0.2 * this.hp, this, 0, false)
      this.addAttackSpeed(-25, this, 0, false)
      if (this.passive === Passive.ZYGARDE10) {
        this.addDefense(1, this, 0, false)
        this.addSpecialDefense(1, this, 0, false)
        this.addMaxHP(50, this, 0, false)
      } else {
        this.addAttack(5, this, 0, false)
        this.addDefense(2, this, 0, false)
        this.addSpecialDefense(2, this, 0, false)
        this.addMaxHP(80, this, 0, false)
        this.range = min(1)(this.range - 1)
      }

      this.index = PkmIndex[Pkm.ZYGARDE_100]
      this.name = Pkm.ZYGARDE_100
      this.passive = Passive.NONE
      this.skill = Ability.CORE_ENFORCER
      this.pp = 0
      this.maxPP = 120
    }

    if (this.passive === Passive.GLIMMORA && this.life < 0.5 * this.hp) {
      this.passive = Passive.NONE

      const cells = new Array<Cell>()

      let startY = 1
      let endY = 3
      if (this.team === Team.RED_TEAM) {
        startY = -2
        endY = 0
      }

      for (let x = -1; x < 2; x++) {
        for (let y = startY; y < endY; y++) {
          if (
            !(
              this.positionX + x < 0 ||
              this.positionX + x > BOARD_WIDTH ||
              this.positionY + y < 0 ||
              this.positionY + y > BOARD_HEIGHT
            )
          ) {
            cells.push({
              x: this.positionX + x,
              y: this.positionY + y,
              value:
                board.cells[
                  board.columns * this.positionY + y + this.positionX + x
                ]
            })
          }
        }
      }

      cells.forEach((cell) => {
        board.addBoardEffect(
          cell.x,
          cell.y,
          Effect.TOXIC_SPIKES,
          this.simulation
        )

        this.simulation.room.broadcast(Transfer.ABILITY, {
          id: this.simulation.id,
          skill: "TOXIC_SPIKES",
          positionX: this.positionX,
          positionY: this.positionY,
          targetX: cell.x,
          targetY: cell.y
        })

        if (cell.value && cell.value.team !== this.team) {
          cell.value.handleSpecialDamage(
            20,
            board,
            AttackType.SPECIAL,
            this,
            false
          )
        }
      })
    }
  }

  onCriticalAttack({
    target,
    board,
    damage
  }: { target: PokemonEntity; board: Board; damage: number }) {
    // proc fairy splash damage for both the attacker and the target
    if (target.fairySplashCooldown === 0 && target.types.has(Synergy.FAIRY)) {
      let shockDamageFactor = 0.3
      if (target.effects.has(Effect.AROMATIC_MIST)) {
        shockDamageFactor += 0.2
      } else if (target.effects.has(Effect.FAIRY_WIND)) {
        shockDamageFactor += 0.4
      } else if (target.effects.has(Effect.STRANGE_STEAM)) {
        shockDamageFactor += 0.6
      } else if (target.effects.has(Effect.MOON_FORCE)) {
        shockDamageFactor += 0.8
      }

      const shockDamage = shockDamageFactor * damage
      target.count.fairyCritCount++
      target.fairySplashCooldown = 250

      const distance = distanceC(
        this.positionX,
        this.positionY,
        target.positionX,
        target.positionY
      )

      if (distance <= 1 && this.items.has(Item.PROTECTIVE_PADS) === false) {
        // melee range
        this.handleSpecialDamage(
          shockDamage,
          board,
          AttackType.SPECIAL,
          target,
          false
        )
      }
    }

    if (this.items.has(Item.SCOPE_LENS)) {
      this.addPP(SCOPE_LENS_MANA, this, 0, false)
      target.addPP(-SCOPE_LENS_MANA, this, 0, false)
      target.count.manaBurnCount++
    }

    if (this.items.has(Item.RAZOR_FANG)) {
      target.status.triggerArmorReduction(4000, target)
    }

    if (target.items.has(Item.BABIRI_BERRY)) {
      target.eatBerry(Item.BABIRI_BERRY)
    }
  }

  // called after killing an opponent (does not proc if resurection)
  onKill({ target, board }: { target: PokemonEntity; board: Board }) {
    const itemEffects: OnKillEffect[] = values(this.items)
      .flatMap((item) => ItemEffects[item] ?? [])
      .filter((effect) => effect instanceof OnKillEffect)
    itemEffects.forEach((effect) => {
      effect.apply(this, target, board)
    })

    this.effectsSet.forEach((effect) => {
      if (effect instanceof OnKillEffect) {
        effect.apply(this, target, board)
      }
    })

    if (this.passive === Passive.SOUL_HEART) {
      this.addPP(10, this, 0, false)
      this.addAbilityPower(10, this, 0, false)
    }

    if (this.passive === Passive.BEAST_BOOST_ATK) {
      this.addAttack(5, this, 0, false)
    }
    if (this.passive === Passive.BEAST_BOOST_AP) {
      this.addAbilityPower(10, this, 0, false)
    }

    board.forEach(
      (x, y, v) =>
        v &&
        v.passive === Passive.MOXIE &&
        v.team === this.team &&
        v.addAttack(target.stars, v, 0, false)
    )

    if (
      target.effects.has(Effect.ODD_FLOWER) ||
      target.effects.has(Effect.GLOOM_FLOWER) ||
      target.effects.has(Effect.VILE_FLOWER) ||
      target.effects.has(Effect.SUN_FLOWER)
    ) {
      if (!target.simulation.flowerSpawn[target.team]) {
        target.simulation.flowerSpawn[target.team] = true
        const spawnSpot =
          board.getFarthestTargetCoordinateAvailablePlace(target)
        if (spawnSpot) {
          let flowerSpawnName = Pkm.ODDISH
          if (target.effects.has(Effect.GLOOM_FLOWER)) {
            flowerSpawnName = Pkm.GLOOM
          } else if (target.effects.has(Effect.VILE_FLOWER)) {
            flowerSpawnName = Pkm.VILEPLUME
          } else if (target.effects.has(Effect.SUN_FLOWER)) {
            flowerSpawnName = Pkm.BELLOSSOM
          }

          target.simulation.addPokemon(
            PokemonFactory.createPokemonFromName(
              flowerSpawnName,
              target.player
            ),
            spawnSpot.x,
            spawnSpot.y,
            target.team,
            true
          )
        }
      }

      const floraSpawn = board.cells.find(
        (entity) =>
          entity &&
          entity.team === target.team &&
          [Pkm.ODDISH, Pkm.GLOOM, Pkm.VILEPLUME, Pkm.BELLOSSOM].includes(
            entity.name
          )
      )
      const randomItem = pickRandomIn(
        values(target.items).filter(
          (item) => item !== Item.COMFEY && item !== Item.LEAF_STONE
        )
      )
      if (floraSpawn && randomItem && floraSpawn.items.size < 3) {
        floraSpawn.addItem(randomItem)
        target.removeItem(randomItem)
      }
    }

    if (target.items.has(Item.COMFEY)) {
      const nearestAvailableCoordinate =
        this.state.getNearestAvailablePlaceCoordinates(target, board, 2)
      if (nearestAvailableCoordinate) {
        target.simulation.addPokemon(
          PokemonFactory.createPokemonFromName(Pkm.COMFEY, target.player),
          nearestAvailableCoordinate.x,
          nearestAvailableCoordinate.y,
          target.team
        )
      }
    }

    if (this.passive === Passive.GRIM_NEIGH) {
      this.addAbilityPower(30, this, 0, false)
    }

    if (this.passive === Passive.GUZZLORD && this.items.has(Item.CHEF_HAT)) {
      this.addAbilityPower(4, this, 0, false, true)
    }

    if (
      this.player &&
      this.simulation.room.state.specialGameRule === SpecialGameRule.BLOOD_MONEY
    ) {
      this.player.addMoney(1, true, this)
      this.count.moneyCount += 1
    }
  }

  // called after death (does not proc if resurection)
  onDeath({ board }: { board: Board }) {
    if (!this.isGhostOpponent) {
      this.refToBoardPokemon.deathCount++
    }
    const isWorkUp = this.effects.has(Effect.BULK_UP)
    const isRage = this.effects.has(Effect.RAGE)
    const isAngerPoint = this.effects.has(Effect.ANGER_POINT)

    if (isWorkUp || isRage || isAngerPoint) {
      let heal = 0
      let speedBoost = 0
      if (isWorkUp) {
        heal = 30
        speedBoost = 15
      } else if (isRage) {
        heal = 35
        speedBoost = 20
      } else if (isAngerPoint) {
        heal = 40
        speedBoost = 25
      }
      const _pokemon = this // beware of closure vars
      this.simulation.room.clock.setTimeout(() => {
        board.forEach((x, y, value) => {
          if (
            value &&
            value.team == _pokemon.team &&
            value.types.has(Synergy.FIELD)
          ) {
            value.count.fieldCount++
            value.handleHeal(heal, _pokemon, 0, false)
            value.addAttackSpeed(speedBoost, value, 0, false)
          }
        })
      }, 16) // delay to next tick, targeting 60 ticks per second
    }

    if (this.status.curseVulnerability) {
      this.simulation.applyCurse(Effect.CURSE_OF_VULNERABILITY, this.team)
    }
    if (this.status.curseWeakness) {
      this.simulation.applyCurse(Effect.CURSE_OF_WEAKNESS, this.team)
    }
    if (this.status.curseTorment) {
      this.simulation.applyCurse(Effect.CURSE_OF_TORMENT, this.team)
    }
    if (this.status.curseFate) {
      this.simulation.applyCurse(Effect.CURSE_OF_FATE, this.team)
    }

    if (this.passive === Passive.PYUKUMUKU) {
      this.simulation.room.broadcast(Transfer.ABILITY, {
        id: this.simulation.id,
        skill: Ability.EXPLOSION,
        positionX: this.positionX,
        positionY: this.positionY
      })
      const adjcells = board.getAdjacentCells(this.positionX, this.positionY)
      adjcells.forEach((cell) => {
        if (cell.value && this.team != cell.value.team) {
          cell.value.handleSpecialDamage(
            100,
            board,
            AttackType.SPECIAL,
            this,
            false
          )
        }
      })
    }
  }

  flyAway(board: Board) {
    const flyAwayCell = board.getFlyAwayCell(this.positionX, this.positionY)
    if (flyAwayCell) {
      this.moveTo(flyAwayCell.x, flyAwayCell.y, board)
    }
  }

  applyStat(stat: Stat, value: number, permanent = false) {
    switch (stat) {
      case Stat.ATK:
        this.addAttack(value, this, 0, false, permanent)
        break
      case Stat.DEF:
        this.addDefense(value, this, 0, false, permanent)
        break
      case Stat.SPE_DEF:
        this.addSpecialDefense(value, this, 0, false, permanent)
        break
      case Stat.AP:
        this.addAbilityPower(value, this, 0, false, permanent)
        break
      case Stat.PP:
        this.addPP(value, this, 0, false)
        break
      case Stat.ATK_SPEED:
        this.addAttackSpeed(value, this, 0, false, permanent)
        break
      case Stat.CRIT_CHANCE:
        this.addCritChance(value, this, 0, false)
        break
      case Stat.CRIT_POWER:
        this.addCritPower(value, this, 0, false)
        break
      case Stat.SHIELD:
        this.addShield(value, this, 0, false)
        break
      case Stat.HP:
        this.addMaxHP(value, this, 0, false, permanent)
        break
      case Stat.LUCK:
        this.addLuck(value, this, 0, false, permanent)
        break
    }
  }

  resurrect() {
    this.life = this.hp
    this.pp = 0
    this.status.clearNegativeStatus()

    if (this.items.has(Item.SACRED_ASH) && this.player) {
      const team = this.simulation.getTeam(this.player.id)
      if (team) {
        const alliesAlive = values(team)
          .filter((e) => e.life > 0)
          .map((e) => e.refToBoardPokemon.id)
        const koAllies = values(this.player.board).filter(
          (p) =>
            p.id !== this.refToBoardPokemon.id &&
            !isOnBench(p) &&
            alliesAlive.includes(p.id) === false
        )

        const spawns = pickNRandomIn(koAllies, 3)
        spawns.forEach((spawn) => {
          const mon = PokemonFactory.createPokemonFromName(spawn.name, {
            selectedEmotion: spawn.emotion,
            selectedShiny: spawn.shiny
          })
          const coord =
            this.simulation.getClosestAvailablePlaceOnBoardToPokemon(
              this,
              this.team
            )
          this.simulation.addPokemon(mon, coord.x, coord.y, this.team, true)
        })
      }
    }

    const stackingItems = [
      Item.DEFENSIVE_RIBBON,
      Item.SOUL_DEW,
      Item.UPGRADE,
      Item.MAGMARIZER
    ]

    const removedItems = [Item.DYNAMAX_BAND, Item.SACRED_ASH, Item.MAX_REVIVE]

    stackingItems.forEach((item) => {
      if (this.items.has(item)) {
        ItemEffects[item]
          ?.filter((effect) => effect instanceof OnItemRemovedEffect)
          ?.forEach((effect) => effect.apply(this))
        ItemEffects[item]
          ?.filter((effect) => effect instanceof OnItemGainedEffect)
          ?.forEach((effect) => effect.apply(this))
      }
    })

    removedItems.forEach((item) => {
      if (this.items.has(item)) {
        this.removeItem(item)
      }
    })

    const resetGroundStacks = (effect: GrowGroundEffect) => {
      const removalAmount = -effect.synergyLevel * effect.count
      this.addDefense(removalAmount, this, 0, false)
      this.addSpecialDefense(removalAmount, this, 0, false)
      this.addAttack(removalAmount, this, 0, false)
      effect.count = 0
    }

    const resetMonsterStacks = (effect: MonsterKillEffect) => {
      const attackBoost = [3, 6, 10, 10][effect.synergyLevel] ?? 10
      const apBoost = [10, 20, 30, 30][effect.synergyLevel] ?? 30
      this.addAttack(-effect.count * attackBoost, this, 0, false)
      this.addAbilityPower(-effect.count * apBoost, this, 0, false)
      this.addMaxHP(-effect.hpBoosted, this, 0, false)
      effect.hpBoosted = 0
      effect.count = 0
    }

    const resetFireStacks = (effect: FireHitEffect) => {
      const removalAmount = -effect.count * effect.synergyLevel
      this.addAttack(removalAmount, this, 0, false)
      effect.count = 0
    }

    const resetSoundStacks = (effect: Effect) => {
      const synergyLevel = SynergyEffects[Synergy.SOUND].indexOf(effect)
      const attackBoost =
        ([2, 1, 1][synergyLevel] ?? 0) * -this.count.soundCryCount
      const attackSpeedBoost =
        ([0, 5, 5][synergyLevel] ?? 0) * -this.count.soundCryCount
      const manaBoost =
        ([0, 0, 3][synergyLevel] ?? 0) * -this.count.soundCryCount
      this.addAttack(attackBoost, this, 0, false)
      this.addAttackSpeed(attackSpeedBoost, this, 0, false)
      this.addPP(manaBoost, this, 0, false)
      this.count.soundCryCount = 0
    }

    this.effectsSet.forEach((effect) => {
      if (effect instanceof GrowGroundEffect) {
        resetGroundStacks(effect)
      } else if (effect instanceof MonsterKillEffect) {
        resetMonsterStacks(effect)
      } else if (effect instanceof FireHitEffect) {
        resetFireStacks(effect)
      }
    })
    const soundEffect = SynergyEffects[Synergy.SOUND].find((effect) =>
      this.player?.effects.has(effect)
    )
    if (soundEffect) {
      resetSoundStacks(soundEffect)
    }

    this.status.resurection = false // prevent resurrecting again
    this.shield = 0 // remove existing shield
    this.flyingProtection = 0 // prevent flying effects twice
  }

  eatBerry(berry: Item, stealedFrom?: PokemonEntity, inPuffin = false) {
    const heal = (val) =>
      inPuffin
        ? this.addShield(val, this, 0, false)
        : this.handleHeal(val, this, 0, false)

    switch (berry) {
      case Item.AGUAV_BERRY:
        heal(min(20)(0.5 * this.hp))
        this.status.triggerConfusion(3000, this, this)
        break
      case Item.APICOT_BERRY:
        heal(20)
        this.addSpecialDefense(20, this, 0, false)
        break
      case Item.ASPEAR_BERRY:
        this.status.freeze = false
        this.status.freezeCooldown = 0
        this.effects.add(Effect.IMMUNITY_FREEZE)
        heal(20)
        this.addAttackSpeed(15, this, 0, false)
        break
      case Item.CHERI_BERRY:
        this.status.healParalysis(this)
        this.effects.add(Effect.IMMUNITY_PARALYSIS)
        heal(20)
        this.addAttack(10, this, 0, false)
        break
      case Item.CHESTO_BERRY:
        this.status.sleep = false
        this.status.sleepCooldown = 0
        this.effects.add(Effect.IMMUNITY_SLEEP)
        heal(20)
        this.addAbilityPower(50, this, 0, false)
        break
      case Item.GANLON_BERRY:
        heal(20)
        this.addDefense(20, this, 0, false)
        break
      case Item.JABOCA_BERRY:
        heal(20)
        this.status.triggerSpikeArmor(10000)
        break
      case Item.LANSAT_BERRY:
        heal(20)
        this.addCritChance(50, this, 0, false)
        break
      case Item.LEPPA_BERRY:
        heal(20)
        this.addPP(50, this, 0, false)
        break
      case Item.LIECHI_BERRY:
        heal(20)
        this.addAttack(15, this, 0, false)
        break
      case Item.LUM_BERRY:
        heal(20)
        this.status.clearNegativeStatus()
        this.status.triggerRuneProtect(5000)
        break
      case Item.ORAN_BERRY:
        heal(20)
        this.addShield(80, this, 0, false)
        break
      case Item.PECHA_BERRY:
        heal(50)
        this.status.poisonOrigin = undefined
        this.status.poisonStacks = 0
        this.status.poisonDamageCooldown = 0
        this.effects.add(Effect.IMMUNITY_POISON)
        break
      case Item.PERSIM_BERRY:
        this.status.confusion = false
        this.status.confusionCooldown = 0
        this.effects.add(Effect.IMMUNITY_CONFUSION)
        heal(20)
        this.addSpecialDefense(10, this, 0, false)
        break
      case Item.PETAYA_BERRY:
        heal(20)
        this.addAbilityPower(80, this, 0, false)
        break
      case Item.ROWAP_BERRY:
        heal(20)
        this.status.triggerMagicBounce(10000)
        break
      case Item.RAWST_BERRY:
        this.status.healBurn(this)
        this.effects.add(Effect.IMMUNITY_BURN)
        heal(20)
        this.addDefense(10, this, 0, false)
        break
      case Item.SALAC_BERRY:
        heal(20)
        this.addAttackSpeed(50, this, 0, false)
        break
      case Item.SITRUS_BERRY:
        this.effects.add(Effect.BUFF_HEAL_RECEIVED)
        heal(20)
        break
      case Item.BERRY_JUICE:
        heal(this.hp - this.life)
        break
      case Item.BABIRI_BERRY:
        this.status.triggerProtect(2000)
        heal(20)
        break
    }

    if (stealedFrom) {
      stealedFrom.removeItem(berry, true)
    } else {
      this.removeItem(berry, true)
    }

    if (this.passive === Passive.GLUTTON) {
      this.applyStat(Stat.HP, 5, true)
      if (this.refToBoardPokemon.hp > 750) {
        this.player?.titles.add(Title.GLUTTON)
      }
    }

    if (this.effects.has(Effect.BERRY_JUICE)) {
      this.addShield(50, this, 0, false)
    }
  }

  transferAbility(name: Ability | string) {
    this.simulation.room.broadcast(Transfer.ABILITY, {
      id: this.simulation.id,
      skill: name,
      positionX: this.positionX,
      positionY: this.positionY,
      targetX: this.targetX,
      targetY: this.targetY,
      orientation: this.orientation
    })
  }
}

export function getStrongestUnit<T extends Pokemon | PokemonEntity>(
  pokemons: T[]
): T {
  /*
    strongest is defined as:
    1) number of items
    2) stars level
    3) rarity cost
    */
  const pokemonScores = pokemons.map((pokemon) => getUnitScore(pokemon))
  const bestScore = Math.max(...pokemonScores)
  return pickRandomIn(pokemons.filter((p, i) => pokemonScores[i] === bestScore))
}

export function getUnitScore(pokemon: IPokemonEntity | IPokemon) {
  let score = 0
  score += 100 * pokemon.items.size
  score += 10 * pokemon.stars
  score += getSellPrice(pokemon)
  return score
}

export function canSell(
  pkm: Pkm,
  specialGameRule: SpecialGameRule | undefined | null
) {
  if (specialGameRule === SpecialGameRule.DITTO_PARTY && pkm === Pkm.DITTO) {
    return false
  }

  return new PokemonClasses[pkm]().canBeSold
}

export function getMoveSpeed(
  pokemon: IPokemonEntity,
  weather: Weather
): number {
  let moveSpeed = 1
  if (weather === Weather.SNOW) {
    moveSpeed -= 0.25
  } else if (weather === Weather.WINDY) {
    moveSpeed += 0.2
  }
  if (pokemon.status.paralysis) {
    moveSpeed -= 0.4
  }

  if (pokemon.effects.has(Effect.QUICK_FEET)) {
    moveSpeed += 0.3
  } else if (pokemon.effects.has(Effect.RUN_AWAY)) {
    moveSpeed += 0.5
  } else if (pokemon.effects.has(Effect.HUSTLE)) {
    moveSpeed += 0.8
  } else if (pokemon.effects.has(Effect.BERSERK)) {
    moveSpeed += 1.0
  }

  return moveSpeed
}
