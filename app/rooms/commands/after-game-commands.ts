import { Command } from "@colyseus/command"
import { GameUser } from "../../models/colyseus-models/game-user"
import UserMetadata from "../../models/mongo-models/user-metadata"
import { Emotion, Transfer } from "../../types"
import { logger } from "../../utils/logger"

export class OnJoinCommand extends Command {
  async execute({ client, options, auth }) {
    try {
      const user = await UserMetadata.findOne({ uid: auth.uid })
      if (user) {
        this.state.users.set(
          client.auth.uid,
          new GameUser(
            user.uid,
            user.displayName,
            user.elo,
            user.avatar,
            false,
            false,
            user.title,
            user.role,
            false
          )
        )

        this.room.broadcast(Transfer.MESSAGES, {
          author: "Server",
          payload: `${user.displayName} joined.`,
          avatar: user.avatar,
          time: Date.now()
        })
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

export class OnLeaveCommand extends Command {
  execute({ client, consented }) {
    try {
      this.room.broadcast(Transfer.MESSAGES, {
        author: "Server",
        payload: `${client.auth.displayName} left.`,
        avatar: `0037/Teary-Eyed`,
        time: Date.now()
      })
      this.state.users.delete(client.auth.uid)
    } catch (error) {
      logger.error(error)
    }
  }
}
