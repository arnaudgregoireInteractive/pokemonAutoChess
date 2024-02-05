import { Command } from "@colyseus/command"
import { Client, matchMaker } from "colyseus"
import { FilterQuery } from "mongoose"
import os from "node:os"
import { memoryUsage } from "node:process"
import { GameUser, IGameUser } from "../../models/colyseus-models/game-user"
import { BotV2, IBot } from "../../models/mongo-models/bot-v2"
import UserMetadata, {
  IUserMetadata
} from "../../models/mongo-models/user-metadata"
import { IChatV2, Role, Transfer } from "../../types"
import { EloRankThreshold, MAX_PLAYERS_PER_LOBBY } from "../../types/Config"
import { BotDifficulty, LobbyType } from "../../types/enum/Game"
import { logger } from "../../utils/logger"
import { pickRandomIn } from "../../utils/random"
import { entries, values } from "../../utils/schemas"
import PreparationRoom from "../preparation-room"

export class OnJoinCommand extends Command<
  PreparationRoom,
  {
    client: Client
    options: any
    auth: any
  }
> {
  async execute({ client, options, auth }) {
    try {
      const numberOfHumanPlayers = values(this.state.users).filter(
        (u) => !u.isBot
      ).length
      if (numberOfHumanPlayers >= MAX_PLAYERS_PER_LOBBY) {
        client.send(Transfer.KICK)
        client.leave()
        return // lobby already full
      }
      if (
        this.state.ownerId == "" &&
        this.state.lobbyType === LobbyType.NORMAL
      ) {
        this.state.ownerId = auth.uid
      }
      if (this.state.users.has(auth.uid)) {
        const user = this.state.users.get(auth.uid)!
        this.room.broadcast(Transfer.MESSAGES, {
          author: "Server",
          payload: `${user.name} joined.`,
          avatar: user.avatar,
          time: Date.now()
        })
      } else {
        const u = await UserMetadata.findOne({ uid: auth.uid })
        const numberOfHumanPlayers = values(this.state.users).filter(
          (u) => !u.isBot
        ).length
        if (numberOfHumanPlayers >= MAX_PLAYERS_PER_LOBBY) {
          // lobby has been filled with someone else while waiting for the database
          client.send(Transfer.KICK)
          client.leave()
          return
        }

        if (u) {
          if (
            this.state.minRank != null &&
            u.elo < EloRankThreshold[this.state.minRank]
          ) {
            client.send(Transfer.KICK)
            client.leave()
            return // rank not high enough
          }

          const initiallyReady = this.state.lobbyType !== LobbyType.NORMAL
          this.state.users.set(
            client.auth.uid,
            new GameUser(
              u.uid,
              u.displayName,
              u.elo,
              u.avatar,
              false,
              initiallyReady,
              u.title,
              u.role,
              auth.email === undefined && auth.photoURL === undefined
            )
          )
          if (u.uid == this.state.ownerId) {
            // logger.debug(user.displayName);
            this.state.ownerName = u.displayName
          }
          this.room.broadcast(Transfer.MESSAGES, {
            author: "Server",
            payload: `${u.displayName} joined.`,
            avatar: u.avatar,
            time: Date.now()
          })
        }
      }

      while (this.state.users.size > MAX_PLAYERS_PER_LOBBY) {
        // delete a random bot to make room
        const users = entries(this.state.users)
        const entryToDelete = users.find(([key, user]) => user.isBot)
        if (entryToDelete) {
          const [key, bot] = entryToDelete
          this.room.broadcast(Transfer.MESSAGES, {
            payload: `Bot ${bot.name} removed to make room for new player.`,
            time: Date.now()
          })
          this.state.users.delete(key)
        } else {
          throw new Error(
            `There is more than 8 players in the lobby which was not supposed to happen`
          )
        }
      }

      if (
        this.state.lobbyType !== LobbyType.NORMAL &&
        this.state.users.size === MAX_PLAYERS_PER_LOBBY
      ) {
        // auto start when special lobby is full and all ready
        this.room.broadcast(Transfer.MESSAGES, {
          payload: `Lobby is full, starting match...`,
          time: Date.now()
        })
        this.clock.setTimeout(() => {
          this.room.dispatcher.dispatch(new OnGameStartRequestCommand())
          // open another one
          this.room.presence.publish("special-lobby-full", {
            lobbyType: this.state.lobbyType,
            minRank: this.state.minRank,
            noElo: this.state.noElo
          })
        }, 2000)
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

export class OnGameStartRequestCommand extends Command<
  PreparationRoom,
  {
    client?: Client
  }
> {
  execute({ client }: { client?: Client } = {}) {
    try {
      if (this.state.gameStarted) {
        return // game already started
      }
      let allUsersReady = true
      let nbHumanPlayers = 0

      this.state.users.forEach((user: GameUser) => {
        if (!user.ready) {
          allUsersReady = false
        }
        if (!user.isBot) {
          nbHumanPlayers++
        }
      })

      if (!allUsersReady && this.state.lobbyType === LobbyType.NORMAL) {
        client?.send(Transfer.MESSAGES, {
          author: "Server",
          payload: `Not all players are ready.`,
          avatar: "0079/Sigh",
          time: Date.now()
        })
      } else {
        let freeMemory = os.freemem()
        let totalMemory = os.totalmem()
        logger.info(
          `Memory freemem/totalmem: ${(
            (100 * freeMemory) /
            totalMemory
          ).toFixed(2)} % free (${totalMemory - freeMemory} / ${totalMemory})`
        )
        freeMemory = memoryUsage().heapUsed
        totalMemory = memoryUsage().heapTotal
        logger.info(
          `Memory heapUsed/heapTotal: ${(
            (100 * freeMemory) /
            totalMemory
          ).toFixed(2)} % free (${totalMemory - freeMemory} / ${totalMemory})`
        )
        if (freeMemory < 0.1 * totalMemory) {
          // if less than 10% free memory available, prevents starting another game to avoid out of memory crash
          this.room.broadcast(Transfer.MESSAGES, {
            author: "Server",
            payload: `Too many players are currently playing and the server is running out of memory. Try again in a few minutes, and avoid playing with bots. Sorry for the inconvenience.`,
            avatar: "0025/Pain",
            time: Date.now()
          })
        } else if (
          freeMemory < 0.2 * totalMemory &&
          nbHumanPlayers < MAX_PLAYERS_PER_LOBBY
        ) {
          // if less than 20% free memory available, prevents starting a game with bots
          this.room.broadcast(Transfer.MESSAGES, {
            author: "Server",
            payload: `Too many players are currently playing and the server is running out of memory. To save resources, only lobbys with ${MAX_PLAYERS_PER_LOBBY} human players are enabled. Sorry for the inconvenience.`,
            avatar: "0025/Pain",
            time: Date.now()
          })
        } else if (freeMemory < 0.4 * totalMemory && nbHumanPlayers === 1) {
          // if less than 40% free memory available, prevents starting a game solo
          this.room.broadcast(Transfer.MESSAGES, {
            author: "Server",
            payload: `Too many players are currently playing and the server is running out of memory. To save resources, solo games have been disabled. Please wait for more players to join the lobby before starting the game. Sorry for the inconvenience.`,
            avatar: "0025/Pain",
            time: Date.now()
          })
        } else {
          this.state.gameStarted = true
          matchMaker.createRoom("game", {
            users: this.state.users,
            name: this.state.name,
            preparationId: this.room.roomId,
            noElo: this.state.noElo,
            selectedMap: this.state.selectedMap,
            lobbyType: this.state.lobbyType,
            minRank: this.state.minRank,
            whenReady: (game) => {
              this.room.setGameStarted(true)
              logger.debug("game start", game.roomId)
              this.room.broadcast(Transfer.GAME_START, game.roomId)
              setTimeout(() => this.room.disconnect(), 30000) // TRYFIX: ranked lobbies prep rooms not being removed
            }
          })
        }
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

export class OnMessageCommand extends Command<
  PreparationRoom,
  {
    client: Client
    message: IChatV2
  }
> {
  execute({ client, message }) {
    try {
      this.room.broadcast(Transfer.MESSAGES, { ...message, time: Date.now() })
    } catch (error) {
      logger.error(error)
    }
  }
}

export class OnRoomNameCommand extends Command<
  PreparationRoom,
  {
    client: Client
    message: string
  }
> {
  execute({ client, message }) {
    try {
      if (
        client.auth?.uid == this.state.ownerId &&
        this.state.name != message
      ) {
        this.room.setName(message)
        this.state.name = message
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

export class OnRoomPasswordCommand extends Command<
  PreparationRoom,
  {
    client: Client
    message: string
  }
> {
  execute({ client, message: password }) {
    try {
      if (
        client.auth?.uid == this.state.ownerId &&
        this.state.password != password
      ) {
        this.room.setPassword(password)
        this.state.password = password
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

export class OnToggleEloCommand extends Command<
  PreparationRoom,
  {
    client: Client
    message: boolean
  }
> {
  execute({ client, message: noElo }) {
    try {
      if (
        client.auth?.uid === this.state.ownerId &&
        this.state.noElo != noElo
      ) {
        this.state.noElo = noElo
        this.room.toggleElo(noElo)
        this.room.broadcast(Transfer.MESSAGES, {
          author: "Server",
          payload: `Room leader ${
            noElo ? "disabled" : "enabled"
          } ELO gain for this game.`,
          avatar: this.state.users.get(client.auth.uid)?.avatar,
          time: Date.now()
        })
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

export class OnKickPlayerCommand extends Command<
  PreparationRoom,
  {
    client: Client
    message: string
  }
> {
  execute({ client, message: userId }) {
    try {
      const user = this.state.users.get(client.auth?.uid)
      if (
        client.auth?.uid === this.state.ownerId ||
        (user && [Role.ADMIN, Role.MODERATOR].includes(user.role))
      ) {
        this.room.clients.forEach((cli) => {
          if (cli.auth?.uid === userId && this.state.users.has(userId)) {
            const user = this.state.users.get(userId)!
            if (user.role === Role.BASIC) {
              this.room.broadcast(Transfer.MESSAGES, {
                author: "Server",
                payload: `${user.name} was kicked out of the room`,
                avatar: this.state.users.get(client.auth.uid)?.avatar,
                time: Date.now()
              })
              this.state.users.delete(userId)
              cli.send(Transfer.KICK)
              cli.leave()
            } else {
              this.room.broadcast(Transfer.MESSAGES, {
                author: "Server",
                payload: `${this.state.ownerName} tried to kick a moderator (${user.name}).`,
                avatar: "0068/Normal",
                time: Date.now()
              })
            }
          }
        })
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

export class OnDeleteRoomCommand extends Command<
  PreparationRoom,
  {
    client: Client
  }
> {
  execute({ client }) {
    try {
      const user = this.state.users.get(client.auth?.uid)
      if (user && [Role.ADMIN, Role.MODERATOR].includes(user.role)) {
        this.room.clients.forEach((cli) => {
          cli.send(Transfer.KICK)
          cli.leave()
        })
        this.room.clients.forEach((cli) => {
          cli.send(Transfer.KICK)
          cli.leave()
        })
        this.room.disconnect()
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

export class OnLeaveCommand extends Command<
  PreparationRoom,
  {
    client: Client
    consented: boolean
  }
> {
  execute({ client, consented }) {
    try {
      if (client.auth?.uid) {
        const user = this.state.users.get(client.auth?.uid)
        if (user) {
          this.room.broadcast(Transfer.MESSAGES, {
            author: "Server",
            payload: `${user.name} left.`,
            avatar: user.avatar,
            time: Date.now()
          })
          this.state.users.delete(client.auth.uid)

          if (client.auth.uid === this.state.ownerId) {
            const newOwner = values(this.state.users).find(
              (user) => user.id !== this.state.ownerId
            )
            if (newOwner) {
              this.state.ownerId = newOwner.id
              this.state.ownerName = newOwner.name
              this.room.broadcast(Transfer.MESSAGES, {
                author: "Server",
                payload: `The new room leader is ${newOwner.name}`,
                avatar: newOwner.avatar,
                time: Date.now()
              })
            }
          }
        }
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

export class OnToggleReadyCommand extends Command<
  PreparationRoom,
  {
    client: Client
  }
> {
  execute({ client }) {
    try {
      // logger.debug(this.state.users.get(client.auth.uid).ready);
      if (client.auth?.uid && this.state.users.has(client.auth.uid)) {
        const user = this.state.users.get(client.auth.uid)!
        user.ready = !user.ready
      }
      if (
        this.state.lobbyType !== LobbyType.NORMAL &&
        this.state.users.size === this.room.maxClients &&
        values(this.state.users).every((user) => user.ready === true)
      ) {
        // auto start when ranked lobby is full and all ready
        return [new OnGameStartRequestCommand()]
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

export class InitializeBotsCommand extends Command<
  PreparationRoom,
  {
    ownerId: string
  }
> {
  async execute({ ownerId }) {
    try {
      const user = await UserMetadata.findOne({ uid: ownerId })
      if (user) {
        const difficulty = { $gt: user.elo - 100, $lt: user.elo + 100 }

        const bots = await BotV2.find({ elo: difficulty }, [
          "avatar",
          "elo",
          "name",
          "id"
        ]).limit(7)

        if (bots) {
          bots.forEach((bot) => {
            this.state.users.set(
              bot.id,
              new GameUser(
                bot.id,
                bot.name,
                bot.elo,
                bot.avatar,
                true,
                true,
                "",
                Role.BOT,
                false
              )
            )
          })
        }
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

type OnAddBotPayload = {
  type: IBot | BotDifficulty
  user: IGameUser
}

export class OnAddBotCommand extends Command<PreparationRoom, OnAddBotPayload> {
  async execute(data: OnAddBotPayload) {
    if (this.state.users.size >= MAX_PLAYERS_PER_LOBBY) {
      this.room.broadcast(Transfer.MESSAGES, {
        payload: "Room is full",
        time: Date.now()
      })
      return
    }

    const { type, user } = data
    let bot: IBot | undefined
    if (typeof type === "object") {
      // pick a specific bot chosen by the user
      bot = type
    } else {
      // pick a random bot per difficulty
      const difficulty = type
      let d: FilterQuery<IBot> | undefined

      switch (difficulty) {
        case BotDifficulty.EASY:
          d = { $lt: 800 }
          break
        case BotDifficulty.MEDIUM:
          d = { $gte: 800, $lt: 1100 }
          break
        case BotDifficulty.HARD:
          d = { $gte: 1100, $lt: 1400 }
          break
        case BotDifficulty.EXTREME:
          d = { $gte: 1400 }
          break
      }

      const existingBots = new Array<string>()
      this.state.users.forEach((value: GameUser, key: string) => {
        if (value.isBot) {
          existingBots.push(key)
        }
      })

      const bots = await BotV2.find({ id: { $nin: existingBots }, elo: d }, [
        "avatar",
        "elo",
        "name",
        "id"
      ])

      if (bots.length <= 0) {
        this.room.broadcast(Transfer.MESSAGES, {
          payload: "Error: No bots found",
          time: Date.now()
        })
        return
      }

      bot = pickRandomIn(bots)
    }

    if (bot) {
      // we checked again the lobby size because of the async request ahead
      if (this.state.users.size >= MAX_PLAYERS_PER_LOBBY) {
        this.room.broadcast(Transfer.MESSAGES, {
          payload: "Room is full",
          time: Date.now()
        })
        return
      }

      this.state.users.set(
        bot.id,
        new GameUser(
          bot.id,
          bot.name,
          bot.elo,
          bot.avatar,
          true,
          true,
          "",
          Role.BOT,
          false
        )
      )

      this.room.broadcast(Transfer.MESSAGES, {
        payload: `Bot ${bot.name} added.`,
        time: Date.now()
      })
    }
  }
}

export class OnRemoveBotCommand extends Command<
  PreparationRoom,
  {
    target?: string | undefined
    user?: IGameUser | undefined
  }
> {
  execute({ target, user }) {
    try {
      const name = this.state.users.get(target)?.name
      if (name && this.state.users.delete(target)) {
        this.room.broadcast(Transfer.MESSAGES, {
          payload: `Bot ${name} removed.`,
          time: Date.now()
        })
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

export class OnListBotsCommand extends Command<PreparationRoom> {
  async execute(data: { user: IUserMetadata }) {
    try {
      if (this.state.users.size >= MAX_PLAYERS_PER_LOBBY) {
        return
      }

      const userArray = new Array<string>()

      this.state.users.forEach((value: GameUser, key: string) => {
        if (value.isBot) {
          userArray.push(key)
        }
      })

      const bots = await BotV2.find({ id: { $nin: userArray } }, [
        "avatar",
        "elo",
        "name",
        "id"
      ])

      if (bots) {
        if (bots.length <= 0) {
          this.room.broadcast(Transfer.MESSAGES, {
            payload: `Error: No bots found !`,
            time: Date.now()
          })
        }
        this.room.clients.forEach((client) => {
          if (client.auth?.uid === this.state.ownerId) {
            client.send(Transfer.REQUEST_BOT_LIST, bots)
          }
        })
      }
    } catch (error) {
      logger.error(error)
    }
  }
}
