import { Item } from "../types/enum/Item"
import { AttackType } from "../types/enum/Game"
import { Effect } from "../types/enum/Effect"
import Board from "./board"
import { PokemonEntity } from "./pokemon-entity"
import PokemonState from "./pokemon-state"
import { PokemonActionState } from "../types/enum/Game"
import { chance } from "../utils/random"
import { distanceC } from "../utils/distance"
import { Synergy } from "../types/enum/Synergy"
import { max, min } from "../utils/number"
import { Passive } from "../types/enum/Passive"
import { AbilityStrategies } from "./abilities/abilities"
import Player from "../models/colyseus-models/player"

export default class AttackingState extends PokemonState {
  update(
    pokemon: PokemonEntity,
    dt: number,
    board: Board,
    weather: string,
    player: Player
  ) {
    super.update(pokemon, dt, board, weather, player)

    if (pokemon.cooldown <= 0) {
      pokemon.cooldown = pokemon.getAttackDelay()

      // first, try to hit the same target than previous attack
      let target = board.getValue(pokemon.targetX, pokemon.targetY)
      let targetCoordinate: { x: number; y: number } | undefined = {
        x: pokemon.targetX,
        y: pokemon.targetY
      }

      if (pokemon.status.confusion) {
        targetCoordinate = this.getTargetCoordinateWhenConfused(pokemon, board)
      } else if (
        !(
          target &&
          target.team !== pokemon.team &&
          target.isTargettable &&
          distanceC(
            pokemon.positionX,
            pokemon.positionY,
            targetCoordinate.x,
            targetCoordinate.y
          ) <= pokemon.range
        )
      ) {
        // if target is no longer alive or at range, retargeting
        targetCoordinate = this.getNearestTargetAtRangeCoordinates(
          pokemon,
          board
        )
        if (targetCoordinate) {
          target = board.getValue(targetCoordinate.x, targetCoordinate.y)
        }
      }

      // no target at range, changing to moving state
      if (!target || !targetCoordinate || pokemon.status.charm) {
        const targetAtSight = this.getNearestTargetAtSightCoordinates(
          pokemon,
          board
        )
        if (targetAtSight) {
          pokemon.toMovingState()
        }
      } else if (
        target &&
        pokemon.pp >= pokemon.maxPP &&
        !pokemon.status.silence
      ) {
        // CAST ABILITY
        let crit = false
        if (pokemon.items.has(Item.REAPER_CLOTH)) {
          crit = chance(pokemon.critChance / 100)
        }
        AbilityStrategies[pokemon.skill].process(
          pokemon,
          this,
          board,
          target,
          crit
        )
      } else {
        // BASIC ATTACK
        pokemon.count.attackCount++
        this.attack(pokemon, board, targetCoordinate)
        if (
          pokemon.effects.has(Effect.RISING_VOLTAGE) ||
          pokemon.effects.has(Effect.OVERDRIVE)
        ) {
          let isTripleAttack = false
          if (pokemon.effects.has(Effect.RISING_VOLTAGE)) {
            isTripleAttack = pokemon.count.attackCount % 4 === 0
          } else if (pokemon.effects.has(Effect.OVERDRIVE)) {
            isTripleAttack = pokemon.count.attackCount % 3 === 0
          }
          if (isTripleAttack) {
            pokemon.count.tripleAttackCount++
            this.attack(pokemon, board, targetCoordinate)
            this.attack(pokemon, board, targetCoordinate)
          }
        }
      }
    } else {
      pokemon.cooldown = Math.max(0, pokemon.cooldown - dt)
    }
  }

  attack(
    pokemon: PokemonEntity,
    board: Board,
    coordinates: { x: number; y: number }
  ) {
    pokemon.targetX = coordinates.x
    pokemon.targetY = coordinates.y

    const target = board.getValue(coordinates.x, coordinates.y)
    if (target) {
      pokemon.orientation = board.orientation(
        pokemon.positionX,
        pokemon.positionY,
        target.positionX,
        target.positionY,
        pokemon,
        target
      )

      let damage = pokemon.atk
      let physicalDamage = 0
      let specialDamage = 0
      let trueDamage = 0
      let totalTakenDamage = 0

      if (Math.random() * 100 < pokemon.critChance) {
        pokemon.onCriticalAttack({ target, board })
        if (target.items.has(Item.ROCKY_HELMET) === false) {
          let opponentCritDamage = pokemon.critDamage
          if (target.effects.has(Effect.BATTLE_ARMOR)) {
            opponentCritDamage -= 0.3
          } else if (target.effects.has(Effect.MOUTAIN_RESISTANCE)) {
            opponentCritDamage -= 0.5
          } else if (target.effects.has(Effect.DIAMOND_STORM)) {
            opponentCritDamage -= 0.7
          }
          damage = Math.round(damage * opponentCritDamage)
        }
      }

      if (pokemon.items.has(Item.FIRE_GEM)) {
        damage = Math.round(damage + target.hp * 0.08)
      }

      if (pokemon.attackType === AttackType.SPECIAL) {
        damage = Math.ceil(damage * (1 + pokemon.ap / 100))
      }

      if (pokemon.passive === Passive.SPOT_PANDA && target.status.confusion) {
        damage = Math.ceil(damage * (1 + pokemon.ap / 100))
      }

      let trueDamagePart = 0
      if (pokemon.effects.has(Effect.STEEL_SURGE)) {
        trueDamagePart += 0.33
      } else if (pokemon.effects.has(Effect.STEEL_SPIKE)) {
        trueDamagePart += 0.66
      } else if (pokemon.effects.has(Effect.CORKSCREW_CRASH)) {
        trueDamagePart += 1.0
      } else if (pokemon.effects.has(Effect.MAX_MELTDOWN)) {
        trueDamagePart += 1.5
      }
      if (pokemon.items.has(Item.RED_ORB) && target) {
        trueDamagePart += 0.25
      }
      if (pokemon.effects.has(Effect.LOCK_ON) && target) {
        trueDamagePart += 1.0 + pokemon.ap / 100
        target.status.triggerArmorReduction(3000)
        pokemon.effects.delete(Effect.LOCK_ON)
      }

      let isAttackSuccessful = true
      let dodgeChance = target.dodge
      if (pokemon.effects.has(Effect.GAS)) {
        dodgeChance += 0.5
      }
      dodgeChance = max(0.9)(dodgeChance)

      if (
        chance(dodgeChance) &&
        !pokemon.items.has(Item.XRAY_VISION) &&
        !pokemon.effects.has(Effect.LOCK_ON) &&
        !target.status.paralysis &&
        !target.status.sleep &&
        !target.status.freeze
      ) {
        isAttackSuccessful = false
        damage = 0
        target.count.dodgeCount += 1
      }
      if (target.status.protect) {
        isAttackSuccessful = false
        damage = 0
      }

      if (trueDamagePart > 0) {
        // Apply true damage part
        trueDamage = Math.ceil(damage * trueDamagePart)
        damage = min(0)(damage * (1 - trueDamagePart))

        const { takenDamage } = target.handleDamage({
          damage: trueDamage,
          board,
          attackType: AttackType.TRUE,
          attacker: pokemon,
          shouldTargetGainMana: true
        })
        totalTakenDamage += takenDamage
      }

      if (pokemon.attackType === AttackType.SPECIAL) {
        specialDamage = damage
      } else {
        physicalDamage = damage
      }

      if (pokemon.passive === Passive.SPOT_PANDA && target.status.confusion) {
        specialDamage += 1 * damage * (1 + pokemon.ap / 100)
      }

      if (physicalDamage > 0) {
        // Apply attack physical damage
        const { takenDamage } = target.handleDamage({
          damage: physicalDamage,
          board,
          attackType: AttackType.PHYSICAL,
          attacker: pokemon,
          shouldTargetGainMana: true
        })
        totalTakenDamage += takenDamage
      }

      if (specialDamage > 0) {
        // Apply special damage
        const { takenDamage } = target.handleDamage({
          damage: specialDamage,
          board,
          attackType: AttackType.SPECIAL,
          attacker: pokemon,
          shouldTargetGainMana: true
        })
        totalTakenDamage += takenDamage
      }

      const totalDamage = physicalDamage + specialDamage + trueDamage
      pokemon.onAttack({
        target,
        board,
        physicalDamage,
        specialDamage,
        trueDamage,
        totalDamage
      })
      if (isAttackSuccessful) {
        pokemon.onHit({
          target,
          board,
          totalTakenDamage,
          physicalDamage,
          specialDamage,
          trueDamage
        })
      }
    }
  }

  onEnter(pokemon) {
    super.onEnter(pokemon)
    pokemon.action = PokemonActionState.ATTACK
    pokemon.cooldown = 0
  }

  onExit(pokemon) {
    super.onExit(pokemon)
    pokemon.targetX = -1
    pokemon.targetY = -1
  }
}
