import { SetSchema } from "@colyseus/schema"
import {
  CraftableItems,
  Item,
  SynergyGivenByItem,
  SynergyStones
} from "../types/enum/Item"
import {
  Effect,
  OnItemGainedEffect,
  OnItemRemovedEffect,
  OnKillEffect,
  PeriodicEffect
} from "./effect"
import { pickRandomIn } from "../utils/random"
import { Pokemon } from "../models/colyseus-models/pokemon"
import { PokemonEntity } from "./pokemon-entity"
import { min } from "../utils/number"
import { DEFAULT_ATK_SPEED } from "../types/Config"
import { Pkm } from "../types/enum/Pokemon"
import PokemonFactory from "../models/pokemon-factory"
import { Stat } from "../types/enum/Game"

export function getWonderboxItems(existingItems: SetSchema<Item>): Item[] {
  const wonderboxItems: Item[] = []
  for (let n = 0; n < 2; n++) {
    const elligibleItems = CraftableItems.filter(
      (i) =>
        !SynergyStones.includes(i) &&
        !wonderboxItems.includes(i) &&
        !existingItems.has(i) &&
        i !== Item.WONDER_BOX
    )
    wonderboxItems.push(pickRandomIn(elligibleItems))
  }
  return wonderboxItems
}

export function onItemRemoved(item: Item, pokemon: Pokemon) {
  if (item in SynergyGivenByItem) {
    pokemon.types.delete(SynergyGivenByItem[item])
  }
}

export const ItemStats: { [item in Item]?: { [stat in Stat]?: number } } = {
  [Item.TWISTED_SPOON]: { [Stat.AP]: 10 },
  [Item.MAGNET]: { [Stat.ATK_SPEED]: 10 },
  [Item.BLACK_GLASSES]: { [Stat.CRIT_CHANCE]: 10 },
  [Item.MIRACLE_SEED]: { [Stat.SHIELD]: 15 },
  [Item.CHARCOAL]: { [Stat.ATK]: 3 },
  [Item.NEVER_MELT_ICE]: { [Stat.SPE_DEF]: 3 },
  [Item.HEART_SCALE]: { [Stat.DEF]: 3 },
  [Item.MYSTIC_WATER]: { [Stat.PP]: 15 },
  [Item.OLD_AMBER]: {},
  [Item.DAWN_STONE]: { [Stat.AP]: 10 },
  [Item.WATER_STONE]: { [Stat.PP]: 15 },
  [Item.THUNDER_STONE]: { [Stat.ATK_SPEED]: 10 },
  [Item.FIRE_STONE]: { [Stat.ATK]: 3 },
  [Item.MOON_STONE]: { [Stat.DEF]: 3 },
  [Item.DUSK_STONE]: { [Stat.CRIT_CHANCE]: 10 },
  [Item.LEAF_STONE]: { [Stat.SHIELD]: 15 },
  [Item.ICE_STONE]: { [Stat.SPE_DEF]: 3 },
  [Item.CHOICE_SPECS]: { [Stat.AP]: 100 },
  [Item.SOUL_DEW]: { [Stat.AP]: 10, [Stat.PP]: 15 },
  [Item.UPGRADE]: { [Stat.AP]: 10, [Stat.ATK_SPEED]: 10 },
  [Item.REAPER_CLOTH]: { [Stat.AP]: 10, [Stat.CRIT_CHANCE]: 20 },
  [Item.POKEMONOMICON]: { [Stat.AP]: 10, [Stat.SHIELD]: 15 },
  [Item.POWER_LENS]: { [Stat.AP]: 10, [Stat.SPE_DEF]: 10 },
  [Item.SHELL_BELL]: { [Stat.AP]: 10, [Stat.ATK]: 3 },
  [Item.LUCKY_EGG]: { [Stat.AP]: 60, [Stat.DEF]: 12, [Stat.LUCK]: 50 },
  [Item.AQUA_EGG]: { [Stat.PP]: 50 },
  [Item.BLUE_ORB]: { [Stat.PP]: 15, [Stat.ATK_SPEED]: 10 },
  [Item.SCOPE_LENS]: { [Stat.PP]: 15, [Stat.CRIT_CHANCE]: 25 },
  [Item.STAR_DUST]: { [Stat.PP]: 15, [Stat.SHIELD]: 15 },
  [Item.GREEN_ORB]: { [Stat.PP]: 15, [Stat.SPE_DEF]: 3 },
  [Item.MANA_SCARF]: { [Stat.PP]: 15, [Stat.ATK]: 3 },
  [Item.SMOKE_BALL]: { [Stat.PP]: 15, [Stat.DEF]: 3 },
  [Item.XRAY_VISION]: { [Stat.ATK_SPEED]: 50 },
  [Item.RAZOR_FANG]: {
    [Stat.ATK_SPEED]: 10,
    [Stat.CRIT_CHANCE]: 10,
    [Stat.CRIT_POWER]: 100
  },
  [Item.GRACIDEA_FLOWER]: { [Stat.ATK_SPEED]: 10, [Stat.SHIELD]: 15 },
  [Item.CHOICE_SCARF]: { [Stat.ATK_SPEED]: 10, [Stat.SPE_DEF]: 3 },
  [Item.PUNCHING_GLOVE]: { [Stat.ATK_SPEED]: 10, [Stat.ATK]: 3 },
  [Item.DEFENSIVE_RIBBON]: { [Stat.ATK_SPEED]: 10, [Stat.DEF]: 3 },
  [Item.WONDER_BOX]: { [Stat.CRIT_CHANCE]: 10 },
  [Item.CLEANSE_TAG]: { [Stat.CRIT_CHANCE]: 10, [Stat.SHIELD]: 15 },
  [Item.WIDE_LENS]: { [Stat.CRIT_CHANCE]: 10, [Stat.SPE_DEF]: 3 },
  [Item.RAZOR_CLAW]: { [Stat.CRIT_CHANCE]: 50, [Stat.ATK]: 3 },
  [Item.FLUFFY_TAIL]: { [Stat.CRIT_CHANCE]: 10, [Stat.DEF]: 3 },
  [Item.KINGS_ROCK]: { [Stat.SHIELD]: 100 },
  [Item.SHINY_CHARM]: { [Stat.SHIELD]: 15, [Stat.SPE_DEF]: 3 },
  [Item.PROTECTIVE_PADS]: { [Stat.SHIELD]: 60, [Stat.ATK]: 6 },
  [Item.MAX_REVIVE]: { [Stat.SHIELD]: 15, [Stat.DEF]: 3 },
  [Item.ASSAULT_VEST]: { [Stat.SPE_DEF]: 40 },
  [Item.AMULET_COIN]: {},
  [Item.POKE_DOLL]: { [Stat.DEF]: 3, [Stat.SPE_DEF]: 3 },
  [Item.RED_ORB]: { [Stat.ATK]: 10 },
  [Item.FLAME_ORB]: { [Stat.ATK]: 5, [Stat.DEF]: 3 },
  [Item.ROCKY_HELMET]: { [Stat.DEF]: 25 },
  [Item.ELECTIRIZER]: { [Stat.ATK_SPEED]: 30 },
  [Item.MAGMARIZER]: { [Stat.ATK]: 5 },
  [Item.MACHO_BRACE]: { [Stat.ATK]: 15, [Stat.ATK_SPEED]: -15 },
  [Item.LIGHT_BALL]: { [Stat.AP]: 75 },
  [Item.TOXIC_ORB]: { [Stat.SHIELD]: 15, [Stat.SPE_DEF]: 4 },
  [Item.METRONOME]: { [Stat.PP]: 5 },
  [Item.METAL_COAT]: { [Stat.DEF]: 10, [Stat.SPE_DEF]: 10 },
  [Item.SWIFT_WING]: { [Stat.ATK_SPEED]: 30 },
  [Item.HARD_STONE]: { [Stat.SHIELD]: 100 },
  [Item.BIG_NUGGET]: {
    [Stat.DEF]: 10,
    [Stat.SPE_DEF]: 10
  },
  [Item.INCENSE]: { [Stat.SPE_DEF]: 10, [Stat.AP]: 30 },
  [Item.EVIOLITE]: {
    [Stat.HP]: 100,
    [Stat.ATK]: 10,
    [Stat.AP]: 50,
    [Stat.DEF]: 10,
    [Stat.SPE_DEF]: 10
  },
  [Item.GOLD_BOTTLE_CAP]: {
    [Stat.LUCK]: 50
  },
  [Item.COMET_SHARD]: { [Stat.ATK]: 12 },
  [Item.ABSORB_BULB]: { [Stat.DEF]: 15, [Stat.SPE_DEF]: 15 },
  [Item.TEAL_MASK]: { [Stat.SHIELD]: 50 },
  [Item.WELLSPRING_MASK]: { [Stat.SHIELD]: 50 },
  [Item.CORNERSTONE_MASK]: { [Stat.SHIELD]: 50 },
  [Item.HEARTHFLAME_MASK]: { [Stat.SHIELD]: 50 }
}

export const ItemEffects: { [i in Item]?: Effect[] } = {
  [Item.SOUL_DEW]: [
    new OnItemGainedEffect((pokemon) => {
      pokemon.effectsSet.add(new SoulDewEffect())
    }),
    new OnItemRemovedEffect((pokemon) => {
      for (const effect of pokemon.effectsSet) {
        if (effect instanceof SoulDewEffect) {
          pokemon.addAbilityPower(-10 * effect.count, pokemon, 0, false)
          pokemon.effectsSet.delete(effect)
          break
        }
      }
    })
  ],

  [Item.WIDE_LENS]: [
    new OnItemGainedEffect((pokemon) => {
      pokemon.range += 2
    }),
    new OnItemRemovedEffect((pokemon) => {
      pokemon.range = min(1)(pokemon.range - 2)
    })
  ],

  [Item.MAX_REVIVE]: [
    new OnItemGainedEffect((pokemon) => {
      pokemon.status.addResurrection(pokemon)
    }),
    new OnItemRemovedEffect((pokemon) => {
      pokemon.status.resurection = false
    })
  ],

  [Item.SWIFT_WING]: [
    new OnItemGainedEffect((pokemon) => {
      pokemon.addDodgeChance(0.1, pokemon, 0, false)
    }),
    new OnItemRemovedEffect((pokemon) => {
      pokemon.addDodgeChance(-0.1, pokemon, 0, false)
    })
  ],

  [Item.FLAME_ORB]: [
    new OnItemGainedEffect((pokemon) => {
      pokemon.addAttack(pokemon.baseAtk, pokemon, 0, false)
      pokemon.status.triggerBurn(
        60000,
        pokemon as PokemonEntity,
        pokemon as PokemonEntity
      )
    }),
    new OnItemRemovedEffect((pokemon) => {
      pokemon.addAttack(-pokemon.baseAtk, pokemon, 0, false)
      pokemon.status.burnCooldown = 0
    })
  ],

  [Item.TOXIC_ORB]: [
    new OnItemGainedEffect((pokemon) => {
      pokemon.addAttack(pokemon.baseAtk, pokemon, 0, false)
      pokemon.status.triggerPoison(
        60000,
        pokemon as PokemonEntity,
        pokemon as PokemonEntity
      )
    }),
    new OnItemRemovedEffect((pokemon) => {
      pokemon.addAttack(-pokemon.baseAtk, pokemon, 0, false)
      pokemon.status.poisonCooldown = 0
    })
  ],

  [Item.POKERUS_VIAL]: [
    new OnItemGainedEffect((pokemon) => {
      pokemon.status.triggerPokerus(pokemon)
    })
    // intentionally no item removal effect
  ],

  [Item.FLUFFY_TAIL]: [
    new OnItemGainedEffect((pokemon) => {
      pokemon.status.triggerRuneProtect(60000)
    }),
    new OnItemRemovedEffect((pokemon) => {
      pokemon.status.runeProtectCooldown = 0
    })
  ],

  [Item.KINGS_ROCK]: [
    new OnItemGainedEffect((pokemon) => {
      pokemon.addShield(0.3 * pokemon.baseHP, pokemon, 0, false)
    }),
    new OnItemRemovedEffect((pokemon) => {
      pokemon.addShield(-0.3 * pokemon.baseHP, pokemon, 0, false)
    })
  ],

  [Item.DYNAMAX_BAND]: [
    new OnItemGainedEffect((pokemon) => {
      pokemon.addMaxHP(2 * pokemon.baseHP, pokemon, 0, false)
    }),
    new OnItemRemovedEffect((pokemon) => {
      pokemon.addMaxHP(-2 * pokemon.baseHP, pokemon, 0, false)
    })
  ],

  [Item.GOLD_BOTTLE_CAP]: [
    new OnItemGainedEffect((pokemon) => {
      pokemon.addCritChance(pokemon.player?.money ?? 0, pokemon, 0, false)
      pokemon.addCritPower(pokemon.player?.money ?? 0, pokemon, 0, false)
    }),
    new OnItemRemovedEffect((pokemon) => {
      pokemon.addCritChance(-(pokemon.player?.money ?? 0), pokemon, 0, false)
      pokemon.addCritPower(-(pokemon.player?.money ?? 0), pokemon, 0, false)
    }),
    new OnKillEffect((pokemon, target, board) => {
      if (pokemon.player) {
        const isLastEnemy =
          board.cells.some(
            (p) =>
              p &&
              p.team !== pokemon.team &&
              (p.life > 0 || p.status.resurecting)
          ) === false
        pokemon.count.bottleCapCount++
        const moneyGained = isLastEnemy ? pokemon.count.bottleCapCount + 1 : 1
        pokemon.player.addMoney(moneyGained, true, pokemon)
        pokemon.count.moneyCount += moneyGained
      }
    })
  ],

  [Item.REPEAT_BALL]: [
    new OnItemGainedEffect((pokemon) => {
      pokemon.addShield(
        Math.floor(
          ((pokemon.player?.rerollCount ?? 0) + pokemon.simulation.stageLevel) /
            2
        ) * 2,
        pokemon,
        0,
        false
      )
      pokemon.addAttackSpeed(
        Math.floor(
          ((pokemon.player?.rerollCount ?? 0) + pokemon.simulation.stageLevel) /
            2
        ),
        pokemon,
        0,
        false
      )
    }),
    new OnItemRemovedEffect((pokemon) => {
      pokemon.addAbilityPower(
        -Math.floor(
          ((pokemon.player?.rerollCount ?? 0) + pokemon.simulation.stageLevel) /
            2
        ),
        pokemon,
        0,
        false
      )
    })
  ],

  [Item.SACRED_ASH]: [
    new OnItemGainedEffect((pokemon) => {
      pokemon.status.addResurrection(pokemon)
    }),
    new OnItemRemovedEffect((pokemon) => {
      pokemon.status.resurection = false
    })
  ],

  [Item.UPGRADE]: [
    new OnItemRemovedEffect((pokemon) => {
      pokemon.addAttackSpeed(-5 * pokemon.count.upgradeCount, pokemon, 0, false)
      pokemon.count.upgradeCount = 0
    })
  ],

  [Item.DEFENSIVE_RIBBON]: [
    new OnItemRemovedEffect((pokemon) => {
      const stacks = Math.floor(pokemon.count.defensiveRibbonCount / 2)
      pokemon.addAttack(-stacks, pokemon, 0, false)
      pokemon.addDefense(-2 * stacks, pokemon, 0, false)
      pokemon.addAttackSpeed(-5 * stacks, pokemon, 0, false)
      pokemon.count.defensiveRibbonCount = 0
    })
  ],

  [Item.AMULET_COIN]: [
    new OnKillEffect((pokemon) => {
      if (pokemon.player) {
        pokemon.player.addMoney(1, true, pokemon)
        pokemon.count.moneyCount += 1
        pokemon.count.amuletCoinCount += 1
      }
    })
  ],

  [Item.COMFEY]: [
    new OnItemGainedEffect((pokemon) => {
      const comfey = PokemonFactory.createPokemonFromName(Pkm.COMFEY)
      pokemon.addAbilityPower(comfey.ap, pokemon, 0, false)
      pokemon.addAttack(comfey.atk, pokemon, 0, false)
      pokemon.addAttackSpeed(
        comfey.atkSpeed - DEFAULT_ATK_SPEED,
        pokemon,
        0,
        false
      )
      pokemon.addMaxHP(comfey.hp, pokemon, 0, false)
      pokemon.addDefense(comfey.def, pokemon, 0, false)
      pokemon.addSpecialDefense(comfey.speDef, pokemon, 0, false)
    }),
    new OnItemRemovedEffect((pokemon) => {
      const comfey = PokemonFactory.createPokemonFromName(Pkm.COMFEY)
      pokemon.addAbilityPower(-comfey.ap, pokemon, 0, false)
      pokemon.addAttack(-comfey.atk, pokemon, 0, false)
      pokemon.addAttackSpeed(
        -(comfey.atkSpeed - DEFAULT_ATK_SPEED),
        pokemon,
        0,
        false
      )
      pokemon.addMaxHP(-comfey.hp, pokemon, 0, false)
      pokemon.addDefense(-comfey.def, pokemon, 0, false)
      pokemon.addSpecialDefense(-comfey.speDef, pokemon, 0, false)
    })
  ],

  [Item.MAGMARIZER]: [
    new OnItemRemovedEffect((pokemon) => {
      pokemon.addAttack(-pokemon.count.magmarizerCount, pokemon, 0, false)
      pokemon.count.magmarizerCount = 0
    })
  ]
}

export class SoulDewEffect extends PeriodicEffect {
  constructor() {
    super(
      (pokemon) => {
        pokemon.addAbilityPower(10, pokemon, 0, false)
        pokemon.count.soulDewCount++
      },
      Item.SOUL_DEW,
      1000
    )
  }
}
