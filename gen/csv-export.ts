import { createObjectCsvWriter } from "csv-writer"
import { Pkm, PkmDuos, PkmFamily, PkmIndex } from "../app/types/enum/Pokemon"
import PokemonFactory from "../app/models/pokemon-factory"
import { Ability } from "../app/types/enum/Ability"
import { logger } from "../app/utils/logger"
import { Synergy } from "../app/types/enum/Synergy"
import { getPokemonData } from "../app/models/precomputed/precomputed-pokemon-data"

const csvWriter = createObjectCsvWriter({
  path: "../app/models/precomputed/pokemons-data.csv",
  header: [
    { id: "index", title: "Index" },
    { id: "name", title: "Name" },
    { id: "category", title: "Category" },
    { id: "tier", title: "Tier" },
    { id: "additional", title: "Additional pick" },
    { id: "type1", title: "Type 1" },
    { id: "type2", title: "Type 2" },
    { id: "type3", title: "Type 3" },
    { id: "type4", title: "Type 4" },
    { id: "hp", title: "HP" },
    { id: "attack", title: "Attack" },
    { id: "speed", title: "Speed" },
    { id: "def", title: "Defense" },
    { id: "spedef", title: "Special Defense" },
    { id: "range", title: "Attack Range" },
    { id: "pp", title: "Max PP" },
    { id: "ability", title: "Ability" },
    { id: "family", title: "Family" },
    { id: "familyType1", title: "Family Type 1" },
    { id: "familyType2", title: "Family Type 2" },
    { id: "familyType3", title: "Family Type 3" },
    { id: "familyType4", title: "Family Type 4" },
    { id: "duo", title: "Duo" },
    { id: "regional", title: "Regional" },
    { id: "stages", title: "Nb stages" }
  ]
})

interface PokemonData {
  index: string
  name: string
  category: string
  tier: number
  stages: number
  additional: boolean
  regional: boolean
  type1: string
  type2: string
  type3: string
  type4: string
  hp: number
  attack: number
  speed: number
  def: number
  spedef: number
  range: number
  pp: number
  ability: string
  family: string
  familyType1: string
  familyType2: string
  familyType3: string
  familyType4: string
  duo: boolean
}

export function csvExport() {
  const data: PokemonData[] = []

  Object.values(Pkm)
    .sort((a, b) => PkmIndex[a].localeCompare(PkmIndex[b]))
    .forEach((pkm) => {
      const pokemon = PokemonFactory.createPokemonFromName(pkm)
      const pokemonData = getPokemonData(pkm)
      if (pokemon.skill != Ability.DEFAULT) {
        const family = Object.keys(PkmFamily).filter(
          (p) => PkmFamily[p] === PkmFamily[pkm]
        )
        const types: Synergy[] = pokemonData.types
        const familyTypes = [
          ...new Set(
            family.flatMap((p) => [
              ...Array.from(
                PokemonFactory.createPokemonFromName(p as Pkm).types.values()
              )
            ])
          )
        ]
        data.push({
          index: pokemon.index,
          name: pkm,
          category: pokemon.rarity,
          tier: pokemon.stars,
          stages:
            pokemon.stages ??
            Math.max(...family.map((p) => getPokemonData(p as Pkm).stars)),
          additional: pokemonData.additional,
          regional: pokemonData.regional,
          duo: Object.values(PkmDuos).some((duo) => duo.includes(pkm)),
          type1: types[0] ?? "",
          type2: types[1] ?? "",
          type3: types[2] ?? "",
          type4: types[3] ?? "",
          hp: pokemon.hp,
          attack: pokemon.atk,
          speed: pokemon.speed,
          def: pokemon.def,
          spedef: pokemon.speDef,
          range: pokemon.range,
          pp: pokemon.maxPP,
          ability: pokemon.skill,
          family: PkmFamily[pkm],
          familyType1: familyTypes[0] ?? "",
          familyType2: familyTypes[1] ?? "",
          familyType3: familyTypes[2] ?? "",
          familyType4: familyTypes[3] ?? ""
        })
      }
    })

  csvWriter
    .writeRecords(data)
    .then(() => logger.info("CSV export done successfully"))
}
