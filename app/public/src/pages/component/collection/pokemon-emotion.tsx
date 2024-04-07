import React from "react"
import { useTranslation } from "react-i18next"
import { Emotion } from "../../../../../types"
import { getEmotionCost } from "../../../../../types/Config"
import { getPortraitSrc } from "../../../utils"
import { cc } from "../../utils/jsx"
import "./pokemon-emotion.css"

export default function PokemonEmotion(props: {
  index: string
  shiny: boolean
  unlocked: boolean | undefined
  path: string
  emotion: Emotion
  dust: number
  onClick: () => void
}) {
  const { t } = useTranslation()
  const cost = getEmotionCost(props.emotion, props.shiny)
  const canUnlock = !props.unlocked && cost <= props.dust

  return (
    <div
      className={cc("my-box", "clickable", "pokemon-emotion", {
        unlocked: !!props.unlocked,
        unlockable: canUnlock,
        shimmer: canUnlock
      })}
      onClick={props.onClick}
    >
      <img src={getPortraitSrc(props.index, props.shiny, props.emotion)} />
      {props.unlocked ? (
        <p>{t(`emotion.${props.emotion}`)}</p>
      ) : (
        <p>
          <span>{cost}</span>
          <img src={getPortraitSrc(props.index)} />
        </p>
      )}
    </div>
  )
}
