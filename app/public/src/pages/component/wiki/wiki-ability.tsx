import React, { useState } from "react"
import ReactDOM from "react-dom"
import { useTranslation } from "react-i18next"
import { Tooltip } from "react-tooltip"
import {
  getPokemonData,
  PRECOMPUTED_POKEMONS_PER_ABILITY
} from "../../../../../models/precomputed"
import { Ability } from "../../../../../types/enum/Ability"
import { Pkm } from "../../../../../types/enum/Pokemon"
import { getPortraitSrc } from "../../../utils"
import { addIconsToDescription } from "../../utils/descriptions"
import { cc } from "../../utils/jsx"
import { GamePokemonDetail } from "../game/game-pokemon-detail"

export default function WikiAbility() {
  const { t } = useTranslation()
  const [hoveredPokemon, setHoveredPokemon] = useState<Pkm>()

  return (
    <div id="wiki-ability">
      <ul>
        {(Object.keys(Ability) as Ability[])
          .filter((a) => a !== Ability.DEFAULT)
          .sort((a, b) => t(`ability.${a}`).localeCompare(t(`ability.${b}`)))
          .map((ability) => {
            return (
              <li key={ability} className="my-box">
                <div>
                  <h2>{t(`ability.${ability}`)}</h2>
                  <p>
                    {addIconsToDescription(t(`ability_description.${ability}`))}
                  </p>
                </div>
                <div>
                  <ul>
                    {PRECOMPUTED_POKEMONS_PER_ABILITY[ability]
                      .map((p) => getPokemonData(p))
                      .map((p) => (
                        <li key={p.name}>
                          <div
                            className={cc("pokemon-portrait", {
                              additional: p.additional
                            })}
                            data-tooltip-id="pokemon-detail"
                            onMouseOver={() => {
                              setHoveredPokemon(p.name)
                            }}
                          >
                            <img src={getPortraitSrc(p.index)} />
                          </div>
                        </li>
                      ))}
                  </ul>
                </div>
              </li>
            )
          })}
      </ul>
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
    </div>
  )
}
