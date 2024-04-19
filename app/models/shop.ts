import GameState from "../rooms/states/game-state"
import {
  DITTO_RATE,
  FishRarityProbability,
  NB_UNIQUE_PROPOSITIONS,
  PoolSize,
  RarityProbabilityPerLevel,
  SHOP_SIZE
} from "../types/Config"
import { Ability } from "../types/enum/Ability"
import { Effect } from "../types/enum/Effect"
import { Rarity } from "../types/enum/Game"
import {
  Pkm,
  PkmDuos,
  PkmFamily,
  PkmProposition,
  getUnownsPoolPerStage
} from "../types/enum/Pokemon"
import { SpecialGameRule } from "../types/enum/SpecialGameRule"
import { Synergy } from "../types/enum/Synergy"
import { removeInArray } from "../utils/array"
import { logger } from "../utils/logger"
import { clamp } from "../utils/number"
import { chance, pickNRandomIn, pickRandomIn } from "../utils/random"
import { values } from "../utils/schemas"
import Player from "./colyseus-models/player"
import { PRECOMPUTED_POKEMONS_PER_RARITY, getPokemonData } from "./precomputed"
import { PVEStages } from "./pve-stages"

export function getPoolSize(rarity: Rarity, maxStars: number): number {
  return PoolSize[rarity][clamp(maxStars, 1, 3) - 1]
}

function getRegularsTier1(pokemons: Pkm[]) {
  return pokemons.filter((p) => {
    const pokemonData = getPokemonData(p)
    return (
      pokemonData.stars === 1 &&
      pokemonData.skill !== Ability.DEFAULT &&
      !pokemonData.additional &&
      !pokemonData.regional
    )
  })
}

export function getAdditionalsTier1(pokemons: Pkm[]) {
  return pokemons.filter((p) => {
    const pokemonData = getPokemonData(p)
    return (
      pokemonData.stars === 1 &&
      pokemonData.skill !== Ability.DEFAULT &&
      pokemonData.additional
    )
  })
}

const CommonShop = getRegularsTier1(PRECOMPUTED_POKEMONS_PER_RARITY.COMMON)
const UncommonShop = getRegularsTier1(PRECOMPUTED_POKEMONS_PER_RARITY.UNCOMMON)
const RareShop = getRegularsTier1(PRECOMPUTED_POKEMONS_PER_RARITY.RARE)
const EpicShop = getRegularsTier1(PRECOMPUTED_POKEMONS_PER_RARITY.EPIC)
const UltraShop = getRegularsTier1(PRECOMPUTED_POKEMONS_PER_RARITY.ULTRA)

export default class Shop {
  commonPool: Pkm[] = new Array<Pkm>()
  uncommonPool: Pkm[] = new Array<Pkm>()
  rarePool: Pkm[] = new Array<Pkm>()
  epicPool: Pkm[] = new Array<Pkm>()
  ultraPool: Pkm[] = new Array<Pkm>()
  constructor() {
    this.commonPool = CommonShop.flatMap((pkm) =>
      Array(getPoolSize(Rarity.COMMON, 3)).fill(pkm)
    )
    this.uncommonPool = UncommonShop.flatMap((pkm) =>
      Array(getPoolSize(Rarity.UNCOMMON, pkm === Pkm.EEVEE ? 2 : 3)).fill(pkm)
    )
    this.rarePool = RareShop.flatMap((pkm) =>
      Array(getPoolSize(Rarity.RARE, 3)).fill(pkm)
    )
    this.epicPool = EpicShop.flatMap((pkm) =>
      Array(getPoolSize(Rarity.EPIC, 3)).fill(pkm)
    )
    this.ultraPool = UltraShop.flatMap((pkm) =>
      Array(getPoolSize(Rarity.ULTRA, 3)).fill(pkm)
    )
  }

  getPool(rarity: Rarity) {
    switch (rarity) {
      case Rarity.COMMON:
        return this.commonPool
      case Rarity.UNCOMMON:
        return this.uncommonPool
      case Rarity.RARE:
        return this.rarePool
      case Rarity.EPIC:
        return this.epicPool
      case Rarity.ULTRA:
        return this.ultraPool
    }
  }

  getRegionalPool(rarity: Rarity, player: Player) {
    switch (rarity) {
      case Rarity.COMMON:
        return player.commonRegionalPool
      case Rarity.UNCOMMON:
        return player.uncommonRegionalPool
      case Rarity.RARE:
        return player.rareRegionalPool
      case Rarity.EPIC:
        return player.epicRegionalPool
      case Rarity.ULTRA:
        return player.ultraRegionalPool
    }
  }

  addAdditionalPokemon(pkmProposition: PkmProposition) {
    const pkm: Pkm =
      pkmProposition in PkmDuos ? PkmDuos[pkmProposition][0] : pkmProposition
    const { rarity, stages } = getPokemonData(pkm)
    const pool = this.getPool(rarity)
    const entityNumber = getPoolSize(rarity, stages)
    if (pool) {
      for (let n = 0; n < entityNumber; n++) {
        pool.push(pkm)
      }
    }
  }

  addRegionalPokemon(pkm: Pkm, player: Player) {
    console.log("adding regional pokemon", pkm)
    const { rarity, stages } = getPokemonData(pkm)
    const pool = this.getRegionalPool(rarity, player)
    const entityNumber = getPoolSize(rarity, stages)
    if (pool) {
      for (let n = 0; n < entityNumber; n++) {
        pool.push(pkm)
      }
    }
  }

  releasePokemon(pkm: Pkm, player: Player) {
    const { stars, rarity, regional } = getPokemonData(pkm)
    const family = PkmFamily[pkm]
    let entityNumber = stars >= 3 ? 9 : stars === 2 ? 3 : 1
    const duo = Object.entries(PkmDuos).find(([key, duo]) => duo.includes(pkm))
    if (duo) {
      // duos increase the number in pool by one if selling both
      // but it is negligible and cannot be abused
      entityNumber = Math.ceil(entityNumber / 2)
    }

    const pool = regional
      ? this.getRegionalPool(rarity, player)
      : this.getPool(rarity)
    if (pool) {
      for (let n = 0; n < entityNumber; n++) {
        pool.push(family)
      }
    }
  }

  refillShop(player: Player, state: GameState) {
    // No need to release pokemons since they won't be changed
    const PkmList = player.shop.map((pokemon) => {
      if (pokemon != Pkm.MAGIKARP && pokemon != Pkm.DEFAULT) {
        return pokemon
      }
      return this.pickPokemon(player, state)
    })

    for (let i = 0; i < SHOP_SIZE; i++) {
      player.shop[i] = PkmList[i]
    }
  }

  assignShop(player: Player, manualRefresh: boolean, state: GameState) {
    player.shop.forEach((pkm) => this.releasePokemon(pkm, player))

    if (player.effects.has(Effect.EERIE_SPELL) && !manualRefresh) {
      const unowns = getUnownsPoolPerStage(state.stageLevel)
      for (let i = 0; i < SHOP_SIZE; i++) {
        player.shop[i] = pickRandomIn(unowns)
      }
    } else {
      for (let i = 0; i < SHOP_SIZE; i++) {
        player.shop[i] = this.pickPokemon(player, state)
      }
    }
  }

  assignUniquePropositions(
    player: Player,
    list: PkmProposition[],
    synergies: Synergy[]
  ) {
    const propositions = [...list]

    // ensure we have at least one synergy per proposition
    if (synergies.length > NB_UNIQUE_PROPOSITIONS) {
      synergies = pickNRandomIn(synergies, NB_UNIQUE_PROPOSITIONS)
    } else if (synergies.length < NB_UNIQUE_PROPOSITIONS) {
      while (synergies.length < NB_UNIQUE_PROPOSITIONS) {
        synergies = synergies.concat(pickRandomIn(Synergy))
      }
    }

    for (let i = 0; i < NB_UNIQUE_PROPOSITIONS; i++) {
      const synergy = synergies[i]
      const candidates = propositions.filter((m) => {
        const pkm: Pkm = m in PkmDuos ? PkmDuos[m][0] : m
        return getPokemonData(pkm).types.includes(synergy)
      })
      const selectedProposition = pickRandomIn(
        candidates.length > 0 ? candidates : propositions
      )
      removeInArray(propositions, selectedProposition)
      player.pokemonsProposition.push(selectedProposition)
    }
  }

  getRandomPokemonFromPool(
    rarity: Rarity,
    player: Player,
    finals: Set<Pkm>,
    specificTypeWanted?: Synergy
  ): Pkm {
    let pkm = Pkm.MAGIKARP
    const candidates = (this.getPool(rarity) ?? [])
      .concat(this.getRegionalPool(rarity, player) ?? [])
      .filter((pkm) => {
        const types = getPokemonData(pkm).types
        const isOfTypeWanted = specificTypeWanted
          ? types.includes(specificTypeWanted)
          : types.includes(Synergy.WILD) === false

        return isOfTypeWanted && !finals.has(pkm)
      })

    if (candidates.length > 0) {
      pkm = pickRandomIn(candidates)
    } else if (specificTypeWanted === Synergy.WATER) {
      return Pkm.MAGIKARP // if no more water in pool, return magikarp
    } else if (specificTypeWanted) {
      return this.getRandomPokemonFromPool(rarity, player, finals) // could not find of specific type, return another type
    }

    const { regional } = getPokemonData(pkm)
    const pool = regional
      ? this.getRegionalPool(rarity, player)
      : this.getPool(rarity)
    if (pool) {
      const index = pool.indexOf(pkm)
      if (index >= 0) {
        pool.splice(index, 1)
      }
    }

    return pkm
  }

  pickPokemon(player: Player, state: GameState) {
    if (
      state.specialGameRule !== SpecialGameRule.DITTO_PARTY &&
      chance(DITTO_RATE)
    ) {
      return Pkm.DITTO
    }

    const UNOWN_RATE = 0.05
    if (
      (player.effects.has(Effect.LIGHT_SCREEN) ||
        player.effects.has(Effect.EERIE_SPELL)) &&
      chance(UNOWN_RATE)
    ) {
      const unowns = getUnownsPoolPerStage(state.stageLevel)
      return pickRandomIn(unowns)
    }

    const isPVE = state.stageLevel in PVEStages
    const wildChance = player.effects.has(Effect.QUICK_FEET)
      ? 0.05
      : player.effects.has(Effect.RUN_AWAY)
      ? 0.1
      : player.effects.has(Effect.HUSTLE)
      ? 0.15
      : player.effects.has(Effect.BERSERK)
      ? 0.2
      : isPVE
      ? 0.05
      : 0

    const finals = new Set(
      values(player.board)
        .filter((pokemon) => pokemon.final)
        .map((pokemon) => PkmFamily[pokemon.name])
    )

    let specificTypeWanted: Synergy | undefined = undefined
    if (wildChance > 0 && chance(wildChance)) {
      specificTypeWanted = Synergy.WILD
    }

    const probas = RarityProbabilityPerLevel[player.experienceManager.level]
    const rarity_seed = Math.random()
    let i = 0,
      threshold = 0
    while (rarity_seed > threshold) {
      threshold += probas[i]
      i++
    }
    const rarity = [
      Rarity.COMMON,
      Rarity.UNCOMMON,
      Rarity.RARE,
      Rarity.EPIC,
      Rarity.ULTRA
    ][i - 1]

    if (!rarity) {
      logger.error(
        `error in shop while picking seed = ${rarity_seed}, threshold = ${threshold}`
      )
      return Pkm.MAGIKARP
    }

    return this.getRandomPokemonFromPool(
      rarity,
      player,
      finals,
      specificTypeWanted
    )
  }

  fishPokemon(player: Player, fishingLevel: number): Pkm {
    const rarityProbability = FishRarityProbability[fishingLevel]
    const rarity_seed = Math.random()
    let fish: Pkm = Pkm.MAGIKARP
    let threshold = 0
    const finals = new Set(
      values(player.board)
        .filter((pokemon) => pokemon.final)
        .map((pokemon) => PkmFamily[pokemon.name])
    )

    let rarity = Rarity.SPECIAL
    for (const r in rarityProbability) {
      threshold += rarityProbability[r]
      if (rarity_seed < threshold) {
        rarity = r as Rarity
      }
    }

    if (rarity === Rarity.SPECIAL) {
      if (fishingLevel === 1) fish = Pkm.MAGIKARP
      if (fishingLevel === 2) fish = Pkm.FEEBAS
      //if (fishingLevel >= 3) fish = Pkm.WISHIWASHI // when available
    } else {
      fish = this.getRandomPokemonFromPool(
        rarity,
        player,
        finals,
        Synergy.WATER
      )
    }

    return fish
  }
}
