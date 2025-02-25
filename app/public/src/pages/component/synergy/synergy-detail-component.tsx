import React from "react"
import { useTranslation } from "react-i18next"
import { getPokemonData } from "../../../../../models/precomputed/precomputed-pokemon-data"
import { PRECOMPUTED_POKEMONS_PER_TYPE_AND_CATEGORY } from "../../../../../models/precomputed/precomputed-types-and-categories"
import { PVEStages } from "../../../../../models/pve-stages"
import { SynergyEffects } from "../../../../../models/effects"
import { IPlayer } from "../../../../../types"
import {
  RarityColor,
  RarityCost,
  SynergyTriggers
} from "../../../../../types/Config"
import { Pkm, PkmFamily, PkmRegionalVariants } from "../../../../../types/enum/Pokemon"
import { Synergy } from "../../../../../types/enum/Synergy"
import { SpecialGameRule } from "../../../../../types/enum/SpecialGameRule"
import { IPokemonData } from "../../../../../types/interfaces/PokemonData"
import { roundToNDigits } from "../../../../../utils/number"
import { values } from "../../../../../utils/schemas"
import { useAppSelector } from "../../../hooks"
import { getPortraitSrc } from "../../../../../utils/avatar"
import { addIconsToDescription } from "../../utils/descriptions"
import { cc } from "../../utils/jsx"
import SynergyIcon from "../icons/synergy-icon"
import { EffectDescriptionComponent } from "./effect-description"
import { usePreference } from "../../../preferences"

export default function SynergyDetailComponent(props: {
  type: Synergy
  value: number
}) {
  const { t } = useTranslation()
  const additionalPokemons = useAppSelector(
    (state) => state.game.additionalPokemons
  )
  const stageLevel = useAppSelector((state) => state.game.stageLevel)
  const currentPlayer = useAppSelector((state) =>
    state.game.players.find((p) => p.id === state.game.currentPlayerId)
  )
  const specialGameRule = useAppSelector((state) => state.game.specialGameRule)

  const levelReached = SynergyTriggers[props.type]
    .filter((n) => n <= props.value)
    .at(-1)

  const regulars = PRECOMPUTED_POKEMONS_PER_TYPE_AND_CATEGORY[
    props.type
  ].pokemons
    .filter(
      (p, i, arr) => arr.findIndex((x) => PkmFamily[x] === PkmFamily[p]) === i // remove duplicates of same family
    )
    .map((p) => getPokemonData(p as Pkm))
    .sort((a, b) => RarityCost[a.rarity] - RarityCost[b.rarity])

  const baseVariant = (pkm: Pkm): Pkm => (Object.keys(PkmRegionalVariants) as Pkm[]).find((p) =>
    PkmRegionalVariants[p]!.includes(pkm)
  ) ?? pkm

  const additionals = PRECOMPUTED_POKEMONS_PER_TYPE_AND_CATEGORY[
    props.type
  ].additionalPokemons
    .filter((p) =>
      additionalPokemons.includes(baseVariant(PkmFamily[p])) ||
      specialGameRule === SpecialGameRule.EVERYONE_IS_HERE
    )
    .filter(
      (p, i, arr) => arr.findIndex((x) => PkmFamily[x] === PkmFamily[p]) === i // remove duplicates of same family
    )
    .map((p) => getPokemonData(p as Pkm))

  const uniques = PRECOMPUTED_POKEMONS_PER_TYPE_AND_CATEGORY[
    props.type
  ].uniquePokemons
    .filter(
      (p, i, arr) => arr.findIndex((x) => PkmFamily[x] === PkmFamily[p]) === i // remove duplicates of same family
    )
    .map((p) => getPokemonData(p as Pkm))

  const legendaries = PRECOMPUTED_POKEMONS_PER_TYPE_AND_CATEGORY[
    props.type
  ].legendaryPokemons
    .filter(
      (p, i, arr) => arr.findIndex((x) => PkmFamily[x] === PkmFamily[p]) === i // remove duplicates of same family
    )
    .map((p) => getPokemonData(p as Pkm))

  const specials = PRECOMPUTED_POKEMONS_PER_TYPE_AND_CATEGORY[
    props.type
  ].specialPokemons
    .filter(
      (p, i, arr) => arr.findIndex((x) => PkmFamily[x] === PkmFamily[p]) === i // remove duplicates of same family
    )
    .map((p) => getPokemonData(p as Pkm))

  let additionalInfo = ''

  if (props.type === Synergy.WILD && currentPlayer) {
    const isPVE = stageLevel in PVEStages
    additionalInfo = t('synergy_description.WILD_ADDITIONAL', { wildChance: roundToNDigits(currentPlayer.wildChance * 100 + (isPVE ? 5 : 0), 1) })
  }

  if (props.type === Synergy.BABY && currentPlayer) {
    additionalInfo = t('synergy_description.BABY_CHANCE_STACKED', { eggChance: roundToNDigits((levelReached === 7 ? currentPlayer.goldenEggChance : currentPlayer.eggChance) * 100, 1) })
  }

  return (
    <div style={{ maxWidth: "560px" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <SynergyIcon type={props.type} size="40px" />
        <h3 style={{ margin: 0 }}>{t(`synergy.${props.type}`)}</h3>
      </div>
      <p style={{ whiteSpace: "pre-wrap" }}>{addIconsToDescription(t(`synergy_description.${props.type}`, { additionalInfo }))}</p>

      {SynergyEffects[props.type].map((d, i) => {
        return (
          <div
            key={d}
            style={{
              color:
                levelReached === SynergyTriggers[props.type][i]
                  ? "#fff"
                  : "#e8e8e8",
              backgroundColor:
                levelReached === SynergyTriggers[props.type][i]
                  ? "var(--color-bg-secondary)"
                  : "rgba(84, 89, 107,0)",
              border:
                levelReached === SynergyTriggers[props.type][i]
                  ? "var(--border-thick)"
                  : "none",
              borderRadius: "12px",
              padding: "5px"
            }}
          >
            <h4 style={{ fontSize: "1.2em", marginBottom: 0 }}>
              ({SynergyTriggers[props.type][i]}) {t(`effect.${d}`)}
            </h4>
            <EffectDescriptionComponent effect={d} />
          </div>
        )
      })}
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {regulars.map((p) => (
          <PokemonPortrait p={p} key={p.name} type={props.type} player={currentPlayer} />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", marginTop: "0.5em" }}>
        {additionals.map((p) => (
          <PokemonPortrait p={p} key={p.name} type={props.type} player={currentPlayer} />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", marginTop: "0.5em" }}>
        {uniques.map((p) => (
          <PokemonPortrait p={p} key={p.name} type={props.type} player={currentPlayer} />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", marginTop: "0.5em" }}>
        {legendaries.map((p) => (
          <PokemonPortrait p={p} key={p.name} type={props.type} player={currentPlayer} />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", marginTop: "0.5em" }}>
        {specials.map((p) => (
          <PokemonPortrait p={p} key={p.name} type={props.type} player={currentPlayer} />
        ))}
      </div>
    </div>
  )
}

function PokemonPortrait(props: { p: IPokemonData, type: Synergy, player?: IPlayer }) {
  const [antialiasing] = usePreference("antialiasing")
  const isOnTeam = (p: Pkm) => props.player != null && values(props.player.board).some(
    (x) => PkmFamily[x.name] === PkmFamily[p] && x.types.has(props.type)
  )
  return (
    <div
      className={cc("pokemon-portrait", {
        additional: props.p.additional,
        regional: props.p.regional,
        acquired: isOnTeam(props.p.name)
      })}
      key={props.p.name}
      style={{ color: RarityColor[props.p.rarity], border: "3px solid " + RarityColor[props.p.rarity] }}
    >
      <img src={getPortraitSrc(props.p.index)} className={cc({ pixelated: !antialiasing })} />
    </div>
  )
}
