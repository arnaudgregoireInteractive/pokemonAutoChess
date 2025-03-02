import { ArraySchema } from "@colyseus/schema"
import {
  ITournament,
  ITournamentBracket,
  ITournamentPlayer
} from "../types/interfaces/Tournament"

export function getRemainingPlayers(
  tournament: ITournament
): (ITournamentPlayer & { id: string })[] {
  const remainingPlayers: (ITournamentPlayer & { id: string })[] = []
  tournament.players.forEach((player, playerId) => {
    if (!player.eliminated)
      remainingPlayers.push({
        id: playerId,
        ...player
      })
  })
  return remainingPlayers
}

export function getTournamentStage(tournament: ITournament): string {
  if (tournament.finished) return "Finished"
  const remainingPlayers = getRemainingPlayers(tournament)
  if (remainingPlayers.length <= 8) return "FINALS"
  if (remainingPlayers.length <= 16) return "Semi-Finals"
  if (remainingPlayers.length <= 32) return "Quarter-Finals"
  else {
    const n = Math.floor(Math.log(remainingPlayers.length) / Math.log(2))
    return `Round of ${Math.pow(2, n)}`
  }
}

export function makeBrackets(tournament: ITournament): ITournamentBracket[] {
  const remainingPlayers = getRemainingPlayers(tournament)
  remainingPlayers.sort((a, b) => b.elo - a.elo)

  // find the ideal number of brackets depending on the number of remaining players
  let minDelta = 8
  let idealNbPerBracket = 8
  for (let nbPerBracket = 5; nbPerBracket <= 8; nbPerBracket++) {
    let delta = Math.abs(
      Math.round(remainingPlayers.length / nbPerBracket) -
        remainingPlayers.length / nbPerBracket
    )
    delta += 8 - nbPerBracket // favorizing 8 player lobbies
    if (delta <= minDelta) {
      minDelta = delta
      idealNbPerBracket = nbPerBracket
    }
  }

  const nbBrackets = Math.ceil(remainingPlayers.length / idealNbPerBracket)
  const brackets: ITournamentBracket[] = []

  for (let i = 0; i < nbBrackets; i++) {
    let bracketName = getTournamentStage(tournament)
    if (nbBrackets > 1) {
      bracketName += ` #${i + 1}`
    }
    const bracket: ITournamentBracket = {
      name: bracketName,
      playersId: new ArraySchema(),
      finished: false
    }
    brackets.push(bracket)
  }

  let b = 0
  while (remainingPlayers.length > 0) {
    const bracket = brackets[b]
    /* Seeding: The number one ranked plays the lowest ranked, the number two ranked plays the second lowest ranked and so on.*/
    if (remainingPlayers.length > 0)
      bracket.playersId.push(remainingPlayers.shift()!.id)
    if (remainingPlayers.length > nbBrackets - b - 1)
      // try to balance number of players between brackets
      bracket.playersId.push(remainingPlayers.pop()!.id)
    b = (b + 1) % nbBrackets
  }

  return brackets
}
