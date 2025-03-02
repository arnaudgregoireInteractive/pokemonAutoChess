import React, { useState } from "react"
import { useDispatch } from "react-redux"
import { useTranslation } from "react-i18next"
import { useAppDispatch, useAppSelector } from "../../../hooks"
import {
  createTournament,
  remakeTournamentLobby,
  deleteTournament
} from "../../../stores/NetworkStore"
import { formatDate } from "../../utils/date"
import { ITournament, ITournamentBracket } from "../../../../../types/interfaces/Tournament"
import { entries } from "../../../../../utils/schemas"
import "./tournament-admin.css"

export function TournamentsAdmin() {
  const { t } = useTranslation()
  const dispatch = useDispatch()

  const [tournamentName, setTournamentName] = useState<string>("")
  const [tournamentDate, setTournamentDate] = useState<string>("")

  const tournaments = useAppSelector((state) => state.lobby.tournaments)
  const isLoading = !tournaments

  async function createNewTournament(event) {
    event.preventDefault()
    dispatch(
      createTournament({
        name: tournamentName,
        startDate: tournamentDate
      })
    )
  }

  return (
    <div className="tournaments-admin">
      <div className="content">
        {isLoading && <p>Loading...</p>}
        {tournaments.length === 0 && <p>No tournaments planned</p>}
        {tournaments && (
          <ul>
            {tournaments.map((tournament) => (
              <li key={tournament.id}>
                <TournamentAdminItem tournament={tournament} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="content my-box">
        <h2>Create a new tournament</h2>
        <form className="tournament-form" onSubmit={createNewTournament}>
          <label>
            Tournament name{" "}
            <input
              type="text"
              required
              value={tournamentName}
              style={{ width: "50ch" }}
              onChange={(event) => {
                setTournamentName(event.target.value)
              }}
            ></input>
          </label>
          <label>
            Start at{" "}
            <input
              type="datetime-local"
              required
              onChange={(event) => {
                if (event.target["validity"].valid) {
                  const d = new Date(event.target.value).toISOString()
                  setTournamentDate(d)
                }
              }}
            ></input>
          </label>
          <button type="submit" className="bubbly blue">
            Create tournament
          </button>
        </form>
      </div>
    </div>
  )
}

function TournamentAdminItem(props: { tournament: ITournament }) {
  const dispatch = useAppDispatch()
  const brackets = entries(props.tournament.brackets)

  return (
    <div className="my-box tournament-admin-item">
      <div style={{ display: "flex", alignItems: "center", gap: "0.5em" }}>
        <p className="name">{props.tournament.name}</p>
        <p className="date">{formatDate(new Date(props.tournament.startDate))}</p>
        <div className="spacer"></div>
        <div className="actions">
          <button
            className="remove-btn bubbly red"
            onClick={() => {
              if (confirm("Delete tournament and all registrations ?")) {
                dispatch(deleteTournament({ id: props.tournament.id! }))
              }
            }}
          >
            Delete tournament
          </button>
          <button
            className="bubbly orange"
            onClick={() => {
              if (
                confirm(
                  "Remake tournament lobbies ? Previous lobbies won't be deleted so do this only after a server reboot if lobbies have been lost"
                )
              ) {
                dispatch(remakeTournamentLobby({ tournamentId: props.tournament.id!, bracketId: "all" }))
              }
            }}
          >
            Remake all lobbies
          </button>
        </div>
      </div>
      {brackets.length > 0 && <TournamentBrackets tournamentId={props.tournament.id} brackets={brackets} />}
    </div>
  )
}

function TournamentBrackets(props: { tournamentId: string, brackets: [string, ITournamentBracket][] }) {
  const dispatch = useAppDispatch()
  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>Bracket ID</th>
            <th>Bracket name</th>
            <th>Players</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {props.brackets.map(([bracketId, bracket]) => (
            <tr key={bracketId}>
              <td>{bracketId}</td>
              <td>{bracket.name}</td>
              <td>{bracket.playersId.length}</td>
              <td>{bracket.finished ? "Finished" : "In progress"}</td>
              <td>
                <button className="bubbly orange" onClick={() => {
                  if (
                    confirm(
                      "Remake this tournament lobby ? Ongoing game will be deleted as well"
                    )
                  ) {
                    dispatch(remakeTournamentLobby({ tournamentId: props.tournamentId, bracketId }))
                  }
                }}>Remake</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}