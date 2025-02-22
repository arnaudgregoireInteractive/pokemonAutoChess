import Board from "./board"
import { PokemonEntity } from "./pokemon-entity"
import { Item } from "../types/enum/Item"
import { Effect as EffectEnum } from "../types/enum/Effect"
import { Synergy } from "../types/enum/Synergy"
import PokemonState from "./pokemon-state"
import { Passive } from "../types/enum/Passive"
import { Ability } from "../types/enum/Ability"
import { SynergyEffects } from "../models/effects"
import { AttackType } from "../types/enum/Game"
import { chance } from "../utils/random"

type EffectOrigin = EffectEnum | Item | Passive | Ability

export abstract class Effect {
  origin?: EffectOrigin
  apply(entity: PokemonEntity, ...others: any[]) {}
  constructor(
    effect?: (entity: PokemonEntity, ...others: any[]) => void,
    origin?: EffectOrigin
  ) {
    if (effect) {
      this.apply = effect
    }
    this.origin = origin
  }
}

// applied on fight start or when spawning
export class OnSpawnEffect extends Effect {}

// item effect applied on fight start of after stealing/obtaining an item
export class OnItemGainedEffect extends Effect {}

export class OnItemRemovedEffect extends Effect {}

// applied after knocking out an enemy
export class OnKillEffect extends Effect {
  apply(entity: PokemonEntity, target: PokemonEntity, board: Board) {}
  constructor(
    effect?: (
      entity: PokemonEntity,
      target: PokemonEntity,
      board: Board
    ) => void,
    origin?: EffectOrigin
  ) {
    super(effect, origin)
  }
}

export class PeriodicEffect extends Effect {
  intervalMs: number
  timer: number
  count: number

  constructor(
    effect: (entity: PokemonEntity, ...others: any[]) => void,
    origin: EffectOrigin,
    intervalMs: number
  ) {
    super(effect, origin)
    this.intervalMs = intervalMs
    this.timer = intervalMs
    this.count = 0
  }

  update(dt: number, entity: PokemonEntity) {
    this.timer -= dt
    if (this.timer <= 0) {
      this.count++
      this.apply(entity)
      this.timer = this.intervalMs
    }
  }
}

export class OnHitEffect extends Effect {
  apply(entity: PokemonEntity, target: PokemonEntity, board: Board) {}
  constructor(
    effect?: (
      entity: PokemonEntity,
      target: PokemonEntity,
      board: Board
    ) => void,
    origin?: EffectOrigin
  ) {
    super(effect, origin)
  }
}

export class OnAttackEffect extends Effect {
  apply(entity: PokemonEntity, target: PokemonEntity, board: Board) {}
  constructor(
    effect?: (
      entity: PokemonEntity,
      target: PokemonEntity,
      board: Board
    ) => void,
    origin?: EffectOrigin
  ) {
    super(effect, origin)
  }
}

export class OnAbilityCastEffect extends Effect {
  apply(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {}
  constructor(
    effect?: (
      pokemon: PokemonEntity,
      state: PokemonState,
      board: Board,
      target: PokemonEntity,
      crit: boolean
    ) => void,
    origin?: EffectOrigin
  ) {
    super(effect, origin)
  }
}

export class MonsterKillEffect extends OnKillEffect {
  hpBoosted: number = 0
  count: number = 0
  synergyLevel: number
  constructor(effect: EffectEnum) {
    super(undefined, effect)
    this.synergyLevel = SynergyEffects[Synergy.MONSTER].indexOf(effect)
  }

  apply(pokemon, target, board) {
    const attackBoost = [3, 6, 10, 10][this.synergyLevel] ?? 10
    const apBoost = [10, 20, 30, 30][this.synergyLevel] ?? 30
    const hpGain = [0.2, 0.4, 0.6, 0.6][this.synergyLevel] ?? 0.6
    const lifeBoost = hpGain * target.hp
    pokemon.addAttack(attackBoost, pokemon, 0, false)
    pokemon.addAbilityPower(apBoost, pokemon, 0, false)
    pokemon.addMaxHP(lifeBoost, pokemon, 0, false)
    this.hpBoosted += lifeBoost
    this.count += 1
  }
}

export class GrowGroundEffect extends PeriodicEffect {
  synergyLevel: number
  constructor(effect: EffectEnum) {
    super(
      (pokemon) => {
        if (this.count > 5) {
          return
        }
        pokemon.addDefense(this.synergyLevel * 2, pokemon, 0, false)
        pokemon.addSpecialDefense(this.synergyLevel * 2, pokemon, 0, false)
        pokemon.addAttack(this.synergyLevel, pokemon, 0, false)
        pokemon.transferAbility("GROUND_GROW")
        if (
          pokemon.items.has(Item.BIG_NUGGET) &&
          this.count === 5 &&
          pokemon.player
        ) {
          pokemon.player.addMoney(3, true, pokemon)
          pokemon.count.moneyCount += 3
        }
      },
      effect,
      3000
    )
    this.synergyLevel = SynergyEffects[Synergy.GROUND].indexOf(effect) + 1
  }
}

export class ClearWingEffect extends PeriodicEffect {
  constructor() {
    super(
      (pokemon) => {
        pokemon.addAttackSpeed(2, pokemon, 0, false)
      },
      Passive.CLEAR_WING,
      1000
    )
  }
}

export class SynchroEffect extends PeriodicEffect {
  constructor() {
    super(
      (pokemon) => {
        const status = pokemon.status
        if (status.burn && status.burnOrigin) {
          status.burnOrigin.status.triggerBurn(3000, status.burnOrigin, pokemon)
        }
        if (status.poisonStacks && status.poisonOrigin) {
          status.poisonOrigin.status.triggerPoison(
            3000,
            status.poisonOrigin,
            pokemon
          )
        }
        if (status.wound && status.woundOrigin) {
          status.woundOrigin.status.triggerWound(
            3000,
            status.woundOrigin,
            pokemon
          )
        }
        if (status.silence && status.silenceOrigin) {
          status.silenceOrigin.status.triggerSilence(
            3000,
            status.silenceOrigin,
            pokemon
          )
        }
      },
      Passive.SYNCHRO,
      3000
    )
  }
}

export class DrySkinEffect extends PeriodicEffect {
  constructor() {
    super(
      (pokemon) => {
        pokemon.handleHeal(8, pokemon, 0, false)
      },
      Passive.DRY_SKIN,
      1000
    )
  }
}

export class DarkHarvestEffect extends PeriodicEffect {
  duration: number
  constructor(duration: number, pokemon: PokemonEntity) {
    super(
      (pokemon) => {
        pokemon.transferAbility(Ability.DARK_HARVEST)
        const board = pokemon.simulation.board
        const crit = pokemon.items.has(Item.REAPER_CLOTH)
          ? chance(pokemon.critChance, pokemon)
          : false
        const darkHarvestDamage = [5, 10, 20][pokemon.stars - 1] ?? 20
        const healFactor = 0.3
        board
          .getAdjacentCells(pokemon.positionX, pokemon.positionY)
          .forEach((cell) => {
            if (cell.value && cell.value.team !== pokemon.team) {
              cell.value.handleSpecialDamage(
                darkHarvestDamage,
                board,
                AttackType.SPECIAL,
                pokemon,
                crit,
                true
              )
              pokemon.handleHeal(
                Math.round(darkHarvestDamage * healFactor),
                pokemon,
                0,
                false
              )
            }
          })
        if (this.duration <= 0) {
          pokemon.effectsSet.delete(this)
          pokemon.effects.delete(EffectEnum.DARK_HARVEST)
        } else {
          this.duration -= this.intervalMs
        }
      },
      EffectEnum.DARK_HARVEST,
      1000
    )

    this.timer = 0 // delay the first tick
    this.duration = duration + this.intervalMs

    if (pokemon.effects.has(EffectEnum.DARK_HARVEST)) {
      // merge with existing effect if not finished before the next cast
      pokemon.effectsSet.delete(this)
      for (const effect of pokemon.effectsSet) {
        if (effect instanceof DarkHarvestEffect) {
          effect.duration = Math.max(this.duration, effect.duration)
          effect.timer = this.timer
          break
        }
      }
    } else {
      pokemon.effects.add(EffectEnum.DARK_HARVEST)
    }
  }
}

export class FireHitEffect extends OnAttackEffect {
  count: number = 0
  synergyLevel: number
  constructor(effect: EffectEnum) {
    super(undefined, effect)
    this.synergyLevel = SynergyEffects[Synergy.FIRE].indexOf(effect)
  }

  apply(pokemon, target, board) {
    pokemon.addAttack(this.synergyLevel, pokemon, 0, false)
    this.count += 1
  }
}
export class SoundCryEffect extends OnAbilityCastEffect {
  count: number = 0
  synergyLevel: number = -1
  constructor(effect?: EffectEnum) {
    super(undefined, effect)
    if (effect) {
      this.synergyLevel = SynergyEffects[Synergy.SOUND].indexOf(effect)
    }
  }

  apply(pokemon, state, board, target, crit) {
    pokemon.transferAbility(Ability.ECHO)
    const attackBoost = [2, 1, 1][this.synergyLevel] ?? 0
    const attackSpeedBoost = [0, 5, 5][this.synergyLevel] ?? 0
    const manaBoost = [0, 0, 3][this.synergyLevel] ?? 0

    const chimecho = board
      .getAdjacentCells(pokemon.positionX, pokemon.positionY)
      .some((cell) => cell.value?.passive === Passive.CHIMECHO)

    const scale =
      (chimecho ? 2 : 1) * (pokemon.passive === Passive.MEGA_LAUNCHER ? 3 : 1)

    board.cells.forEach((ally) => {
      if (ally?.team === pokemon.team) {
        ally.status.sleep = false
        ally.addAttack(attackBoost * scale, pokemon, 0, false)
        ally.addAttackSpeed(attackSpeedBoost * scale, pokemon, 0, false)
        ally.addPP(manaBoost * scale, pokemon, 0, false)
        ally.count.soundCryCount += scale
      }
    })
  }
}

export class WaterSpringEffect extends OnAbilityCastEffect {
  apply(pokemon) {
    pokemon.simulation.board.forEach((x, y, pkm) => {
      if (pkm?.passive === Passive.WATER_SPRING && pkm.team !== pokemon.team) {
        pkm.addPP(5, pkm, 0, false)
        pkm.transferAbility(pkm.skill)
      }
    })
  }
}
