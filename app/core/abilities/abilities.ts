import { Ability } from "../../types/enum/Ability"
import { AbilityStrategy } from "./ability-strategy"
import {
  HiddenPowerAStrategy,
  HiddenPowerBStrategy,
  HiddenPowerCStrategy,
  HiddenPowerDStrategy,
  HiddenPowerEMStrategy,
  HiddenPowerEStrategy,
  HiddenPowerFStrategy,
  HiddenPowerGStrategy,
  HiddenPowerHStrategy,
  HiddenPowerIStrategy,
  HiddenPowerJStrategy,
  HiddenPowerKStrategy,
  HiddenPowerLStrategy,
  HiddenPowerMStrategy,
  HiddenPowerNStrategy,
  HiddenPowerOStrategy,
  HiddenPowerPStrategy,
  HiddenPowerQMStrategy,
  HiddenPowerQStrategy,
  HiddenPowerRStrategy,
  HiddenPowerSStrategy,
  HiddenPowerTStrategy,
  HiddenPowerUStrategy,
  HiddenPowerVStrategy,
  HiddenPowerWStrategy,
  HiddenPowerXStrategy,
  HiddenPowerYStrategy,
  HiddenPowerZStrategy
} from "./hidden-power"

import { Transfer } from "../../types"
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  DEFAULT_ATK_SPEED,
  EvolutionTime
} from "../../types/Config"
import { Effect } from "../../types/enum/Effect"
import { AttackType, BoardEvent, Team } from "../../types/enum/Game"
import { ArtificialItems, Item } from "../../types/enum/Item"
import { Pkm, PkmIndex } from "../../types/enum/Pokemon"
import { Synergy } from "../../types/enum/Synergy"
import { Weather } from "../../types/enum/Weather"

import PokemonFactory from "../../models/pokemon-factory"
import Board, { Cell } from "../board"
import { PokemonEntity } from "../pokemon-entity"
import PokemonState from "../pokemon-state"

import { getFirstAvailablePositionInBench } from "../../utils/board"
import { distanceC, distanceM } from "../../utils/distance"
import { repeat } from "../../utils/function"
import { logger } from "../../utils/logger"
import { clamp, max, min } from "../../utils/number"
import { OrientationArray, effectInLine } from "../../utils/orientation"
import {
  chance,
  pickNRandomIn,
  pickRandomIn,
  randomBetween,
  shuffleArray
} from "../../utils/random"
import { values } from "../../utils/schemas"

export class BlueFlareStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 50
    let multiplier = 0
    if (pokemon.effects.has(Effect.BLAZE)) {
      multiplier = 1
    } else if (pokemon.effects.has(Effect.VICTORY_STAR)) {
      multiplier = 2
    } else if (pokemon.effects.has(Effect.DROUGHT)) {
      multiplier = 3
    } else if (pokemon.effects.has(Effect.DESOLATE_LAND)) {
      multiplier = 4
    }
    damage += multiplier * 20

    const cells = board.getAdjacentCells(target.positionX, target.positionY)

    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)

    cells.forEach((cell) => {
      if (cell.value && cell.value.team !== pokemon.team) {
        cell.value.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
      }
    })
  }
}

export class FusionBoltStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 50
    let multiplier = 0
    if (pokemon.effects.has(Effect.RISING_VOLTAGE)) {
      multiplier = 1
    } else if (pokemon.effects.has(Effect.OVERDRIVE)) {
      multiplier = 2
    }
    damage += multiplier * 40

    const cells = board.getAdjacentCells(target.positionX, target.positionY)

    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)

    cells.forEach((cell) => {
      if (cell.value && cell.value.team !== pokemon.team) {
        cell.value.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
      }
    })
  }
}

export class BeatUpStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    for (let i = 0; i < pokemon.stars; i++) {
      const houndour = PokemonFactory.createPokemonFromName(
        Pkm.HOUNDOUR,
        pokemon.player
      )
      const coord = pokemon.simulation.getClosestAvailablePlaceOnBoardToPokemon(
        pokemon,
        pokemon.team
      )
      pokemon.simulation.addPokemon(
        houndour,
        coord.x,
        coord.y,
        pokemon.team,
        true
      )
    }
  }
}

export class PaydayStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = pokemon.stars === 2 ? 60 : pokemon.stars === 3 ? 120 : 30

    const { death } = target.handleSpecialDamage(
      damage,
      board,
      AttackType.SPECIAL,
      pokemon,
      crit
    )
    if (death && pokemon.player) {
      pokemon.player.money += pokemon.stars
      pokemon.count.moneyCount++
    }
  }
}

export class MindBlownStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    target.count.mindBlownCount++
    target.handleSpecialDamage(
      pokemon.life / 2,
      board,
      AttackType.SPECIAL,
      pokemon,
      crit
    )
  }
}

export class SoftBoiledStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let shield = 30
    if (pokemon.stars == 2) {
      shield = 60
    } else if (pokemon.stars == 3) {
      shield = 120
    }
    board.forEach((x: number, y: number, tg: PokemonEntity | undefined) => {
      if (tg && pokemon.team == tg.team) {
        pokemon.simulation.room.broadcast(Transfer.ABILITY, {
          id: pokemon.simulation.id,
          skill: pokemon.skill,
          positionX: tg.positionX,
          positionY: tg.positionX,
          orientation: pokemon.orientation
        })
        tg.addShield(shield, pokemon, true)
        tg.status.clearNegativeStatus()
      }
    })
  }
}

export class EarthquakeStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = 120
    board.forEach((x: number, y: number, tg: PokemonEntity | undefined) => {
      if (
        (tg && pokemon.team !== tg.team && pokemon.positionY === y) ||
        (tg && pokemon.team !== tg.team && pokemon.positionX === x)
      ) {
        tg.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
        tg.count.earthquakeCount++
      }
    })
  }
}

export class SongOfDesireStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)

    const rank = new Array<PokemonEntity>()
    board.forEach((x: number, y: number, tg: PokemonEntity | undefined) => {
      if (tg && pokemon.team != tg.team) {
        rank.push(tg)
      }
    })
    rank.sort((a, b) => {
      if (a.team === Team.BLUE_TEAM) {
        return a.positionY - b.positionY
      } else {
        return b.positionY - a.positionY
      }
    })

    const duration = 3000
    const count = 2
    for (let i = 0; i < count; i++) {
      const targetCharmed = rank[i]
      if (targetCharmed) {
        targetCharmed.status.triggerCharm(
          duration,
          targetCharmed,
          pokemon,
          true
        )
      }
    }
  }
}

export class SlackOffStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    pokemon.status.clearNegativeStatus()
    const healFactor =
      pokemon.stars === 3 ? 0.5 : pokemon.stars === 2 ? 0.4 : 0.3
    pokemon.handleHeal(pokemon.hp * healFactor, pokemon, 0.5)
    pokemon.status.triggerSleep(5000, pokemon)
  }
}

export class ConfusingMindStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)

    const rank = new Array<PokemonEntity>()
    board.forEach((x: number, y: number, tg: PokemonEntity | undefined) => {
      if (tg && pokemon.team != tg.team) {
        rank.push(tg)
      }
    })
    rank.sort((a, b) => {
      if (a.team === Team.BLUE_TEAM) {
        return a.positionY - b.positionY
      } else {
        return b.positionY - a.positionY
      }
    })

    const duration = 3000
    const count = 2
    for (let i = 0; i < count; i++) {
      const targetConfused = rank[i]
      if (targetConfused) {
        targetConfused.status.triggerConfusion(duration, targetConfused)
      }
    }
  }
}

export class KnowledgeThiefStrategy extends AbilityStrategy {
  copyable = false
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    if (AbilityStrategies[target.skill].copyable) {
      AbilityStrategies[target.skill].process(
        pokemon,
        state,
        board,
        target,
        crit
      )
    }
  }
}

export class WonderGuardStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const cells = board.getAdjacentCells(pokemon.positionX, pokemon.positionY)
    let damage = 30
    if (pokemon.stars == 2) {
      damage = 60
    }
    if (pokemon.stars == 3) {
      damage = 120
    }

    cells.forEach((cell) => {
      if (cell.value && pokemon.team != cell.value.team) {
        cell.value.status.triggerParalysis(3000, cell.value)
        cell.value.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
      }
    })
  }
}

export class IllusionStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const heal = pokemon.stars === 3 ? 70 : pokemon.stars === 2 ? 50 : 30
    pokemon.handleHeal(heal, pokemon, 0.5)
    if (target) {
      pokemon.index = target.index
      pokemon.atk = Math.max(pokemon.atk, target.atk)
      pokemon.range = target.range + (pokemon.items.has(Item.WIDE_LENS) ? 2 : 0)
      pokemon.def = Math.max(pokemon.def, target.def)
      pokemon.speDef = Math.max(pokemon.speDef, target.speDef)
    }
  }
}

export class JudgementStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let synergyLevelsCount = 0
    const synergies = pokemon.player?.synergies
    if (synergies) {
      pokemon.types.forEach((type) => {
        synergyLevelsCount += synergies.get(type) ?? 0
      })
    }
    const damage = 10 * synergyLevelsCount
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
  }
}

export class ElectricSurgeStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const buff = 10
    board.forEach((x: number, y: number, ally: PokemonEntity | undefined) => {
      if (
        ally &&
        pokemon.team == ally.team &&
        ally.types.has(Synergy.ELECTRIC)
      ) {
        ally.addAttackSpeed(buff, true)
      }
    })
  }
}

export class PsychicSurgeStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const buff = 5
    board.forEach((x: number, y: number, ally: PokemonEntity | undefined) => {
      if (
        ally &&
        ally !== pokemon &&
        pokemon.team == ally.team &&
        ally.types.has(Synergy.PSYCHIC)
      ) {
        ally.addAbilityPower(buff, true)
      }
    })
  }
}

export class MistySurgeStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit, true)
    const ppGain = Math.round(30 * (1 + pokemon.ap / 100))
    board.forEach((x: number, y: number, ally: PokemonEntity | undefined) => {
      if (ally && pokemon.team == ally.team && ally.types.has(Synergy.FAIRY)) {
        ally.addPP(ppGain)
      }
    })
  }
}

export class GrassySurgeStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const buff = 5
    board.forEach((x: number, y: number, ally: PokemonEntity | undefined) => {
      if (ally && pokemon.team == ally.team && ally.types.has(Synergy.GRASS)) {
        ally.addAttack(buff, true)
      }
    })
  }
}

export class PsychicStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = pokemon.stars === 3 ? 180 : pokemon.stars === 2 ? 90 : 45

    const cells = board.getAdjacentCells(target.positionX, target.positionY)
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
    target.addPP(-15)
    target.count.manaBurnCount++
    cells.forEach((cell) => {
      if (cell.value && cell.value.team !== pokemon.team) {
        cell.value.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
        cell.value.addPP(-15)
        cell.value.count.manaBurnCount++
      }
    })
  }
}

export class ChatterStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = 20
    const confusionChance = 0.5
    board.forEach((x: number, y: number, tg: PokemonEntity | undefined) => {
      if (tg && pokemon.team != tg.team) {
        tg.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
        if (chance(confusionChance)) {
          tg.status.triggerConfusion(1000, tg)
        }
      }
    })
  }
}

export class CorruptedNatureStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 20
    if (pokemon.stars == 2) {
      damage = 40
    } else if (pokemon.stars == 3) {
      damage = 80
    }
    const cells = board.getAdjacentCells(pokemon.positionX, pokemon.positionY)
    cells.forEach((cell) => {
      if (cell.value && cell.value.team !== pokemon.team) {
        cell.value.status.triggerWound(5000, cell.value, pokemon)
        cell.value.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
      }
    })
  }
}

export class CrabHammerStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 40
    if (pokemon.stars == 2) {
      damage = 80
    } else if (pokemon.stars == 3) {
      damage = 120
    }
    if (pokemon.items.has(Item.REAPER_CLOTH)) {
      crit = chance((3 * pokemon.critChance) / 100)
    }
    let attackType = AttackType.SPECIAL
    if (target.life / target.hp < 0.3) {
      damage = target.life
      attackType = AttackType.TRUE
    }
    target.handleSpecialDamage(damage, board, attackType, pokemon, crit)
  }
}

export class DiamondStormStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = Math.round(2 * pokemon.def * (1 + pokemon.ap / 100))
    const cells = board.getAdjacentCells(pokemon.positionX, pokemon.positionY)
    cells.forEach((cell) => {
      if (cell.value && cell.value.team !== pokemon.team) {
        cell.value.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
      }
    })
  }
}

export class DracoEnergyStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    target.handleSpecialDamage(
      pokemon.life,
      board,
      AttackType.SPECIAL,
      pokemon,
      crit
    )
  }
}

export class DynamaxCannonStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)

    effectInLine(board, pokemon, target, (targetInLine) => {
      if (targetInLine != null && targetInLine.team !== pokemon.team) {
        targetInLine.handleSpecialDamage(
          Math.ceil(targetInLine.hp * 0.5),
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
      }
    })
  }
}

export class DynamicPunchStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let duration = 1500
    let damage = 20
    if (pokemon.stars == 2) {
      damage = 40
      duration = 3000
    } else if (pokemon.stars == 3) {
      damage = 80
      duration = 6000
    }
    target.status.triggerConfusion(duration, target)
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
  }
}

export class ElectroBoostStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    board.forEach((x, y, tg) => {
      if (tg && pokemon.team == tg.team && tg.types.has(Synergy.ELECTRIC)) {
        tg.status.triggerRuneProtect(5000)
      }
    })
  }
}

export class AuroraVeilStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const runeProtectDuration = 500
    let shield = 5
    if (pokemon.stars === 2) {
      shield = 10
    }
    if (pokemon.stars === 3) {
      shield = 15
    }
    shield = Math.round(shield * (1 + pokemon.ap / 100))

    board.forEach((x, y, tg) => {
      if (tg && pokemon.team == tg.team) {
        tg.addShield(shield, pokemon, false)
        tg.status.triggerRuneProtect(runeProtectDuration)
      }
    })
  }
}

export class TimeTravelStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    board.forEach((x, y, ally) => {
      if (ally && pokemon.team == ally.team) {
        ally.handleHeal(25, pokemon, 1)
        ally.status.clearNegativeStatus()
      }
    })

    if (pokemon.player && pokemon.player.canRegainLife) {
      pokemon.player.life = max(100)(pokemon.player.life + 1)
    }
  }
}

export class AquaJetStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 20
    if (pokemon.stars === 2) {
      damage = 40
    }
    if (pokemon.stars === 3) {
      damage = 80
    }
    const farthestCoordinate = state.getFarthestTargetCoordinateAvailablePlace(
      pokemon,
      board
    )
    if (farthestCoordinate) {
      const cells = board.getCellsBetween(
        pokemon.positionX,
        pokemon.positionY,
        farthestCoordinate.x,
        farthestCoordinate.y
      )
      cells.forEach((cell) => {
        if (cell.value && cell.value.team != pokemon.team) {
          cell.value.handleSpecialDamage(
            damage,
            board,
            AttackType.SPECIAL,
            pokemon,
            crit
          )
        }
      })

      pokemon.moveTo(farthestCoordinate.x, farthestCoordinate.y, board)
    }
  }
}

export class ElectroWebStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const steal = [15, 30, 60][pokemon.stars - 1] ?? 60
    const damage = [15, 30, 60][pokemon.stars - 1] ?? 80
    board
      .getAdjacentCells(pokemon.positionX, pokemon.positionY)
      .forEach((cell) => {
        if (cell.value && cell.value.team !== pokemon.team) {
          cell.value.handleSpecialDamage(
            damage,
            board,
            AttackType.SPECIAL,
            pokemon,
            crit
          )
          cell.value.addAttackSpeed(-steal)
          pokemon.addAttackSpeed(steal)
        }
      })
  }
}

export class FireTrickStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 20
    if (pokemon.stars == 2) {
      damage = 40
    } else if (pokemon.stars == 3) {
      damage = 80
    }
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
    const teleportationCell = board.getTeleportationCell(
      target.positionX,
      target.positionY
    )
    if (teleportationCell) {
      target.moveTo(teleportationCell.x, teleportationCell.y, board)
    }
  }
}

export class FlameChargeStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 20
    if (pokemon.stars === 2) {
      damage = 40
    }
    if (pokemon.stars === 3) {
      damage = 80
    }
    const farthestCoordinate = state.getFarthestTargetCoordinateAvailablePlace(
      pokemon,
      board
    )
    if (farthestCoordinate) {
      const cells = board.getCellsBetween(
        pokemon.positionX,
        pokemon.positionY,
        farthestCoordinate.x,
        farthestCoordinate.y
      )
      cells.forEach((cell) => {
        if (cell.value && cell.value.team != pokemon.team) {
          cell.value.handleSpecialDamage(
            damage,
            board,
            AttackType.SPECIAL,
            pokemon,
            crit
          )
        }
      })

      pokemon.moveTo(farthestCoordinate.x, farthestCoordinate.y, board)
    }
  }
}

export class LeechSeedStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let duration = 3000
    let heal = 20
    if (pokemon.stars == 2) {
      duration = 6000
      heal = 40
    } else if (pokemon.stars == 3) {
      duration = 6000
      heal = 80
    }
    pokemon.handleHeal(heal, pokemon, 1)
    target.status.triggerPoison(duration, target, pokemon)
  }
}

export class LockOnStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    pokemon.effects.add(Effect.LOCK_ON)
  }
}

export class PsychUpStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 10
    let duration = 2000
    if (pokemon.stars == 2) {
      damage = 20
      duration = 4000
    } else if (pokemon.stars == 3) {
      damage = 80
      duration = 8000
    }
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
    target.status.triggerSilence(duration, pokemon)
    const cells = board.getAdjacentCells(target.positionX, target.positionY)
    cells.forEach((cell) => {
      if (cell && cell.value && cell.value.team !== pokemon.team) {
        cell.value.status.triggerSilence(duration, pokemon)
      }
    })
  }
}

export class RazorWindStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = pokemon.stars === 3 ? 80 : pokemon.stars === 2 ? 40 : 20
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
    target.status.triggerParalysis(7000, target)
    const cells = board.getAdjacentCells(target.positionX, target.positionY)
    cells.forEach((cell) => {
      if (cell && cell.value && cell.value.team !== pokemon.team) {
        cell.value.status.triggerParalysis(7000, cell.value)
      }
    })
  }
}

export class TwistingNetherStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const cells = board.getCellsInRadius(target.positionX, target.positionY, 2)
    cells.forEach((cell) => {
      if (cell && cell.value && cell.value.team !== pokemon.team) {
        cell.value.handleSpecialDamage(
          80,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
        const teleportationCell = board.getTeleportationCell(
          cell.value.positionX,
          cell.value.positionY
        )
        if (teleportationCell) {
          cell.value.moveTo(teleportationCell.x, teleportationCell.y, board)
        } else {
          logger.error("unable to teleport pokemon", cell.value)
        }
      }
    })
  }
}

export class DarkVoidStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = 30
    board.forEach((x: number, y: number, tg: PokemonEntity | undefined) => {
      if (tg && pokemon.team != tg.team) {
        tg.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
        if (tg.status.silence) {
          tg.status.triggerSleep(2000, tg)
        }
      }
    })
  }
}

export class OverheatStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    board.forEach((x: number, y: number, tg: PokemonEntity | undefined) => {
      if (tg && pokemon.team != tg.team) {
        let damage = 30
        if (tg.status.burn) {
          damage = Math.round(damage * 1.3)
        }
        tg.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
      }
    })
  }
}

export class HypnosisStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    const farthestTarget = state.getFarthestTarget(pokemon, board) ?? target
    super.process(pokemon, state, board, farthestTarget, crit)
    if (farthestTarget) {
      const duration = Math.round(
        ([2000, 4000, 6000][pokemon.stars - 1] ?? 2000) * (1 + pokemon.ap / 200)
      )
      farthestTarget.status.triggerSleep(duration, farthestTarget)
    }
  }
}

export class KingShieldStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const duration = 1500
    const shield = [10, 20, 30][pokemon.stars - 1] ?? 30
    pokemon.status.triggerProtect(duration)
    pokemon.addShield(shield, pokemon, true)
    const farthestTarget = state.getFarthestTarget(pokemon, board)
    if (farthestTarget) {
      pokemon.moveTo(farthestTarget.positionX, farthestTarget.positionY, board)
    }
  }
}

export class PoisonJabStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    const damage = [30, 60, 90, 120][pokemon.stars - 1] ?? 30
    const farthestTarget = state.getFarthestTarget(pokemon, board) ?? target
    super.process(pokemon, state, board, farthestTarget, crit)
    if (farthestTarget) {
      farthestTarget.handleSpecialDamage(
        damage,
        board,
        AttackType.SPECIAL,
        pokemon,
        crit
      )
      farthestTarget.status.triggerPoison(4000, farthestTarget, pokemon)
      pokemon.status.triggerPoison(4000, pokemon, pokemon)
      pokemon.moveTo(farthestTarget.positionX, farthestTarget.positionY, board)
    }
  }
}

export class ExplosionStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 0
    switch (pokemon.stars) {
      case 1:
        damage = 50
        break
      case 2:
        damage = 100
        break
      case 3:
        damage = 200
        break
      default:
        break
    }

    const cells = board.getAdjacentCells(pokemon.positionX, pokemon.positionY)

    cells.forEach((cell) => {
      if (cell.value && pokemon.team != cell.value.team) {
        cell.value.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
      }
    })

    pokemon.handleSpecialDamage(
      damage,
      board,
      AttackType.SPECIAL,
      pokemon,
      crit
    )
  }
}

export class ClangorousSoulStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const buff = [1, 2, 4][pokemon.stars - 1] ?? 1

    const cells = board.getAdjacentCells(pokemon.positionX, pokemon.positionY)

    pokemon.addAttack(buff, true)
    pokemon.addDefense(buff, true)
    pokemon.addSpecialDefense(buff, true)

    cells.forEach((cell) => {
      if (cell.value && pokemon.team == cell.value.team) {
        cell.value.addAttack(buff, true)
        cell.value.addDefense(buff, true)
        cell.value.addSpecialDefense(buff, true)
      }
    })
  }
}

export class LiquidationStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 0
    let reduce = 0
    switch (pokemon.stars) {
      case 1:
        damage = 20
        reduce = 1
        break
      case 2:
        damage = 40
        reduce = 2
        break
      case 3:
        damage = 80
        reduce = 4
        break
      default:
        break
    }

    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
    target.addDefense(-reduce, true)
  }
}

export class BonemerangStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 0
    switch (pokemon.stars) {
      case 1:
        damage = 30
        break
      case 2:
        damage = 60
        break
      case 3:
        damage = 90
        break
      default:
        break
    }

    board.forEach((x: number, y: number, tg: PokemonEntity | undefined) => {
      if (tg && pokemon.team != tg.team && x == target.positionX) {
        tg.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
      }
    })
  }
}

export class AuroraBeamStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 0
    switch (pokemon.stars) {
      case 1:
        damage = 25
        break
      case 2:
        damage = 50
        break
      case 3:
        damage = 100
        break
      default:
        break
    }

    effectInLine(board, pokemon, target, (targetInLine) => {
      if (targetInLine != null && targetInLine.team !== pokemon.team) {
        targetInLine.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
        let freezeChance = 0
        if (pokemon.effects.has(Effect.CHILLY)) {
          freezeChance = 0.2
        } else if (pokemon.effects.has(Effect.FROSTY)) {
          freezeChance = 0.3
        } else if (pokemon.effects.has(Effect.FREEZING)) {
          freezeChance = 0.4
        } else if (pokemon.effects.has(Effect.SHEER_COLD)) {
          freezeChance = 0.5
        }
        if (chance(freezeChance)) {
          targetInLine.status.triggerFreeze(2000, target)
        }
      }
    })
  }
}

export class GrowlStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let duration = [3000, 6000, 9000][pokemon.stars - 1] ?? 9000
    duration = Math.round(duration * (1 + pokemon.ap / 100))
    board.forEach((x: number, y: number, tg: PokemonEntity | undefined) => {
      if (tg && pokemon.team != tg.team) {
        tg.status.triggerFlinch(duration)
      }
    })
  }
}

export class RelicSongStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    if (pokemon.count.ult % 3 === 0) {
      const duration = Math.round(2000 * (1 + pokemon.ap / 200))
      board.forEach((x: number, y: number, tg: PokemonEntity | undefined) => {
        if (tg && pokemon.team != tg.team) {
          tg.status.triggerSleep(duration, tg)
          pokemon.simulation.room.broadcast(Transfer.ABILITY, {
            id: pokemon.simulation.id,
            skill: pokemon.skill,
            positionX: tg.positionX,
            positionY: tg.positionX,
            orientation: tg.orientation
          })
        }
      })
    }
  }
}

export class FairyWindStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let ppGain = [10, 20, 30][pokemon.stars - 1] ?? 0
    ppGain = Math.round(ppGain * (1 + pokemon.ap / 200))
    board.forEach((x: number, y: number, tg: PokemonEntity | undefined) => {
      if (tg && pokemon.team === tg.team && tg.id !== pokemon.id) {
        tg.addPP(ppGain)
        pokemon.simulation.room.broadcast(Transfer.ABILITY, {
          id: pokemon.simulation.id,
          skill: pokemon.skill,
          positionX: tg.positionX,
          positionY: tg.positionY,
          orientation: tg.orientation
        })
      }
    })
  }
}

export class DisarmingVoiceStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const cells = board.getCellsInRadius(
      pokemon.positionX,
      pokemon.positionY,
      2
    )
    cells.forEach((cell) => {
      if (cell.value && pokemon.team != cell.value.team) {
        cell.value.status.triggerCharm(1000, target, pokemon, true)
      }
    })
  }
}

export class HighJumpKickStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 0
    switch (pokemon.stars) {
      case 1:
        damage = 50
        break
      case 2:
        damage = 100
        break
      case 3:
        damage = 200
        break
      default:
        break
    }
    pokemon.addPP(target.pp)
    target.addPP(-target.pp)
    target.count.manaBurnCount++
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
  }
}

export class GrassWhistleStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let n = 0
    switch (pokemon.stars) {
      case 1:
        n = 1
        break
      case 2:
        n = 2
        break
      case 3:
        n = 4
        break
      default:
        break
    }
    board.forEach((x: number, y: number, tg: PokemonEntity | undefined) => {
      if (tg && pokemon.team != tg.team && n > 0) {
        tg.status.triggerSleep(2000, tg)
        n--
      }
    })
  }
}

export class TriAttackStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = [30, 50, 70][pokemon.stars - 1] ?? 70
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
    const effect = randomBetween(1, 3)
    switch (effect) {
      case 1:
        target.status.triggerFreeze(2000, target)
        break
      case 2:
        target.status.triggerBurn(5000, target, pokemon)
        break
      case 3:
        target.status.triggerParalysis(5000, target)
        break
    }
  }
}

export class EchoStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)

    let damage = 0
    let additional = 0

    switch (pokemon.stars) {
      case 1:
        damage = 3
        additional = 3
        break
      case 2:
        damage = 6
        additional = 6
        break
      case 3:
        damage = 9
        additional = 9
        break
      default:
        break
    }

    board.forEach((x: number, y: number, tg: PokemonEntity | undefined) => {
      if (tg && pokemon.team != tg.team) {
        tg.handleSpecialDamage(
          damage + pokemon.echo * additional,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
      }
    })

    pokemon.echo++
  }
}

export class FutureSightStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit, true)

    let damage = 0
    let count = 0

    switch (pokemon.stars) {
      case 1:
        damage = 15
        count = 5
        break
      case 2:
        damage = 30
        count = 5
        break
      case 3:
        damage = 60
        count = 5
        break
      default:
        break
    }

    board.forEach((x: number, y: number, tg: PokemonEntity | undefined) => {
      if (tg && pokemon.team != tg.team && count > 0) {
        tg.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
        count--
        tg.count.futureSightCount++
      }
    })
  }
}

export class PetalDanceStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit, true)

    const damage = [20, 30, 50][pokemon.stars - 1] ?? 50
    const count = [3, 4, 5][pokemon.stars - 1] ?? 5

    const enemies = board.cells.filter(
      (p) => p && p.team !== pokemon.team
    ) as PokemonEntity[]
    const enemiesHit = enemies
      .sort(
        (a, b) =>
          distanceM(
            a.positionX,
            a.positionY,
            pokemon.positionX,
            pokemon.positionY
          ) -
          distanceM(
            b.positionX,
            b.positionY,
            pokemon.positionX,
            pokemon.positionY
          )
      )
      .slice(0, count)

    enemiesHit.forEach((enemy) => {
      enemy.handleSpecialDamage(
        damage,
        board,
        AttackType.SPECIAL,
        pokemon,
        crit
      )
      enemy.count.petalDanceCount++
    })
  }
}

export class HyperVoiceStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)

    const damage = [40, 80, 200][pokemon.stars - 1] ?? 200
    const confusionDuration = [1000, 2000, 3000][pokemon.stars - 1] ?? 3

    board.forEach((x: number, y: number, tg: PokemonEntity | undefined) => {
      if (tg && pokemon.team != tg.team && target.positionY == y) {
        tg.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
        tg.status.triggerConfusion(confusionDuration, tg)
      }
    })
  }
}
export class ShadowCloneStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const farthestCoordinate = state.getFarthestTargetCoordinateAvailablePlace(
      pokemon,
      board
    )

    if (farthestCoordinate) {
      const p = PokemonFactory.createPokemonFromName(pokemon.name)
      if (pokemon.items.size > 0) {
        const itemGiven = pickRandomIn(values(pokemon.items))
        p.items.add(itemGiven)
        pokemon.items.delete(itemGiven)
        if (itemGiven === Item.MAX_REVIVE && pokemon.status.resurection) {
          pokemon.status.resurection = false
        }
      }

      const clone = pokemon.simulation.addPokemon(
        p,
        farthestCoordinate.x,
        farthestCoordinate.y,
        pokemon.team
      )
      clone.hp = min(1)(Math.ceil(0.5 * pokemon.hp * (1 + pokemon.ap / 100)))
      clone.life = clone.hp
      clone.isClone = true
    }
  }
}

export class VoltSwitchStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = [30, 60, 120][pokemon.stars - 1] ?? 120
    const farthestCoordinate = state.getFarthestTargetCoordinateAvailablePlace(
      pokemon,
      board
    )

    if (farthestCoordinate) {
      const cells = board.getCellsBetween(
        pokemon.positionX,
        pokemon.positionY,
        farthestCoordinate.x,
        farthestCoordinate.y
      )
      cells.forEach((cell) => {
        if (cell.value && cell.value.team != pokemon.team) {
          cell.value.handleSpecialDamage(
            damage,
            board,
            AttackType.SPECIAL,
            pokemon,
            crit
          )
        }
      })

      pokemon.moveTo(farthestCoordinate.x, farthestCoordinate.y, board)
    }
  }
}

export class AccelerockStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const farthestCoordinate = state.getFarthestTargetCoordinateAvailablePlace(
      pokemon,
      board
    )

    if (farthestCoordinate) {
      pokemon.moveTo(farthestCoordinate.x, farthestCoordinate.y, board)
      const targetCoordinates = state.getNearestTargetAtRangeCoordinates(
        pokemon,
        board
      )
      if (targetCoordinates) {
        pokemon.targetX = targetCoordinates.x
        pokemon.targetY = targetCoordinates.y
        const target = board.getValue(targetCoordinates.x, targetCoordinates.y)
        if (target) {
          target.handleSpecialDamage(
            pokemon.atk,
            board,
            AttackType.SPECIAL,
            pokemon,
            crit,
            true
          )
        }
      }
    }

    const defLost = max(pokemon.def)(Math.round(5 * (1 + pokemon.ap / 100)))
    pokemon.addDefense(-defLost)
    pokemon.addAttackSpeed(defLost * 5)
    pokemon.cooldown = 0
  }
}

export class NuzzleStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    const farthestTarget = state.getFarthestTarget(pokemon, board) ?? target
    super.process(pokemon, state, board, farthestTarget, crit)
    const farthestCoordinate = state.getFarthestTargetCoordinateAvailablePlace(
      pokemon,
      board
    )

    if (farthestTarget && farthestCoordinate) {
      const damage = [30, 60, 120][pokemon.stars - 1] ?? 120
      const duration = [3000, 4000, 5000][pokemon.stars - 1] ?? 5000

      farthestTarget.handleSpecialDamage(
        damage,
        board,
        AttackType.SPECIAL,
        pokemon,
        crit,
        true
      )
      farthestTarget.status.triggerParalysis(duration, farthestTarget)
      pokemon.moveTo(farthestCoordinate.x, farthestCoordinate.y, board)
    }
  }
}

export class HeadSmashStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)

    let damage, recoil
    if (pokemon.stars === 3) {
      damage = 150
      recoil = 15
    } else if (pokemon.stars === 2) {
      damage = 80
      recoil = 10
    } else {
      damage = 40
      recoil = 5
    }

    if (target.status.sleep || target.status.freeze) {
      target.handleSpecialDamage(
        target.life,
        board,
        AttackType.TRUE,
        pokemon,
        crit
      )
    } else {
      target.handleSpecialDamage(
        damage,
        board,
        AttackType.SPECIAL,
        pokemon,
        crit
      )
    }
    pokemon.handleSpecialDamage(recoil, board, AttackType.TRUE, pokemon, crit)
  }
}

export class RockSmashStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)

    let d = 0
    let s = 0
    switch (pokemon.stars) {
      case 1:
        d = 20
        s = 3000
        break
      case 2:
        d = 40
        s = 6000
        break
      case 3:
        d = 80
        s = 9000
        break
      default:
        break
    }

    target.handleSpecialDamage(d, board, AttackType.SPECIAL, pokemon, crit)
    target.status.triggerSilence(s, pokemon)
  }
}

export class RockTombStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)

    let damage = 30
    let debuff = 10
    if (pokemon.stars === 2) {
      damage = 60
      debuff = 20
    }
    if (pokemon.stars === 3) {
      damage = 120
      debuff = 40
    }

    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
    target.addAttackSpeed(-debuff, false)
  }
}

export class RoarOfTimeStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const atkSpeedBuff = Math.round(20 * (1 + pokemon.ap / 100))

    const strongest = board.getStrongestUnitOnBoard(pokemon.team)
    if (strongest) {
      strongest.status.resurection = true
      strongest.addAttackSpeed(atkSpeedBuff, false)
    }
  }
}

export class HealBlockStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)

    let timer = 0
    switch (pokemon.stars) {
      case 1:
        timer = 5000
        break
      case 2:
        timer = 10000
        break
      case 3:
        timer = 15000
        break
      default:
        break
    }
    const cells = board.getAdjacentCells(pokemon.positionX, pokemon.positionY)

    cells.forEach((cell) => {
      if (cell.value && pokemon.team != cell.value.team) {
        cell.value.status.triggerWound(timer, cell.value, pokemon)
      }
    })
  }
}

export class SpikeArmorStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const duration =
      pokemon.stars === 3 ? 10000 : pokemon.stars === 2 ? 5000 : 3000
    pokemon.status.triggerSpikeArmor(duration)
  }
}

export class OriginPulseStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = 100
    board.forEach((x: number, y: number, tg: PokemonEntity | undefined) => {
      if (tg && pokemon.team != tg.team && target.positionY == y) {
        tg.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
      }
    })
  }
}

export class SeedFlareStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = 30

    board.forEach((x: number, y: number, tg: PokemonEntity | undefined) => {
      if (tg && pokemon.team != tg.team) {
        tg.addSpecialDefense(-2, true)
        tg.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
      }
    })
  }
}

export class NightmareStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const duration = [1500, 3000, 8000][pokemon.stars - 1] ?? 8000
    const damage = [25, 50, 100][pokemon.stars - 1] ?? 100

    board.forEach((x: number, y: number, enemy: PokemonEntity | undefined) => {
      if (enemy && pokemon.team != enemy.team) {
        if (enemy.status.flinch || enemy.status.sleep || enemy.status.silence) {
          enemy.handleSpecialDamage(
            damage,
            board,
            AttackType.SPECIAL,
            pokemon,
            crit,
            true
          )
        }
        enemy.status.triggerSilence(duration, pokemon)
      }
    })
  }
}

export class BurnStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let duration = 5000
    if (pokemon.stars === 2) {
      duration = 10000
    }
    if (pokemon.stars === 3) {
      duration = 20000
    }
    board.forEach((x: number, y: number, value: PokemonEntity | undefined) => {
      if (value && pokemon.team != value.team) {
        value.status.triggerBurn(duration, value, pokemon)
      }
    })
  }
}

export class PoisonStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let duration = 0
    let count = 1

    switch (pokemon.stars) {
      case 1:
        duration = 3000
        count = 1
        break
      case 2:
        duration = 6000
        count = 2
        break
      case 3:
        duration = 9000
        count = 3
        break
      default:
        break
    }

    duration = Math.round(duration * (1 + pokemon.ap / 200))

    const closestEnemies = new Array<PokemonEntity>()
    board.forEach((x: number, y: number, enemy: PokemonEntity | undefined) => {
      if (enemy && pokemon.team !== enemy.team) {
        closestEnemies.push(enemy)
      }
    })
    closestEnemies.sort((a, b) => {
      const distanceA = distanceC(
        a.positionX,
        a.positionY,
        pokemon.positionX,
        pokemon.positionY
      )
      const distanceB = distanceC(
        b.positionX,
        b.positionY,
        pokemon.positionX,
        pokemon.positionY
      )
      return distanceA - distanceB
    })

    for (let i = 0; i < count; i++) {
      const enemy = closestEnemies[i]
      if (enemy) {
        enemy.status.triggerPoison(duration, enemy, pokemon)
      }
    }
  }
}

export class BlizzardStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const freezeDuration = 2000
    const damage = [5, 10, 15][pokemon.stars - 1] ?? 15
    board.forEach((x: number, y: number, enemy: PokemonEntity | undefined) => {
      if (enemy && pokemon.team != enemy.team) {
        enemy.status.triggerFreeze(freezeDuration, enemy)
        enemy.handleSpecialDamage(
          enemy.status.freeze ? damage * 2 : damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
      }
    })
  }
}

export class ProtectStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const duration = Math.round(5000 * (1 + pokemon.ap / 200))
    pokemon.status.triggerProtect(duration)
  }
}

export class SleepStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const timer = Math.round(2000 * (1 + pokemon.ap / 100))
    const count = pokemon.stars
    const rank = new Array<PokemonEntity>()
    board.forEach((x: number, y: number, tg: PokemonEntity | undefined) => {
      if (tg && pokemon.team != tg.team) {
        rank.push(tg)
      }
    })
    rank.sort((a, b) => {
      if (a.team === Team.BLUE_TEAM) {
        return a.positionY - b.positionY
      } else {
        return b.positionY - a.positionY
      }
    })
    for (let i = 0; i < count; i++) {
      const tg = rank[i]
      if (tg) {
        tg.status.triggerSleep(timer, tg)
      }
    }
  }
}

export class ConfusionStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let timer = 0,
      damage = 0
    switch (pokemon.stars) {
      case 1:
        timer = 3000
        damage = 75
        break
      case 2:
        timer = 5000
        damage = 150
        break
      case 3:
        timer = 7000
        damage = 300
        break
      default:
        break
    }

    if (target.status.confusion) {
      target.handleSpecialDamage(
        damage,
        board,
        AttackType.SPECIAL,
        pokemon,
        crit
      )
    } else {
      target.status.triggerSilence(timer, target)
      target.status.triggerConfusion(timer, target)
    }
  }
}

export class FireBlastStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 30
    if (pokemon.stars === 2) {
      damage = 60
    }
    if (pokemon.stars === 3) {
      damage = 120
    }
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
  }
}

export class SeismicTossStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 7
    if (pokemon.stars === 2) {
      damage = 14
    }
    if (pokemon.stars === 3) {
      damage = 28
    }

    let totalDamage = 0
    board.forEach((x: number, y: number, value: PokemonEntity | undefined) => {
      if (value && pokemon.team == value.team) {
        totalDamage += damage
      }
    })
    target.handleSpecialDamage(
      totalDamage,
      board,
      AttackType.TRUE,
      pokemon,
      crit
    )
  }
}

export class GuillotineStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = pokemon.atk * pokemon.stars
    const { death } = target.handleSpecialDamage(
      damage,
      board,
      AttackType.SPECIAL,
      pokemon,
      crit
    )
    if (death) {
      pokemon.addPP(pokemon.maxPP)
    }
  }
}

export class RockSlideStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 30
    if (pokemon.stars === 2) {
      damage = 60
    }
    if (pokemon.stars === 3) {
      damage = 120
    }

    if (target.types.has(Synergy.FLYING)) {
      damage = damage * 2
    }
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
  }
}

export class WheelOfFireStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    const damage = [10, 20, 30][pokemon.stars - 1] ?? 30
    const farthestTarget = state.getFarthestTarget(pokemon, board) ?? target
    super.process(pokemon, state, board, farthestTarget, crit)

    const cells = board.getCellsBetween(
      pokemon.positionX,
      pokemon.positionY,
      farthestTarget.positionX,
      farthestTarget.positionY
    )

    cells.forEach((cell) => {
      if (cell.value && cell.value.team != pokemon.team) {
        pokemon.simulation.room.broadcast(Transfer.ABILITY, {
          id: pokemon.simulation.id,
          skill: "FLAME_HIT",
          positionX: cell.value.positionX,
          positionY: cell.value.positionY
        })

        cell.value.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
        cell.value.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
      }
    })
  }
}

export class InfernalParadeStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    const farthestTarget = state.getFarthestTarget(pokemon, board) ?? target
    super.process(pokemon, state, board, farthestTarget, crit)

    const cells = board.getCellsBetween(
      pokemon.positionX,
      pokemon.positionY,
      farthestTarget.positionX,
      farthestTarget.positionY
    )

    cells.forEach((cell) => {
      if (cell.value && cell.value.team != pokemon.team) {
        const enemy = cell.value
        pokemon.simulation.room.broadcast(Transfer.ABILITY, {
          id: pokemon.simulation.id,
          skill: "FLAME_HIT",
          positionX: enemy.positionX,
          positionY: enemy.positionY
        })

        if (Math.random() > 0.5) {
          enemy.status.triggerBurn(3000, cell.value, pokemon)
        }

        repeat(2)(() =>
          enemy.handleSpecialDamage(
            30,
            board,
            AttackType.SPECIAL,
            pokemon,
            crit
          )
        )
      }
    })
  }
}

export class HeatWaveStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 0
    switch (pokemon.stars) {
      case 1:
        damage = 20
        break
      case 2:
        damage = 40
        break
      case 3:
        damage = 80
        break
      default:
        break
    }

    effectInLine(board, pokemon, target, (targetInLine) => {
      if (targetInLine != null && targetInLine.team != pokemon.team) {
        targetInLine.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
      }
    })
  }
}

export class HydroPumpStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 0
    switch (pokemon.stars) {
      case 1:
        damage = 25
        break
      case 2:
        damage = 50
        break
      case 3:
        damage = 100
        break
      default:
        break
    }

    effectInLine(board, pokemon, target, (targetInLine) => {
      if (targetInLine != null && targetInLine.team !== pokemon.team) {
        targetInLine.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
      }
    })
  }
}

export class SolarBeamStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = pokemon.stars === 3 ? 120 : pokemon.stars === 2 ? 60 : 30
    if (pokemon.simulation.weather === Weather.SUN) {
      damage = damage * 2
      pokemon.addPP(40)
    }
    effectInLine(board, pokemon, target, (targetInLine) => {
      if (targetInLine != null && targetInLine.team !== pokemon.team) {
        if (pokemon.simulation.weather === Weather.SUN) {
          targetInLine.status.triggerBurn(3000, targetInLine, pokemon)
        }

        targetInLine.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
      }
    })
  }
}

export class ThunderStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 0
    switch (pokemon.stars) {
      case 1:
        damage = 30
        break
      case 2:
        damage = 60
        break
      case 3:
        damage = 120
        break
      default:
        break
    }
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
  }
}

export class DracoMeteorStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = 50
    board.forEach((x: number, y: number, tg: PokemonEntity | undefined) => {
      if (tg && pokemon.team != tg.team) {
        tg.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
      }
    })
  }
}

export class BlazeKickStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = [30, 60, 120][pokemon.stars - 1] ?? 120
    if (target.status.burn) {
      damage = Math.round(damage * 1.3)
    } else {
      target.status.triggerBurn(2000, target, pokemon)
    }
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
  }
}

export class WishStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const heal = 50
    let count = pokemon.stars

    board.forEach((x: number, y: number, ally: PokemonEntity | undefined) => {
      if (
        ally &&
        pokemon.team == ally.team &&
        count > 0 &&
        ally.life < ally.hp
      ) {
        ally.handleHeal(heal, pokemon, 1)
        count -= 1
      }
    })
  }
}

export class NaturalGiftStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit, true)

    const lowestHealthAlly = (
      board.cells.filter(
        (cell) => cell && cell.team === pokemon.team
      ) as PokemonEntity[]
    ).sort((a, b) => a.life / a.hp - b.life / b.hp)[0]

    if (lowestHealthAlly) {
      lowestHealthAlly.handleHeal(
        pokemon.stars === 3 ? 120 : pokemon.stars === 2 ? 60 : 30,
        pokemon,
        1
      )
      lowestHealthAlly.status.triggerRuneProtect(pokemon.stars * 1000)
      pokemon.simulation.room.broadcast(Transfer.ABILITY, {
        id: pokemon.simulation.id,
        skill: Ability.NATURAL_GIFT,
        positionX: pokemon.positionX,
        positionY: pokemon.positionY,
        targetX: lowestHealthAlly.positionX,
        targetY: lowestHealthAlly.positionY
      })
    }
  }
}

export class CalmMindStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const buff = 1
    pokemon.addAttack(buff * pokemon.baseAtk, true)
  }
}

export class CosmicPowerStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const apGain = Math.round(20 * (1 + pokemon.ap / 100))
    board.forEach((x, y, ally) => {
      if (ally && ally.team === pokemon.team) {
        ally.addAbilityPower(apGain, false)
      }
    })
  }
}

export class DefenseCurlStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let buff = 3
    if (pokemon.stars === 2) {
      buff = 6
    }
    if (pokemon.stars === 3) {
      buff = 12
    }
    pokemon.addDefense(buff, true)
    pokemon.addSpecialDefense(buff, true)
  }
}

export class IronDefenseStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const shield = [20, 40, 80][pokemon.stars - 1] ?? 80
    board.forEach((x: number, y: number, ally: PokemonEntity | undefined) => {
      if (ally && pokemon.team == ally.team && y === pokemon.positionY) {
        ally.addShield(shield, pokemon, true)
      }
    })
  }
}

export class SoakStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 0
    switch (pokemon.stars) {
      case 1:
        damage = 20
        break
      case 2:
        damage = 40
        break
      case 3:
        damage = 80
        break
      default:
        break
    }

    board.forEach((x: number, y: number, ally: PokemonEntity | undefined) => {
      if (ally && pokemon.team == ally.team) {
        ally.addPP(10)
      }
    })

    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
  }
}

export class IronTailStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 20
    let buff = 1
    if (pokemon.stars === 2) {
      damage = 40
      buff = 3
    }
    if (pokemon.stars === 3) {
      damage = 80
      buff = 5
    }
    pokemon.addDefense(buff, true)
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
  }
}

export class BlastBurnStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 0

    switch (pokemon.stars) {
      case 1:
        damage = 30
        break
      case 2:
        damage = 60
        break
      case 3:
        damage = 120
        break
      default:
        break
    }

    const cells = board.getAdjacentCells(pokemon.positionX, pokemon.positionY)

    cells.forEach((cell) => {
      if (cell.value && pokemon.team != cell.value.team) {
        cell.value.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
      }
    })
  }
}

export class ChargeStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const buff = 0.25
    board.forEach((x: number, y: number, ally: PokemonEntity | undefined) => {
      if (
        ally &&
        pokemon.team == ally.team &&
        ally.types.has(Synergy.ELECTRIC)
      ) {
        ally.addAttack(pokemon.baseAtk * buff, true)
        ally.addAttackSpeed(buff * 100, true)
      }
    })
  }
}

export class SludgeStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const nbStacks = pokemon.stars === 1 ? 2 : pokemon.stars === 2 ? 3 : 4
    const cells = board.getCellsInFront(pokemon, target)

    cells.forEach((cell) => {
      if (cell.value && pokemon.team != cell.value.team) {
        for (let i = 0; i < nbStacks; i++) {
          cell.value.status.triggerPoison(3000, cell.value, pokemon)
        }
      }
    })
  }
}

export class SludgeWaveStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit, true)
    const duration =
      pokemon.stars === 3 ? 6000 : pokemon.stars === 2 ? 4000 : 2000
    const damage = pokemon.stars === 3 ? 30 : pokemon.stars === 2 ? 20 : 10
    const potentials = board.cells
      .filter((p) => p && p.team !== pokemon.team)
      .sort((a, b) => b!.life - a!.life)
    const mostHpEnnemy = potentials[0]
    if (mostHpEnnemy) {
      pokemon.simulation.room.broadcast(Transfer.ABILITY, {
        id: pokemon.simulation.id,
        skill: pokemon.skill,
        positionX: pokemon.positionX,
        positionY: pokemon.positionY,
        targetX: mostHpEnnemy.positionX,
        targetY: mostHpEnnemy.positionY,
        orientation: pokemon.orientation
      })
      const cells = board.getCellsBetween(
        pokemon.positionX,
        pokemon.positionY,
        mostHpEnnemy.positionX,
        mostHpEnnemy.positionY
      )
      cells.forEach((cell) => {
        if (cell.value && cell.value.team != pokemon.team) {
          cell.value.status.triggerPoison(duration, cell.value, pokemon)
          cell.value.handleSpecialDamage(
            damage,
            board,
            AttackType.SPECIAL,
            pokemon,
            crit
          )
        }
      })
    }
  }
}

export class DischargeStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 0

    switch (pokemon.stars) {
      case 1:
        damage = 25
        break
      case 2:
        damage = 50
        break
      case 3:
        damage = 75
        break
      default:
        break
    }

    const cells = board.getAdjacentCells(pokemon.positionX, pokemon.positionY)

    cells.forEach((cell) => {
      if (cell.value && pokemon.team != cell.value.team) {
        cell.value.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
        cell.value.status.triggerParalysis(5000, cell.value)
      }
    })
  }
}

export class DiveStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = pokemon.stars === 3 ? 60 : pokemon.stars === 2 ? 30 : 15
    const freezeDuration = 1500
    const mostSurroundedCoordinate =
      state.getMostSurroundedCoordinateAvailablePlace(pokemon, board)

    if (mostSurroundedCoordinate) {
      pokemon.moveTo(
        mostSurroundedCoordinate.x,
        mostSurroundedCoordinate.y,
        board
      )

      const cells = board.getAdjacentCells(pokemon.positionX, pokemon.positionY)

      cells.forEach((cell) => {
        if (cell.value && cell.value.team !== pokemon.team) {
          cell.value.handleSpecialDamage(
            damage,
            board,
            AttackType.SPECIAL,
            pokemon,
            crit
          )
          cell.value.status.triggerFreeze(freezeDuration, cell.value)
        }
      })
    }
  }
}

export class SmokeScreenStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit, true)
    const damage = pokemon.stars === 3 ? 40 : pokemon.stars === 2 ? 20 : 10
    const duration = 2000
    const mostSurroundedCoordinate =
      state.getMostSurroundedCoordinateAvailablePlace(pokemon, board)

    if (mostSurroundedCoordinate) {
      pokemon.moveTo(
        mostSurroundedCoordinate.x,
        mostSurroundedCoordinate.y,
        board
      )

      const cells = board.getAdjacentCells(pokemon.positionX, pokemon.positionY)

      pokemon.simulation.room.broadcast(Transfer.ABILITY, {
        id: pokemon.simulation.id,
        skill: pokemon.skill,
        positionX: pokemon.positionX,
        positionY: pokemon.positionY,
        targetX: pokemon.positionX,
        targetY: pokemon.positionY,
        orientation: pokemon.orientation
      })

      cells.forEach((cell) => {
        if (cell.value && cell.value.team !== pokemon.team) {
          cell.value.handleSpecialDamage(
            damage,
            board,
            AttackType.SPECIAL,
            pokemon,
            crit
          )
          cell.value.status.triggerBurn(duration, cell.value, pokemon)
          cell.value.status.triggerArmorReduction(duration)
          pokemon.simulation.room.broadcast(Transfer.ABILITY, {
            id: pokemon.simulation.id,
            skill: pokemon.skill,
            positionX: pokemon.positionX,
            positionY: pokemon.positionY,
            targetX: cell.x,
            targetY: cell.y,
            orientation: pokemon.orientation
          })
        }
      })
    }
  }
}

export class BiteStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = [40, 80, 120][pokemon.stars - 1] ?? 120
    const { takenDamage } = target.handleSpecialDamage(
      damage,
      board,
      AttackType.SPECIAL,
      pokemon,
      crit
    )
    pokemon.handleHeal(Math.ceil(0.3 * takenDamage), pokemon, 1)
    if (takenDamage > 0) pokemon.status.triggerFlinch(5000)
  }
}

export class AppleAcidStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const cells = board.getCellsInFront(pokemon, target)
    const damage = [15, 30, 60][pokemon.stars - 1] ?? 60
    cells.forEach((cell) => {
      if (cell.value && cell.value.team !== pokemon.team) {
        cell.value.addDefense(-5, true)
        cell.value.addSpecialDefense(-5, true)
        cell.value.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
      }
    })
  }
}

export class PsybeamStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = [25, 50, 100][pokemon.stars - 1] ?? 25

    effectInLine(board, pokemon, target, (targetInLine) => {
      if (targetInLine != null && targetInLine.team !== pokemon.team) {
        targetInLine.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
        if (chance(0.5)) {
          targetInLine.status.triggerConfusion(4000, targetInLine)
        }
      }
    })
  }
}

export class PresentStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const chance = Math.random()
    /* 80 damage: 40%
       150 damage: 30%
       300 damage: 10%
       heal 80HP: 20%
    */
    if (chance < 0.2) {
      target.handleHeal(80, pokemon, 0)
    } else if (chance < 0.6) {
      target.handleSpecialDamage(80, board, AttackType.SPECIAL, pokemon, crit)
    } else if (chance < 0.9) {
      target.handleSpecialDamage(150, board, AttackType.SPECIAL, pokemon, crit)
    } else {
      target.handleSpecialDamage(300, board, AttackType.SPECIAL, pokemon, crit)
    }
  }
}

export class SacredSwordStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = 100
    target.handleSpecialDamage(damage, board, AttackType.TRUE, pokemon, crit)
  }
}

export class LeafBladeStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, true)
    const damage = Math.round(pokemon.atk * (1 + pokemon.ap / 100))
    target.handleSpecialDamage(
      damage,
      board,
      AttackType.TRUE,
      pokemon,
      true,
      false
    )
  }
}

export class WaterfallStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const shield = pokemon.stars === 3 ? 120 : pokemon.stars === 2 ? 60 : 30
    pokemon.addShield(shield, pokemon, true)
    pokemon.status.clearNegativeStatus()
    board.effects[pokemon.positionY * board.columns + pokemon.positionX] =
      undefined
  }
}

export class XScissorStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = [10, 20, 40, 80][pokemon.stars - 1] ?? 80
    target.handleSpecialDamage(damage, board, AttackType.TRUE, pokemon, crit)
    target.handleSpecialDamage(damage, board, AttackType.TRUE, pokemon, crit) // twice
  }
}

export class DragonTailStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = [30, 60, 100][pokemon.stars - 1] ?? 100
    const buff = [1, 2, 3][pokemon.stars - 1] ?? 3
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
    pokemon.addDefense(buff, true)
    pokemon.addSpecialDefense(buff, true)
  }
}

export class DragonBreathStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = [25, 50, 100][pokemon.stars - 1] ?? 100
    target.handleSpecialDamage(damage, board, AttackType.TRUE, pokemon, crit)
    const secondTarget = board.getValue(target.positionX, target.positionY + 1)
    if (secondTarget && secondTarget != pokemon) {
      secondTarget.handleSpecialDamage(
        damage,
        board,
        AttackType.TRUE,
        pokemon,
        crit
      )
    }
  }
}

export class IcicleCrashStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 20
    if (pokemon.stars === 2) {
      damage = 40
    }
    if (pokemon.stars === 3) {
      damage = 80
    }

    const cells = board.getAdjacentCells(target.positionX, target.positionY)

    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
    cells.forEach((cell) => {
      if (cell.value && pokemon.team != cell.value.team) {
        cell.value.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
      }
    })
  }
}

export class SteamEruptionStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = 80
    const burnDuration = 3000

    const cells = board.getAdjacentCells(target.positionX, target.positionY)
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
    target.status.triggerBurn(burnDuration, target, pokemon)

    cells.forEach((cell) => {
      if (cell.value && pokemon.team != cell.value.team) {
        cell.value.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
        cell.value.status.triggerBurn(burnDuration, cell.value, pokemon)
      }
    })
  }
}

export class RootStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let heal = 0

    switch (pokemon.stars) {
      case 1:
        heal = 20
        break
      case 2:
        heal = 30
        break
      case 3:
        heal = 40
        break
      default:
        break
    }

    const cells = board.getAdjacentCells(pokemon.positionX, pokemon.positionY)
    pokemon.handleHeal(heal, pokemon, 1)

    cells.forEach((cell) => {
      if (cell.value && pokemon.team == cell.value.team) {
        cell.value.handleHeal(heal, pokemon, 1)
      }
    })
  }
}

export class TormentStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let boost = 0

    switch (pokemon.stars) {
      case 1:
        boost = 20
        break
      case 2:
        boost = 40
        break
      case 3:
        boost = 60
        break
      default:
        break
    }
    pokemon.addAttackSpeed(boost, true)
    pokemon.cooldown = 500 / pokemon.atkSpeed
  }
}

export class StompStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damageFactor = 3
    if (pokemon.stars === 2) {
      damageFactor = 4
    } else if (pokemon.stars === 3) {
      damageFactor = 5
    }
    const damage = pokemon.atk * damageFactor
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
  }
}

export class PaybackStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 0
    switch (pokemon.stars) {
      case 1:
        damage = 15
        break
      case 2:
        damage = 30
        break
      case 3:
        damage = 60
        break
      default:
        break
    }
    if (pokemon.life < 0.5 * pokemon.hp) {
      damage *= 2
    }
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
  }
}

export class ShadowBallStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 40
    if (pokemon.stars === 2) {
      damage = 60
    }
    if (pokemon.stars === 3) {
      damage = 100
    }

    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)

    board.forEach((x: number, y: number, v: PokemonEntity | undefined) => {
      if (v && pokemon.team != v.team) {
        v.addSpecialDefense(-1, true)
      }
    })
  }
}

export class BugBuzzStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 0

    switch (pokemon.stars) {
      case 1:
        damage = 20
        break
      case 2:
        damage = 40
        break
      case 3:
        damage = 80
        break
      default:
        break
    }

    if (target.status.paralysis) {
      damage *= 2
    }

    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
  }
}

export class StringShotStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 0

    switch (pokemon.stars) {
      case 1:
        damage = 10
        break
      case 2:
        damage = 20
        break
      case 3:
        damage = 50
        break
      default:
        break
    }

    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
    target.status.triggerParalysis(5000, target)
  }
}

export class EntanglingThreadStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 0

    switch (pokemon.stars) {
      case 1:
        damage = 10
        break
      case 2:
        damage = 20
        break
      case 3:
        damage = 40
        break
      default:
        break
    }

    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
    target.status.triggerParalysis(4000, target)
    const cells = board.getAdjacentCells(pokemon.positionX, pokemon.positionY)
    cells.forEach((cell) => {
      if (cell.value && pokemon.team !== cell.value.team) {
        cell.value.status.triggerParalysis(4000, target)
        cell.value.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
      }
    })
  }
}

export class PoisonStingStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 30
    if (pokemon.stars === 2) {
      damage = 60
    }
    if (pokemon.stars === 3) {
      damage = 120
    }

    if (pokemon.status.poisonStacks > 0) {
      damage = damage * 2
    }

    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
  }
}

export class LeechLifeStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 0

    switch (pokemon.stars) {
      case 1:
        damage = 20
        break
      case 2:
        damage = 40
        break
      case 3:
        damage = 80
        break
      default:
        break
    }

    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
    pokemon.handleHeal(damage, pokemon, 1)
  }
}

export class HappyHourStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let buff = 0
    switch (pokemon.stars) {
      case 1:
        buff = 2
        break
      case 2:
        buff = 5
        break
      case 3:
        buff = 8
        break
      default:
        break
    }
    buff = Math.round(buff * (1 + pokemon.ap / 100))
    board.forEach((x: number, y: number, ally: PokemonEntity | undefined) => {
      if (ally && pokemon.team == ally.team) {
        ally.addAttack(buff, false)
      }
    })
  }
}

export class TeleportStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, false) // crit is handled with TELEPORT_NEXT_ATTACK effect

    const potentialCells = [
      [0, 0],
      [0, board.rows - 1],
      [board.columns - 1, board.rows - 1],
      [board.columns - 1, 0]
    ]
    shuffleArray(potentialCells)

    for (let i = 0; i < potentialCells.length; i++) {
      const entity = board.getValue(potentialCells[i][0], potentialCells[i][1])
      if (entity === undefined) {
        pokemon.moveTo(potentialCells[i][0], potentialCells[i][1], board)
        pokemon.effects.add(Effect.TELEPORT_NEXT_ATTACK)
        break
      }
    }
  }
}

export class NastyPlotStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const buff = 10
    pokemon.addAttack(buff, true)
  }
}

export class SpectralThiefStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const farthestCoordinate = state.getFarthestTargetCoordinateAvailablePlace(
      pokemon,
      board
    )
    const damage = 80
    if (farthestCoordinate) {
      target.handleSpecialDamage(
        damage,
        board,
        AttackType.SPECIAL,
        pokemon,
        crit
      )

      pokemon.moveTo(farthestCoordinate.x, farthestCoordinate.y, board)
      const boostAtk = min(0)(target.atk - target.baseAtk)
      const boostAtkSpeed = min(0)(target.atkSpeed - DEFAULT_ATK_SPEED)
      const boostDef = min(0)(target.def - target.baseSpeDef)
      const boostSpeDef = min(0)(target.speDef - target.baseSpeDef)
      const boostAP = target.ap

      target.atk = target.baseAtk
      target.def = target.baseDef
      target.speDef = target.baseSpeDef
      pokemon.addAttack(boostAtk, false)
      pokemon.addDefense(boostDef, false)
      pokemon.addSpecialDefense(boostSpeDef, false)
      pokemon.addAbilityPower(boostAP, false)
      pokemon.addAttackSpeed(boostAtkSpeed, false)
    }
  }
}

export class ThiefStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 15
    if (pokemon.stars === 2) {
      damage = 30
    }
    if (pokemon.stars === 3) {
      damage = 60
    }

    const l = target.items.size
    target.items.forEach((item) => {
      if (pokemon.items.size < 3) {
        pokemon.items.add(item)
        pokemon.simulation.applyItemEffect(pokemon, item)
      }
      target.items.delete(item)
      if (item === Item.MAX_REVIVE && target.status.resurection) {
        target.status.resurection = false
      }
    })

    // update artificial synergy bonuses
    if (pokemon.effects.has(Effect.DUBIOUS_DISC)) {
      pokemon.addAttack(4 * l, true)
      pokemon.addShield(20 * l, pokemon)
    }

    if (pokemon.effects.has(Effect.LINK_CABLE)) {
      pokemon.addAttack(7 * l, true)
      pokemon.addShield(30 * l, pokemon)
    }

    if (pokemon.effects.has(Effect.GOOGLE_SPECS)) {
      pokemon.addAttack(10 * l, true)
      pokemon.addShield(50 * l, pokemon)
    }

    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
  }
}

export class KnockOffStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = 90 + target.items.size * 30

    target.items.forEach((item) => {
      target.items.delete(item)
      if (item === Item.MAX_REVIVE && target.status.resurection) {
        target.status.resurection = false
      }
    })

    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
  }
}

export class StunSporeStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = [5, 10, 20][pokemon.stars - 1] ?? 20
    board
      .getAdjacentCells(target.positionX, target.positionY)
      .forEach((cell) => {
        if (cell.value && cell.value.team !== pokemon.team) {
          cell.value.handleSpecialDamage(
            damage,
            board,
            AttackType.SPECIAL,
            pokemon,
            crit
          )
          cell.value.status.triggerParalysis(5000, cell.value)
        }
      })
  }
}

export class MeteorMashStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 0

    switch (pokemon.stars) {
      case 1:
        damage = 30
        break
      case 2:
        damage = 50
        break
      case 3:
        damage = 70
        break
      default:
        break
    }

    pokemon.addAttack(5, true)
    const cells = board.getAdjacentCells(pokemon.positionX, pokemon.positionY)

    cells.forEach((cell) => {
      if (cell.value && pokemon.team != cell.value.team) {
        cell.value.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
      }
    })
  }
}

export class HurricaneStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = [25, 50, 100][pokemon.stars - 1] ?? 25

    effectInLine(board, pokemon, target, (targetInLine) => {
      if (targetInLine != null && targetInLine.team !== pokemon.team) {
        targetInLine.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
        targetInLine.status.triggerParalysis(4000, targetInLine)
      }
    })
  }
}

export class FleurCannonStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = 120
    effectInLine(board, pokemon, target, (targetInLine) => {
      if (targetInLine != null && targetInLine.team !== pokemon.team) {
        targetInLine.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
      }
    })
    pokemon.addAbilityPower(-20)
  }
}

export class SandsearStormStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = 80

    effectInLine(board, pokemon, target, (targetInLine) => {
      if (targetInLine != null && targetInLine.team !== pokemon.team) {
        targetInLine.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
        targetInLine.status.triggerBurn(4000, targetInLine, pokemon)
      }
    })
  }
}

export class WildboltStormStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = 80

    effectInLine(board, pokemon, target, (targetInLine) => {
      if (targetInLine != null && targetInLine.team !== pokemon.team) {
        targetInLine.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
        targetInLine.status.triggerParalysis(4000, targetInLine)
      }
    })
  }
}

export class BleakwindStormStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = 80

    effectInLine(board, pokemon, target, (targetInLine) => {
      if (targetInLine != null && targetInLine.team !== pokemon.team) {
        targetInLine.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
        targetInLine.status.triggerFreeze(2000, targetInLine)
      }
    })
  }
}

export class SpringtideStormStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = 80

    effectInLine(board, pokemon, target, (targetInLine) => {
      if (targetInLine != null && targetInLine.team !== pokemon.team) {
        targetInLine.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
        targetInLine.status.triggerCharm(4000, targetInLine, pokemon)
      }
    })
  }
}

export class FakeTearsStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = [3, 6, 9][pokemon.stars - 1] ?? 3

    board.forEach((x: number, y: number, value: PokemonEntity | undefined) => {
      if (value && pokemon.team != value.team) {
        value.status.triggerArmorReduction(3000)
        pokemon.simulation.room.broadcast(Transfer.ABILITY, {
          id: pokemon.simulation.id,
          skill: pokemon.skill,
          positionX: value.positionX,
          positionY: value.positionX,
          orientation: value.orientation
        })
        value.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
      }
    })
  }
}

export class SparklingAriaStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = pokemon.stars === 3 ? 60 : pokemon.stars === 2 ? 30 : 15

    const cells = board.getAdjacentCells(target.positionX, target.positionY)
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
    cells.forEach((cell) => {
      if (cell.value && cell.value.team !== pokemon.team) {
        cell.value.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
      } else if (
        cell.value &&
        cell.value.team === pokemon.team &&
        cell.value.status.burn
      ) {
        cell.value.status.healBurn(cell.value)
      }
    })
  }
}

export class DragonDartsStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = [10, 20, 40][pokemon.stars - 1] ?? 10

    for (let n = 0; n < 3; n++) {
      target.handleSpecialDamage(
        damage,
        board,
        AttackType.SPECIAL,
        pokemon,
        crit
      )
    }
    if (target.life <= 0) {
      pokemon.addPP(40)
    }
  }
}

export class MetronomeStrategy extends AbilityStrategy {
  copyable = false
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)

    const skill = pickRandomIn(
      (Object.keys(Ability) as Ability[]).filter(
        (a) => AbilityStrategies[a].copyable
      )
    )

    pokemon.simulation.room.broadcast(Transfer.ABILITY, {
      id: pokemon.simulation.id,
      skill: skill,
      positionX: pokemon.positionX,
      positionY: pokemon.positionY,
      targetX: target.positionX,
      targetY: target.positionY,
      orientation: pokemon.orientation
    })

    AbilityStrategies[skill].process(pokemon, state, board, target, crit)
  }
}

export class SkyAttackStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit, true)
    const destination = state.getFarthestTargetCoordinateAvailablePlace(
      pokemon,
      board
    )
    if (destination) {
      pokemon.skydiveTo(destination.x, destination.y, board)
      setTimeout(() => {
        pokemon.simulation.room.broadcast(Transfer.ABILITY, {
          id: pokemon.simulation.id,
          skill: Ability.SKY_ATTACK,
          positionX: destination.x,
          positionY: destination.y,
          targetX: destination.target.positionX,
          targetY: destination.target.positionY
        })
      }, 500)

      setTimeout(() => {
        if (destination.target?.hp > 0) {
          const damage = 120
          destination.target.handleSpecialDamage(
            damage,
            board,
            AttackType.SPECIAL,
            pokemon,
            crit
          )
        }
      }, 1000)
    }
  }
}

export class AgilityStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let boost = 0

    switch (pokemon.stars) {
      case 1:
        boost = 10
        break
      case 2:
        boost = 20
        break
      case 3:
        boost = 30
        break
    }

    pokemon.addAttackSpeed(boost, true)
    pokemon.cooldown = 0
  }
}

export class SpiritShackleStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 0
    switch (pokemon.stars) {
      case 1:
        damage = 30
        break
      case 2:
        damage = 60
        break
      case 3:
        damage = 90
        break
      default:
        break
    }

    effectInLine(board, pokemon, target, (targetInLine) => {
      if (targetInLine != null && targetInLine.team !== pokemon.team) {
        targetInLine.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
        targetInLine.status.triggerWound(4000, targetInLine, pokemon)
      }
    })
  }
}

export class WaterShurikenStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 0
    switch (pokemon.stars) {
      case 1:
        damage = 20
        break
      case 2:
        damage = 40
        break
      case 3:
        damage = 60
        break
      default:
        break
    }

    pokemon.orientation = board.orientation(
      pokemon.positionX,
      pokemon.positionY,
      target.positionX,
      target.positionY,
      pokemon,
      target
    )

    const orientations = [
      pokemon.orientation,
      OrientationArray[(OrientationArray.indexOf(pokemon.orientation) + 1) % 8],
      OrientationArray[(OrientationArray.indexOf(pokemon.orientation) + 7) % 8]
    ]

    orientations.forEach((orientation) => {
      effectInLine(board, pokemon, orientation, (targetInLine) => {
        if (targetInLine.team !== pokemon.team) {
          targetInLine.handleSpecialDamage(
            damage,
            board,
            AttackType.SPECIAL,
            pokemon,
            crit
          )
        }
      })
    })
  }
}

export class ShadowSneakStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = 50
    const damageType = target.status.silence
      ? AttackType.TRUE
      : AttackType.SPECIAL
    target.handleSpecialDamage(damage, board, damageType, pokemon, crit)
  }
}

export class PlasmaFistStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = 120
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
    pokemon.handleHeal(damage * 0.25, pokemon, 1)
  }
}

export class ForecastStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    board.forEach((x: number, y: number, p: PokemonEntity | undefined) => {
      if (p && pokemon.team === p.team) {
        p.addShield(10, pokemon, true)
        if (pokemon.name === Pkm.CASTFORM_SUN) {
          p.addAttack(3, true)
        }
        if (pokemon.name === Pkm.CASTFORM_RAIN) {
          p.addPP(Math.round(10 * (1 + pokemon.ap / 100)))
        }
        if (pokemon.name === Pkm.CASTFORM_HAIL) {
          p.addDefense(2, true)
          p.addSpecialDefense(2, true)
        }
      }
    })
  }
}

export class MachPunchStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = 50
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
    pokemon.cooldown = 100
  }
}

export class UppercutStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 60
    if (pokemon.def > target.def) damage *= 2
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
  }
}

export class MawashiGeriStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 60
    if (pokemon.atk > target.atk) damage *= 2
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
  }
}

export class TripleKickStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = 60

    const cells = board.getAdjacentCells(pokemon.positionX, pokemon.positionY)
    let count = 0
    cells.forEach((cell) => {
      if (cell.value && pokemon.team !== cell.value.team) {
        count++
        if (count <= 3) {
          cell.value.handleSpecialDamage(
            damage,
            board,
            AttackType.SPECIAL,
            pokemon,
            crit,
            true
          )
        }
      }
    })
  }
}

export class GeomancyStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    pokemon.addAttack(15, true)
    pokemon.addSpecialDefense(5, true)
    pokemon.addAttackSpeed(20, false)
  }
}

export class DeathWingStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = 150
    const { takenDamage } = target.handleSpecialDamage(
      damage,
      board,
      AttackType.SPECIAL,
      pokemon,
      crit
    )
    if (takenDamage > 0) {
      pokemon.handleHeal(Math.round(0.75 * takenDamage), pokemon, 0)
    }
  }
}

export class MimicStrategy extends AbilityStrategy {
  copyable = false
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    if (AbilityStrategies[target.skill].copyable) {
      AbilityStrategies[target.skill].process(
        pokemon,
        state,
        board,
        target,
        crit
      )
    }
  }
}

export class HexStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = pokemon.stars === 3 ? 80 : pokemon.stars === 2 ? 40 : 20
    if (
      target.status.burn ||
      target.status.confusion ||
      target.status.freeze ||
      target.status.paralysis ||
      target.status.poisonStacks > 0 ||
      target.status.silence ||
      target.status.sleep ||
      target.status.wound
    ) {
      damage = damage * 2
    }
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
  }
}

export class GrowthStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)

    const attackBuff = Math.floor(10 * (1 + pokemon.ap / 100))
    pokemon.addAttack(attackBuff)

    if (pokemon.simulation.weather === Weather.SUN) {
      pokemon.addAttack(attackBuff) // grows twice as fast if sunny weather
    }
  }
}

export class HealOrderStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const cells = board.getAdjacentCells(pokemon.positionX, pokemon.positionY)
    const damage = pokemon.stars === 3 ? 65 : pokemon.stars === 2 ? 45 : 25

    cells.forEach((cell) => {
      if (cell.value) {
        if (cell.value.team !== pokemon.team) {
          cell.value.count.attackOrderCount++
          cell.value.handleSpecialDamage(
            damage,
            board,
            AttackType.SPECIAL,
            pokemon,
            crit
          )
        } else {
          cell.value.count.healOrderCount++
          cell.value.handleHeal(damage, pokemon, 1)
        }
      }
    })
  }
}

export class ShellTrapStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    pokemon.effects.add(Effect.SHELL_TRAP)
  }
}

export class DigStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = pokemon.stars === 3 ? 40 : pokemon.stars === 2 ? 20 : 10

    const farthestCoordinate = state.getFarthestTargetCoordinateAvailablePlace(
      pokemon,
      board
    )

    if (farthestCoordinate) {
      const cells = board.getCellsBetween(
        pokemon.positionX,
        pokemon.positionY,
        farthestCoordinate.x,
        farthestCoordinate.y
      )
      cells.forEach((cell) => {
        if (cell.value && cell.value.team != pokemon.team) {
          cell.value.handleSpecialDamage(
            damage,
            board,
            AttackType.SPECIAL,
            pokemon,
            crit
          )
        }
      })

      pokemon.moveTo(farthestCoordinate.x, farthestCoordinate.y, board)
    }
  }
}

export class FireSpinStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = [20, 40, 80][pokemon.stars - 1] ?? 80
    const cells = board.getAdjacentCells(target.positionX, target.positionY)
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
    target.status.triggerBurn(3000, target, pokemon)
    cells.forEach((cell) => {
      if (cell.value && pokemon.team != cell.value.team) {
        cell.value.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
        cell.value.status.triggerBurn(3000, target, pokemon)
      }
    })
  }
}

export class SearingShotStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = 40
    const cells = board.getCellsInRadius(
      pokemon.positionX,
      pokemon.positionY,
      2
    )
    cells.forEach((cell) => {
      if (cell.value && pokemon.team != cell.value.team) {
        cell.value.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
        cell.value.status.triggerBurn(3000, target, pokemon)
      }
    })
  }
}

export class PeckStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = [10, 20, 30][pokemon.stars - 1] ?? 30
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
  }
}

export class SplashStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    // does nothing, intentionally
  }
}

export class CounterStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = Math.max(0, pokemon.hp - pokemon.life)
    const cells = board.getAdjacentCells(pokemon.positionX, pokemon.positionY)

    cells.forEach((cell) => {
      if (cell.value && cell.value.team !== pokemon.team) {
        cell.value.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
      }
    })
  }
}

export class PoisonPowderStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 30
    if (pokemon.stars === 2) {
      damage = 60
    }
    if (pokemon.stars === 3) {
      damage = 120
    }

    const farthestCoordinate = state.getFarthestTargetCoordinateAvailablePlace(
      pokemon,
      board
    )

    if (farthestCoordinate) {
      const cells = board.getCellsBetween(
        pokemon.positionX,
        pokemon.positionY,
        farthestCoordinate.x,
        farthestCoordinate.y
      )
      cells.forEach((cell) => {
        if (cell.value && cell.value.team != pokemon.team) {
          cell.value.status.triggerPoison(5000, target, pokemon)
          cell.value.handleSpecialDamage(
            damage,
            board,
            AttackType.SPECIAL,
            pokemon,
            crit
          )
        }
      })

      pokemon.moveTo(farthestCoordinate.x, farthestCoordinate.y, board)
    }
  }
}

export class SilverWindStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)

    let damage = 30
    if (pokemon.stars === 2) {
      damage = 60
    }
    if (pokemon.stars === 3) {
      damage = 120
    }

    const farthestCoordinate = state.getFarthestTargetCoordinateAvailablePlace(
      pokemon,
      board
    )

    pokemon.addAttack(1)
    pokemon.addDefense(1)
    pokemon.addSpecialDefense(1)
    pokemon.addAttackSpeed(10)
    pokemon.addAbilityPower(10)

    if (farthestCoordinate) {
      const cells = board.getCellsBetween(
        pokemon.positionX,
        pokemon.positionY,
        farthestCoordinate.x,
        farthestCoordinate.y
      )
      cells.forEach((cell) => {
        if (cell.value && cell.value.team != pokemon.team) {
          cell.value.handleSpecialDamage(
            damage,
            board,
            AttackType.SPECIAL,
            pokemon,
            crit
          )
        }
      })

      pokemon.moveTo(farthestCoordinate.x, farthestCoordinate.y, board)
    }
  }
}

export class IcyWindStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = pokemon.stars === 3 ? 120 : pokemon.stars === 2 ? 60 : 30
    const debuff = pokemon.stars === 3 ? 40 : pokemon.stars === 2 ? 20 : 10
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
    target.addAttackSpeed(-debuff)
  }
}

export class GigatonHammerStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 100
    if (pokemon.stars === 2) {
      damage = 200
    }
    if (pokemon.stars === 3) {
      damage = 400
    }
    pokemon.status.triggerSilence(6000, pokemon)
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
  }
}

export class AcrobaticsStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 20
    if (pokemon.stars === 2) {
      damage = 40
    }
    if (pokemon.stars === 3) {
      damage = 80
    }
    if (pokemon.items.size === 0) {
      damage *= 2
    }
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
  }
}

export class AbsorbStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = 30
    if (pokemon.stars === 2) {
      damage = 60
    }
    if (pokemon.stars === 3) {
      damage = 120
    }
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
    pokemon.handleHeal(damage * 0.1, pokemon, 1)

    const cells = board.getAdjacentCells(pokemon.positionX, pokemon.positionY)
    cells.forEach((cell) => {
      if (cell.value && cell.value.team === pokemon.team) {
        cell.value.handleHeal(damage * 0.1, pokemon, 1)
      }
    })
  }
}

export class RolloutStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const multiplier = 5
    const defenseBoost = 5

    pokemon.addDefense(defenseBoost, true)
    target.handleSpecialDamage(
      multiplier * pokemon.def,
      board,
      AttackType.SPECIAL,
      pokemon,
      crit
    )
  }
}

export class ThrashStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    pokemon.addAttack(pokemon.baseAtk, true)
    pokemon.status.triggerConfusion(3000, pokemon)
  }
}

export class MagmaStormStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    target.status.triggerMagmaStorm(target, pokemon)
  }
}

export class SlashingClawStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = pokemon.stars === 3 ? 60 : pokemon.stars === 2 ? 30 : 15
    if (target.status.wound) {
      damage = Math.ceil(damage * 1.3)
    }
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
    target.status.triggerWound(5000, target, pokemon)
  }
}

export class EruptionStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = pokemon.stars === 3 ? 100 : pokemon.stars === 2 ? 50 : 30
    const numberOfProjectiles =
      pokemon.stars === 3 ? 40 : pokemon.stars === 2 ? 30 : 20

    for (let i = 0; i < numberOfProjectiles; i++) {
      const x = randomBetween(0, BOARD_WIDTH - 1)
      const y = randomBetween(0, BOARD_HEIGHT - 1)
      const value = board.getValue(y, x)
      if (value && value.team !== pokemon.team) {
        value.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
      }
      pokemon.simulation.room.broadcast(Transfer.ABILITY, {
        id: pokemon.simulation.id,
        skill: Ability.ERUPTION,
        positionX: pokemon.positionX,
        positionY: pokemon.positionY,
        targetX: x,
        targetY: y
      })
    }

    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
    target.status.triggerBurn(5000, target, pokemon)
  }
}

export class MistBallStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = 30

    effectInLine(board, pokemon, target, (targetInLine) => {
      if (
        targetInLine != null &&
        targetInLine.team !== pokemon.team &&
        distanceC(
          pokemon.positionX,
          pokemon.positionY,
          targetInLine.positionX,
          targetInLine.positionY
        ) <= 4
      ) {
        targetInLine.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
        targetInLine.addAbilityPower(-30)
      }
    })

    pokemon.simulation.room.clock.setTimeout(() => {
      effectInLine(board, pokemon, target, (targetInLine) => {
        if (targetInLine != null && targetInLine.team !== pokemon.team) {
          targetInLine.handleSpecialDamage(
            damage,
            board,
            AttackType.SPECIAL,
            pokemon,
            crit
          )
          targetInLine.addAbilityPower(-30)
        }
      })
    }, 1000)
  }
}

export class LusterPurgeStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = 30

    effectInLine(board, pokemon, target, (targetInLine) => {
      if (
        targetInLine != null &&
        targetInLine.team !== pokemon.team &&
        distanceC(
          pokemon.positionX,
          pokemon.positionY,
          targetInLine.positionX,
          targetInLine.positionY
        ) <= 4
      ) {
        targetInLine.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
        targetInLine.addSpecialDefense(-3)
      }
    })

    pokemon.simulation.room.clock.setTimeout(() => {
      effectInLine(board, pokemon, target, (targetInLine) => {
        if (targetInLine != null && targetInLine.team !== pokemon.team) {
          targetInLine.handleSpecialDamage(
            damage,
            board,
            AttackType.SPECIAL,
            pokemon,
            crit
          )
          targetInLine.addSpecialDefense(-3)
        }
      })
    }, 1000)
  }
}

export class MudBubbleStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const heal = pokemon.stars === 3 ? 40 : pokemon.stars === 2 ? 20 : 10
    pokemon.handleHeal(heal, pokemon, 1)
  }
}

export class LinkCableStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const farthestTarget = state.getFarthestTarget(pokemon, board)
    const farthestCoordinate = state.getFarthestTargetCoordinateAvailablePlace(
      pokemon,
      board
    )

    if (farthestCoordinate && farthestTarget) {
      pokemon.moveTo(farthestCoordinate.x, farthestCoordinate.y, board)
      pokemon.targetX = farthestTarget.positionX
      pokemon.targetY = farthestTarget.positionY
    }

    pokemon.simulation.room.clock.setTimeout(() => {
      if (pokemon.life <= 0) return
      const partner = board.find(
        (x, y, entity) =>
          entity.skill === Ability.LINK_CABLE &&
          entity.id !== pokemon.id &&
          entity.team === pokemon.team
      )
      if (partner) {
        const damage = 50
        const targetsHit = new Set<PokemonEntity>()
        effectInLine(board, pokemon, partner, (targetInLine) => {
          if (targetInLine != null && targetInLine.team !== pokemon.team) {
            targetsHit.add(targetInLine)
          }
        })
        board
          .getAdjacentCells(pokemon.positionX, pokemon.positionY)
          .forEach((cell) => {
            if (cell.value && cell.value.team !== pokemon.team) {
              targetsHit.add(cell.value)
            }
          })
        board
          .getAdjacentCells(partner.positionX, partner.positionY)
          .forEach((cell) => {
            if (cell.value && cell.value.team !== pokemon.team) {
              targetsHit.add(cell.value)
            }
          })

        targetsHit.forEach((target) => {
          target.handleSpecialDamage(
            damage,
            board,
            AttackType.SPECIAL,
            pokemon,
            crit
          )
        })
        pokemon.simulation.room.broadcast(Transfer.ABILITY, {
          id: pokemon.simulation.id,
          skill: "LINK_CABLE_link",
          positionX: pokemon.positionX,
          positionY: pokemon.positionY,
          targetX: partner.positionX,
          targetY: partner.positionY
        })
        pokemon.simulation.room.broadcast(Transfer.ABILITY, {
          id: pokemon.simulation.id,
          skill: "LINK_CABLE_discharge",
          positionX: pokemon.positionX,
          positionY: pokemon.positionY,
          targetX: pokemon.targetX,
          targetY: pokemon.targetY
        })
        pokemon.simulation.room.broadcast(Transfer.ABILITY, {
          id: pokemon.simulation.id,
          skill: "LINK_CABLE_discharge",
          positionX: partner.positionX,
          positionY: partner.positionY,
          targetX: partner.targetX,
          targetY: partner.targetY
        })
      } else {
        const damage = 50
        const cells = board.getAdjacentCells(
          pokemon.positionX,
          pokemon.positionY
        )
        cells.forEach((cell) => {
          if (cell.value && cell.value.team !== pokemon.team) {
            cell.value.handleSpecialDamage(
              damage,
              board,
              AttackType.SPECIAL,
              pokemon,
              crit
            )
          }
        })
        pokemon.simulation.room.broadcast(Transfer.ABILITY, {
          id: pokemon.simulation.id,
          skill: "LINK_CABLE_discharge",
          positionX: pokemon.positionX,
          positionY: pokemon.positionY,
          targetX: pokemon.targetX,
          targetY: pokemon.targetY
        })
      }
    }, 300)
  }
}

export class MagicBounceStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    pokemon.status.triggerMagicBounce(5000)
  }
}

export class ShellSmashStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = pokemon.stars === 1 ? 15 : 30
    const cells = board.getAdjacentCells(pokemon.positionX, pokemon.positionY)
    cells.forEach((cell) => {
      if (cell && cell.value && cell.value.team !== pokemon.team) {
        cell.value.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
      }
    })
    pokemon.addAbilityPower(20, false)
    pokemon.addAttack(2, false)
    pokemon.addAttackSpeed(20, false)
    pokemon.addDefense(-1, false)
    pokemon.addSpecialDefense(-1, false)
  }
}

export class HelpingHandStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const buffs = pokemon.stars === 3 ? 6 : pokemon.stars === 2 ? 4 : 2
    const allies = new Array<{ pkm: PokemonEntity; distance: number }>()
    board.forEach((x, y, cell) => {
      if (cell && cell.team === pokemon.team && pokemon.id !== cell.id) {
        allies.push({
          pkm: cell,
          distance: distanceM(
            pokemon.positionX,
            pokemon.positionY,
            cell.positionX,
            cell.positionY
          )
        })
      }
    })
    allies.sort((a, b) => a.distance - b.distance)
    for (let i = 0; i < buffs; i++) {
      const ally = allies[i]?.pkm
      if (ally) {
        ally.status.doubleDamage = true
        ally.simulation.room.broadcast(Transfer.ABILITY, {
          id: pokemon.simulation.id,
          skill: Ability.HELPING_HAND,
          positionX: ally.positionX,
          positionY: ally.positionY
        })
      }
    }
  }
}

export class AstralBarrageStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damagePerGhost = 20

    const enemies: PokemonEntity[] = []
    board.forEach((x: number, y: number, tg: PokemonEntity | undefined) => {
      if (tg && pokemon.team != tg.team) {
        enemies.push(tg)
      }
    })

    const nbGhosts = 3 * (1 + (2 * pokemon.ap) / 100)
    for (let i = 0; i < nbGhosts; i++) {
      const randomTarget = pickRandomIn(enemies)
      setTimeout(() => {
        pokemon.simulation.room.broadcast(Transfer.ABILITY, {
          id: pokemon.simulation.id,
          skill: Ability.ASTRAL_BARRAGE,
          positionX: pokemon.positionX,
          positionY: pokemon.positionY,
          targetX: randomTarget.positionX,
          targetY: randomTarget.positionY,
          orientation: pokemon.orientation
        })
        if (randomTarget?.life > 0) {
          randomTarget.handleSpecialDamage(
            damagePerGhost,
            board,
            AttackType.SPECIAL,
            pokemon,
            crit
          )
        }
      }, 100 * i)
    }
  }
}

export class PyroBallStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit, true)
    const damage = pokemon.stars === 3 ? 40 : pokemon.stars === 2 ? 20 : 10

    const farthestTarget = state.getFarthestTarget(pokemon, board) ?? target
    pokemon.simulation.room.broadcast(Transfer.ABILITY, {
      id: pokemon.simulation.id,
      skill: pokemon.skill,
      positionX: pokemon.positionX,
      positionY: pokemon.positionY,
      targetX: farthestTarget.positionX,
      targetY: farthestTarget.positionY,
      orientation: pokemon.orientation
    })

    const cells = board.getCellsBetween(
      pokemon.positionX,
      pokemon.positionY,
      farthestTarget.positionX,
      farthestTarget.positionY
    )
    cells.forEach((cell) => {
      if (cell.value && cell.value.team != pokemon.team) {
        cell.value.status.triggerBurn(2000, cell.value, pokemon)
        cell.value.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
      }
    })
  }
}

export class WhirlpoolStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    const farthestTarget = state.getFarthestTarget(pokemon, board) ?? target
    super.process(pokemon, state, board, farthestTarget, crit, true)

    const cells = board.getCellsBetween(
      pokemon.positionX,
      pokemon.positionY,
      farthestTarget.positionX,
      farthestTarget.positionY
    )
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i]
      if (cell && cell.value && cell.value.team !== pokemon.team) {
        pokemon.simulation.room.broadcast(Transfer.ABILITY, {
          id: pokemon.simulation.id,
          skill: pokemon.skill,
          positionX: pokemon.positionX,
          positionY: pokemon.positionY,
          targetX: cell.x,
          targetY: cell.y,
          orientation: pokemon.orientation
        })
        for (let i = 0; i < 4; i++) {
          cell.value.handleSpecialDamage(
            Math.ceil(pokemon.atk * 1.25),
            board,
            AttackType.PHYSICAL,
            pokemon,
            crit
          )
        }
        break
      }
    }
  }
}

export class AnchorShotStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    const damage = pokemon.stars === 3 ? 80 : pokemon.stars === 2 ? 40 : 20
    const farthestTarget = state.getFarthestTarget(pokemon, board) ?? target
    super.process(pokemon, state, board, farthestTarget, crit, true)
    const adjacentCells = board.getAdjacentCells(
      pokemon.positionX,
      pokemon.positionY
    )
    const potentials = shuffleArray(
      adjacentCells
        .filter((v) => v.value === undefined)
        .map((v) => ({ x: v.x, y: v.y }))
    )
    if (potentials.length > 0) {
      const potential = potentials[0]
      pokemon.simulation.room.broadcast(Transfer.ABILITY, {
        id: pokemon.simulation.id,
        skill: Ability.ANCHOR_SHOT,
        targetX: farthestTarget.positionX,
        targetY: farthestTarget.positionY
      })
      farthestTarget.moveTo(potential.x, potential.y, board)
      farthestTarget.handleSpecialDamage(
        damage,
        board,
        AttackType.SPECIAL,
        pokemon,
        crit
      )
    }
  }
}

export class SmogStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const cells = board.getCellsInFront(pokemon, target)
    const damage = pokemon.stars === 1 ? 10 : pokemon.stars === 2 ? 20 : 40

    cells.forEach((cell) => {
      const index = cell.y * board.columns + cell.x
      if (board.effects[index] !== Effect.GAS) {
        board.effects[index] = Effect.GAS
        pokemon.simulation.room.broadcast(Transfer.BOARD_EVENT, {
          simulationId: pokemon.simulation.id,
          type: BoardEvent.GAS,
          x: cell.x,
          y: cell.y
        })
      }

      if (cell.value) {
        cell.value.effects.add(Effect.GAS)
        if (cell.value.team !== pokemon.team) {
          cell.value.handleSpecialDamage(
            damage,
            board,
            AttackType.SPECIAL,
            pokemon,
            crit
          )
        }
      }
    })
  }
}

export class MagnetRiseStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit, true)
    const cells = board
      .getAdjacentCells(pokemon.positionX, pokemon.positionY)
      .filter((cell) => cell.value && cell.value.team === pokemon.team)
      .sort((a, b) => a.value!.life - b.value!.life)

    for (
      let i = 0;
      i < (pokemon.stars === 3 ? 6 : pokemon.stars === 2 ? 4 : 2);
      i++
    ) {
      const cell = cells.shift()
      if (cell && cell.value) {
        cell.value.status.triggerProtect(2000)
        pokemon.simulation.room.broadcast(Transfer.ABILITY, {
          id: cell.value.simulation.id,
          skill: Ability.MAGNET_RISE,
          positionX: cell.value.positionX,
          positionY: cell.value.positionY
        })
      }
    }
  }
}

export class AttractStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit, true)
    const targets = pickNRandomIn(
      board.cells.filter((v) => v && v.team !== pokemon.team),
      pokemon.stars
    )
    targets?.forEach((t) => {
      if (t) {
        pokemon.simulation.room.broadcast(Transfer.ABILITY, {
          id: pokemon.simulation.id,
          skill: Ability.ATTRACT,
          positionX: t.positionX,
          positionY: t.positionY
        })
        t?.status.triggerCharm(1000, t, pokemon, true)
      }
    })
  }
}

export class WaterPulseStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = [75, 150][pokemon.stars - 1] ?? 75
    board
      .getAdjacentCells(target.positionX, target.positionY)
      .map((v) => v.value)
      .filter((v) => v?.team === target.team)
      .concat(target)
      .forEach((v) => {
        if (v) {
          v.status.triggerConfusion(2000, v)
          v.handleSpecialDamage(
            damage,
            board,
            AttackType.SPECIAL,
            pokemon,
            crit
          )
        }
      })
  }
}

export class PlayRoughStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    target.status.triggerCharm(2500, target, pokemon, false)
    target.handleSpecialDamage(
      pokemon.stars === 3 ? 120 : pokemon.stars === 2 ? 60 : 30,
      board,
      AttackType.SPECIAL,
      pokemon,
      crit
    )
  }
}

export class AerialAceStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = [25, 50, 100][pokemon.stars - 1] ?? 100
    target.handleSpecialDamage(damage, board, AttackType.TRUE, pokemon, crit)
  }
}

export class ParabolicChargeStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const heal = pokemon.stars > 1 ? 50 : 25
    const overHeal = Math.max(0, heal + pokemon.life - pokemon.hp)
    pokemon.handleHeal(heal, pokemon, 0)
    target.handleSpecialDamage(
      (pokemon.stars === 3 ? 100 : pokemon.stars === 2 ? 50 : 25) + overHeal,
      board,
      AttackType.SPECIAL,
      pokemon,
      crit
    )
  }
}

export class SuperFangStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = pokemon.stars === 3 ? 90 : pokemon.stars === 2 ? 60 : 30
    if (target.types.has(Synergy.GRASS)) {
      damage *= 2
    }
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
  }
}

export class TeeterDanceStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    board.cells
      .filter((v) => v !== undefined)
      .forEach((v) => v && v.status.triggerConfusion(3000, v))
  }
}

export class CloseCombatStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    pokemon.addDefense(-3, false)
    pokemon.addSpecialDefense(-3, false)
    target.handleSpecialDamage(130, board, AttackType.SPECIAL, pokemon, crit)
  }
}

export class AssistStrategy extends AbilityStrategy {
  copyable = false
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit, true)
    const skill = pickRandomIn(
      board.cells
        .filter(
          (v) =>
            v &&
            v.team === pokemon.team &&
            v.skill &&
            AbilityStrategies[v.skill].copyable
        )
        .map((v) => v?.skill)
    )
    if (skill) {
      pokemon.simulation.room.broadcast(Transfer.ABILITY, {
        id: pokemon.simulation.id,
        skill: skill,
        positionX: pokemon.positionX,
        positionY: pokemon.positionY,
        targetX: target.positionX,
        targetY: target.positionY,
        orientation: pokemon.orientation
      })
      AbilityStrategies[skill].process(pokemon, state, board, target, crit)
    }
  }
}

export class FissureStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit, true)
    const numberOfRifts = pokemon.stars === 3 ? 4 : pokemon.stars === 2 ? 3 : 2
    for (let i = 0; i < numberOfRifts; i++) {
      const x_ = randomBetween(0, BOARD_WIDTH - 1)
      const y_ = randomBetween(0, BOARD_HEIGHT - 1)
      const cells = board.getAdjacentCells(x_, y_)
      cells.push({ x: x_, y: y_, value: board.getValue(x_, y_) })

      cells.forEach((cell) => {
        if (cell && cell.value && cell.value.team !== pokemon.team) {
          cell.value.handleSpecialDamage(
            pokemon.stars === 3 ? 75 : pokemon.stars === 2 ? 50 : 25,
            board,
            AttackType.SPECIAL,
            pokemon,
            crit
          )
        }
        pokemon.simulation.room.broadcast(Transfer.ABILITY, {
          id: pokemon.simulation.id,
          skill: Ability.FISSURE,
          positionX: pokemon.positionX,
          positionY: pokemon.positionY,
          targetX: cell.x,
          targetY: cell.y
        })
      })
    }
  }
}

export class AssuranceStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = pokemon.stars === 3 ? 100 : pokemon.stars === 2 ? 50 : 25

    target.handleSpecialDamage(
      pokemon.life / pokemon.hp < 0.5 ? damage * 2 : damage,
      board,
      AttackType.SPECIAL,
      pokemon,
      crit
    )
  }
}

export class AquaRingStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const mostSurroundedCoordinate =
      state.getMostSurroundedCoordinateAvailablePlace(target, board)
    if (mostSurroundedCoordinate) {
      pokemon.moveTo(
        mostSurroundedCoordinate.x,
        mostSurroundedCoordinate.y,
        board
      )

      const cells = board.getAdjacentCells(
        mostSurroundedCoordinate.x,
        mostSurroundedCoordinate.y
      )
      cells.push({
        x: mostSurroundedCoordinate.x,
        y: mostSurroundedCoordinate.y,
        value: board.getValue(
          mostSurroundedCoordinate.x,
          mostSurroundedCoordinate.y
        )
      })

      cells.forEach((cell) => {
        if (cell.value && cell.value.team === pokemon.team) {
          cell.value.status.clearNegativeStatus()
          cell.value.handleHeal(
            pokemon.stars === 3 ? 50 : pokemon.stars === 2 ? 30 : 20,
            pokemon,
            1
          )
        }
      })
    }
  }
}

export class LungeStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const enemiesSortedByAttack = board.cells
      .filter((enemy) => enemy && enemy.team !== pokemon.team)
      .sort((a, b) => b!.atk - a!.atk) as PokemonEntity[]

    let cellToGo: Cell | undefined
    let enemy: PokemonEntity | undefined
    while (cellToGo == null && enemiesSortedByAttack.length > 0) {
      enemy = enemiesSortedByAttack.shift()
      if (enemy) {
        cellToGo = board
          .getAdjacentCells(enemy.positionX, enemy.positionY)
          .find((cell) => cell.value == null)
      }
    }

    if (cellToGo) {
      pokemon.moveTo(cellToGo.x, cellToGo.y, board)
      if (enemy) {
        enemy.addAttack(-5, true)
        enemy.handleSpecialDamage(
          50,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit,
          true
        )
      }
    }
  }
}

export class PoisonGasStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = [15, 30, 60][pokemon.stars - 1] ?? 60

    const cells = board.getAdjacentCells(pokemon.positionX, pokemon.positionY)
    cells.forEach((cell) => {
      const index = cell.y * board.columns + cell.x
      if (board.effects[index] !== Effect.POISON_GAS) {
        board.effects[index] = Effect.POISON_GAS
        pokemon.simulation.room.broadcast(Transfer.BOARD_EVENT, {
          simulationId: pokemon.simulation.id,
          type: BoardEvent.POISON_GAS,
          x: cell.x,
          y: cell.y
        })
      }

      if (cell.value) {
        cell.value.effects.add(Effect.POISON_GAS)
        if (cell.value.team !== pokemon.team) {
          cell.value.handleSpecialDamage(
            damage,
            board,
            AttackType.SPECIAL,
            pokemon,
            crit
          )
          cell.value.status.triggerPoison(3000, cell.value, pokemon)
        }
      }
    })
  }
}

export class BraveBirdStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const flyAwayCell = board.getFlyAwayCell(
      pokemon.positionX,
      pokemon.positionY
    )
    if (flyAwayCell) {
      pokemon.moveTo(flyAwayCell.x, flyAwayCell.y, board)
      const adjacentEmptyCells = board
        .getAdjacentCells(flyAwayCell.x, flyAwayCell.y)
        .filter((v) => v.value === undefined)
      if (adjacentEmptyCells.length > 0) {
        const cell = adjacentEmptyCells[0]
        target.moveTo(cell.x, cell.y, board)
        target.handleSpecialDamage(
          pokemon.stars === 3 ? 90 : pokemon.stars === 2 ? 60 : 30,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
      }
    }
  }
}

export class MagicalLeafStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    const damage = pokemon.stars === 3 ? 40 : pokemon.stars === 2 ? 20 : 10
    const farthestTarget = state.getFarthestTarget(pokemon, board) ?? target
    super.process(pokemon, state, board, farthestTarget, crit)

    const cells = board.getCellsBetween(
      pokemon.positionX,
      pokemon.positionY,
      farthestTarget.positionX,
      farthestTarget.positionY
    )
    cells.forEach((cell) => {
      if (cell.value && cell.value.team != pokemon.team) {
        cell.value.status.triggerArmorReduction(3000)
        cell.value.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
      }
    })
  }
}

export class StealthRocksStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const cells = board.getCellsInFront(pokemon, target, 2)
    const damage = 50

    cells.forEach((cell) => {
      const index = cell.y * board.columns + cell.x
      if (board.effects[index] !== Effect.STEALTH_ROCKS) {
        board.effects[index] = Effect.STEALTH_ROCKS
        pokemon.simulation.room.broadcast(Transfer.BOARD_EVENT, {
          simulationId: pokemon.simulation.id,
          type: BoardEvent.STEALTH_ROCKS,
          x: cell.x,
          y: cell.y
        })
      }

      pokemon.simulation.room.broadcast(Transfer.ABILITY, {
        id: pokemon.simulation.id,
        skill: Ability.STEALTH_ROCKS,
        positionX: cell.x,
        positionY: cell.y
      })

      if (cell.value && cell.value.team !== pokemon.team) {
        cell.value.effects.add(Effect.STEALTH_ROCKS)
        cell.value.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
      }
    })
  }
}

export class StickyWebStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const cells = board.getCellsInFront(pokemon, target, 2)
    const damage = pokemon.stars === 3 ? 70 : pokemon.stars === 2 ? 35 : 20

    cells.forEach((cell) => {
      const index = cell.y * board.columns + cell.x
      if (board.effects[index] !== Effect.STICKY_WEB) {
        board.effects[index] = Effect.STICKY_WEB
        pokemon.simulation.room.broadcast(Transfer.BOARD_EVENT, {
          simulationId: pokemon.simulation.id,
          type: BoardEvent.STICKY_WEB,
          x: cell.x,
          y: cell.y
        })
      }

      pokemon.simulation.room.broadcast(Transfer.ABILITY, {
        id: pokemon.simulation.id,
        skill: Ability.STICKY_WEB,
        positionX: cell.x,
        positionY: cell.y
      })

      if (cell.value && cell.value.team !== pokemon.team) {
        cell.value.effects.add(Effect.STICKY_WEB)
        cell.value.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
      }
    })
  }
}

export class StruggleBugStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)

    const cells = board.getAdjacentCells(pokemon.positionX, pokemon.positionY)

    cells.forEach((cell) => {
      if (cell.value && cell.value.team !== pokemon.team) {
        cell.value.addAbilityPower(-50, false)
        cell.value.handleSpecialDamage(
          30,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
      }
    })
  }
}

export class TailGlowStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)

    const cells = board.getAdjacentCells(pokemon.positionX, pokemon.positionY)

    pokemon.addAbilityPower(50, false)
    cells.forEach((cell) => {
      if (cell.value && cell.value.team !== pokemon.team) {
        cell.value.handleSpecialDamage(
          30,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
      }
    })
  }
}

export class PrismaticLaserStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const affectedCells = board.cells.filter(
      (v) =>
        v &&
        v.team !== pokemon.team &&
        (v.positionX === pokemon.positionX ||
          v.positionX === pokemon.positionX - 1 ||
          v.positionX === pokemon.positionX + 1)
    )

    affectedCells.forEach((tg) => {
      if (tg) {
        tg.handleSpecialDamage(80, board, AttackType.SPECIAL, pokemon, crit)
        const teleportationCell = board.getTeleportationCell(
          tg.positionX,
          tg.positionY
        )
        if (teleportationCell) {
          tg.moveTo(teleportationCell.x, teleportationCell.y, board)
        } else {
          logger.error("unable to teleport pokemon", tg)
        }
      }
    })
  }
}

export class NightShadeStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = Math.ceil(
      ([0.25, 0.33, 0.5][pokemon.stars - 1] ?? 0.5) *
        target.hp *
        (1 + (0.5 * pokemon.ap) / 100)
    )
    target.handleSpecialDamage(damage, board, AttackType.TRUE, pokemon, crit)
  }
}

export class ChargeBeamStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit, false)
    const chain = [target]
    const NB_MAX_TARGETS = 3
    for (
      let n = 1, x = target.positionX, y = target.positionY;
      n < NB_MAX_TARGETS;
      n++
    ) {
      const nextCell = board
        .getAdjacentCells(x, y)
        .find(
          (cell) =>
            cell.value &&
            cell.value.team === target.team &&
            !chain.includes(cell.value)
        )
      if (nextCell) {
        chain.push(nextCell.value!)
        x = nextCell.x
        y = nextCell.y
      }
    }

    for (let i = 0; i < chain.length; i++) {
      const damage = [15, 30, 60][pokemon.stars - 1] ?? 60
      chain[i].handleSpecialDamage(
        damage,
        board,
        AttackType.SPECIAL,
        pokemon,
        crit
      )
      const previous = i === 0 ? pokemon : chain[i - 1]
      pokemon.simulation.room.broadcast(Transfer.ABILITY, {
        id: pokemon.simulation.id,
        skill: "LINK_CABLE_link", // reuse anim
        positionX: previous.positionX,
        positionY: previous.positionY,
        targetX: chain[i].positionX,
        targetY: chain[i].positionY
      })
    }
  }
}

export class PopulationBombStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = 10
    const numberOfAttacks = Math.round(
      ([4, 8, 12, 16][pokemon.stars - 1] ?? 8) * (1 + pokemon.ap / 100)
    )
    for (let i = 0; i < numberOfAttacks; i++) {
      target.handleSpecialDamage(
        damage,
        board,
        AttackType.SPECIAL,
        pokemon,
        crit,
        false
      )
    }
  }
}

export class ScreechStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const debuff = pokemon.stars === 3 ? -4 : pokemon.stars === 2 ? -2 : -1
    const cells = board.getAdjacentCells(pokemon.positionX, pokemon.positionY)

    target.addDefense(debuff, true)
    cells.forEach((cell) => {
      if (cell.value && cell.value.team !== pokemon.team) {
        cell.value.addDefense(debuff, true)
        cell.value.simulation.room.broadcast(Transfer.ABILITY, {
          id: pokemon.simulation.id,
          skill: Ability.SCREECH,
          targetX: cell.value.positionX,
          targetY: cell.value.positionY
        })
      }
    })
  }
}

export class SandTombStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    target.status.triggerParalysis(
      pokemon.stars === 3 ? 8000 : pokemon.stars === 2 ? 5000 : 3000,
      target
    )
    target.status.triggerSilence(
      pokemon.stars === 3 ? 8000 : pokemon.stars === 2 ? 5000 : 3000,
      pokemon
    )
    target.handleSpecialDamage(
      pokemon.stars === 3 ? 40 : pokemon.stars === 2 ? 20 : 10,
      board,
      AttackType.SPECIAL,
      pokemon,
      crit,
      false
    )
  }
}

export class WhirlwindStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit, true)
    const x = target.positionX
    const y = target.positionY
    target.flyAway(board)
    pokemon.simulation.room.broadcast(Transfer.ABILITY, {
      id: pokemon.simulation.id,
      skill: Ability.WHIRLWIND,
      positionX: x,
      positionY: y,
      targetX: target.positionX,
      targetY: target.positionY
    })
    target.handleSpecialDamage(
      pokemon.stars === 3 ? 120 : pokemon.stars === 2 ? 80 : 40,
      board,
      AttackType.SPECIAL,
      pokemon,
      crit,
      false
    )
  }
}

export class EmptyLightStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit, true)
    let tg: PokemonEntity | undefined = target
    const affectedTargetsIds = new Array<string>()
    for (let i = 0; i < 5; i++) {
      if (tg) {
        pokemon.simulation.room.broadcast(Transfer.ABILITY, {
          id: pokemon.simulation.id,
          skill: Ability.EMPTY_LIGHT,
          positionX: pokemon.positionX,
          positionY: pokemon.positionY,
          targetX: tg.positionX,
          targetY: tg.positionY
        })
        tg.addSpecialDefense(-3, false)
        tg.handleSpecialDamage(40, board, AttackType.SPECIAL, pokemon, crit)
        affectedTargetsIds.push(tg.id)
        const cells = board.getAdjacentCells(tg.positionX, tg.positionY)
        tg = cells
          .filter(
            (v) =>
              v.value &&
              v.value.team !== pokemon.team &&
              !affectedTargetsIds.includes(v.value.id)
          )
          .map((v) => v.value)[0]
      } else {
        break
      }
    }
  }
}

export class UnboundStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    pokemon.index = PkmIndex[Pkm.HOOPA_UNBOUND]
    pokemon.skill = Ability.HYPERSPACE_FURY
    pokemon.atk += 10
    pokemon.toMovingState()
    pokemon.addMaxHP(100)
  }
}

export class HyperSpaceFury extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit, true)
    const nbHits = 4 * (1 + pokemon.ap / 100)
    for (let i = 0; i < nbHits; i++) {
      target.addDefense(-1)
      target.handleSpecialDamage(
        15,
        board,
        AttackType.SPECIAL,
        pokemon,
        crit,
        true
      )
    }
    pokemon.simulation.room.broadcast(Transfer.ABILITY, {
      id: pokemon.simulation.id,
      skill: Ability.HYPERSPACE_FURY,
      positionX: pokemon.positionX,
      positionY: pokemon.positionY,
      targetX: target.positionX,
      targetY: target.positionY,
      orientation: nbHits // use orientation field for the number of hits
    })
  }
}

export class SnipeShotStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    const damage = [50, 100, 200][pokemon.stars - 1] ?? 200
    const farthestTarget = state.getFarthestTarget(pokemon, board) ?? target
    super.process(pokemon, state, board, farthestTarget, crit)

    if (farthestTarget) {
      const cells = board.getCellsBetween(
        pokemon.positionX,
        pokemon.positionY,
        farthestTarget.positionX,
        farthestTarget.positionY
      )
      cells.forEach((cell) => {
        if (cell.value && cell.value.team != pokemon.team) {
          cell.value.handleSpecialDamage(
            damage,
            board,
            AttackType.SPECIAL,
            pokemon,
            crit
          )
        }
      })
    }
  }
}

export class AirSlashStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = pokemon.stars === 3 ? 100 : pokemon.stars === 2 ? 50 : 25
    target.status.triggerFlinch(7000)
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
  }
}

export class EggsplosionStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = pokemon.stars === 3 ? 140 : pokemon.stars === 2 ? 80 : 40
    const kill = target.handleSpecialDamage(
      damage,
      board,
      AttackType.SPECIAL,
      pokemon,
      crit
    )
    if (kill.death && Math.random() < 0.3) {
      const egg = PokemonFactory.createRandomEgg(false)
      const player = pokemon.player
      if (player) {
        const x = getFirstAvailablePositionInBench(player.board)
        if (x !== undefined) {
          egg.positionX = x
          egg.positionY = 0
          egg.evolutionRule.evolutionTimer = EvolutionTime.EGG_HATCH
          player.board.set(egg.id, egg)
        }
      }
    }
    board
      .getAdjacentCells(target.positionX, target.positionY)
      .map((v) => v.value)
      .filter((v) => v?.team === target.team)
      .concat(target)
      .forEach((v) => {
        if (v) {
          v.status.triggerArmorReduction(4000)
        }
      })
  }
}

export class BodySlamStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = Math.round(0.3 * pokemon.hp * (1 + pokemon.hp / 100))
    target.handleSpecialDamage(
      damage,
      board,
      AttackType.SPECIAL,
      pokemon,
      crit,
      false
    )
  }
}

export class VineWhipStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    board
      .getAdjacentCells(target.positionX, target.positionY)
      .map((v) => v.value)
      .filter((v) => v?.team === target.team)
      .concat(target)
      .forEach((v) => {
        if (v) {
          v.status.triggerFlinch(3000)
        }
      })
    target.handleSpecialDamage(100, board, AttackType.SPECIAL, pokemon, crit)
  }
}

export class BarbBarrageStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit, true)
    const mostSurroundedCoordinate =
      state.getMostSurroundedCoordinateAvailablePlace(pokemon, board)

    if (mostSurroundedCoordinate) {
      pokemon.moveTo(
        mostSurroundedCoordinate.x,
        mostSurroundedCoordinate.y,
        board
      )
      board
        .getAdjacentCells(target.positionX, target.positionY)
        .map((v) => v.value)
        .filter((v) => v?.team === target.team)
        .concat(target)
        .forEach((v) => {
          if (v) {
            v.status.triggerPoison(3000, v, pokemon)
            pokemon.simulation.room.broadcast(Transfer.ABILITY, {
              id: pokemon.simulation.id,
              skill: Ability.BARB_BARRAGE,
              positionX: pokemon.positionX,
              positionY: pokemon.positionY,
              targetX: v.positionX,
              targetY: v.positionY,
              orientation: v.orientation
            })
          }
        })
      target.handleSpecialDamage(
        pokemon.stars === 3 ? 60 : pokemon.stars === 2 ? 30 : 15,
        board,
        AttackType.SPECIAL,
        pokemon,
        crit
      )
    }
  }
}

export class FloralHealingStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    // we explicitely not trigger super.process() so that the pokemon doesn't get twice the oncast effects
    pokemon.handleHeal(pokemon.maxPP, pokemon, 0)
  }
}

export class MagicPowderStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const shield = [10, 20, 40][pokemon.stars - 1] ?? 40
    const silenceDuration = [2000, 4000, 6000][pokemon.stars - 1] ?? 6000
    pokemon.addShield(shield, pokemon, true)
    board
      .getAdjacentCells(pokemon.positionX, pokemon.positionY)
      .forEach((cell) => {
        if (cell.value && cell.value.team !== pokemon.team) {
          cell.value.status.triggerSilence(silenceDuration, pokemon)
        }
      })
  }
}

export class RetaliateStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const nbAlliesAlive = board.cells.filter(
      (entity) => entity && entity.team === pokemon.team
    ).length
    const nbFallenAllies =
      (pokemon.player?.boardSize ?? nbAlliesAlive) - nbAlliesAlive
    const damage =
      ([15, 30, 60][pokemon.stars - 1] ?? 60) +
      ([10, 15, 25][pokemon.stars - 1] ?? 15) * nbFallenAllies
    target.handleSpecialDamage(
      damage,
      board,
      AttackType.SPECIAL,
      pokemon,
      crit,
      true
    )
  }
}

export class SlashStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = pokemon.stars === 3 ? 40 : pokemon.stars === 2 ? 20 : 10
    const increasedCrit = crit
      ? crit
      : pokemon.stars === 3
      ? chance(0.9)
      : pokemon.stars === 2
      ? chance(0.6)
      : chance(0.3)
    target.handleSpecialDamage(
      damage,
      board,
      AttackType.SPECIAL,
      pokemon,
      increasedCrit
    )
  }
}

export class OutrageStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit, true)
    pokemon.status.triggerConfusion(2000, pokemon)
    const damage = Math.round(
      ([1, 1.5, 2][pokemon.stars - 1] ?? 2) * pokemon.atk
    )
    board
      .getAdjacentCells(pokemon.positionX, pokemon.positionY)
      .map((v) => v.value)
      .filter((v) => v?.team === target.team)
      .concat(target)
      .forEach((v) => {
        if (v) {
          pokemon.simulation.room.broadcast(Transfer.ABILITY, {
            id: pokemon.simulation.id,
            skill: Ability.OUTRAGE,
            targetX: v.positionX,
            targetY: v.positionY
          })
          v.handleSpecialDamage(
            damage,
            board,
            AttackType.SPECIAL,
            pokemon,
            crit
          )
        }
      })
  }
}

export class FishiousRendStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit, true)
    // deals 80 special damage. Double damage if attacker got more atk speed than target.
    const damage = 80 * (pokemon.atkSpeed > target.atkSpeed ? 2 : 1)
    target.handleSpecialDamage(
      damage,
      board,
      AttackType.SPECIAL,
      pokemon,
      crit,
      true
    )
  }
}

export class GoldRushStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit, true)
    const goldDamage = pokemon.player?.money ? pokemon.player?.money : 0
    const damage = 20 + goldDamage
    if (pokemon.player) {
      pokemon.player.money += 2
    }
    target.handleSpecialDamage(
      damage,
      board,
      AttackType.SPECIAL,
      pokemon,
      crit,
      true
    )
  }
}

export class MakeItRainStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit, true)
    const goldDamage = pokemon.player?.money ? pokemon.player?.money : 0
    const damage = 100 + goldDamage

    target.handleSpecialDamage(
      damage,
      board,
      AttackType.SPECIAL,
      pokemon,
      crit,
      true
    )
  }
}

export class RecoverStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit, true)
    pokemon.handleHeal(0.25 * pokemon.hp, pokemon, 1)
  }
}

export class CurseStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit, true)
    const enemies = board.cells.filter(
      (p) => p && p.team !== pokemon.team
    ) as PokemonEntity[]
    enemies.sort((a, b) => (a.status.curse ? +1 : b.hp - a.hp))
    const enemyWithHighestHP = enemies[0]
    const curseDelay =
      ([12000, 8000, 4000][pokemon.stars - 1] ?? 4000) *
      (1 - (0.2 * pokemon.ap) / 100)
    enemyWithHighestHP.status.triggerCurse(curseDelay)
  }
}

export class DoomDesireStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit, true)
    setTimeout(() => {
      if (target && target.life > 0) {
        pokemon.simulation.room.broadcast(Transfer.ABILITY, {
          id: pokemon.simulation.id,
          skill: Ability.JUDGEMENT,
          positionX: pokemon.positionX,
          positionY: pokemon.positionY,
          targetX: target.positionX,
          targetY: target.positionY
        })
        target.handleSpecialDamage(
          150,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit,
          true
        )
      } else {
        pokemon.addPP(40)
      }
    }, 2000)
  }
}

export class PoltergeistStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let damage = pokemon.stars === 3 ? 120 : pokemon.stars === 2 ? 60 : 30
    target.items.forEach(
      (item) => (damage += ArtificialItems.includes(item) ? 40 : 20)
    )
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
  }
}

export class CrushGripStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = Math.round(20 + (pokemon.life / pokemon.hp) * 180)
    target.handleSpecialDamage(
      damage,
      board,
      AttackType.PHYSICAL,
      pokemon,
      crit,
      true
    )
  }
}

export class AuraSphereStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = [25, 50, 100][pokemon.stars - 1] ?? 25
    effectInLine(board, pokemon, target, (targetInLine) => {
      if (targetInLine != null && targetInLine.team !== pokemon.team) {
        targetInLine.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit
        )
        targetInLine.status.triggerSilence(3000, pokemon)
      }
    })
  }
}

export class SketchStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
  }
}

export class LovelyKissStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const duration = Math.round(
      ([2000, 4000][pokemon.stars - 1] ?? 2000) * (1 + pokemon.ap / 100)
    )
    target.status.triggerSleep(duration, target)
  }
}

export class OverdriveStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const cells = board.getCellsInRadius(target.positionX, target.positionY, 3)
    cells.forEach((cell) => {
      if (cell && cell.value && cell.value.team !== pokemon.team) {
        const distance = distanceC(
          cell.x,
          cell.y,
          pokemon.positionX,
          pokemon.positionY
        )
        const damage = pokemon.atk * (1.2 - 0.2 * (distance - 1))
        cell.value.handleSpecialDamage(
          damage,
          board,
          AttackType.SPECIAL,
          pokemon,
          crit,
          true
        )
      }
    })
  }
}

export class TransformStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    if (target) {
      pokemon.index = target.index
      pokemon.rarity = target.rarity
      pokemon.stars = target.stars
      pokemon.skill = target.skill
      pokemon.passive = target.passive
      pokemon.baseAtk = target.atk
      pokemon.baseDef = target.def
      pokemon.baseSpeDef = target.speDef
      pokemon.baseRange = target.baseRange
      pokemon.atk = target.atk
      pokemon.atkSpeed = target.atkSpeed
      pokemon.def = target.def
      pokemon.speDef = target.speDef
      pokemon.attackType = target.attackType
      pokemon.ap = target.ap
      pokemon.maxPP = target.maxPP
      pokemon.atkSpeed = target.atkSpeed
      pokemon.critChance = target.critChance
      pokemon.critDamage = target.critDamage
      pokemon.range = target.range
      pokemon.attackSprite = target.attackSprite
      pokemon.shiny = target.shiny
      pokemon.emotion = target.emotion
      pokemon.dodge = target.dodge
    }
  }
}

export class PsychicFangsStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    target.handleSpecialDamage(
      100,
      board,
      AttackType.PHYSICAL,
      pokemon,
      crit,
      true
    )
    target.atk = Math.min(target.atk, target.baseAtk)
    target.def = Math.min(target.def, target.baseDef)
    target.speDef = Math.min(target.speDef, target.baseSpeDef)
  }
}

export class ShedTailStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const x = pokemon.positionX
    const y = pokemon.positionY
    const lowestHealthAlly = (
      board.cells.filter(
        (cell) => cell && cell.team === pokemon.team
      ) as PokemonEntity[]
    ).sort((a, b) => a.life / a.hp - b.life / b.hp)[0]

    if (lowestHealthAlly) {
      lowestHealthAlly.addShield(80, pokemon, true)
      const substitute = PokemonFactory.createPokemonFromName(
        Pkm.SUBSTITUTE,
        pokemon.player
      )
      const coord = pokemon.simulation.getClosestAvailablePlaceOnBoardToPokemon(
        lowestHealthAlly,
        lowestHealthAlly.team
      )
      pokemon.moveTo(coord.x, coord.y, board)
      pokemon.simulation.addPokemon(substitute, x, y, pokemon.team, true)
    }
  }
}

export class NightSlashStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = [15, 30, 60][pokemon.stars - 1] ?? 60
    crit = crit || chance([0.3, 0.6, 0.9][pokemon.stars - 1] ?? 0.9)
    target.handleSpecialDamage(damage, board, AttackType.SPECIAL, pokemon, crit)
  }
}

export class KowtowCleaveStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    crit = chance(pokemon.critChance / 100) // can crit by default
    super.process(pokemon, state, board, target, crit)
    const nbAllies =
      board.cells.filter((p) => p && p.team === pokemon.team).length - 1
    const nbFallenAllies = min(0)(
      (pokemon.player?.experienceManager.level ?? 0) - nbAllies
    )
    const damage = Math.round(
      pokemon.atk * (1.5 + nbFallenAllies * 0.2 * (1 + pokemon.ap / 100))
    )
    target.handleSpecialDamage(
      damage,
      board,
      AttackType.TRUE,
      pokemon,
      crit,
      false
    )
  }
}

export class ShieldsDownStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit, true)
    pokemon.simulation.room.broadcast(Transfer.ABILITY, {
      id: pokemon.simulation.id,
      skill: Ability.SHIELDS_UP,
      positionX: pokemon.positionX,
      positionY: pokemon.positionY
    })
    const pkm = pickRandomIn([
      Pkm.MINIOR_KERNEL_BLUE,
      Pkm.MINIOR_KERNEL_GREEN,
      Pkm.MINIOR_KERNEL_ORANGE,
      Pkm.MINIOR_KERNEL_RED
    ])
    pokemon.index = PkmIndex[pkm]
    pokemon.name = pkm
    pokemon.skill = Ability.SHIELDS_UP
  }
}

export class ShieldsUpStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit, true)
    pokemon.simulation.room.broadcast(Transfer.ABILITY, {
      id: pokemon.simulation.id,
      skill: Ability.SHIELDS_UP,
      positionX: pokemon.positionX,
      positionY: pokemon.positionX
    })
    pokemon.index = PkmIndex[Pkm.MINIOR]
    pokemon.name = Pkm.MINIOR
    pokemon.skill = Ability.SHIELDS_DOWN
  }
}

export class AuraWheelStrategy extends AbilityStrategy {
  copyable = false
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    if (pokemon.name === Pkm.MORPEKO) {
      pokemon.name = Pkm.MORPEKO_HANGRY
      pokemon.index = PkmIndex[Pkm.MORPEKO_HANGRY]
    } else {
      pokemon.name = Pkm.MORPEKO
      pokemon.index = PkmIndex[Pkm.MORPEKO]
    }

    target.handleSpecialDamage(
      60,
      board,
      AttackType.SPECIAL,
      pokemon,
      crit,
      true
    )
  }
}

export class LickStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = pokemon.stars === 3 ? 120 : pokemon.stars === 2 ? 60 : 30
    target.handleSpecialDamage(
      damage,
      board,
      AttackType.SPECIAL,
      pokemon,
      crit,
      true
    )
    target.status.triggerConfusion(3000, target)
    target.status.triggerParalysis(3000, target)
  }
}

export class FurySwipesStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const nbAttacks = randomBetween(
      Math.round(2 * (1 + pokemon.ap / 100)),
      Math.round(5 * (1 + pokemon.ap / 100))
    )
    for (let n = 0; n < nbAttacks; n++) {
      target.handleSpecialDamage(
        Math.ceil(pokemon.atk),
        board,
        AttackType.PHYSICAL,
        pokemon,
        crit
      )
    }
  }
}

export class TickleStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const attackLost = Math.round(3 * (1 + pokemon.ap / 100))
    const defLost = Math.round(3 * (1 + pokemon.ap / 100))
    const nbMaxEnemiesHit = [1, 2][pokemon.stars - 1] ?? 2
    let nbEnemiesHit = 0
    board
      .getAdjacentCells(pokemon.positionX, pokemon.positionY)
      .forEach((cell) => {
        if (
          cell.value &&
          cell.value.team !== pokemon.team &&
          nbEnemiesHit < nbMaxEnemiesHit
        ) {
          nbEnemiesHit++
          cell.value.addAttack(-attackLost)
          cell.value.addDefense(-defLost)
        }
      })
  }
}

export class AromatherapyStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const heal = [20, 40, 80][pokemon.stars - 1] ?? 20
    board
      .getAdjacentCells(pokemon.positionX, pokemon.positionY)
      .forEach((cell) => {
        if (cell.value && cell.value.team === pokemon.team) {
          cell.value.status.clearNegativeStatus()
          cell.value.handleHeal(heal, pokemon, 1)
        }
      })
  }
}

export class DetectStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let nbAdjacentEnemies = 0
    const adjacentAllies: PokemonEntity[] = []
    board
      .getAdjacentCells(pokemon.positionX, pokemon.positionY)
      .forEach((cell) => {
        if (cell.value && cell.value.team !== pokemon.team) {
          nbAdjacentEnemies++
        } else if (cell.value && cell.value.team === pokemon.team) {
          adjacentAllies.push(cell.value)
        }
      })

    adjacentAllies.forEach((ally) =>
      ally.status.triggerProtect(
        Math.round(500 * nbAdjacentEnemies * (1 + pokemon.ap / 100))
      )
    )
  }
}

export class SpacialRendStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = 100
    const enemies = board.cells.filter((p) => p && p.team !== pokemon.team)
    const n = enemies.length
    for (let i = 0; i < Math.floor(n / 2); i++) {
      board.swapValue(
        enemies[i]!.positionX,
        enemies[i]!.positionY,
        enemies[n - 1 - i]!.positionX,
        enemies[n - 1 - i]!.positionY
      )
    }
    setTimeout(() => {
      const y = clamp(target.positionY, 2, BOARD_HEIGHT - 2)
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const targetHit = board.getValue(x, y)
        if (targetHit && targetHit.team !== pokemon.team) {
          targetHit.handleSpecialDamage(
            damage,
            board,
            AttackType.SPECIAL,
            pokemon,
            crit
          )
        }
      }
    }, 700)
  }
}

export class MultiAttackStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const silvallyType = values(pokemon.types).at(-1)
    const synergies = pokemon.player?.synergies
    let synergyLevelCount = 0

    if (synergies && silvallyType && synergies.has(silvallyType)) {
      synergyLevelCount = synergies.get(silvallyType)!
    }
    const damage = 10 * synergyLevelCount

    board
      .getAdjacentCells(pokemon.positionX, pokemon.positionY)
      .map((v) => v.value)
      .forEach((v) => {
        if (v && v.team !== pokemon.team) {
          v.handleSpecialDamage(
            damage,
            board,
            AttackType.SPECIAL,
            pokemon,
            crit
          )
        }
      })
  }
}

export class PetalBlizzardStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    board
      .getCellsInRange(pokemon.positionX, pokemon.positionY, 1)
      .forEach((cell) => {
        if (cell.value && cell.value.team !== pokemon.team) {
          cell.value.handleSpecialDamage(
            30,
            board,
            AttackType.SPECIAL,
            pokemon,
            crit,
            true
          )
        }
      })
    pokemon.addAbilityPower(10)
  }
}

export class SunsteelStrikeStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit, true)
    const mostSurroundedCoordinate =
      state.getMostSurroundedCoordinateAvailablePlace(pokemon, board)

    if (mostSurroundedCoordinate) {
      pokemon.skydiveTo(
        mostSurroundedCoordinate.x,
        mostSurroundedCoordinate.y,
        board
      )
      setTimeout(() => {
        pokemon.simulation.room.broadcast(Transfer.ABILITY, {
          id: pokemon.simulation.id,
          skill: Ability.SUNSTEEL_STRIKE,
          positionX: mostSurroundedCoordinate.x,
          positionY: mostSurroundedCoordinate.y,
          targetX: mostSurroundedCoordinate.x,
          targetY: mostSurroundedCoordinate.y
        })
      }, 500)

      setTimeout(() => {
        const cells = board.getAdjacentCells(
          mostSurroundedCoordinate.x,
          mostSurroundedCoordinate.y
        )

        pokemon.simulation.room.broadcast(Transfer.ABILITY, {
          id: pokemon.simulation.id,
          skill: Ability.SEARING_SHOT,
          positionX: mostSurroundedCoordinate.x,
          positionY: mostSurroundedCoordinate.y,
          targetX: mostSurroundedCoordinate.x,
          targetY: mostSurroundedCoordinate.y
        })

        cells.forEach((cell) => {
          if (cell.value && cell.value.team !== pokemon.team) {
            cell.value.handleSpecialDamage(
              100,
              board,
              AttackType.SPECIAL,
              pokemon,
              crit
            )
            cell.value.status.triggerBurn(3000, cell.value, pokemon)
          }
        })
      }, 1000)
    }
  }
}

export class MoongeistBeamStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    effectInLine(board, pokemon, target, (targetInLine) => {
      if (targetInLine != null) {
        if (targetInLine.team !== pokemon.team) {
          targetInLine.handleSpecialDamage(
            100,
            board,
            AttackType.SPECIAL,
            pokemon,
            crit
          )
          targetInLine.status.triggerParalysis(3000, targetInLine)
        }
      }
    })
  }
}

export class MantisBladesStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = pokemon.stars === 1 ? 30 : pokemon.stars === 2 ? 60 : 120

    target.handleSpecialDamage(
      damage,
      board,
      AttackType.PHYSICAL,
      pokemon,
      crit,
      true
    )

    target.handleSpecialDamage(
      damage,
      board,
      AttackType.SPECIAL,
      pokemon,
      crit,
      true
    )

    target.handleSpecialDamage(
      damage,
      board,
      AttackType.TRUE,
      pokemon,
      crit,
      true
    )
  }
}

export class SpiritBreakStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const damage = [20, 40, 80][pokemon.stars - 1] ?? 80
    target.handleSpecialDamage(
      damage,
      board,
      AttackType.SPECIAL,
      pokemon,
      crit,
      true
    )
    const apDebuff = -1 * Math.round(20 * (1 + pokemon.ap / 100))
    target.addAbilityPower(apDebuff)
  }
}

export class SheerColdStrategy extends AbilityStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    let executeChance = clamp(
      0,
      0.3 * (1 + pokemon.ap / 100) +
        min(0)((pokemon.life - target.life) / target.life),
      1
    )
    if (target.types.has(Synergy.ICE)) executeChance = 0
    else if (target.status.freeze) executeChance = 1

    if (chance(executeChance)) {
      target.handleSpecialDamage(
        9999,
        board,
        AttackType.SPECIAL,
        pokemon,
        crit,
        true
      )
    }
  }
}

export * from "./hidden-power"

export const AbilityStrategies: { [key in Ability]: AbilityStrategy } = {
  [Ability.SONG_OF_DESIRE]: new SongOfDesireStrategy(),
  [Ability.CONFUSING_MIND]: new ConfusingMindStrategy(),
  [Ability.KNOWLEDGE_THIEF]: new KnowledgeThiefStrategy(),
  [Ability.WONDER_GUARD]: new WonderGuardStrategy(),
  [Ability.CORRUPTED_NATURE]: new CorruptedNatureStrategy(),
  [Ability.CRABHAMMER]: new CrabHammerStrategy(),
  [Ability.KING_SHIELD]: new KingShieldStrategy(),
  [Ability.EXPLOSION]: new ExplosionStrategy(),
  [Ability.NIGHTMARE]: new NightmareStrategy(),
  [Ability.CLANGOROUS_SOUL]: new ClangorousSoulStrategy(),
  [Ability.BONEMERANG]: new BonemerangStrategy(),
  [Ability.GROWL]: new GrowlStrategy(),
  [Ability.RELIC_SONG]: new RelicSongStrategy(),
  [Ability.FAIRY_WIND]: new FairyWindStrategy(),
  [Ability.DISARMING_VOICE]: new DisarmingVoiceStrategy(),
  [Ability.HIGH_JUMP_KICK]: new HighJumpKickStrategy(),
  [Ability.GRASS_WHISTLE]: new GrassWhistleStrategy(),
  [Ability.TRI_ATTACK]: new TriAttackStrategy(),
  [Ability.ECHO]: new EchoStrategy(),
  [Ability.PETAL_DANCE]: new PetalDanceStrategy(),
  [Ability.HYPER_VOICE]: new HyperVoiceStrategy(),
  [Ability.SHADOW_CLONE]: new ShadowCloneStrategy(),
  [Ability.VOLT_SWITCH]: new VoltSwitchStrategy(),
  [Ability.NUZZLE]: new NuzzleStrategy(),
  [Ability.FIRE_BLAST]: new FireBlastStrategy(),
  [Ability.WHEEL_OF_FIRE]: new WheelOfFireStrategy(),
  [Ability.SEISMIC_TOSS]: new SeismicTossStrategy(),
  [Ability.GUILLOTINE]: new GuillotineStrategy(),
  [Ability.ROCK_SLIDE]: new RockSlideStrategy(),
  [Ability.HEAT_WAVE]: new HeatWaveStrategy(),
  [Ability.THUNDER]: new ThunderStrategy(),
  [Ability.HYDRO_PUMP]: new HydroPumpStrategy(),
  [Ability.DRACO_METEOR]: new DracoMeteorStrategy(),
  [Ability.BLAZE_KICK]: new BlazeKickStrategy(),
  [Ability.WISH]: new WishStrategy(),
  [Ability.CALM_MIND]: new CalmMindStrategy(),
  [Ability.IRON_DEFENSE]: new IronDefenseStrategy(),
  [Ability.DEFENSE_CURL]: new DefenseCurlStrategy(),
  [Ability.METRONOME]: new MetronomeStrategy(),
  [Ability.SOAK]: new SoakStrategy(),
  [Ability.IRON_TAIL]: new IronTailStrategy(),
  [Ability.BLAST_BURN]: new BlastBurnStrategy(),
  [Ability.CHARGE]: new ChargeStrategy(),
  [Ability.DISCHARGE]: new DischargeStrategy(),
  [Ability.BITE]: new BiteStrategy(),
  [Ability.DRAGON_TAIL]: new DragonTailStrategy(),
  [Ability.DRAGON_BREATH]: new DragonBreathStrategy(),
  [Ability.ICICLE_CRASH]: new IcicleCrashStrategy(),
  [Ability.ROOT]: new RootStrategy(),
  [Ability.TORMENT]: new TormentStrategy(),
  [Ability.STOMP]: new StompStrategy(),
  [Ability.PAYBACK]: new PaybackStrategy(),
  [Ability.NIGHT_SLASH]: new NightSlashStrategy(),
  [Ability.KOWTOW_CLEAVE]: new KowtowCleaveStrategy(),
  [Ability.BUG_BUZZ]: new BugBuzzStrategy(),
  [Ability.STRING_SHOT]: new StringShotStrategy(),
  [Ability.ENTANGLING_THREAD]: new EntanglingThreadStrategy(),
  [Ability.VENOSHOCK]: new PoisonStingStrategy(),
  [Ability.LEECH_LIFE]: new LeechLifeStrategy(),
  [Ability.HAPPY_HOUR]: new HappyHourStrategy(),
  [Ability.TELEPORT]: new TeleportStrategy(),
  [Ability.NASTY_PLOT]: new NastyPlotStrategy(),
  [Ability.THIEF]: new ThiefStrategy(),
  [Ability.STUN_SPORE]: new StunSporeStrategy(),
  [Ability.METEOR_MASH]: new MeteorMashStrategy(),
  [Ability.HURRICANE]: new HurricaneStrategy(),
  [Ability.BURN]: new BurnStrategy(),
  [Ability.SLEEP]: new SleepStrategy(),
  [Ability.CONFUSION]: new ConfusionStrategy(),
  [Ability.BLIZZARD]: new BlizzardStrategy(),
  [Ability.PROTECT]: new ProtectStrategy(),
  [Ability.POISON]: new PoisonStrategy(),
  [Ability.ORIGIN_PULSE]: new OriginPulseStrategy(),
  [Ability.SEED_FLARE]: new SeedFlareStrategy(),
  [Ability.HEAL_BLOCK]: new HealBlockStrategy(),
  [Ability.ROAR_OF_TIME]: new RoarOfTimeStrategy(),
  [Ability.ROCK_TOMB]: new RockTombStrategy(),
  [Ability.ROCK_SMASH]: new RockSmashStrategy(),
  [Ability.HEAD_SMASH]: new HeadSmashStrategy(),
  [Ability.DEFAULT]: new AbilityStrategy(),
  [Ability.DIAMOND_STORM]: new DiamondStormStrategy(),
  [Ability.DRACO_ENERGY]: new DracoEnergyStrategy(),
  [Ability.DYNAMAX_CANNON]: new DynamaxCannonStrategy(),
  [Ability.DYNAMIC_PUNCH]: new DynamicPunchStrategy(),
  [Ability.ELECTRO_BOOST]: new ElectroBoostStrategy(),
  [Ability.ELECTRO_WEB]: new ElectroWebStrategy(),
  [Ability.FIRE_TRICK]: new FireTrickStrategy(),
  [Ability.FLAME_CHARGE]: new FlameChargeStrategy(),
  [Ability.LEECH_SEED]: new LeechSeedStrategy(),
  [Ability.LOCK_ON]: new LockOnStrategy(),
  [Ability.PSYCH_UP]: new PsychUpStrategy(),
  [Ability.RAZOR_WIND]: new RazorWindStrategy(),
  [Ability.TWISTING_NETHER]: new TwistingNetherStrategy(),
  [Ability.EARTHQUAKE]: new EarthquakeStrategy(),
  [Ability.SOFT_BOILED]: new SoftBoiledStrategy(),
  [Ability.ELECTRIC_SURGE]: new ElectricSurgeStrategy(),
  [Ability.PSYCHIC_SURGE]: new PsychicSurgeStrategy(),
  [Ability.MIND_BLOWN]: new MindBlownStrategy(),
  [Ability.PAYDAY]: new PaydayStrategy(),
  [Ability.BEAT_UP]: new BeatUpStrategy(),
  [Ability.BLUE_FLARE]: new BlueFlareStrategy(),
  [Ability.FUSION_BOLT]: new FusionBoltStrategy(),
  [Ability.AURORA_VEIL]: new AuroraVeilStrategy(),
  [Ability.AQUA_JET]: new AquaJetStrategy(),
  [Ability.JUDGEMENT]: new JudgementStrategy(),
  [Ability.CHATTER]: new ChatterStrategy(),
  [Ability.LIQUIDATION]: new LiquidationStrategy(),
  [Ability.STEAM_ERUPTION]: new SteamEruptionStrategy(),
  [Ability.APPLE_ACID]: new AppleAcidStrategy(),
  [Ability.SHADOW_BALL]: new ShadowBallStrategy(),
  [Ability.DIVE]: new DiveStrategy(),
  [Ability.SPIKE_ARMOR]: new SpikeArmorStrategy(),
  [Ability.FUTURE_SIGHT]: new FutureSightStrategy(),
  [Ability.FAKE_TEARS]: new FakeTearsStrategy(),
  [Ability.SPARKLING_ARIA]: new SparklingAriaStrategy(),
  [Ability.DRAGON_DARTS]: new DragonDartsStrategy(),
  [Ability.GRASSY_SURGE]: new GrassySurgeStrategy(),
  [Ability.MISTY_SURGE]: new MistySurgeStrategy(),
  [Ability.SKY_ATTACK]: new SkyAttackStrategy(),
  [Ability.ILLUSION]: new IllusionStrategy(),
  [Ability.SLUDGE]: new SludgeStrategy(),
  [Ability.SLUDGE_WAVE]: new SludgeWaveStrategy(),
  [Ability.AURORA_BEAM]: new AuroraBeamStrategy(),
  [Ability.AGILITY]: new AgilityStrategy(),
  [Ability.SPIRIT_SHACKLE]: new SpiritShackleStrategy(),
  [Ability.WATER_SHURIKEN]: new WaterShurikenStrategy(),
  [Ability.SHADOW_SNEAK]: new ShadowSneakStrategy(),
  [Ability.MACH_PUNCH]: new MachPunchStrategy(),
  [Ability.UPPERCUT]: new UppercutStrategy(),
  [Ability.TRIPLE_KICK]: new TripleKickStrategy(),
  [Ability.MAWASHI_GERI]: new MawashiGeriStrategy(),
  [Ability.FORECAST]: new ForecastStrategy(),
  [Ability.SACRED_SWORD]: new SacredSwordStrategy(),
  [Ability.X_SCISSOR]: new XScissorStrategy(),
  [Ability.PLASMA_FIST]: new PlasmaFistStrategy(),
  [Ability.SPECTRAL_THIEF]: new SpectralThiefStrategy(),
  [Ability.GEOMANCY]: new GeomancyStrategy(),
  [Ability.DEATH_WING]: new DeathWingStrategy(),
  [Ability.SLACK_OFF]: new SlackOffStrategy(),
  [Ability.DARK_VOID]: new DarkVoidStrategy(),
  [Ability.OVERHEAT]: new OverheatStrategy(),
  [Ability.HYPNOSIS]: new HypnosisStrategy(),
  [Ability.MIMIC]: new MimicStrategy(),
  [Ability.HEX]: new HexStrategy(),
  [Ability.GROWTH]: new GrowthStrategy(),
  [Ability.HEAL_ORDER]: new HealOrderStrategy(),
  [Ability.SHELL_TRAP]: new ShellTrapStrategy(),
  [Ability.DIG]: new DigStrategy(),
  [Ability.FIRE_SPIN]: new FireSpinStrategy(),
  [Ability.SEARING_SHOT]: new SearingShotStrategy(),
  [Ability.PECK]: new PeckStrategy(),
  [Ability.SPLASH]: new SplashStrategy(),
  [Ability.COUNTER]: new CounterStrategy(),
  [Ability.COSMIC_POWER]: new CosmicPowerStrategy(),
  [Ability.POISON_POWDER]: new PoisonPowderStrategy(),
  [Ability.SILVER_WIND]: new SilverWindStrategy(),
  [Ability.ICY_WIND]: new IcyWindStrategy(),
  [Ability.GIGATON_HAMMER]: new GigatonHammerStrategy(),
  [Ability.ACROBATICS]: new AcrobaticsStrategy(),
  [Ability.ABSORB]: new AbsorbStrategy(),
  [Ability.ROLLOUT]: new RolloutStrategy(),
  [Ability.THRASH]: new ThrashStrategy(),
  [Ability.SOLAR_BEAM]: new SolarBeamStrategy(),
  [Ability.MAGMA_STORM]: new MagmaStormStrategy(),
  [Ability.SLASHING_CLAW]: new SlashingClawStrategy(),
  [Ability.ERUPTION]: new EruptionStrategy(),
  [Ability.MIST_BALL]: new MistBallStrategy(),
  [Ability.LUSTER_PURGE]: new LusterPurgeStrategy(),
  [Ability.MUD_BUBBLE]: new MudBubbleStrategy(),
  [Ability.LINK_CABLE]: new LinkCableStrategy(),
  [Ability.MAGIC_BOUNCE]: new MagicBounceStrategy(),
  [Ability.HIDDEN_POWER_A]: new HiddenPowerAStrategy(),
  [Ability.HIDDEN_POWER_B]: new HiddenPowerBStrategy(),
  [Ability.HIDDEN_POWER_C]: new HiddenPowerCStrategy(),
  [Ability.HIDDEN_POWER_D]: new HiddenPowerDStrategy(),
  [Ability.HIDDEN_POWER_E]: new HiddenPowerEStrategy(),
  [Ability.HIDDEN_POWER_F]: new HiddenPowerFStrategy(),
  [Ability.HIDDEN_POWER_G]: new HiddenPowerGStrategy(),
  [Ability.HIDDEN_POWER_H]: new HiddenPowerHStrategy(),
  [Ability.HIDDEN_POWER_I]: new HiddenPowerIStrategy(),
  [Ability.HIDDEN_POWER_J]: new HiddenPowerJStrategy(),
  [Ability.HIDDEN_POWER_K]: new HiddenPowerKStrategy(),
  [Ability.HIDDEN_POWER_L]: new HiddenPowerLStrategy(),
  [Ability.HIDDEN_POWER_M]: new HiddenPowerMStrategy(),
  [Ability.HIDDEN_POWER_N]: new HiddenPowerNStrategy(),
  [Ability.HIDDEN_POWER_O]: new HiddenPowerOStrategy(),
  [Ability.HIDDEN_POWER_P]: new HiddenPowerPStrategy(),
  [Ability.HIDDEN_POWER_Q]: new HiddenPowerQStrategy(),
  [Ability.HIDDEN_POWER_R]: new HiddenPowerRStrategy(),
  [Ability.HIDDEN_POWER_S]: new HiddenPowerSStrategy(),
  [Ability.HIDDEN_POWER_T]: new HiddenPowerTStrategy(),
  [Ability.HIDDEN_POWER_U]: new HiddenPowerUStrategy(),
  [Ability.HIDDEN_POWER_V]: new HiddenPowerVStrategy(),
  [Ability.HIDDEN_POWER_W]: new HiddenPowerWStrategy(),
  [Ability.HIDDEN_POWER_X]: new HiddenPowerXStrategy(),
  [Ability.HIDDEN_POWER_Y]: new HiddenPowerYStrategy(),
  [Ability.HIDDEN_POWER_Z]: new HiddenPowerZStrategy(),
  [Ability.HIDDEN_POWER_QM]: new HiddenPowerQMStrategy(),
  [Ability.HIDDEN_POWER_EM]: new HiddenPowerEMStrategy(),
  [Ability.POISON_JAB]: new PoisonJabStrategy(),
  [Ability.SHELL_SMASH]: new ShellSmashStrategy(),
  [Ability.HELPING_HAND]: new HelpingHandStrategy(),
  [Ability.ASTRAL_BARRAGE]: new AstralBarrageStrategy(),
  [Ability.WATERFALL]: new WaterfallStrategy(),
  [Ability.PYRO_BALL]: new PyroBallStrategy(),
  [Ability.WHIRLPOOL]: new WhirlpoolStrategy(),
  [Ability.SMOKE_SCREEN]: new SmokeScreenStrategy(),
  [Ability.PRESENT]: new PresentStrategy(),
  [Ability.LEAF_BLADE]: new LeafBladeStrategy(),
  [Ability.ANCHOR_SHOT]: new AnchorShotStrategy(),
  [Ability.SMOG]: new SmogStrategy(),
  [Ability.PSYCHIC]: new PsychicStrategy(),
  [Ability.PSYBEAM]: new PsybeamStrategy(),
  [Ability.MAGNET_RISE]: new MagnetRiseStrategy(),
  [Ability.ATTRACT]: new AttractStrategy(),
  [Ability.WATER_PULSE]: new WaterPulseStrategy(),
  [Ability.PLAY_ROUGH]: new PlayRoughStrategy(),
  [Ability.AERIAL_ACE]: new AerialAceStrategy(),
  [Ability.PARABOLIC_CHARGE]: new ParabolicChargeStrategy(),
  [Ability.SUPER_FANG]: new SuperFangStrategy(),
  [Ability.TEETER_DANCE]: new TeeterDanceStrategy(),
  [Ability.CLOSE_COMBAT]: new CloseCombatStrategy(),
  [Ability.ASSIST]: new AssistStrategy(),
  [Ability.FISSURE]: new FissureStrategy(),
  [Ability.ASSURANCE]: new AssuranceStrategy(),
  [Ability.AQUA_RING]: new AquaRingStrategy(),
  [Ability.POISON_GAS]: new PoisonGasStrategy(),
  [Ability.BRAVE_BIRD]: new BraveBirdStrategy(),
  [Ability.MAGICAL_LEAF]: new MagicalLeafStrategy(),
  [Ability.STEALTH_ROCKS]: new StealthRocksStrategy(),
  [Ability.TAIL_GLOW]: new TailGlowStrategy(),
  [Ability.STRUGGLE_BUG]: new StruggleBugStrategy(),
  [Ability.PRISMATIC_LASER]: new PrismaticLaserStrategy(),
  [Ability.NATURAL_GIFT]: new NaturalGiftStrategy(),
  [Ability.NIGHT_SHADE]: new NightShadeStrategy(),
  [Ability.CHARGE_BEAM]: new ChargeBeamStrategy(),
  [Ability.POPULATION_BOMB]: new PopulationBombStrategy(),
  [Ability.SCREECH]: new ScreechStrategy(),
  [Ability.SAND_TOMB]: new SandTombStrategy(),
  [Ability.WHIRLWIND]: new WhirlwindStrategy(),
  [Ability.EMPTY_LIGHT]: new EmptyLightStrategy(),
  [Ability.UNBOUND]: new UnboundStrategy(),
  [Ability.HYPERSPACE_FURY]: new HyperSpaceFury(),
  [Ability.SNIPE_SHOT]: new SnipeShotStrategy(),
  [Ability.AIR_SLASH]: new AirSlashStrategy(),
  [Ability.EGGSPLOSION]: new EggsplosionStrategy(),
  [Ability.BODY_SLAM]: new BodySlamStrategy(),
  [Ability.FLORAL_HEALING]: new FloralHealingStrategy(),
  [Ability.VINE_WHIP]: new VineWhipStrategy(),
  [Ability.BARB_BARRAGE]: new BarbBarrageStrategy(),
  [Ability.INFERNAL_PARADE]: new InfernalParadeStrategy(),
  [Ability.MAGIC_POWDER]: new MagicPowderStrategy(),
  [Ability.RETALIATE]: new RetaliateStrategy(),
  [Ability.SLASH]: new SlashStrategy(),
  [Ability.OUTRAGE]: new OutrageStrategy(),
  [Ability.LUNGE]: new LungeStrategy(),
  [Ability.KNOCK_OFF]: new KnockOffStrategy(),
  [Ability.FISHIOUS_REND]: new FishiousRendStrategy(),
  [Ability.RECOVER]: new RecoverStrategy(),
  [Ability.CURSE]: new CurseStrategy(),
  [Ability.GOLD_RUSH]: new GoldRushStrategy(),
  [Ability.MAKE_IT_RAIN]: new MakeItRainStrategy(),
  [Ability.TIME_TRAVEL]: new TimeTravelStrategy(),
  [Ability.POLTERGEIST]: new PoltergeistStrategy(),
  [Ability.CRUSH_GRIP]: new CrushGripStrategy(),
  [Ability.AURASPHERE]: new AuraSphereStrategy(),
  [Ability.SKETCH]: new SketchStrategy(),
  [Ability.OVERDRIVE]: new OverdriveStrategy(),
  [Ability.LOVELY_KISS]: new LovelyKissStrategy(),
  [Ability.TRANSFORM]: new TransformStrategy(),
  [Ability.PSYCHIC_FANGS]: new PsychicFangsStrategy(),
  [Ability.SHED_TAIL]: new ShedTailStrategy(),
  [Ability.SHIELDS_DOWN]: new ShieldsDownStrategy(),
  [Ability.SHIELDS_UP]: new ShieldsUpStrategy(),
  [Ability.SANDSEAR_STORM]: new SandsearStormStrategy(),
  [Ability.WILDBOLT_STORM]: new WildboltStormStrategy(),
  [Ability.BLEAKWIND_STORM]: new BleakwindStormStrategy(),
  [Ability.SPRINGTIDE_STORM]: new SpringtideStormStrategy(),
  [Ability.AURA_WHEEL]: new AuraWheelStrategy(),
  [Ability.LICK]: new LickStrategy(),
  [Ability.FURY_SWIPES]: new FurySwipesStrategy(),
  [Ability.TICKLE]: new TickleStrategy(),
  [Ability.AROMATHERAPY]: new AromatherapyStrategy(),
  [Ability.DETECT]: new DetectStrategy(),
  [Ability.SPACIAL_REND]: new SpacialRendStrategy(),
  [Ability.MULTI_ATTACK]: new MultiAttackStrategy(),
  [Ability.STICKY_WEB]: new StickyWebStrategy(),
  [Ability.ACCELEROCK]: new AccelerockStrategy(),
  [Ability.PETAL_BLIZZARD]: new PetalBlizzardStrategy(),
  [Ability.SUNSTEEL_STRIKE]: new SunsteelStrikeStrategy(),
  [Ability.MOONGEIST_BEAM]: new MoongeistBeamStrategy(),
  [Ability.MANTIS_BLADES]: new MantisBladesStrategy(),
  [Ability.FLEUR_CANNON]: new FleurCannonStrategy(),
  [Ability.DOOM_DESIRE]: new DoomDesireStrategy(),
  [Ability.SPIRIT_BREAK]: new SpiritBreakStrategy(),
  [Ability.SHEER_COLD]: new SheerColdStrategy()
}
