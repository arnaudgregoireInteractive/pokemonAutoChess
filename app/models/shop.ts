import PokemonFactory from "./pokemon-factory"
import { Pkm, PkmFamily } from "../types/enum/Pokemon"
import Player from "./colyseus-models/player"
import { Probability, DITTO_RATE, PoolSize, CommonShop, EpicShop, LegendaryShop, RareShop, UncommonShop } from "../types/Config"
import { Rarity } from "../types/enum/Game"
import { pickRandomIn, shuffleArray } from "../utils/random"
import { clamp } from "../utils/number"
import { removeInArray } from "../utils/array"
import { Pokemon } from "./colyseus-models/pokemon"


export function getPoolSize(rarity: Rarity, maxStars: number): number {
  return PoolSize[rarity][clamp(maxStars, 1, 3) - 1]
}

export default class Shop {
  commonPool: Map<Pkm, number> = new Map<Pkm, number>()
  uncommonPool: Map<Pkm, number> = new Map<Pkm, number>()
  rarePool: Map<Pkm, number> = new Map<Pkm, number>()
  epicPool: Map<Pkm, number> = new Map<Pkm, number>()
  legendaryPool: Map<Pkm, number> = new Map<Pkm, number>()
  constructor() {
    CommonShop.forEach((pkm) => {
      this.commonPool.set(pkm, getPoolSize(Rarity.COMMON, 3))
    })
    UncommonShop.forEach((pkm) => {
      const maxStars = pkm === Pkm.EEVEE ? 2 : 3
      this.uncommonPool.set(pkm, getPoolSize(Rarity.UNCOMMON, maxStars))
    })
    RareShop.forEach((pkm) => {
      this.rarePool.set(pkm, getPoolSize(Rarity.RARE, 3))
    })
    EpicShop.forEach((pkm) => {
      this.epicPool.set(pkm, getPoolSize(Rarity.EPIC, 3))
    })
    LegendaryShop.forEach((pkm) => {
      this.legendaryPool.set(pkm, getPoolSize(Rarity.LEGENDARY, 3))
    })
  }

  addAdditionalPokemon(pkm: Pkm) {
    const p = PokemonFactory.createPokemonFromName(pkm)
    switch (p.rarity) {
      case Rarity.COMMON:
        this.commonPool.set(pkm, getPoolSize(Rarity.COMMON, 2))
        break
      case Rarity.UNCOMMON:
        this.uncommonPool.set(pkm, getPoolSize(Rarity.UNCOMMON, 2))
        break
      case Rarity.RARE:
        this.rarePool.set(pkm, getPoolSize(Rarity.RARE, 2))
        break
      case Rarity.EPIC:
        this.epicPool.set(pkm, getPoolSize(Rarity.EPIC, 2))
        break
      case Rarity.LEGENDARY:
        this.legendaryPool.set(pkm, getPoolSize(Rarity.LEGENDARY, 2))
        break
      default:
        break
    }
  }

  releasePokemon(pkm: Pkm) {
    const pokemon = PokemonFactory.createPokemonFromName(pkm)
    if (pokemon.name !== Pkm.MAGIKARP) {
      const family = PkmFamily[pokemon.name]
      const entityNumber = pokemon.stars === 3 ? 9 : pokemon.stars === 2 ? 3 : 1
      if (pokemon.rarity === Rarity.COMMON) {
        const value = this.commonPool.get(family)
        if (value !== undefined) {
          this.commonPool.set(family, value + entityNumber)
        }
      } else if (pokemon.rarity === Rarity.UNCOMMON) {
        const value = this.uncommonPool.get(family)
        if (value !== undefined) {
          this.uncommonPool.set(family, value + entityNumber)
        }
      } else if (pokemon.rarity === Rarity.RARE) {
        const value = this.rarePool.get(family)
        if (value !== undefined) {
          this.rarePool.set(family, value + entityNumber)
        }
      } else if (pokemon.rarity === Rarity.EPIC) {
        const value = this.epicPool.get(family)
        if (value !== undefined) {
          this.epicPool.set(family, value + entityNumber)
        }
      } else if (pokemon.rarity === Rarity.LEGENDARY) {
        const value = this.legendaryPool.get(family)
        if (value !== undefined) {
          this.legendaryPool.set(family, value + entityNumber)
        }
      }
    }
  }

  assignShop(player: Player) {
    player.shop.forEach((pkm) => this.releasePokemon(pkm))

    for (let i = 0; i < 6; i++) {
      let pokemon = this.pickPokemon(player)
      const seed = Math.random()
      if (seed < DITTO_RATE) {
        pokemon = Pkm.DITTO
      }
      player.shop[i] = pokemon
    }
  }

  assignMythicalPropositions(player: Player, list: Pkm[]) {
    const mythicals = [...list]
    const synergies = Array.from(player.synergies)
      .filter(([synergy, value]) => value > 0)
      .map(([synergy, value]) => synergy)
    const top2Synergies = Array.from(player.synergies)
      .sort(([s1, v1], [s2, v2]) => v2 - v1)
      .slice(0, 2)
      .map(([synergy, value]) => synergy)

    const mythicalsTopSynergy = mythicals.filter((m) =>
      PokemonFactory.createPokemonFromName(m).types.some((t) =>
        top2Synergies.includes(t)
      )
    )
    const mythicalsCommonSynergy = mythicals.filter((m) =>
      PokemonFactory.createPokemonFromName(m).types.some((t) =>
        synergies.includes(t)
      )
    )

    const shop: Pkm[] = []
    if (mythicalsTopSynergy.length > 0) {
      const pkm = pickRandomIn(mythicalsTopSynergy)
      removeInArray(mythicals, pkm)
      removeInArray(mythicalsTopSynergy, pkm)
      removeInArray(mythicalsCommonSynergy, pkm)
      shop.push(pkm)
    }

    for (let i = 0; i < 2; i++) {
      if (mythicalsCommonSynergy.length > 0) {
        const pkm = pickRandomIn(mythicalsCommonSynergy)
        removeInArray(mythicals, pkm)
        removeInArray(mythicalsCommonSynergy, pkm)
        shop.push(pkm)
      }
    }

    while (shop.length < 6) {
      const pkm = pickRandomIn(mythicals)
      removeInArray(mythicals, pkm)
      shop.push(pkm)
    }

    shuffleArray(shop)
    shop.forEach((pkm) => player.pokemonsProposition.push(pkm))
  }

  getRandomPokemonFromPool(pool: Map<Pkm, number>, finals: Array<Pkm>): Pkm {
    let pkm = Pkm.MAGIKARP
    const potential = new Array<Pkm>()
    pool.forEach((value, pkm) => {
      if (!finals.includes(pkm)) {
        for (let i = 0; i < value; i++) {
          potential.push(pkm)
        }
      }
    })
    if (potential.length > 0) {
      pkm = pickRandomIn(potential)
    }
    const val = pool.get(pkm)
    if (val !== undefined) {
      pool.set(pkm, Math.max(0, val - 1))
    }
    //console.log("taking a ", pkm, "from the shop", val)
    return pkm
  }

  pickPokemon(player: Player) {
    const playerProbality = Probability[player.experienceManager.level]
    const seed = Math.random()
    let pokemon = Pkm.MAGIKARP
    let threshold = 0
    const finals = new Array<Pkm>()

    player.board.forEach((pokemon: Pokemon) => {
      if (pokemon.final) {
        finals.push(PkmFamily[pokemon.name])
      }
    })

    for (let i = 0; i < playerProbality.length; i++) {
      threshold += playerProbality[i]
      if (seed < threshold) {
        switch (i) {
          case 0:
            pokemon = this.getRandomPokemonFromPool(this.commonPool, finals)
            break
          case 1:
            pokemon = this.getRandomPokemonFromPool(this.uncommonPool, finals)
            break
          case 2:
            pokemon = this.getRandomPokemonFromPool(this.rarePool, finals)
            break
          case 3:
            pokemon = this.getRandomPokemonFromPool(this.epicPool, finals)
            break
          case 4:
            pokemon = this.getRandomPokemonFromPool(this.legendaryPool, finals)
            break
          default:
            console.error(
              `error in shop while picking seed = ${seed}, threshold = ${threshold}, index = ${i}`
            )
            break
        }
        break
      }
    }
    return pokemon
  }
}
