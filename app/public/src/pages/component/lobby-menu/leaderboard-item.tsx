import React from "react"
import {
  ILeaderboardBotInfo,
  ILeaderboardInfo
} from "../../../../../models/colyseus-models/leaderboard-info"
import { useAppDispatch } from "../../../hooks"
import { searchById } from "../../../stores/NetworkStore"
import { getAvatarSrc } from "../../../utils"
import { useTranslation } from "react-i18next"
import { EloBadge } from "../profile/elo-badge"

export default function LeaderboardItem(props: {
  item: ILeaderboardInfo | ILeaderboardBotInfo
  isBot: boolean
  noElo: boolean | undefined
}) {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  return (
    <div
      className="player-box clickable"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}
      onClick={() => {
        if (!props.isBot && "id" in props.item) {
          dispatch(searchById(props.item.id))
        }
      }}
    >
      <div style={{ display: "flex", gap: "5px" }}>
        <span className="player-rank">{props.item.rank}</span>
        <img
          src={getAvatarSrc(props.item.avatar)}
          className="pokemon-portrait"
        />
      </div>
      <span
        style={{
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          padding: "0 0.5em"
        }}
      >
        {props.isBot ? t(`pkm.${props.item.name}`) : props.item.name}
      </span>
      {props.isBot && (
        <span>
          {t("by")} @{(props.item as ILeaderboardBotInfo).author}
        </span>
      )}
      <div>
        {props.noElo ? props.item.value : <EloBadge elo={props.item.value} />}
      </div>
    </div>
  )
}
