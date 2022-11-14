import { Client, Room } from "colyseus.js"
import { RoomAvailable } from "colyseus.js"
import firebase from "firebase/compat/app"
import React, { Dispatch, SetStateAction, useState } from "react"
import { useAppDispatch, useAppSelector } from "../../../hooks"
import { ICustomLobbyState } from "../../../../../types"
import RoomItem from "./room-item"
import PreparationState from "../../../../../rooms/states/preparation-state"
import { leaveLobby } from "../../../stores/LobbyStore"

const ulStyle = {
  listStyle: "none",
  padding: "0px"
}

export default function RoomMenu(props: {
  toPreparation: boolean
  setToPreparation: Dispatch<SetStateAction<boolean>>
}) {
  const dispatch = useAppDispatch()
  const allRooms: RoomAvailable[] = useAppSelector(
    (state) => state.lobby.allRooms
  )
  const client: Client = useAppSelector((state) => state.network.client)
  const lobby: Room<ICustomLobbyState> | undefined = useAppSelector(
    (state) => state.network.lobby
  )
  const uid: string = useAppSelector((state) => state.network.uid)
  const [isJoining, setJoining] = useState<boolean>(false)

  async function create() {
    if (lobby && !props.toPreparation && !isJoining) {
      setJoining(true)
      const token = await firebase.auth().currentUser?.getIdToken()
      if (token) {
        const room: Room<PreparationState> = await client.create("room", {
          idToken: token,
          ownerId: uid
        })
        localStorage.setItem("lastRoomId", room.id)
        localStorage.setItem("lastSessionId", room.sessionId)
        await lobby.leave()
        room.connection.close()
        dispatch(leaveLobby())
        props.setToPreparation(true)
      }
    }
  }

  async function join(id: string) {
    if (lobby && !props.toPreparation && !isJoining) {
      setJoining(true)
      const token = await firebase.auth().currentUser?.getIdToken()
      if (token) {
        const room: Room<PreparationState> = await client.joinById(id, {
          idToken: token
        })
        localStorage.setItem("lastRoomId", room.id)
        localStorage.setItem("lastSessionId", room.sessionId)
        await lobby.leave()
        room.connection.close()
        dispatch(leaveLobby())
        props.setToPreparation(true)
      }
    }
  }

  return (
    <div
      className="nes-container"
      style={{
        margin: "10px",
        display: "flex",
        flexFlow: "column",
        flexBasis: "25%",
        height: "90vh",
        background: 'url("assets/ui/back1.png")',
        backgroundSize: "cover"
      }}
    >
      <h1 className="my-h1">Available Rooms</h1>
      <p style={{ textAlign: "center", color: "white", fontSize: "1.5vw" }}>
        Click Create Room to play!
      </p>
      <ul style={ulStyle} className="hidden-scrollable">
        {allRooms.map((r) => (
          <li key={r.roomId}>
            <RoomItem room={r} click={join} />
          </li>
        ))}
      </ul>
      <button
        style={{
          position: "absolute",
          bottom: "20px",
          left: "8%",
          width: "80%"
        }}
        onClick={create}
        className="bubbly-success is-success"
      >
        Create Room
      </button>
    </div>
  )
}
