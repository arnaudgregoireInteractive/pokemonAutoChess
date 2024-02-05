import { Dispatcher } from "@colyseus/command"
import {
  Client,
  Room,
  RoomListingData,
  matchMaker,
  subscribeLobby
} from "colyseus"
import { CronJob } from "cron"
import { WebhookClient } from "discord.js"
import admin from "firebase-admin"
import { nanoid } from "nanoid"
import { PastebinAPI } from "pastebin-ts/dist/api"
import {
  ILeaderboardBotInfo,
  ILeaderboardInfo
} from "../models/colyseus-models/leaderboard-info"
import Message from "../models/colyseus-models/message"
import BannedUser from "../models/mongo-models/banned-user"
import { BotV2, IBot } from "../models/mongo-models/bot-v2"
import ChatV2 from "../models/mongo-models/chat-v2"
import UserMetadata from "../models/mongo-models/user-metadata"
import { Emotion, IPlayer, Role, Title, Transfer } from "../types"
import {
  EloRank,
  GREATBALL_RANKED_LOBBY_CRON,
  SCRIBBLE_LOBBY_CRON,
  ULTRABALL_RANKED_LOBBY_CRON
} from "../types/Config"
import { LobbyType } from "../types/enum/Game"
import { Language } from "../types/enum/Language"
import { logger } from "../utils/logger"
import {
  AddBotCommand,
  BanUserCommand,
  BuyBoosterCommand,
  BuyEmotionCommand,
  ChangeAvatarCommand,
  ChangeNameCommand,
  ChangeSelectedEmotionCommand,
  ChangeTitleCommand,
  DeleteBotCommand,
  GiveBoostersCommand,
  GiveRoleCommand,
  GiveTitleCommand,
  MakeServerAnnouncementCommand,
  OnBotUploadCommand,
  OnJoinCommand,
  OnLeaveCommand,
  OnNewMessageCommand,
  OnSearchByIdCommand,
  OnSearchCommand,
  OpenBoosterCommand,
  OpenSpecialLobbyCommand,
  RemoveMessageCommand,
  SelectLanguageCommand,
  UnbanUserCommand,
  createBotList
} from "./commands/lobby-commands"
import LobbyState from "./states/lobby-state"

export default class CustomLobbyRoom extends Room<LobbyState> {
  discordWebhook: WebhookClient | undefined
  discordBanWebhook: WebhookClient | undefined
  bots: Map<string, IBot>
  leaderboard: ILeaderboardInfo[]
  botLeaderboard: ILeaderboardBotInfo[]
  levelLeaderboard: ILeaderboardInfo[]
  pastebin: PastebinAPI | undefined = undefined
  unsubscribeLobby: (() => void) | undefined
  rooms: RoomListingData<any>[] | undefined
  dispatcher: Dispatcher<this>

  constructor() {
    super()
    if (
      process.env.PASTEBIN_API_DEV_KEY &&
      process.env.PASTEBIN_API_USERNAME &&
      process.env.PASTEBIN_API_DEV_KEY
    ) {
      this.pastebin = new PastebinAPI({
        api_dev_key: process.env.PASTEBIN_API_DEV_KEY!,
        api_user_name: process.env.PASTEBIN_API_USERNAME!,
        api_user_password: process.env.PASTEBIN_API_PASSWORD!
      })
    }

    if (process.env.DISCORD_WEBHOOK_URL) {
      this.discordWebhook = new WebhookClient({
        url: process.env.DISCORD_WEBHOOK_URL
      })
    }

    if (process.env.DISCORD_BAN_WEBHOOK_URL) {
      this.discordBanWebhook = new WebhookClient({
        url: process.env.DISCORD_BAN_WEBHOOK_URL
      })
    }

    this.dispatcher = new Dispatcher(this)
    this.bots = new Map<string, IBot>()
    this.leaderboard = new Array<ILeaderboardInfo>()
    this.botLeaderboard = new Array<ILeaderboardBotInfo>()
    this.levelLeaderboard = new Array<ILeaderboardInfo>()
  }

  async onCreate(): Promise<void> {
    logger.info("create lobby", this.roomId)
    this.setState(new LobbyState())
    this.state.getNextSpecialLobbyDate()
    this.autoDispose = false
    this.listing.unlisted = true

    this.unsubscribeLobby = await subscribeLobby((roomId, data) => {
      if (this.rooms) {
        const roomIndex = this.rooms?.findIndex(
          (room) => room.roomId === roomId
        )

        if (!data) {
          // remove room listing data
          if (roomIndex !== -1) {
            this.rooms.splice(roomIndex, 1)

            this.clients.forEach((client) => {
              client.send(Transfer.REMOVE_ROOM, roomId)
            })
          }
        } else if (roomIndex === -1) {
          // append room listing data
          this.rooms.push(data)

          this.clients.forEach((client) => {
            client.send(Transfer.ADD_ROOM, [roomId, data])
          })
        } else {
          const previousData = this.rooms[roomIndex]

          // replace room listing data
          this.rooms[roomIndex] = data

          this.clients.forEach((client) => {
            if (previousData && !data) {
              client.send(Transfer.REMOVE_ROOM, roomId)
            } else if (data) {
              client.send(Transfer.ADD_ROOM, [roomId, data])
            }
          })
        }
      }
    })

    this.rooms = await matchMaker.query({ private: false, unlisted: false })

    this.onMessage(Transfer.REQUEST_LEADERBOARD, (client, message) => {
      try {
        client.send(Transfer.REQUEST_LEADERBOARD, this.leaderboard)
      } catch (error) {
        logger.error(error)
      }
    })

    this.onMessage(Transfer.REQUEST_BOT_LEADERBOARD, (client, message) => {
      try {
        client.send(Transfer.REQUEST_BOT_LEADERBOARD, this.botLeaderboard)
      } catch (error) {
        logger.error(error)
      }
    })

    this.onMessage(Transfer.REQUEST_LEVEL_LEADERBOARD, (client, message) => {
      try {
        client.send(Transfer.REQUEST_LEVEL_LEADERBOARD, this.levelLeaderboard)
      } catch (error) {
        logger.error(error)
      }
    })

    this.onMessage(Transfer.DELETE_BOT_DATABASE, async (client, message) => {
      this.dispatcher.dispatch(new DeleteBotCommand(), { client, message })
    })

    this.onMessage(Transfer.ADD_BOT_DATABASE, async (client, message) => {
      this.dispatcher.dispatch(new AddBotCommand(), { client, message })
    })

    this.onMessage(
      Transfer.SELECT_LANGUAGE,
      async (client, message: Language) => {
        this.dispatcher.dispatch(new SelectLanguageCommand(), {
          client,
          message
        })
      }
    )

    this.onMessage(
      Transfer.UNBAN,
      (client, { uid, name }: { uid: string; name: string }) => {
        this.dispatcher.dispatch(new UnbanUserCommand(), { client, uid, name })
      }
    )

    this.onMessage(
      Transfer.BAN,
      (
        client,
        { uid, name, reason }: { uid: string; name: string; reason: string }
      ) => {
        this.dispatcher.dispatch(new BanUserCommand(), {
          client,
          uid,
          name,
          reason
        })
      }
    )

    this.onMessage(Transfer.NEW_MESSAGE, (client, message) => {
      this.dispatcher.dispatch(new OnNewMessageCommand(), { client, message })
    })

    this.onMessage(
      Transfer.REMOVE_MESSAGE,
      (client, message: { id: string }) => {
        this.dispatcher.dispatch(new RemoveMessageCommand(), {
          client,
          messageId: message.id
        })
      }
    )

    this.onMessage(
      Transfer.GIVE_BOOSTER,
      (
        client,
        { uid, numberOfBoosters }: { uid: string; numberOfBoosters: number }
      ) => {
        this.dispatcher.dispatch(new GiveBoostersCommand(), {
          client,
          uid,
          numberOfBoosters: Number(numberOfBoosters) || 1
        })
      }
    )

    this.onMessage(
      Transfer.GIVE_TITLE,
      (client, { uid, title }: { uid: string; title: Title }) => {
        this.dispatcher.dispatch(new GiveTitleCommand(), { client, uid, title })
      }
    )

    this.onMessage(
      Transfer.SET_ROLE,
      (client, { uid, role }: { uid: string; role: Role }) => {
        this.dispatcher.dispatch(new GiveRoleCommand(), { client, uid, role })
      }
    )

    this.onMessage(Transfer.BOT_CREATION, (client, { bot }: { bot: IBot }) => {
      this.dispatcher.dispatch(new OnBotUploadCommand(), { client, bot })
    })

    this.onMessage(
      Transfer.REQUEST_BOT_LIST,
      (client, options?: { withSteps: boolean }) => {
        try {
          client.send(
            Transfer.REQUEST_BOT_LIST,
            createBotList(this.bots, options)
          )
        } catch (error) {
          logger.error(error)
        }
      }
    )

    this.onMessage(Transfer.REQUEST_BOT_DATA, (client, bot) => {
      try {
        const botData = this.bots.get(bot)
        client.send(Transfer.REQUEST_BOT_DATA, botData)
      } catch (error) {
        logger.error(error)
      }
    })

    this.onMessage(Transfer.OPEN_BOOSTER, (client) => {
      this.dispatcher.dispatch(new OpenBoosterCommand(), { client })
    })

    this.onMessage(Transfer.CHANGE_NAME, (client, message) => {
      this.dispatcher.dispatch(new ChangeNameCommand(), {
        client,
        name: message.name
      })
    })

    this.onMessage(Transfer.SET_TITLE, (client, title: Title | "") => {
      this.dispatcher.dispatch(new ChangeTitleCommand(), { client, title })
    })

    this.onMessage(
      Transfer.CHANGE_SELECTED_EMOTION,
      (
        client,
        {
          index,
          emotion,
          shiny
        }: { index: string; emotion: Emotion; shiny: boolean }
      ) => {
        this.dispatcher.dispatch(new ChangeSelectedEmotionCommand(), {
          client,
          index,
          emotion,
          shiny
        })
      }
    )

    this.onMessage(
      Transfer.BUY_EMOTION,
      (
        client,
        {
          index,
          emotion,
          shiny
        }: { index: string; emotion: Emotion; shiny: boolean }
      ) => {
        this.dispatcher.dispatch(new BuyEmotionCommand(), {
          client,
          index,
          emotion,
          shiny
        })
      }
    )

    this.onMessage(
      Transfer.BUY_BOOSTER,
      (client, message: { index: string }) => {
        this.dispatcher.dispatch(new BuyBoosterCommand(), {
          client,
          index: message.index
        })
      }
    )

    this.onMessage(Transfer.SEARCH_BY_ID, (client, uid: string) => {
      this.dispatcher.dispatch(new OnSearchByIdCommand(), { client, uid })
    })

    this.onMessage(Transfer.SEARCH, (client, { name }: { name: string }) => {
      this.dispatcher.dispatch(new OnSearchCommand(), { client, name })
    })

    this.onMessage(
      Transfer.SERVER_ANNOUNCEMENT,
      (client, { message }: { message: string }) => {
        this.dispatcher.dispatch(new MakeServerAnnouncementCommand(), {
          client,
          message
        })
      }
    )

    this.onMessage(
      Transfer.CHANGE_AVATAR,
      (
        client,
        {
          index,
          emotion,
          shiny
        }: { index: string; emotion: Emotion; shiny: boolean }
      ) => {
        this.dispatcher.dispatch(new ChangeAvatarCommand(), {
          client,
          index,
          emotion,
          shiny
        })
      }
    )

    this.presence.subscribe("ranked-lobby-winner", (player: IPlayer) => {
      this.state.addAnnouncement(`${player.name} won the ranked match !`)
    })

    this.presence.subscribe(
      "special-lobby-full",
      (params: {
        lobbyType: LobbyType
        minRank: EloRank | null
        noElo?: boolean
      }) => {
        // open another special lobby when the previous one is full
        this.dispatcher.dispatch(new OpenSpecialLobbyCommand(), params)
      }
    )

    this.initCronJobs()
    this.fetchChat()
    this.fetchLeaderboards()
  }

  async onAuth(client: Client, options: any, request: any) {
    try {
      super.onAuth(client, options, request)
      const token = await admin.auth().verifyIdToken(options.idToken)
      const user = await admin.auth().getUser(token.uid)
      const isBanned = await BannedUser.findOne({ uid: user.uid })
      const userProfile = await UserMetadata.findOne({ uid: user.uid })
      client.send(Transfer.USER_PROFILE, userProfile)

      if (!user.displayName) {
        throw "No display name"
      } else if (isBanned) {
        throw "User banned"
      } else {
        return user
      }
    } catch (error) {
      logger.error(error)
    }
  }

  onJoin(client: Client, options: any, auth: any) {
    this.dispatcher.dispatch(new OnJoinCommand(), {
      client,
      options,
      auth,
      rooms: this.rooms
    })
  }

  onLeave(client: Client) {
    this.dispatcher.dispatch(new OnLeaveCommand(), { client })
  }

  onDispose() {
    try {
      logger.info("dispose lobby")
      this.dispatcher.stop()
      if (this.unsubscribeLobby) {
        this.unsubscribeLobby()
      }
    } catch (error) {
      logger.error(error)
    }
  }

  async fetchChat() {
    try {
      const messages = await ChatV2.find({
        time: { $gt: Date.now() - 86400000 }
      })
      if (messages) {
        messages.forEach((message) => {
          this.state.messages.push(
            new Message(
              message.id,
              message.payload,
              message.authorId,
              message.author,
              message.avatar,
              message.time
            )
          )
        })
      }
    } catch (error) {
      logger.error(error)
    }
  }

  async fetchLeaderboards() {
    const users = await UserMetadata.find(
      {},
      ["displayName", "avatar", "elo", "uid"],
      { limit: 100, sort: { elo: -1 } }
    )

    if (users) {
      this.leaderboard = users.map((user, i) => ({
        name: user.displayName,
        rank: i + 1,
        avatar: user.avatar,
        value: user.elo,
        id: user.uid
      }))
    }

    const levelUsers = await UserMetadata.find(
      {},
      ["displayName", "avatar", "level", "uid"],
      { limit: 100, sort: { level: -1 } }
    )

    if (levelUsers) {
      this.levelLeaderboard = levelUsers.map((user, i) => ({
        name: user.displayName,
        rank: i + 1,
        avatar: user.avatar,
        value: user.level,
        id: user.uid
      }))
    }

    const bots = await BotV2.find({}, {}, { sort: { elo: -1 } })
    if (bots) {
      const ids = new Array<string>()
      this.botLeaderboard = []
      bots.forEach((bot, i) => {
        if (ids.includes(bot.id)) {
          const id = nanoid()
          bot.id = id
          bot.save()
        }
        ids.push(bot.id)
        this.bots.set(bot.id, bot)
        this.botLeaderboard.push({
          name: bot.name,
          avatar: bot.avatar,
          rank: i + 1,
          value: bot.elo,
          author: bot.author
        })
      })
    }
  }

  initCronJobs() {
    logger.debug("initCronJobs")
    const leaderboardRefreshJob = CronJob.from({
      cronTime: "0 0/10 * * * *", // every 10 minutes
      timeZone: "Europe/Paris",
      onTick: () => this.fetchLeaderboards(),
      start: true
    })

    const greatBallRankedLobbyJob = CronJob.from({
      cronTime: GREATBALL_RANKED_LOBBY_CRON,
      //cronTime: "0 0/1 * * * *", // DEBUG: trigger every minute
      timeZone: "Europe/Paris",
      onTick: () => {
        this.dispatcher.dispatch(new OpenSpecialLobbyCommand(), {
          lobbyType: LobbyType.RANKED,
          minRank: EloRank.GREATBALL
        })
      },
      start: true
    })

    const ultratBallRankedLobbyJob = CronJob.from({
      cronTime: ULTRABALL_RANKED_LOBBY_CRON,
      //cronTime: "0 0/1 * * * *", // DEBUG: trigger every minute
      timeZone: "Europe/Paris",
      onTick: () => {
        this.dispatcher.dispatch(new OpenSpecialLobbyCommand(), {
          lobbyType: LobbyType.RANKED,
          minRank: EloRank.ULTRABALL
        })
      },
      start: true
    })

    const scribbleLobbyJob = CronJob.from({
      cronTime: SCRIBBLE_LOBBY_CRON,
      //cronTime: "0 0/1 * * * *", // DEBUG: trigger every minute //TEMP
      timeZone: "Europe/Paris",
      onTick: () => {
        this.dispatcher.dispatch(new OpenSpecialLobbyCommand(), {
          lobbyType: LobbyType.SCRIBBLE,
          noElo: true
        })
      },
      start: true
    })
  }
}
