import { Schema, type } from "@colyseus/schema"
import Board from "../../core/board"
import { PokemonEntity } from "../../core/pokemon-entity"
import { IPokemonEntity, ISimulation, IStatus, Transfer } from "../../types"
import { Ability } from "../../types/enum/Ability"
import { Effect } from "../../types/enum/Effect"
import { AttackType } from "../../types/enum/Game"
import { Item } from "../../types/enum/Item"
import { Passive } from "../../types/enum/Passive"
import { Weather } from "../../types/enum/Weather"
import { count } from "../../utils/array"
import { max, min } from "../../utils/number"
import { chance } from "../../utils/random"
import { FIGHTING_PHASE_DURATION } from "../../types/Config"

export default class Status extends Schema implements IStatus {
  @type("boolean") burn = false
  @type("boolean") silence = false
  @type("boolean") fatigue = false
  @type("number") poisonStacks = 0
  @type("boolean") freeze = false
  @type("boolean") protect = false
  @type("boolean") sleep = false
  @type("boolean") confusion = false
  @type("boolean") wound = false
  @type("boolean") resurection = false
  @type("boolean") resurecting = false
  @type("boolean") paralysis = false
  @type("boolean") pokerus = false
  @type("boolean") locked = false
  @type("boolean") blinded = false
  @type("boolean") armorReduction = false
  @type("boolean") runeProtect = false
  @type("boolean") charm = false
  @type("boolean") flinch = false
  @type("boolean") electricField = false
  @type("boolean") psychicField = false
  @type("boolean") grassField = false
  @type("boolean") fairyField = false
  @type("boolean") spikeArmor = false
  @type("boolean") magicBounce = false
  @type("boolean") light = false
  @type("boolean") curse = false
  @type("boolean") curseVulnerability = false
  @type("boolean") curseWeakness = false
  @type("boolean") curseTorment = false
  @type("boolean") curseFate = false
  @type("boolean") enraged = false
  @type("boolean") skydiving = false
  @type("boolean") tree = false
  burnOrigin: PokemonEntity | undefined = undefined
  poisonOrigin: PokemonEntity | undefined = undefined
  silenceOrigin: PokemonEntity | undefined = undefined
  woundOrigin: PokemonEntity | undefined = undefined
  charmOrigin: PokemonEntity | undefined = undefined
  burnCooldown = 0
  burnDamageCooldown = 1000
  silenceCooldown = 0
  fatigueCooldown = 0
  poisonCooldown = 0
  poisonDamageCooldown = 1000
  freezeCooldown = 0
  protectCooldown = 0
  sleepCooldown = 0
  confusionCooldown = 0
  woundCooldown = 0
  paralysisCooldown = 0
  armorReductionCooldown = 0
  runeProtectCooldown = 0
  charmCooldown = 0
  flinchCooldown = 0
  enrageCooldown = 0
  spikeArmorCooldown = 0
  magicBounceCooldown = 0
  resurectingCooldown = 0
  curseCooldown = 0
  pokerusCooldown = 2500
  lockedCooldown = 0
  blindCooldown = 0
  enrageDelay = 35000

  constructor(simulation: ISimulation) {
    super()
    const elapsedTime = FIGHTING_PHASE_DURATION - simulation.room.state.time
    this.enrageDelay = this.enrageDelay - elapsedTime
  }

  clearNegativeStatus() {
    this.burnCooldown = 0
    this.silenceCooldown = 0
    this.fatigueCooldown = 0
    this.poisonCooldown = 0
    this.freezeCooldown = 0
    this.sleepCooldown = 0
    this.confusionCooldown = 0
    this.woundCooldown = 0
    this.paralysisCooldown = 0
    this.charmCooldown = 0
    this.flinchCooldown = 0
    this.armorReductionCooldown = 0
    this.curseCooldown = 0
    this.curse = false
    this.lockedCooldown = 0
    this.enrageCooldown = 0
    this.blindCooldown = 0
  }

  hasNegativeStatus() {
    return (
      this.burn ||
      this.silence ||
      this.fatigue ||
      this.poisonStacks > 0 ||
      this.freeze ||
      this.sleep ||
      this.confusion ||
      this.wound ||
      this.paralysis ||
      this.charm ||
      this.flinch ||
      this.armorReduction ||
      this.curse ||
      this.locked ||
      this.blinded
    )
  }

  updateAllStatus(dt: number, pokemon: PokemonEntity, board: Board) {
    if (pokemon.effects.has(Effect.POISON_GAS) && this.poisonStacks === 0) {
      this.triggerPoison(1500, pokemon, undefined)
    }

    if (pokemon.effects.has(Effect.SMOKE) && !this.blinded) {
      this.triggerBlinded(1000, pokemon)
    }

    if (pokemon.effects.has(Effect.STICKY_WEB) && !this.paralysis) {
      this.triggerParalysis(2000, pokemon, null)
    }

    if (pokemon.status.runeProtect) {
      this.updateRuneProtect(dt)
    }

    if (this.burn) {
      this.updateBurn(dt, pokemon, board)
    }

    if (this.poisonStacks > 0) {
      this.updatePoison(dt, pokemon, board)
    }

    if (this.sleep) {
      this.updateSleep(dt)
    }

    if (this.silence) {
      this.updateSilence(dt)
    }

    if (this.fatigue) {
      this.updateFatigue(dt)
    }

    if (this.protect) {
      this.updateProtect(dt)
    }

    if (this.freeze) {
      this.updateFreeze(dt)
    }

    if (this.confusion) {
      this.updateConfusion(dt)
    }

    if (this.wound) {
      this.updateWound(dt)
    }

    if (this.paralysis) {
      this.updateParalysis(dt, pokemon)
    }

    if (this.locked) {
      this.updateLocked(dt, pokemon)
    }

    if (this.blinded) {
      this.updateBlinded(dt)
    }

    if (this.pokerus) {
      this.updatePokerus(dt, pokemon, board)
    }

    if (this.armorReduction) {
      this.updateArmorReduction(dt)
    }

    if (this.charm) {
      this.updateCharm(dt)
    }

    if (this.flinch) {
      this.updateFlinch(dt)
    }

    if (this.spikeArmor) {
      this.updateSpikeArmor(dt)
    }

    if (this.magicBounce) {
      this.updateMagicBounce(dt)
    }

    if (this.resurecting) {
      this.updateResurecting(dt, pokemon)
    }

    if (this.curse) {
      this.updateCurse(dt, board, pokemon)
    }

    this.updateRage(dt, pokemon)

    if (pokemon.status.curseVulnerability && !pokemon.status.flinch) {
      this.triggerFlinch(30000, pokemon)
    }

    if (pokemon.status.curseWeakness && !pokemon.status.paralysis) {
      this.triggerParalysis(30000, pokemon, null)
    }

    if (pokemon.status.curseTorment && !pokemon.status.fatigue) {
      this.triggerFatigue(30000, pokemon)
    }

    if (pokemon.status.curseFate && !pokemon.status.curse) {
      this.triggerCurse(6500) //Intentionally a bit less than 7 seconds to account for status update delay
    }
  }

  triggerArmorReduction(duration: number, pkm: PokemonEntity) {
    if (!this.runeProtect) {
      this.armorReduction = true

      duration = this.applyAquaticReduction(duration, pkm)

      if (duration > this.armorReductionCooldown) {
        this.armorReductionCooldown = Math.round(duration)
      }
    }
  }

  updateArmorReduction(dt: number) {
    if (this.armorReductionCooldown - dt <= 0) {
      this.armorReduction = false
    } else {
      this.armorReductionCooldown -= dt
    }
  }

  triggerRage(duration: number, pokemon: PokemonEntity) {
    this.enraged = true
    this.protect = false
    duration = this.applyAquaticReduction(duration, pokemon)
    this.enrageCooldown = Math.round(duration)
    pokemon.addAttackSpeed(100, pokemon, 0, false)
  }

  updateRage(dt: number, pokemon: PokemonEntity) {
    if (
      !this.enraged &&
      this.enrageDelay - dt <= 0 &&
      !pokemon.simulation.finished
    ) {
      this.enraged = true
      this.protect = false
      pokemon.addAttackSpeed(100, pokemon, 0, false)
    } else if (
      this.enraged &&
      this.enrageCooldown - dt <= 0 &&
      this.enrageDelay - dt > 0
    ) {
      this.enraged = false
      pokemon.addAttackSpeed(-100, pokemon, 0, false)
    }

    this.enrageDelay -= dt
    this.enrageCooldown -= dt
  }

  triggerBurn(
    duration: number,
    pkm: PokemonEntity,
    origin: PokemonEntity | undefined
  ) {
    if (
      !pkm.effects.has(Effect.IMMUNITY_BURN) &&
      !this.runeProtect &&
      pkm.passive !== Passive.WATER_BUBBLE
    ) {
      this.burn = true

      duration = this.applyAquaticReduction(duration, pkm)

      if (duration > this.burnCooldown) {
        this.burnCooldown = duration
        if (origin) {
          this.burnOrigin = origin
        }
      }

      if (
        pkm.passive === Passive.GUTS &&
        !pkm.effects.has(Effect.GUTS_PASSIVE)
      ) {
        pkm.effects.add(Effect.GUTS_PASSIVE)
        pkm.addAttack(5, pkm, 0, false)
      }

      if (pkm.passive === Passive.WELL_BAKED) {
        pkm.addDefense(20, pkm, 0, false)
      }

      if (pkm.items.has(Item.RAWST_BERRY)) {
        pkm.eatBerry(Item.RAWST_BERRY)
      }
    }
  }

  updateBurn(dt: number, pkm: PokemonEntity, board: Board) {
    if (this.burnDamageCooldown - dt <= 0) {
      if (this.burnOrigin) {
        let burnDamage = pkm.hp * 0.05
        if (pkm.simulation.weather === Weather.SUN) {
          burnDamage *= 1.3
          const nbHeatRocks = pkm.player
            ? count(pkm.player.items, Item.HEAT_ROCK)
            : 0
          if (nbHeatRocks > 0) {
            burnDamage *= 1 - 0.2 * nbHeatRocks
          }
        } else if (pkm.simulation.weather === Weather.RAIN) {
          burnDamage *= 0.7
        }

        if (pkm.items.has(Item.ASSAULT_VEST)) {
          burnDamage *= 0.5
        }

        if (pkm.passive === Passive.WELL_BAKED) {
          burnDamage = 0
        }

        if (burnDamage > 0) {
          pkm.handleDamage({
            damage: Math.round(burnDamage),
            board,
            attackType: AttackType.TRUE,
            attacker: this.burnOrigin,
            shouldTargetGainMana: true
          })
        }
        this.burnDamageCooldown = 1000
      }
    } else {
      this.burnDamageCooldown -= dt
    }

    if (this.burnCooldown - dt <= 0) {
      this.healBurn(pkm)
    } else {
      this.burnCooldown -= dt
    }
  }

  healBurn(pkm: PokemonEntity) {
    this.burn = false
    this.burnOrigin = undefined
    this.burnDamageCooldown = 1000
    if (pkm.passive === Passive.GUTS && this.poisonStacks === 0) {
      pkm.effects.delete(Effect.GUTS_PASSIVE)
      pkm.addAttack(-5, pkm, 0, false)
    }
    if (pkm.passive === Passive.WELL_BAKED) {
      pkm.addDefense(-20, pkm, 0, false)
    }
  }

  triggerSilence(duration: number, pkm: PokemonEntity, origin?: PokemonEntity) {
    if (!this.runeProtect && !this.tree) {
      duration = this.applyAquaticReduction(duration, pkm)

      this.silence = true
      if (duration > this.silenceCooldown) {
        this.silenceCooldown = duration
        if (origin) {
          this.silenceOrigin = origin
        }
      }
    }
  }

  updateSilence(dt: number) {
    if (this.silenceCooldown - dt <= 0) {
      this.silence = false
      this.silenceOrigin = undefined
    } else {
      this.silenceCooldown -= dt
    }
  }

  triggerFatigue(duration: number, pkm: PokemonEntity) {
    if (!this.runeProtect) {
      duration = this.applyAquaticReduction(duration, pkm)

      this.fatigue = true
      if (duration > this.fatigueCooldown) {
        this.fatigueCooldown = duration
      }
    }
  }

  updateFatigue(dt: number) {
    if (this.fatigueCooldown - dt <= 0) {
      this.fatigue = false
    } else {
      this.fatigueCooldown -= dt
    }
  }

  triggerPoison(
    duration: number,
    pkm: PokemonEntity,
    origin: PokemonEntity | undefined
  ) {
    if (!pkm.effects.has(Effect.IMMUNITY_POISON) && !this.runeProtect) {
      let maxStacks = 3
      if (origin) {
        this.poisonOrigin = origin
        if (origin.effects.has(Effect.VENOMOUS)) {
          maxStacks = 4
        }
        if (origin.effects.has(Effect.TOXIC)) {
          maxStacks = 5
        }
      }
      this.poisonStacks = max(maxStacks)(this.poisonStacks + 1)

      duration = this.applyAquaticReduction(duration, pkm)

      if (duration > this.poisonCooldown) {
        this.poisonCooldown = duration
      }
      if (
        pkm.passive === Passive.GUTS &&
        !pkm.effects.has(Effect.GUTS_PASSIVE)
      ) {
        pkm.effects.add(Effect.GUTS_PASSIVE)
        pkm.addAttack(5, pkm, 0, false)
      }

      if (
        pkm.passive === Passive.TOXIC_BOOST &&
        !pkm.effects.has(Effect.TOXIC_BOOST)
      ) {
        pkm.effects.add(Effect.TOXIC_BOOST)
        pkm.addAttack(10, pkm, 0, false)
      }

      if (pkm.items.has(Item.PECHA_BERRY)) {
        pkm.eatBerry(Item.PECHA_BERRY)
      }
    }
  }

  updatePoison(dt: number, pkm: PokemonEntity, board: Board) {
    if (this.poisonDamageCooldown - dt <= 0) {
      let poisonDamage = Math.ceil(pkm.hp * 0.05 * this.poisonStacks)
      if (pkm.simulation.weather === Weather.RAIN) {
        poisonDamage *= 0.7
      }

      if (pkm.items.has(Item.ASSAULT_VEST)) {
        poisonDamage *= 0.5
      }
      if (pkm.passive === Passive.TOXIC_BOOST) {
        poisonDamage *= 0.5
      }

      if (
        pkm.passive === Passive.POISON_HEAL ||
        pkm.passive === Passive.GLIGAR
      ) {
        pkm.handleHeal(Math.round(poisonDamage), pkm, 0, false)
      } else {
        pkm.handleDamage({
          damage: Math.round(poisonDamage),
          board,
          attackType: AttackType.TRUE,
          attacker: this.poisonOrigin ?? null,
          shouldTargetGainMana: false
        })
      }

      if (pkm.effects.has(Effect.POISON_GAS)) {
        // reapply poison stack on every poison tick if in poison gas
        this.triggerPoison(1500, pkm, undefined)
      }

      this.poisonDamageCooldown = 1000
    } else {
      this.poisonDamageCooldown -= dt
    }

    if (this.poisonCooldown - dt <= 0) {
      this.poisonStacks = 0
      this.poisonOrigin = undefined
      this.poisonDamageCooldown = 1000
      if (pkm.passive === Passive.GUTS && !this.burn) {
        pkm.effects.delete(Effect.GUTS_PASSIVE)
        pkm.addAttack(-5, pkm, 0, false)
      }
      if (pkm.passive === Passive.TOXIC_BOOST) {
        pkm.effects.delete(Effect.TOXIC_BOOST)
        pkm.addAttack(-10, pkm, 0, false)
      }
    } else {
      this.poisonCooldown = this.poisonCooldown - dt
    }
  }

  triggerFreeze(duration: number, pkm: PokemonEntity) {
    if (
      !this.freeze && // freeze cannot be stacked
      !this.runeProtect &&
      !this.skydiving &&
      !pkm.effects.has(Effect.IMMUNITY_FREEZE)
    ) {
      if (pkm.simulation.weather === Weather.SNOW) {
        duration *= 1.3
        const nbIcyRocks = pkm.player
          ? count(pkm.player.items, Item.ICY_ROCK)
          : 0
        if (nbIcyRocks > 0) {
          duration *= 1 - 0.2 * nbIcyRocks
        }
      } else if (pkm.simulation.weather === Weather.SUN) {
        duration *= 0.7
      }
      if (pkm.status.enraged) {
        duration = duration / 2
      }

      duration = this.applyAquaticReduction(duration, pkm)

      this.freeze = true
      this.freezeCooldown = Math.round(duration)

      if (pkm.items.has(Item.ASPEAR_BERRY)) {
        pkm.eatBerry(Item.ASPEAR_BERRY)
      }
    }
  }

  updateFreeze(dt: number) {
    if (this.freezeCooldown - dt <= 0) {
      this.freeze = false
    } else {
      this.freezeCooldown -= dt
    }
  }

  triggerProtect(timer: number) {
    if (!this.protect && !this.enraged) {
      // protect cannot be stacked
      this.protect = true
      this.protectCooldown = timer
    }
  }

  updateProtect(dt: number) {
    if (this.protectCooldown - dt <= 0) {
      this.protect = false
    } else {
      this.protectCooldown -= dt
    }
  }

  triggerSleep(duration: number, pkm: PokemonEntity) {
    if (
      !this.sleep &&
      !this.runeProtect &&
      !this.skydiving &&
      !pkm.effects.has(Effect.IMMUNITY_SLEEP)
    ) {
      if (pkm.simulation.weather === Weather.NIGHT) {
        duration *= 1.3
      }
      if (pkm.status.enraged) {
        duration = duration / 2
      }

      duration = this.applyAquaticReduction(duration, pkm)

      this.sleep = true
      this.sleepCooldown = Math.round(duration)

      if (pkm.items.has(Item.CHESTO_BERRY)) {
        pkm.eatBerry(Item.CHESTO_BERRY)
      }
    }
  }

  updateSleep(dt: number) {
    if (this.sleepCooldown - dt <= 0) {
      this.sleep = false
    } else {
      this.sleepCooldown = this.sleepCooldown - dt
    }
  }

  triggerConfusion(
    duration: number,
    pkm: PokemonEntity,
    origin: PokemonEntity,
    apBoost = false
  ) {
    if (
      !this.confusion &&
      !this.runeProtect &&
      !pkm.effects.has(Effect.IMMUNITY_CONFUSION)
    ) {
      const boost = apBoost && origin ? (duration * origin.ap) / 100 : 0
      duration = duration + boost
      if (pkm.simulation.weather === Weather.SANDSTORM) {
        duration *= 1.3
      }

      duration = this.applyAquaticReduction(duration, pkm)

      this.confusion = true
      this.confusionCooldown = Math.round(duration)

      if (pkm.items.has(Item.PERSIM_BERRY)) {
        pkm.eatBerry(Item.PERSIM_BERRY)
      }

      if (pkm.passive === Passive.PSYDUCK) {
        pkm.addAbilityPower(100, pkm, 0, false)
      }
    }
  }

  updateConfusion(dt: number) {
    if (this.confusionCooldown - dt <= 0) {
      this.confusion = false
    } else {
      this.confusionCooldown -= dt
    }
  }

  triggerCharm(
    duration: number,
    pkm: IPokemonEntity,
    origin: PokemonEntity,
    apBoost = false
  ) {
    if (!this.charm && !this.runeProtect) {
      const boost = apBoost && origin ? (duration * origin.ap) / 100 : 0
      duration = duration + boost
      if (pkm.simulation.weather === Weather.MISTY) {
        duration *= 1.3
      }

      duration = this.applyAquaticReduction(duration, pkm)

      this.charm = true
      this.charmCooldown = duration
      this.charmOrigin = origin
      if (origin) {
        pkm.targetX = origin?.positionX
        pkm.targetY = origin?.positionY
      }
    }
  }

  updateCharm(dt: number) {
    if (this.charmCooldown - dt <= 0) {
      this.charm = false
      this.charmOrigin = undefined
    } else {
      this.charmCooldown -= dt
    }
  }

  triggerWound(
    duration: number,
    pkm: PokemonEntity,
    origin: PokemonEntity | undefined
  ) {
    if (!this.runeProtect) {
      this.wound = true
      if (pkm.simulation.weather === Weather.BLOODMOON) {
        duration *= 1.3
      }

      duration = this.applyAquaticReduction(duration, pkm)

      if (duration > this.woundCooldown) {
        this.woundCooldown = duration
        if (origin) {
          this.woundOrigin = origin
        }
      }
    }
  }

  updateWound(dt: number) {
    if (this.woundCooldown - dt <= 0) {
      this.wound = false
      this.woundOrigin = undefined
    } else {
      this.woundCooldown -= dt
    }
  }

  triggerParalysis(
    duration: number,
    pkm: PokemonEntity,
    origin: PokemonEntity | null,
    apBoost = false
  ) {
    if (!this.runeProtect && !pkm.effects.has(Effect.IMMUNITY_PARALYSIS)) {
      if (!this.paralysis) {
        this.paralysis = true
        pkm.addAttackSpeed(-40, pkm, 0, false)
      }
      const boost = apBoost && origin ? (duration * origin.ap) / 100 : 0
      duration = duration + boost
      if (pkm.simulation.weather === Weather.STORM) {
        duration *= 1.3
        const nbElectricQuartz = pkm.player
          ? count(pkm.player.items, Item.ELECTRIC_QUARTZ)
          : 0
        if (nbElectricQuartz > 0) {
          duration *= 1 - 0.2 * nbElectricQuartz
        }
      }

      duration = this.applyAquaticReduction(duration, pkm)

      if (duration > this.paralysisCooldown) {
        this.paralysisCooldown = Math.round(duration)
      }

      if (pkm.items.has(Item.CHERI_BERRY)) {
        pkm.eatBerry(Item.CHERI_BERRY)
      }
    }
  }

  updateParalysis(dt: number, pkm: PokemonEntity) {
    if (this.paralysisCooldown - dt <= 0) {
      this.healParalysis(pkm)
    } else {
      this.paralysisCooldown -= dt
    }
  }

  healParalysis(pkm: PokemonEntity) {
    if (this.paralysis) {
      this.paralysis = false
      this.paralysisCooldown = 0
      pkm.addAttackSpeed(40, pkm, 0, false)
    }
  }

  triggerRuneProtect(timer: number) {
    this.runeProtect = true
    this.clearNegativeStatus()
    if (timer > this.runeProtectCooldown) {
      this.runeProtectCooldown = timer
    }
  }

  updateRuneProtect(dt: number) {
    if (this.runeProtectCooldown - dt <= 0) {
      this.runeProtect = false
    } else {
      this.runeProtectCooldown -= dt
    }
  }

  triggerFlinch(duration: number, pkm: PokemonEntity, origin?: PokemonEntity) {
    if (!this.runeProtect) {
      this.flinch = true

      duration = this.applyAquaticReduction(duration, pkm)

      if (duration > this.flinchCooldown) {
        this.flinchCooldown = Math.round(duration)
      }
    }
  }

  updateFlinch(dt: number) {
    if (this.flinchCooldown - dt <= 0) {
      this.flinch = false
    } else {
      this.flinchCooldown -= dt
    }
  }

  triggerSpikeArmor(timer: number) {
    this.spikeArmor = true
    if (timer > this.spikeArmorCooldown) {
      this.spikeArmorCooldown = timer
    }
  }

  updateSpikeArmor(dt: number) {
    if (this.spikeArmorCooldown - dt <= 0) {
      this.spikeArmor = false
    } else {
      this.spikeArmorCooldown -= dt
    }
  }

  triggerMagicBounce(timer: number) {
    this.magicBounce = true
    if (timer > this.magicBounceCooldown) {
      this.magicBounceCooldown = timer
    }
  }

  updateMagicBounce(dt: number) {
    if (this.magicBounceCooldown - dt <= 0) {
      this.magicBounce = false
    } else {
      this.magicBounceCooldown -= dt
    }
  }

  addResurrection(pokemon: IPokemonEntity) {
    if (pokemon.passive === Passive.INANIMATE) return // Inanimate objects cannot be resurrected
    this.resurection = true
  }

  triggerResurection(pokemon: PokemonEntity) {
    this.resurection = false
    this.resurecting = true
    this.resurectingCooldown = 2000
    pokemon.status.clearNegativeStatus()
  }

  updateResurecting(dt: number, pokemon: PokemonEntity) {
    if (this.resurectingCooldown - dt <= 0) {
      this.resurecting = false
      pokemon.resurrect()
      pokemon.toMovingState()
      pokemon.cooldown = 0
    } else {
      this.resurectingCooldown -= dt
    }
  }

  triggerCurse(timer: number) {
    if (!this.runeProtect) {
      if (this.curse) {
        this.curseCooldown = 0 // apply curse immediately if already cursed
      } else {
        this.curse = true
        this.curseCooldown = timer
      }
    }
  }

  updateCurse(dt: number, board: Board, pokemon: PokemonEntity) {
    if (this.curseCooldown - dt <= 0) {
      this.curse = false
      pokemon.handleDamage({
        damage: 9999,
        board,
        attacker: null,
        attackType: AttackType.TRUE,
        shouldTargetGainMana: false
      })
      pokemon.simulation.room.broadcast(Transfer.ABILITY, {
        id: pokemon.simulation.id,
        skill: "CURSE_EFFECT",
        positionX: pokemon.positionX,
        positionY: pokemon.positionY,
        orientation: pokemon.orientation
      })
    } else {
      this.curseCooldown -= dt
    }
  }

  triggerPokerus(pokemon: PokemonEntity) {
    if (pokemon.passive === Passive.INANIMATE) return // Inanimate objects cannot get Pokerus
    if (!this.pokerus) {
      this.pokerus = true
    }
  }

  updatePokerus(dt: number, pokemon: PokemonEntity, board: Board) {
    if (this.pokerusCooldown - dt <= 0) {
      pokemon.addAttack(1, pokemon, 0, false)
      pokemon.addAbilityPower(10, pokemon, 0, false)
      let infectCount = 0
      const cells = board.getAdjacentCells(
        pokemon.positionX,
        pokemon.positionY,
        false
      )
      cells.forEach((cell) => {
        if (infectCount < 2 && cell.value !== undefined) {
          if (
            cell.value.team === pokemon.team &&
            cell.value.status.pokerus === false
          ) {
            cell.value.status.triggerPokerus(cell.value)
            infectCount++
          }
        }
      })
      this.pokerusCooldown = 2500
    } else {
      this.pokerusCooldown -= dt
    }
  }

  triggerLocked(duration: number, pkm: PokemonEntity) {
    if (
      !this.locked && // lock cannot be stacked
      !this.skydiving &&
      !this.runeProtect
    ) {
      if (pkm.status.enraged) {
        duration = duration / 2
      }

      duration = this.applyAquaticReduction(duration, pkm)

      this.locked = true
      this.lockedCooldown = Math.round(duration)
      pkm.range = 1
      pkm.toMovingState() // force retargetting
    }
  }

  updateLocked(dt: number, pokemon: PokemonEntity) {
    if (this.lockedCooldown - dt <= 0) {
      this.locked = false
      pokemon.range =
        pokemon.baseRange + (pokemon.items.has(Item.WIDE_LENS) ? 2 : 0)
    } else {
      this.lockedCooldown -= dt
    }
  }

  triggerBlinded(duration: number, pkm: PokemonEntity) {
    if (!this.blinded && !this.runeProtect) {
      if (pkm.status.enraged) {
        duration = duration / 2
      }

      duration = this.applyAquaticReduction(duration, pkm)

      this.blinded = true
      this.blindCooldown = Math.round(duration)
    }
  }

  updateBlinded(dt: number) {
    if (this.blindCooldown - dt <= 0) {
      this.blinded = false
    } else {
      this.blindCooldown -= dt
    }
  }

  private applyAquaticReduction(duration: number, pkm: IPokemonEntity): number {
    if (pkm.effects.has(Effect.SWIFT_SWIM)) {
      duration = Math.round(duration * 0.7)
    } else if (pkm.effects.has(Effect.HYDRATION)) {
      duration = Math.round(duration * 0.4)
    } else if (pkm.effects.has(Effect.WATER_VEIL)) {
      duration = Math.round(duration * 0.1)
    }
    return duration
  }

  addPsychicField(entity: IPokemonEntity) {
    this.psychicField = true
    if (entity.passive === Passive.SURGE_SURFER) {
      entity.addAttackSpeed(30, entity, 0, false)
    }
  }

  removePsychicField(entity: IPokemonEntity) {
    this.psychicField = false
    if (entity.passive === Passive.SURGE_SURFER) {
      entity.addAttackSpeed(-30, entity, 0, false)
    }
  }

  addElectricField(entity: IPokemonEntity) {
    this.electricField = true
    if (entity.passive === Passive.SURGE_SURFER) {
      entity.addAttackSpeed(30, entity, 0, false)
    }
  }

  removeElectricField(entity: IPokemonEntity) {
    this.electricField = false
    if (entity.passive === Passive.SURGE_SURFER) {
      entity.addAttackSpeed(-30, entity, 0, false)
    }
  }
}
