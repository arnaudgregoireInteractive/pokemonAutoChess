import React, { useState } from "react"
import { Tab, Tabs, TabList, TabPanel } from "react-tabs"
import { Pkm, PkmFamily, PkmIndex } from "../../../../../types/enum/Pokemon"
import { PRECOMPUTED_POKEMONS_PER_TYPE } from "../../../../../models/precomputed"
import { Item } from "../../../../../types/enum/Item"
import { getPortraitSrc } from "../../../utils"
import { PkmWithConfig, Emotion } from "../../../../../types"
import SynergyIcon from "../icons/synergy-icon"
import { Synergy } from "../../../../../types/enum/Synergy"
import { GamePokemonDetail } from "../game/game-pokemon-detail"
import { Tooltip } from "react-tooltip"
import PokemonFactory, {
  isAdditionalPick
} from "../../../../../models/pokemon-factory"
import { groupBy } from "../../../../../utils/array"
import { Pokemon } from "../../../../../models/colyseus-models/pokemon"
import { Rarity } from "../../../../../types/enum/Game"
import { RarityColor } from "../../../../../types/Config"
import { useTranslation } from "react-i18next"
import { cc } from "../../utils/jsx"
import ReactDOM from "react-dom"

export default function PokemonPicker(props: {
  selectEntity: React.Dispatch<React.SetStateAction<PkmWithConfig | Item>>
}) {
  const tabs = [...Object.keys(PRECOMPUTED_POKEMONS_PER_TYPE), "none"]
  const pokemonsPerTab = tabs.map((t) =>
    (t === "none"
      ? [Pkm.KECLEON, Pkm.ARCEUS]
      : PRECOMPUTED_POKEMONS_PER_TYPE[t]
    ).map((p) => PokemonFactory.createPokemonFromName(p))
  )

  return (
    <Tabs className="nes-container" id="pokemon-picker">
      <TabList>
        {tabs.map((t) => {
          return (
            <Tab key={t}>
              {t === "none" ? "?" : <SynergyIcon type={t as Synergy} />}
            </Tab>
          )
        })}
      </TabList>

      {pokemonsPerTab.map((pokemons, i) => {
        return (
          <TabPanel key={"pokemons-tab-" + i}>
            <PokemonPickerTab
              selectEntity={props.selectEntity}
              pokemons={pokemons}
            />
          </TabPanel>
        )
      })}
    </Tabs>
  )
}

function PokemonPickerTab(props: {
  pokemons: Pokemon[]
  selectEntity: React.Dispatch<React.SetStateAction<PkmWithConfig | Item>>
}) {
  const { t } = useTranslation()
  const [hoveredPokemon, setHoveredPokemon] = useState<Pokemon>()

  function handleOnDragStart(e: React.DragEvent, name: Pkm) {
    setHoveredPokemon(undefined)
    e.dataTransfer.setData("pokemon", name)
  }

  const pokemonsPerRarity = groupBy(props.pokemons, (p) => p.rarity)
  for (const rarity in pokemonsPerRarity) {
    pokemonsPerRarity[rarity].sort((a: Pokemon, b: Pokemon) => {
      const isAddA = isAdditionalPick(a.name),
        isAddB = isAdditionalPick(b.name)
      if (isAddA !== isAddB) return +isAddA - +isAddB
      return PkmFamily[a.name] === PkmFamily[b.name]
        ? a.stars - b.stars
        : PkmIndex[PkmFamily[a.name]].localeCompare(PkmIndex[PkmFamily[b.name]])
    })
  }

  return (
    <>
      <dl id="rarity-grid">
        {(
          [
            Rarity.COMMON,
            Rarity.UNIQUE,
            Rarity.UNCOMMON,
            Rarity.LEGENDARY,
            Rarity.RARE,
            Rarity.EPIC,
            Rarity.HATCH,
            Rarity.ULTRA,
            Rarity.SPECIAL
          ] as Rarity[]
        ).map((rarity) => (
          <React.Fragment key={rarity}>
            <dt style={{ color: RarityColor[rarity] }}>
              {t(`rarity.${rarity}`)}
            </dt>
            <dd style={{ display: "flex", flexWrap: "wrap" }}>
              {(pokemonsPerRarity[rarity] ?? []).map((p) => (
                <div
                  className={cc("pokemon-portrait", {
                    additional: isAdditionalPick(p.name)
                  })}
                  onClick={() => {
                    props.selectEntity({
                      name: p.name,
                      emotion: Emotion.NORMAL,
                      shiny: false
                    })
                  }}
                  onMouseOver={() => {
                    setHoveredPokemon(p)
                  }}
                  key={p.name}
                  data-tooltip-id="pokemon-detail"
                  draggable
                  onDragStart={(e) => handleOnDragStart(e, p.name)}
                >
                  <img src={getPortraitSrc(p.index)} />
                </div>
              ))}
            </dd>
          </React.Fragment>
        ))}
      </dl>
      {hoveredPokemon &&
        ReactDOM.createPortal(
          <Tooltip
            id="pokemon-detail"
            className="custom-theme-tooltip game-pokemon-detail-tooltip"
            float
          >
            <GamePokemonDetail pokemon={hoveredPokemon} />
          </Tooltip>,
          document.body
        )}
    </>
  )
}
