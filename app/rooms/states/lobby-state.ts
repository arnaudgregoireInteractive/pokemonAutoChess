import { Schema, MapSchema, type, ArraySchema } from "@colyseus/schema"
import { nanoid } from "nanoid"
import LobbyUser from "../../models/colyseus-models/lobby-user"
import Message from "../../models/colyseus-models/message"
import chatV2 from "../../models/mongo-models/chat-v2"
import { SpecialLobbyType } from "../../types/enum/Game"
import { sendAt } from "cron"
import {
  GREATBALL_RANKED_LOBBY_CRON,
  ULTRABALL_RANKED_LOBBY_CRON
} from "../../types/Config"

export default class LobbyState extends Schema {
  @type([Message]) messages = new ArraySchema<Message>()
  @type({ map: LobbyUser }) users = new MapSchema<LobbyUser>()
  @type("number") nextSpecialLobbyDate: number = 0
  @type("string") nextSpecialLobbyType: SpecialLobbyType | "" = ""

  addMessage(
    payload: string,
    authorId: string,
    author: string,
    avatar: string
  ) {
    const id = nanoid()
    const time = Date.now()
    const message = new Message(id, payload, authorId, author, avatar, time)
    chatV2
      .create({
        id: id,
        payload: payload,
        authorId: authorId,
        author: author,
        avatar: avatar,
        time: time
      })
      .then(() => {
        this.messages.push(message)
      })
  }

  removeMessage(id: string) {
    chatV2.deleteMany({ id: id }).then((result) => {
      //logger.debug("deleted message id", id, result)
      const messageIndex = this.messages.findIndex((m) => m.id === id)
      if (messageIndex !== -1) {
        this.messages.splice(messageIndex, 1)
      }
    })
  }

  removeMessages(authorId: string) {
    let i = this.messages.length
    while (i--) {
      if (this.messages[i].authorId === authorId) {
        this.messages.splice(i, 1)
      }
    }
    chatV2.deleteMany({ authorId: authorId })
  }

  addAnnouncement(message: string) {
    this.addMessage(message, "server", "Server Announcement", "0294/Joyous")
  }

  getNextSpecialLobbyDate() {
    const nextGreatBallRanked = sendAt(
      GREATBALL_RANKED_LOBBY_CRON
    ).toUnixInteger()
    const nextUltraBallRanked = sendAt(
      ULTRABALL_RANKED_LOBBY_CRON
    ).toUnixInteger()
    this.nextSpecialLobbyDate = Math.min(
      nextGreatBallRanked,
      nextUltraBallRanked
    )

    if (this.nextSpecialLobbyDate === nextGreatBallRanked) {
      this.nextSpecialLobbyType = "GREATBALL_RANKED"
    } else if (this.nextSpecialLobbyDate === nextUltraBallRanked) {
      this.nextSpecialLobbyType = "ULTRABALL_RANKED"
    }
  }
}
