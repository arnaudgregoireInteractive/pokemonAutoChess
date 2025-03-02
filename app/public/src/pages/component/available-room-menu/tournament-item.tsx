import React from "react"
import { useTranslation } from "react-i18next"
import { Tab, TabList, TabPanel, Tabs } from "react-tabs"
import { useAppDispatch, useAppSelector } from "../../../hooks"
import { formatDate } from "../../utils/date"
import { participateInTournament } from "../../../stores/NetworkStore"
import { EloBadge } from "../profile/elo-badge"
import { getTournamentStage } from "../../../../../core/tournament-logic"
import { entries, values } from "../../../../../utils/schemas"
import {
  TournamentPlayerSchema,
  TournamentSchema
} from "../../../../../models/colyseus-models/tournament"
import { average } from "../../../../../utils/number"
import { cc } from "../../utils/jsx"
import { TOURNAMENT_REGISTRATION_TIME } from "../../../../../types/Config"
import PokemonPortrait from "../pokemon-portrait"
import "./tournament-item.css"

export default function TournamentItem(props: {
  tournament: TournamentSchema
}) {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const uid: string = useAppSelector((state) => state.network.uid)
  const participating = props.tournament.players.has(uid)
  const startTime = new Date(props.tournament.startDate).getTime()
  const tournamentFinished = props.tournament.finished
  const tournamentStarted = Date.now() > startTime && !tournamentFinished
  const registrationsOpen =
    Date.now() > startTime - TOURNAMENT_REGISTRATION_TIME && !tournamentStarted
  const players = values(props.tournament.players)
  const brackets = values(props.tournament.brackets)
  const remainingPlayers = players.filter((p) => !p.eliminated)
  const nbStages = Math.max(...players.map((p) => p.ranks.length))

  const sortedPlayers = entries(props.tournament.players).sort(
    ([idA, a], [idB, b]) => {
      if (a.eliminated !== b.eliminated) return a.eliminated ? +1 : -1
      if (a.ranks.length !== b.ranks.length)
        return b.ranks.length - a.ranks.length
      if (tournamentFinished && a.ranks.length === nbStages) {
        // sort finalists by last rank
        return (a.ranks[a.ranks.length - 1] ?? 8) - (b.ranks[b.ranks.length - 1] ?? 8)
      }
      return average(...values(a.ranks)) - average(...values(b.ranks))
    }
  )

  return (
    <div className="tournament-item my-box">
      <span className="tournament-name">
        <img
          width="32"
          height="32"
          src="assets/ui/tournament.svg"
          style={{ marginRight: "0.5em", verticalAlign: "text-bottom" }}
        />
        {props.tournament.name}
      </span>
      {tournamentFinished ? (
        <div>{getTournamentStage(props.tournament)}</div>
      ) : tournamentStarted ? (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>{getTournamentStage(props.tournament)}</span>
          <span>
            {t("players_remaining")}: {remainingPlayers.length}
          </span>
        </div>
      ) : (
        <p>
          {t("starts_at")}{" "}
          {formatDate(new Date(props.tournament.startDate), {
            dateStyle: "long"
          })}
        </p>
      )}
      {!tournamentStarted && !tournamentFinished && (
        <div className="actions">
          {participating ? (
            <button
              className="participate-btn bubbly green"
              title={t("cancel_tournament_participation")}
              disabled={!registrationsOpen}
              onClick={() => {
                dispatch(
                  participateInTournament({
                    tournamentId: props.tournament.id,
                    participate: false
                  })
                )
              }}
            >
              {t("participating")}
            </button>
          ) : registrationsOpen ? (
            <button
              className="participate-btn bubbly blue"
              title={t("register_tournament_participation")}
              onClick={() => {
                dispatch(
                  participateInTournament({
                    tournamentId: props.tournament.id,
                    participate: true
                  })
                )
              }}
            >
              {t("participate")}
            </button>
          ) : null}
        </div>
      )}
      <Tabs>
        <TabList>
          {tournamentStarted && <Tab>{t("brackets")}</Tab>}
          {(tournamentStarted || tournamentFinished) && (
            <Tab>{t("ranking")}</Tab>
          )}
          {(registrationsOpen || tournamentStarted) && (
            <Tab>
              {t("participants")} ({players.length})
            </Tab>
          )}
        </TabList>
        {!registrationsOpen && !tournamentStarted && (
          <p>{t("registrations_open_info")}</p>
        )}
        {tournamentStarted && (
          <TabPanel className="brackets">
            {brackets.map((bracket) => (
              <div className="bracket" key={bracket.name}>
                <p>{bracket.name}</p>
                <ul>
                  {values(bracket.playersId).map((id, i) => (
                    <TournamentPlayer
                      key={"player" + i}
                      playerId={id}
                      player={props.tournament.players.get(id)!}
                      rank={i + 1}
                      showScore={false}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </TabPanel>
        )}
        {(tournamentStarted || tournamentFinished) && (
          <TabPanel className="ranking">
            <ul>
              {sortedPlayers.map(([id, player], i) => (
                <TournamentPlayer
                  key={"player" + i}
                  playerId={id}
                  player={player}
                  rank={i + 1}
                  showScore={true}
                />
              ))}
            </ul>
          </TabPanel>
        )}
        {(registrationsOpen || tournamentStarted) && (
          <TabPanel className="participants">
            <ul>
              {entries(props.tournament.players).map(([id, player], i) => (
                <TournamentPlayer
                  key={"player" + i}
                  playerId={id}
                  player={player}
                  rank={i + 1}
                  showScore={false}
                />
              ))}
            </ul>
          </TabPanel>
        )}
      </Tabs>
    </div>
  )
}

export function TournamentPlayer(props: {
  playerId: string
  player: TournamentPlayerSchema
  rank: number
  showScore: boolean
}) {
  const uid: string = useAppSelector((state) => state.network.uid)
  return (
    <li
      className={cc("player-box", {
        myself: props.playerId === uid,
        eliminated: props.showScore && props.player.eliminated
      })}
    >
      {props.showScore && <span className="player-rank">{props.rank}</span>}
      <PokemonPortrait avatar={props.player.avatar} />
      <p>
        <span className="player-name">{props.player.name}</span>
      </p>
      {props.showScore ? (
        <span className="player-ranks">
          {props.player.ranks.length > 0 ? props.player.ranks.join(", ") : "-"}
        </span>
      ) : (
        <EloBadge elo={props.player.elo} />
      )}
    </li>
  )
}
