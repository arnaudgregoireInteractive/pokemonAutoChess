/* eslint-disable @typescript-eslint/no-empty-function */
import { Item } from "../types/enum/Item"
import { Effect } from "../types/enum/Effect"
import {
  AttackType,
  HealType,
  PokemonActionState,
  Team
} from "../types/enum/Game"
import Board from "./board"
import { PokemonEntity } from "./pokemon-entity"
import { IPokemonEntity, Transfer } from "../types"
import { Synergy, SynergyEffects } from "../types/enum/Synergy"
import { pickRandomIn } from "../utils/random"
import { logger } from "../utils/logger"
import { Passive } from "../types/enum/Passive"
import { Weather } from "../types/enum/Weather"
import { max, min } from "../utils/number"
import { distanceC, distanceM } from "../utils/distance"
import { FIGHTING_PHASE_DURATION } from "../types/Config"
import Player from "../models/colyseus-models/player"

export default class PokemonState {
  handleHeal(
    pokemon: IPokemonEntity,
    heal: number,
    caster: IPokemonEntity,
    apBoost = 0
  ): void {
    if (
      pokemon.life > 0 &&
      pokemon.life < pokemon.hp &&
      !pokemon.status.wound &&
      !pokemon.status.protect
    ) {
      if (apBoost > 0) {
        heal = Math.round(heal * (1 + (apBoost * caster.ap) / 100))
      }
      if (pokemon.effects.has(Effect.BUFF_HEAL_RECEIVED)) {
        heal = Math.round(heal * 1.5)
      }
      if (pokemon.status.poisonStacks > 0) {
        heal = Math.round(heal * (1 - pokemon.status.poisonStacks * 0.2))
      }

      if (pokemon.passive === Passive.WONDER_GUARD) {
        heal = 1
      }

      const healTaken = Math.min(pokemon.hp - pokemon.life, heal)

      pokemon.life = Math.min(pokemon.hp, pokemon.life + heal)

      if (caster && healTaken > 0) {
        if (pokemon.simulation.room.state.time < FIGHTING_PHASE_DURATION) {
          pokemon.simulation.room.broadcast(Transfer.POKEMON_HEAL, {
            index: caster.index,
            type: HealType.HEAL,
            amount: healTaken,
            x: pokemon.positionX,
            y: pokemon.positionY,
            id: pokemon.simulation.id
          })
        }
        caster.healDone += healTaken
      }
    }
  }

  addShield(
    pokemon: IPokemonEntity,
    shield: number,
    caster: IPokemonEntity,
    apBoost?: boolean
  ) {
    if (pokemon.life > 0) {
      const boost = apBoost ? (shield * caster.ap) / 100 : 0
      const shieldBoosted = Math.round(shield + boost)
      pokemon.shield += shieldBoosted
      if (caster && shieldBoosted > 0) {
        if (pokemon.simulation.room.state.time < FIGHTING_PHASE_DURATION) {
          pokemon.simulation.room.broadcast(Transfer.POKEMON_HEAL, {
            index: caster.index,
            type: HealType.SHIELD,
            amount: shieldBoosted,
            x: pokemon.positionX,
            y: pokemon.positionY,
            id: pokemon.simulation.id
          })
        }
        caster.shieldDone += shieldBoosted
      }
    }
  }

  handleDamage({
    target: pokemon,
    damage,
    board,
    attackType,
    attacker,
    shouldTargetGainMana
  }: {
    target: PokemonEntity
    damage: number
    board: Board
    attackType: AttackType
    attacker: PokemonEntity | null
    shouldTargetGainMana: boolean
  }): { death: boolean; takenDamage: number } {
    let death = false
    let takenDamage = 0

    if (isNaN(damage)) {
      logger.trace(
        `NaN Damage from ${attacker ? attacker.name : "Environment"}`
      )
      return { death: false, takenDamage: 0 }
    }

    if (pokemon.life == 0) {
      death = true
    } else if (pokemon.status.protect) {
      death = false
      takenDamage = 0
    } else {
      if (pokemon.items.has(Item.POKE_DOLL)) {
        damage = Math.ceil(damage * 0.7)
      }
      if (pokemon.items.has(Item.METAL_COAT)) {
        damage = Math.ceil(damage * 0.8)
      }

      if (attacker && attacker.status.electricField) {
        damage = Math.ceil(damage * 1.2)
      }

      if (attacker && attacker.status.psychicField) {
        damage = Math.ceil(damage * 1.2)
      }

      if (attacker && attacker.status.grassField) {
        damage = Math.ceil(damage * 1.2)
      }

      if (attacker && attacker.status.fairyField) {
        damage = Math.ceil(damage * 1.2)
      }

      if (
        attacker &&
        attacker.passive === Passive.HISUIAN_TYPHLOSION &&
        (pokemon.status.burn || pokemon.status.silence)
      ) {
        damage = Math.ceil(damage * 1.2)
      }

      if (
        pokemon.simulation.weather === Weather.MISTY &&
        attackType === AttackType.SPECIAL
      ) {
        damage = Math.ceil(damage * 1.2)
      }

      const ARMOR_FACTOR = 0.1
      const def = pokemon.status.armorReduction
        ? Math.round(pokemon.def / 2)
        : pokemon.def
      const speDef = pokemon.status.armorReduction
        ? Math.round(pokemon.speDef / 2)
        : pokemon.speDef

      let reducedDamage = damage
      if (attackType == AttackType.PHYSICAL) {
        reducedDamage = damage / (1 + ARMOR_FACTOR * def)
      } else if (attackType == AttackType.SPECIAL) {
        reducedDamage = damage / (1 + ARMOR_FACTOR * speDef)
      } else if (attackType == AttackType.TRUE) {
        reducedDamage = damage
      }

      if (
        attackType !== AttackType.TRUE &&
        (pokemon.effects.has(Effect.GUTS) ||
          pokemon.effects.has(Effect.DEFIANT) ||
          pokemon.effects.has(Effect.JUSTIFIED))
      ) {
        const damageBlocked = pokemon.effects.has(Effect.JUSTIFIED)
          ? 10
          : pokemon.effects.has(Effect.DEFIANT)
          ? 7
          : 4
        reducedDamage = reducedDamage - damageBlocked
      }

      reducedDamage = min(1)(reducedDamage) // should deal 1 damage at least

      if (isNaN(reducedDamage)) {
        reducedDamage = 0
        logger.error(
          `error calculating damage, damage: ${damage}, target: ${
            pokemon.name
          }, attacker: ${
            attacker ? attacker.name : "Environment"
          }, attack type: ${attackType}, defense : ${
            pokemon.def
          }, spedefense: ${pokemon.speDef}, life: ${pokemon.life}`
        )
      }

      let residualDamage = reducedDamage

      if (pokemon.shield > 0 && !pokemon.status.flinch) {
        let damageOnShield = reducedDamage
        if (attacker && attacker.items.has(Item.FIRE_GEM)) {
          damageOnShield *= 2 // double damage on shield
        }
        if (damageOnShield > pokemon.shield) {
          damageOnShield = pokemon.shield
        }

        takenDamage += damageOnShield
        pokemon.shield = pokemon.shield - damageOnShield
        residualDamage = min(0)(reducedDamage - damageOnShield)
      }

      if (pokemon.passive == Passive.WONDER_GUARD) {
        residualDamage = max(1)(residualDamage)
      }

      takenDamage += Math.min(residualDamage, pokemon.life)

      if (
        pokemon.items.has(Item.SHINY_CHARM) &&
        pokemon.life - residualDamage < 0.3 * pokemon.hp
      ) {
        death = false
        takenDamage = 0
        residualDamage = 0
        pokemon.status.triggerProtect(2000)
        pokemon.items.delete(Item.SHINY_CHARM)
      }

      pokemon.life = Math.max(0, pokemon.life - residualDamage)

      // logger.debug(`${pokemon.name} took ${damage} and has now ${pokemon.life} life shield ${pokemon.shield}`);

      if (shouldTargetGainMana) {
        pokemon.addPP(Math.ceil(damage / 10))
      }

      if (takenDamage > 0) {
        pokemon.onDamageReceived({ attacker, damage: takenDamage, board })
        if (attacker) {
          attacker.onDamageDealt({ target: pokemon, damage: takenDamage })
          if (pokemon !== attacker) {
            // do not count self damage
            switch (attackType) {
              case AttackType.PHYSICAL:
                attacker.physicalDamage += takenDamage
                break

              case AttackType.SPECIAL:
                attacker.specialDamage += takenDamage
                break

              case AttackType.TRUE:
                attacker.trueDamage += takenDamage
                break

              default:
                break
            }
          }

          pokemon.simulation.room.broadcast(Transfer.POKEMON_DAMAGE, {
            index: attacker.index,
            type: attackType,
            amount: takenDamage,
            x: pokemon.positionX,
            y: pokemon.positionY,
            id: pokemon.simulation.id
          })
        }
      }

      if (!pokemon.life || pokemon.life <= 0) {
        if (pokemon.hasSynergyEffect(Synergy.FOSSIL)) {
          const healBonus = pokemon.effects.has(Effect.FORGOTTEN_POWER)
            ? 1
            : pokemon.effects.has(Effect.ELDER_POWER)
            ? 0.8
            : 0.4
          const attackBonus = pokemon.effects.has(Effect.FORGOTTEN_POWER)
            ? 1
            : pokemon.effects.has(Effect.ELDER_POWER)
            ? 0.6
            : 0.3
          pokemon.life = pokemon.hp * healBonus
          pokemon.addAttack(pokemon.baseAtk * attackBonus)
          SynergyEffects[Synergy.FOSSIL].forEach((e) =>
            pokemon.effects.delete(e)
          )
        } else if (pokemon.status.resurection) {
          pokemon.status.triggerResurection(pokemon)
          board.forEach((x, y, entity: PokemonEntity | undefined) => {
            if (
              entity &&
              entity.targetX === pokemon.positionX &&
              entity.targetY === pokemon.positionY
            ) {
              // switch aggro immediately to reduce retarget lag after resurection
              entity.cooldown = 0
              entity.toMovingState()
            }
          })
        } else {
          death = true
        }
      }

      if (death) {
        pokemon.onDeath({ board })
        board.setValue(pokemon.positionX, pokemon.positionY, undefined)
        if (attacker && pokemon !== attacker) {
          attacker.onKill({ target: pokemon, board })
        }
        const effectsRemovedList: Effect[] = []

        // Remove field effects on death
        if (pokemon.passive === Passive.ELECTRIC_TERRAIN) {
          board.forEach((x, y, pkm) => {
            if (pkm && pkm.team == pokemon.team && pkm.status.electricField) {
              pkm.removeElectricField()
            }
          })
          effectsRemovedList.push(Effect.ELECTRIC_TERRAIN)
        } else if (pokemon.passive === Passive.PSYCHIC_TERRAIN) {
          board.forEach((x, y, pkm) => {
            if (pkm && pkm.team == pokemon.team && pkm.status.psychicField) {
              pkm.removePsychicField()
            }
          })
          effectsRemovedList.push(Effect.PSYCHIC_TERRAIN)
        } else if (pokemon.passive === Passive.GRASSY_TERRAIN) {
          board.forEach((x, y, pkm) => {
            if (pkm && pkm.team == pokemon.team && pkm.status.grassField) {
              pkm.status.grassField = false
            }
          })
          effectsRemovedList.push(Effect.GRASSY_TERRAIN)
        } else if (pokemon.passive === Passive.MISTY_TERRAIN) {
          board.forEach((x, y, pkm) => {
            if (pkm && pkm.team == pokemon.team && pkm.status.fairyField) {
              pkm.status.fairyField = false
            }
          })
          effectsRemovedList.push(Effect.MISTY_TERRAIN)
        }

        if (pokemon.team == Team.BLUE_TEAM) {
          effectsRemovedList.forEach((x) =>
            pokemon.simulation.blueEffects.delete(x)
          )
        } else {
          effectsRemovedList.forEach((x) =>
            pokemon.simulation.redEffects.delete(x)
          )
        }
      }
    }

    takenDamage = Math.round(takenDamage)
    return { death, takenDamage }
  }

  update(
    pokemon: PokemonEntity,
    dt: number,
    board: Board,
    weather: string,
    player: Player | undefined
  ) {
    pokemon.status.updateAllStatus(dt, pokemon, board)

    if (
      pokemon.status.resurecting &&
      pokemon.action !== PokemonActionState.HURT
    ) {
      pokemon.toIdleState()
    }
    if (
      (pokemon.status.freeze || pokemon.status.sleep) &&
      pokemon.action !== PokemonActionState.SLEEP
    ) {
      pokemon.toIdleState()
    }

    if (
      pokemon.effects.has(Effect.TILLER) ||
      pokemon.effects.has(Effect.DIGGER) ||
      pokemon.effects.has(Effect.DRILLER) ||
      pokemon.effects.has(Effect.DEEP_MINER)
    ) {
      pokemon.growGroundTimer -= dt
      if (pokemon.growGroundTimer <= 0) {
        pokemon.growGroundTimer = 3000
        pokemon.count.growGroundCount += 1
        if (pokemon.effects.has(Effect.TILLER)) {
          pokemon.addDefense(1)
          pokemon.addSpecialDefense(1)
          pokemon.addAttack(1)
        } else if (pokemon.effects.has(Effect.DIGGER)) {
          pokemon.addDefense(2)
          pokemon.addSpecialDefense(2)
          pokemon.addAttack(2)
        } else if (pokemon.effects.has(Effect.DRILLER)) {
          pokemon.addDefense(3)
          pokemon.addSpecialDefense(3)
          pokemon.addAttack(3)
        } else if (pokemon.effects.has(Effect.DEEP_MINER)) {
          pokemon.addDefense(4)
          pokemon.addSpecialDefense(4)
          pokemon.addAttack(4)
        }

        if (
          pokemon.items.has(Item.BIG_NUGGET) &&
          pokemon.count.growGroundCount === 5 &&
          player
        ) {
          player.money += 3
          pokemon.count.moneyCount += 3
        }
      }
    }

    if (
      pokemon.effects.has(Effect.INGRAIN) ||
      pokemon.effects.has(Effect.GROWTH) ||
      pokemon.effects.has(Effect.SPORE)
    ) {
      if (pokemon.grassHealCooldown - dt <= 0) {
        let heal = pokemon.effects.has(Effect.SPORE)
          ? 30
          : pokemon.effects.has(Effect.GROWTH)
          ? 15
          : 8
        if (
          pokemon.effects.has(Effect.HYDRATATION) &&
          pokemon.simulation.weather === Weather.RAIN
        ) {
          heal += 5
        }
        pokemon.handleHeal(heal, pokemon, 0)
        pokemon.grassHealCooldown = 2000
        pokemon.simulation.room.broadcast(Transfer.ABILITY, {
          id: pokemon.simulation.id,
          skill: "GRASS_HEAL",
          positionX: pokemon.positionX,
          positionY: pokemon.positionY
        })
      } else {
        pokemon.grassHealCooldown = pokemon.grassHealCooldown - dt
      }
    }

    if (
      pokemon.simulation.weather === Weather.SANDSTORM &&
      pokemon.types.has(Synergy.GROUND) === false
    ) {
      pokemon.sandstormDamageTimer -= dt
      if (pokemon.sandstormDamageTimer <= 0) {
        pokemon.sandstormDamageTimer = 1000
        const sandstormDamage = 5
        pokemon.handleDamage({
          damage: sandstormDamage,
          board,
          attackType: AttackType.SPECIAL,
          attacker: null,
          shouldTargetGainMana: false
        })
      }
    }

    if (pokemon.manaCooldown <= 0) {
      pokemon.addPP(10)
      if (pokemon.simulation.weather === Weather.RAIN) {
        pokemon.addPP(3)
      }
      if (pokemon.passive === Passive.ILLUMISE_VOLBEAT) {
        board.forEach((x, y, p) => {
          if (p && p.passive === Passive.ILLUMISE_VOLBEAT && p !== pokemon) {
            pokemon.addPP(5)
          }
        })
      }
      if (
        pokemon.effects.has(Effect.LIGHT_PULSE) ||
        pokemon.effects.has(Effect.ETERNAL_LIGHT) ||
        pokemon.effects.has(Effect.MAX_ILLUMINATION)
      ) {
        pokemon.addPP(10)
      }
      if (pokemon.items.has(Item.METRONOME)) {
        pokemon.addPP(5)
      }
      pokemon.manaCooldown = 1000
    } else {
      pokemon.manaCooldown = min(0)(pokemon.manaCooldown - dt)
    }

    if (pokemon.fairySplashCooldown > 0) {
      pokemon.fairySplashCooldown = min(0)(pokemon.fairySplashCooldown - dt)
    }
  }

  onEnter(pokemon: PokemonEntity) {}

  onExit(pokemon: PokemonEntity) {}

  /* NOTE: getNearestTargetAtRangeCoordinates require another algorithm that getNearestTargetCoordinate
  because it used Chebyshev distance instead of Manhattan distance
  more info here: https://discord.com/channels/737230355039387749/1183398539456413706 */
  getNearestTargetAtRangeCoordinates(
    pokemon: PokemonEntity,
    board: Board
  ): { x: number; y: number } | undefined {
    let distance = 999
    let candidatesCoordinates: { x: number; y: number }[] = []
    for (
      let x = min(0)(pokemon.positionX - pokemon.range);
      x <= max(board.columns - 1)(pokemon.positionX + pokemon.range);
      x++
    ) {
      for (
        let y = min(0)(pokemon.positionY - pokemon.range);
        y <= max(board.rows - 1)(pokemon.positionY + pokemon.range);
        y++
      ) {
        const value = board.getValue(x, y)
        if (
          value !== undefined &&
          value.team !== pokemon.team &&
          value.isTargettable
        ) {
          const candidateDistance = distanceC(
            pokemon.positionX,
            pokemon.positionY,
            x,
            y
          )
          if (candidateDistance < distance) {
            distance = candidateDistance
            candidatesCoordinates = [{ x, y }]
          } else if (candidateDistance == distance) {
            candidatesCoordinates.push({ x, y })
          }
        }
      }
    }
    if (candidatesCoordinates.length > 0) {
      return pickRandomIn(candidatesCoordinates)
    } else {
      return undefined
    }
  }

  getNearestTargetAtSightCoordinates(
    pokemon: PokemonEntity,
    board: Board
  ): { x: number; y: number } | undefined {
    let distance = 999
    let candidatesCoordinates: { x: number; y: number }[] = new Array<{
      x: number
      y: number
    }>()

    board.forEach((x: number, y: number, value: PokemonEntity | undefined) => {
      if (
        value !== undefined &&
        value.team !== pokemon.team &&
        value.isTargettable
      ) {
        const candidateDistance = distanceM(
          pokemon.positionX,
          pokemon.positionY,
          x,
          y
        )
        if (candidateDistance < distance) {
          distance = candidateDistance
          candidatesCoordinates = [{ x, y }]
        } else if (candidateDistance == distance) {
          candidatesCoordinates.push({ x, y })
        }
      }
    })
    if (candidatesCoordinates.length > 0) {
      return pickRandomIn(candidatesCoordinates)
    } else {
      return undefined
    }
  }

  getFarthestTarget(
    pokemon: PokemonEntity,
    board: Board
  ): PokemonEntity | undefined {
    let farthestTarget: PokemonEntity | undefined = undefined
    let maxDistance = 0

    board.forEach((x: number, y: number, enemy: PokemonEntity | undefined) => {
      if (enemy && enemy.team !== pokemon.team && enemy.isTargettable) {
        const distance = distanceM(pokemon.positionX, pokemon.positionY, x, y)
        if (distance > maxDistance) {
          farthestTarget = enemy
          maxDistance = distance
        }
      }
    })

    return farthestTarget
  }

  getMostSurroundedCoordinateAvailablePlace(
    pokemon: PokemonEntity,
    board: Board
  ): { x: number; y: number } | undefined {
    let x: number | undefined = undefined
    let y: number | undefined = undefined
    const team = pokemon.team
    const emptyPlaces = new Array<{ x: number; y: number; neighbour: number }>()
    board.forEach((x: number, y: number, value: PokemonEntity | undefined) => {
      if (value === undefined) {
        const cells = board.getAdjacentCells(x, y)
        let n = 0
        cells.forEach((cell) => {
          if (cell.value && cell.value.team !== team) {
            n++
          }
        })
        emptyPlaces.push({ x, y, neighbour: n })
      }
    })

    emptyPlaces.sort((a, b) => {
      return b.neighbour - a.neighbour
    })

    if (emptyPlaces.length > 0) {
      x = emptyPlaces[0].x
      y = emptyPlaces[0].y
    }

    if (x !== undefined && y !== undefined) {
      return { x, y }
    } else {
      return undefined
    }
  }

  getFarthestTargetCoordinateAvailablePlace(
    pokemon: PokemonEntity,
    board: Board
  ): { x: number; y: number } | undefined {
    const candidateCells = new Array<{
      distance: number
      x: number
      y: number
    }>()

    board.forEach((x: number, y: number, value: PokemonEntity | undefined) => {
      if (
        value !== undefined &&
        value.team !== pokemon.team &&
        value.isTargettable
      ) {
        candidateCells.push(
          ...board
            .getAdjacentCells(x, y)
            .filter((cell) => board.getValue(cell.x, cell.y) === undefined)
            .map((cell) => ({
              x: cell.x,
              y: cell.y,
              distance: distanceM(
                pokemon.positionX,
                pokemon.positionY,
                cell.x,
                cell.y
              )
            }))
        )
      }
    })

    candidateCells.sort((a, b) => b.distance - a.distance)
    return candidateCells[0]
  }

  getNearestTargetCoordinateAvailablePlace(
    pokemon: PokemonEntity,
    board: Board
  ): { x: number; y: number } | undefined {
    const candidateCells = new Array<{
      distance: number
      x: number
      y: number
    }>()

    board.forEach((x: number, y: number, value: PokemonEntity | undefined) => {
      if (value === undefined) {
        candidateCells.push({
          x,
          y,
          distance: distanceM(pokemon.positionX, pokemon.positionY, x, y)
        })
      }
    })

    candidateCells.sort((a, b) => a.distance - b.distance)
    return candidateCells[0]
  }

  getTargetCoordinateWhenConfused(
    pokemon: PokemonEntity,
    board: Board
  ): { x: number; y: number } | undefined {
    let distance = 999
    let candidatesCoordinates: { x: number; y: number }[] = new Array<{
      x: number
      y: number
    }>()

    board.forEach((x: number, y: number, value: PokemonEntity | undefined) => {
      if (
        value !== undefined &&
        value.id !== pokemon.id &&
        value.isTargettable
      ) {
        const candidateDistance = distanceM(
          pokemon.positionX,
          pokemon.positionY,
          x,
          y
        )
        if (candidateDistance < distance) {
          distance = candidateDistance
          candidatesCoordinates = [{ x, y }]
        } else if (candidateDistance == distance) {
          candidatesCoordinates.push({ x, y })
        }
      }
    })

    candidatesCoordinates.push({ x: pokemon.positionX, y: pokemon.positionY }) // sometimes attack itself when confused

    if (candidatesCoordinates.length > 0) {
      return pickRandomIn(candidatesCoordinates)
    } else {
      return undefined
    }
  }
}
