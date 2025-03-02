import { ArraySchema, MapSchema } from "@colyseus/schema"
import {
  TournamentBracketSchema,
  TournamentPlayerSchema
} from "../../models/colyseus-models/tournament"

export interface ITournament {
  id: string
  name: string
  startDate: string
  players: MapSchema<TournamentPlayerSchema>
  brackets: MapSchema<TournamentBracketSchema>
  finished: boolean
}

export interface ITournamentPlayer {
  name: string
  avatar: string
  elo: number
  ranks: ArraySchema<number>
  eliminated: boolean
}

export interface ITournamentBracket {
  name: string
  playersId: ArraySchema<string>
  finished: boolean
}
