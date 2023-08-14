import React from "react"
import { useAppSelector } from "../../../hooks"
import { useAppDispatch } from "../../../hooks"
import { levelClick } from "../../../stores/NetworkStore"
import { Money } from "../icons/money"
import { useTranslation } from "react-i18next"

export default function GameExperience() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const experienceManager = useAppSelector(
    (state) => state.game.experienceManager
  )
  const isLevelMax = experienceManager.level >= 9

  return (
    <div className="nes-container game-experience">
      <span>
        {t("lvl")} {experienceManager.level}
      </span>
      <button
        className="bubbly orange buy-xp-button"
        title={t("buy_xp_tooltip")}
        onClick={() => {
          dispatch(levelClick())
        }}
      >
        <Money value={t("buy_xp")} />
      </button>
      <div className="progress-bar">
        <progress
          className="nes-progress"
          value={isLevelMax ? 0 : experienceManager.experience}
          max={experienceManager.expNeeded}
        ></progress>
        <span>
          {isLevelMax
            ? "Max Level"
            : experienceManager.experience + "/" + experienceManager.expNeeded}
        </span>
      </div>
    </div>
  )
}
