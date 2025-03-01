import PokemonFactory from "../../models/pokemon-factory"
import { getPokemonData } from "../../models/precomputed/precomputed-pokemon-data"
import { PRECOMPUTED_POKEMONS_PER_TYPE_AND_CATEGORY } from "../../models/precomputed/precomputed-types-and-categories"
import { IPokemon, Transfer } from "../../types"
import { Ability } from "../../types/enum/Ability"
import { AttackType, Rarity } from "../../types/enum/Game"
import { ItemComponents, Berries, Item, Dishes } from "../../types/enum/Item"
import { Pkm, getUnownsPoolPerStage } from "../../types/enum/Pokemon"
import { Synergy } from "../../types/enum/Synergy"
import { pickNRandomIn, pickRandomIn } from "../../utils/random"
import Board from "../board"
import { PokemonEntity } from "../pokemon-entity"
import PokemonState from "../pokemon-state"
import { AbilityStrategies } from "./abilities"
import { AbilityStrategy } from "./ability-strategy"
import { getFirstAvailablePositionInBench } from "../../utils/board"
import { giveRandomEgg } from "../eggs"

export class HiddenPowerStrategy extends AbilityStrategy {
  copyable = false
  process(
    unown: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ): void {
    super.process(unown, state, board, target, crit)
    unown.handleDamage({
      damage: unown.life + unown.shield,
      board,
      attackType: AttackType.TRUE,
      attacker: null,
      shouldTargetGainMana: false
    })
  }
}

export class HiddenPowerAStrategy extends HiddenPowerStrategy {
  process(
    unown: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(unown, state, board, target, crit)
    const corners = [
      [0, 0],
      [board.columns - 1, 0],
      [0, board.rows - 1],
      [board.columns - 1, board.rows - 1]
    ]
    corners.forEach(([x, y]) => {
      const abra = PokemonFactory.createPokemonFromName(Pkm.ABRA, unown.player)
      const coord = unown.simulation.getClosestAvailablePlaceOnBoardTo(
        x,
        y,
        unown.team
      )
      unown.simulation.addPokemon(abra, coord.x, coord.y, unown.team, false)
    })
  }
}

export class HiddenPowerBStrategy extends HiddenPowerStrategy {
  process(
    unown: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(unown, state, board, target, crit)
    board.forEach((x: number, y: number, enemy: PokemonEntity | undefined) => {
      if (enemy && unown.team != enemy.team) {
        enemy.status.triggerBurn(30000, enemy, unown)
      }
    })
  }
}

export class HiddenPowerCStrategy extends HiddenPowerStrategy {
  process(
    unown: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(unown, state, board, target, crit)
    board.forEach(
      (x: number, y: number, pokemon: PokemonEntity | undefined) => {
        if (pokemon && unown.team === pokemon.team) {
          pokemon.addItem(Item.AMULET_COIN)
        }
      }
    )
  }
}

export class HiddenPowerDStrategy extends HiddenPowerStrategy {
  process(
    unown: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(unown, state, board, target, crit)
    const player = unown.player
    if (player && !unown.isGhostOpponent) {
      const x = getFirstAvailablePositionInBench(player.board)
      if (x !== undefined) {
        const ditto = PokemonFactory.createPokemonFromName(Pkm.DITTO, player)
        ditto.positionX = x
        ditto.positionY = 0
        player.board.set(ditto.id, ditto)
      }
    }
  }
}

export class HiddenPowerEStrategy extends HiddenPowerStrategy {
  process(
    unown: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(unown, state, board, target, crit)
    if (!unown.isGhostOpponent && unown.player) {
      giveRandomEgg(unown.player, false, 1)
    }
  }
}

export class HiddenPowerFStrategy extends HiddenPowerStrategy {
  process(
    unown: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(unown, state, board, target, crit)
    const nbFishes = 3
    const player = unown.player

    if (player && !unown.isGhostOpponent) {
      for (let i = 0; i < nbFishes; i++) {
        const fish = unown.simulation.room.state.shop.pickFish(
          player,
          Item.SUPER_ROD
        )
        unown.simulation.room.spawnOnBench(player, fish, "fishing")
      }
    }
  }
}

export class HiddenPowerGStrategy extends HiddenPowerStrategy {
  process(
    unown: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(unown, state, board, target, crit)
    if (unown.player && !unown.isGhostOpponent) {
      unown.player.addMoney(5, true, unown)
    }
  }
}

export class HiddenPowerHStrategy extends HiddenPowerStrategy {
  process(
    unown: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(unown, state, board, target, crit)
    board.forEach(
      (x: number, y: number, pokemon: PokemonEntity | undefined) => {
        if (pokemon && unown.team === pokemon.team) {
          pokemon.handleHeal(pokemon.hp - pokemon.life, unown, 1, crit)
        }
      }
    )
  }
}

export class HiddenPowerIStrategy extends HiddenPowerStrategy {
  process(
    unown: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(unown, state, board, target, crit)
    if (unown.player && !unown.isGhostOpponent) {
      unown.player.items.push(pickRandomIn(ItemComponents))
    }
  }
}

export class HiddenPowerJStrategy extends HiddenPowerStrategy {
  process(
    unown: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(unown, state, board, target, crit)
    const numberToSpawn = 2
    for (let i = 0; i < numberToSpawn; i++) {
      const coord = unown.simulation.getClosestAvailablePlaceOnBoardToPokemon(
        unown,
        unown.team
      )
      const sharpedo = unown.simulation.addPokemon(
        PokemonFactory.createPokemonFromName(Pkm.SHARPEDO, unown.player),
        coord.x,
        coord.y,
        unown.team,
        false
      )
      sharpedo.addItem(Item.RAZOR_CLAW)
    }
  }
}

export class HiddenPowerKStrategy extends HiddenPowerStrategy {
  process(
    unown: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(unown, state, board, target, crit)
    const coord = unown.simulation.getClosestAvailablePlaceOnBoardToPokemon(
      unown,
      unown.team
    )
    const hitmonlee = unown.simulation.addPokemon(
      PokemonFactory.createPokemonFromName(Pkm.HITMONLEE, unown.player),
      coord.x,
      coord.y,
      unown.team,
      false
    )
    hitmonlee.addItem(Item.RED_ORB)
    hitmonlee.pp = hitmonlee.maxPP - 1
  }
}

export class HiddenPowerLStrategy extends HiddenPowerStrategy {
  process(
    unown: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(unown, state, board, target, crit)
    board.forEach(
      (x: number, y: number, pokemon: PokemonEntity | undefined) => {
        if (pokemon && unown.team !== pokemon.team) {
          pokemon.status.triggerLocked(5000, pokemon)
        }
      }
    )
  }
}

export class HiddenPowerMStrategy extends HiddenPowerStrategy {
  process(
    unown: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(unown, state, board, target, crit)
    board.forEach(
      (x: number, y: number, pokemon: PokemonEntity | undefined) => {
        if (pokemon && unown.team === pokemon.team) {
          pokemon.pp = pokemon.maxPP
        }
      }
    )
  }
}

export class HiddenPowerNStrategy extends HiddenPowerStrategy {
  process(
    unown: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(unown, state, board, target, crit)
    board.forEach(
      (x: number, y: number, pokemon: PokemonEntity | undefined) => {
        if (pokemon && unown.team === pokemon.team) {
          const target = board.getValue(pokemon.targetX, pokemon.targetY)
          if (target) {
            pokemon.addShield(50, unown, 1, false)
            AbilityStrategies[Ability.EXPLOSION].process(
              pokemon,
              pokemon.state,
              board,
              target,
              false
            )
            pokemon.simulation.room.broadcast(Transfer.ABILITY, {
              id: pokemon.simulation.id,
              skill: Ability.EXPLOSION,
              positionX: pokemon.positionX,
              positionY: pokemon.positionY,
              targetX: target.positionX,
              targetY: target.positionY,
              orientation: pokemon.orientation
            })
          }
        }
      }
    )
  }
}

export class HiddenPowerOStrategy extends HiddenPowerStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    if (pokemon.player) {
      pokemon.player.board.forEach((p: IPokemon) => {
        p.meal = pickRandomIn(Dishes as unknown as Item[])
      })
    }
  }
}

export class HiddenPowerPStrategy extends HiddenPowerStrategy {
  process(
    unown: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(unown, state, board, target, crit)
    const numberToSpawn = 5
    const bugs = [
      ...PRECOMPUTED_POKEMONS_PER_TYPE_AND_CATEGORY[Synergy.BUG].pokemons,
      ...PRECOMPUTED_POKEMONS_PER_TYPE_AND_CATEGORY[Synergy.BUG]
        .additionalPokemons
    ].filter((p) => getPokemonData(p).stars === 1) as Pkm[]
    for (let i = 0; i < numberToSpawn; i++) {
      const bug = pickRandomIn(bugs)
      const coord = unown.simulation.getClosestAvailablePlaceOnBoardToPokemon(
        unown,
        unown.team
      )
      unown.simulation.addPokemon(
        PokemonFactory.createPokemonFromName(bug, unown.player),
        coord.x,
        coord.y,
        unown.team,
        false
      )
    }
  }
}

export class HiddenPowerQStrategy extends HiddenPowerStrategy {
  process(
    unown: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(unown, state, board, target, crit)
    unown.simulation.redTeam.clear()
    unown.simulation.blueTeam.clear()
  }
}

export class HiddenPowerRStrategy extends HiddenPowerStrategy {
  process(
    unown: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(unown, state, board, target, crit)
    if (unown.player && !unown.isGhostOpponent) {
      unown.player.shopFreeRolls += 6
    }
  }
}

export class HiddenPowerSStrategy extends HiddenPowerStrategy {
  process(
    unown: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(unown, state, board, target, crit)
    board.forEach((x: number, y: number, enemy: PokemonEntity | undefined) => {
      if (enemy && unown.team != enemy.team) {
        enemy.status.triggerFreeze(2000, enemy)
      }
    })
  }
}

export class HiddenPowerTStrategy extends HiddenPowerStrategy {
  process(
    unown: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(unown, state, board, target, crit)
    if (unown.player && !unown.isGhostOpponent) {
      const player = unown.player
      pickNRandomIn(Berries, 3).forEach((item) => {
        player.items.push(item)
      })
    }
  }
}

export class HiddenPowerUStrategy extends HiddenPowerStrategy {
  process(
    unown: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(unown, state, board, target, crit)
    const coord = unown.simulation.getClosestAvailablePlaceOnBoardToPokemon(
      unown,
      unown.team
    )
    const uxie = unown.simulation.addPokemon(
      PokemonFactory.createPokemonFromName(Pkm.UXIE, unown.player),
      coord.x,
      coord.y,
      unown.team,
      false
    )
    uxie.addItem(Item.AQUA_EGG)
    uxie.pp = uxie.maxPP - 1
  }
}

export class HiddenPowerVStrategy extends HiddenPowerStrategy {
  process(
    unown: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(unown, state, board, target, crit)
    board.forEach((x: number, y: number, enemy: PokemonEntity | undefined) => {
      if (enemy && unown.team !== enemy.team) {
        AbilityStrategies[Ability.THUNDER].process(
          unown,
          unown.state,
          board,
          enemy,
          false
        )
        unown.simulation.room.broadcast(Transfer.ABILITY, {
          id: unown.simulation.id,
          skill: Ability.THUNDER,
          positionX: unown.positionX,
          positionY: unown.positionY,
          targetX: enemy.positionX,
          targetY: enemy.positionY,
          orientation: unown.orientation
        })
      }
    })
  }
}

export class HiddenPowerWStrategy extends HiddenPowerStrategy {
  process(
    unown: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(unown, state, board, target, crit)
    const player = unown.player
    if (player && !unown.isGhostOpponent) {
      const x = getFirstAvailablePositionInBench(player.board)
      if (x !== undefined) {
        const topSynergy = pickRandomIn(player.synergies.getTopSynergies())
        const candidates = (
          [
            ...PRECOMPUTED_POKEMONS_PER_TYPE_AND_CATEGORY[topSynergy].pokemons,
            ...PRECOMPUTED_POKEMONS_PER_TYPE_AND_CATEGORY[topSynergy]
              .additionalPokemons
          ] as Pkm[]
        )
          .map((p) => PokemonFactory.createPokemonFromName(p, player))
          .filter(
            (p) =>
              p.stars === 1 &&
              [Rarity.RARE, Rarity.EPIC, Rarity.ULTRA].includes(p.rarity)
          )

        const pokemon = pickRandomIn(candidates)
        pokemon.positionX = x
        pokemon.positionY = 0
        player.board.set(pokemon.id, pokemon)
        unown.simulation.room.checkEvolutionsAfterPokemonAcquired(player.id)
      }
    }
  }
}

export class HiddenPowerXStrategy extends HiddenPowerStrategy {
  process(
    unown: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(unown, state, board, target, crit)
    board.forEach(
      (x: number, y: number, pokemon: PokemonEntity | undefined) => {
        if (pokemon && unown.team === pokemon.team) {
          pokemon.addItem(Item.XRAY_VISION)
        }
      }
    )
  }
}

export class HiddenPowerYStrategy extends HiddenPowerStrategy {
  process(
    unown: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(unown, state, board, target, crit)
    const numberToSpawn = 2
    for (let i = 0; i < numberToSpawn; i++) {
      const coord = unown.simulation.getClosestAvailablePlaceOnBoardToPokemon(
        unown,
        unown.team
      )
      const meditite = unown.simulation.addPokemon(
        PokemonFactory.createPokemonFromName(Pkm.MEDITITE, unown.player),
        coord.x,
        coord.y,
        unown.team,
        false
      )
      meditite.addItem(Item.SOUL_DEW)
    }
  }
}

export class HiddenPowerZStrategy extends HiddenPowerStrategy {
  process(
    unown: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(unown, state, board, target, crit)
    board.forEach((x: number, y: number, enemy: PokemonEntity | undefined) => {
      if (enemy && unown.team != enemy.team) {
        enemy.status.triggerSleep(5000, enemy)
      }
    })
  }
}

export class HiddenPowerQMStrategy extends HiddenPowerStrategy {
  process(
    unown: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(unown, state, board, target, crit)
    const player = unown.player
    if (player && !unown.isGhostOpponent) {
      const stageLevel = unown.simulation.stageLevel
      const candidates = getUnownsPoolPerStage(stageLevel).filter(
        (u) => u !== Pkm.UNOWN_QUESTION
      )
      const nbUnownsObtained = 4
      for (let i = 0; i < nbUnownsObtained; i++) {
        const pkm = pickRandomIn(candidates)
        const x = getFirstAvailablePositionInBench(player.board)
        if (x !== undefined) {
          const pokemon = PokemonFactory.createPokemonFromName(pkm, player)
          pokemon.positionX = x
          pokemon.positionY = 0
          player.board.set(pokemon.id, pokemon)
        }
      }
    }
  }
}

export class HiddenPowerEMStrategy extends HiddenPowerStrategy {
  process(
    pokemon: PokemonEntity,
    state: PokemonState,
    board: Board,
    target: PokemonEntity,
    crit: boolean
  ) {
    super.process(pokemon, state, board, target, crit)
    const corners = [
      [0, 0],
      [board.columns - 1, 0],
      [0, board.rows - 1],
      [board.columns - 1, board.rows - 1]
    ]
    const stageLevel = pokemon.simulation.stageLevel
    const candidates = getUnownsPoolPerStage(stageLevel).filter(
      (u) => u !== Pkm.UNOWN_EXCLAMATION
    )
    corners.forEach(([x, y]) => {
      const unownName = pickRandomIn(candidates)
      const unown = PokemonFactory.createPokemonFromName(
        unownName,
        pokemon.player
      )
      const coord = pokemon.simulation.getClosestAvailablePlaceOnBoardTo(
        x,
        y,
        pokemon.team
      )
      pokemon.simulation.addPokemon(
        unown,
        coord.x,
        coord.y,
        pokemon.team,
        false
      )
    })
  }
}
