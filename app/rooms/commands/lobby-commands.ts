import { Command } from "@colyseus/command"
import { Client, matchMaker, Room } from "colyseus"
import { nanoid } from "nanoid"
import { writeHeapSnapshot } from "v8"
import {
  getRemainingPlayers,
  getTournamentStage,
  makeBrackets
} from "../../core/tournament-logic"
import {
  TournamentBracketSchema,
  TournamentPlayerSchema
} from "../../models/colyseus-models/tournament"
import { BotV2 } from "../../models/mongo-models/bot-v2"
import { Tournament } from "../../models/mongo-models/tournament"
import UserMetadata, {
  IPokemonConfig,
  IUserMetadata
} from "../../models/mongo-models/user-metadata"
import { PRECOMPUTED_EMOTIONS_PER_POKEMON_INDEX } from "../../models/precomputed/precomputed-emotions"
import { getPokemonData } from "../../models/precomputed/precomputed-pokemon-data"
import { PRECOMPUTED_POKEMONS_PER_RARITY } from "../../models/precomputed/precomputed-rarity"
import {
  addBotToDatabase,
  deleteBotFromDatabase,
  getBotData
} from "../../services/bots"
import { discordService } from "../../services/discord"
import { pastebinService } from "../../services/pastebin"
import {
  CDN_PORTRAIT_URL,
  Emotion,
  IPlayer,
  ISuggestionUser,
  PkmWithConfig,
  Role,
  Title,
  Transfer,
  USERNAME_REGEXP
} from "../../types"
import {
  BoosterRarityProbability,
  DUST_PER_BOOSTER,
  DUST_PER_SHINY,
  MAX_PLAYERS_PER_GAME,
  getEmotionCost,
  BoosterPriceByRarity
} from "../../types/Config"
import { Ability } from "../../types/enum/Ability"
import { CloseCodes } from "../../types/enum/CloseCodes"
import { EloRank } from "../../types/enum/EloRank"
import { GameMode, Rarity } from "../../types/enum/Game"
import { Language } from "../../types/enum/Language"
import { Pkm, PkmByIndex, PkmIndex, Unowns } from "../../types/enum/Pokemon"
import { StarterAvatars } from "../../types/enum/Starters"
import { ITournamentPlayer } from "../../types/interfaces/Tournament"
import { sum } from "../../utils/array"
import { getPortraitSrc } from "../../utils/avatar"
import { getRank } from "../../utils/elo"
import { logger } from "../../utils/logger"
import { cleanProfanity } from "../../utils/profanity-filter"
import { wait } from "../../utils/promise"
import { chance, pickRandomIn } from "../../utils/random"
import { convertSchemaToRawObject, values } from "../../utils/schemas"
import CustomLobbyRoom from "../custom-lobby-room"

export class OnJoinCommand extends Command<
  CustomLobbyRoom,
  {
    client: Client
    user: IUserMetadata | null
  }
> {
  async execute({
    client,
    user
  }: {
    client: Client
    user: IUserMetadata | null
  }) {
    try {
      //logger.info(`${client.auth.displayName} ${client.id} join lobby room`)
      client.send(Transfer.ROOMS, this.room.rooms)
      client.userData = { joinedAt: Date.now() }

      if (user) {
        // load existing account
        this.room.users.set(client.auth.uid, user)
        client.send(Transfer.USER_PROFILE, user)
      } else {
        // create new user account
        const starterBoosters = 3
        const starterAvatar = pickRandomIn(StarterAvatars)
        await UserMetadata.create({
          uid: client.auth.uid,
          displayName: client.auth.displayName,
          avatar: starterAvatar,
          booster: starterBoosters,
          pokemonCollection: new Map<string, IPokemonConfig>()
        })
        const newUser: IUserMetadata = {
          uid: client.auth.uid,
          displayName: client.auth.displayName,
          language: client.auth.metadata.language,
          avatar: starterAvatar,
          wins: 0,
          exp: 0,
          level: 0,
          elo: 1000,
          pokemonCollection: new Map<string, IPokemonConfig>(),
          booster: starterBoosters,
          titles: [],
          title: "",
          role: Role.BASIC
        }
        this.room.users.set(client.auth.uid, newUser)
        client.send(Transfer.USER_PROFILE, newUser)
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

export class OnLeaveCommand extends Command<
  CustomLobbyRoom,
  { client: Client }
> {
  execute({ client }: { client: Client }) {
    try {
      if (client && client.auth && client.auth.displayName && client.auth.uid) {
        //logger.info(`${client.auth.displayName} ${client.id} leave lobby`)
        this.room.users.delete(client.auth.uid)
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

export class GiveTitleCommand extends Command<
  CustomLobbyRoom,
  { client: Client; uid: string; title: Title }
> {
  async execute({
    client,
    uid,
    title
  }: {
    client: Client
    uid: string
    title: Title
  }) {
    try {
      const u = this.room.users.get(client.auth.uid)
      const targetUser = this.room.users.get(uid)

      if (u && u.role && u.role === Role.ADMIN) {
        const user = await UserMetadata.findOne({ uid })
        if (user && user.titles && !user.titles.includes(title)) {
          user.titles.push(title)
          user.save()

          if (targetUser) {
            targetUser.titles.push(title)
          }
        }
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

export class HeapSnapshotCommand extends Command<CustomLobbyRoom> {
  execute() {
    logger.info("writing heap snapshot")
    writeHeapSnapshot()
  }
}

export class GiveBoostersCommand extends Command<
  CustomLobbyRoom,
  { client: Client; uid: string; numberOfBoosters: number }
> {
  async execute({
    client,
    uid,
    numberOfBoosters = 1
  }: {
    client: Client
    uid: string
    numberOfBoosters: number
  }) {
    try {
      const u = this.room.users.get(client.auth.uid)
      const targetUser = this.room.users.get(uid)

      if (u && u.role && u.role === Role.ADMIN) {
        const user = await UserMetadata.findOne({ uid: uid })
        if (user) {
          user.booster += numberOfBoosters
          user.save()

          if (targetUser) {
            targetUser.booster = user.booster
          }
        }
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

export class GiveRoleCommand extends Command<
  CustomLobbyRoom,
  { client: Client; uid: string; role: Role }
> {
  async execute({
    client,
    uid,
    role
  }: {
    client: Client
    uid: string
    role: Role
  }) {
    try {
      const u = this.room.users.get(client.auth.uid)
      const targetUser = this.room.users.get(uid)
      // logger.debug(u.role, uid)
      if (u && u.role === Role.ADMIN) {
        const user = await UserMetadata.findOne({ uid: uid })
        if (user) {
          user.role = role
          user.save()

          if (targetUser) {
            targetUser.role = user.role
          }
        }
      }
    } catch (error) {
      logger.error(error)
    }
  }
}
export class OnNewMessageCommand extends Command<
  CustomLobbyRoom,
  { client: Client; message: string }
> {
  execute({ client, message }: { client: Client; message: string }) {
    try {
      const MAX_MESSAGE_LENGTH = 250
      message = cleanProfanity(message.substring(0, MAX_MESSAGE_LENGTH))

      const user = this.room.users.get(client.auth.uid)
      if (
        user &&
        [Role.ADMIN, Role.MODERATOR].includes(user.role) &&
        message != ""
      ) {
        this.state.addMessage(message, user.uid, user.displayName, user.avatar)
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

export class RemoveMessageCommand extends Command<
  CustomLobbyRoom,
  { client: Client; messageId: string }
> {
  execute({ client, messageId }: { client: Client; messageId: string }) {
    try {
      const user = this.room.users.get(client.auth.uid)
      if (
        user &&
        user.role &&
        (user.role === Role.ADMIN || user.role === Role.MODERATOR)
      ) {
        this.state.removeMessage(messageId)
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

export class OpenBoosterCommand extends Command<
  CustomLobbyRoom,
  { client: Client }
> {
  async execute({ client }: { client: Client }) {
    try {
      const user = this.room.users.get(client.auth.uid)
      if (!user) return

      const mongoUser = await UserMetadata.findOneAndUpdate(
        { uid: client.auth.uid, booster: { $gt: 0 } },
        { $inc: { booster: -1 } },
        { new: true }
      )
      if (!mongoUser) return

      const NB_PER_BOOSTER = 10
      const boosterContent: PkmWithConfig[] = []

      for (let i = 0; i < NB_PER_BOOSTER; i++) {
        const guaranteedUnique = i === NB_PER_BOOSTER - 1
        boosterContent.push(pickRandomPokemonBooster(guaranteedUnique))
      }

      boosterContent.forEach((pkmWithConfig) => {
        const index = PkmIndex[pkmWithConfig.name]
        const mongoPokemonConfig = mongoUser.pokemonCollection.get(index)
        const dustGain = pkmWithConfig.shiny ? DUST_PER_SHINY : DUST_PER_BOOSTER

        if (mongoPokemonConfig) {
          mongoPokemonConfig.dust += dustGain
        } else {
          mongoUser.pokemonCollection.set(index, {
            id: index,
            emotions: [],
            shinyEmotions: [],
            dust: dustGain,
            selectedEmotion: Emotion.NORMAL,
            selectedShiny: false
          })
        }
      })

      mongoUser.save()

      // resync, db-authoritative
      user.booster = mongoUser.booster - 1
      boosterContent.forEach((pkmWithConfig) => {
        const index = PkmIndex[pkmWithConfig.name]
        const pokemonConfig = user.pokemonCollection.get(index)
        const mongoPokemonConfig = mongoUser.pokemonCollection.get(index)
        if (!mongoPokemonConfig) return
        if (pokemonConfig) {
          pokemonConfig.dust = mongoPokemonConfig.dust
        } else {
          const newConfig: IPokemonConfig = {
            dust: mongoPokemonConfig.dust,
            id: mongoPokemonConfig.id,
            emotions: mongoPokemonConfig.emotions.map((e) => e),
            shinyEmotions: mongoPokemonConfig.shinyEmotions.map((e) => e),
            selectedEmotion: mongoPokemonConfig.selectedEmotion,
            selectedShiny: mongoPokemonConfig.selectedShiny
          }
          user.pokemonCollection.set(index, newConfig)
        }
      })

      client.send(Transfer.BOOSTER_CONTENT, boosterContent)
      client.send(Transfer.USER_PROFILE, mongoUser)
    } catch (error) {
      logger.error(error)
    }
  }
}

function pickRandomPokemonBooster(guarantedUnique: boolean): PkmWithConfig {
  let pkm = Pkm.MAGIKARP,
    emotion = Emotion.NORMAL
  const shiny = chance(0.03)
  const rarities = Object.keys(Rarity) as Rarity[]
  const seed = Math.random() * sum(Object.values(BoosterRarityProbability))
  let threshold = 0

  if (guarantedUnique) {
    pkm = pickRandomIn([
      ...PRECOMPUTED_POKEMONS_PER_RARITY[Rarity.UNIQUE],
      ...PRECOMPUTED_POKEMONS_PER_RARITY[Rarity.LEGENDARY]
    ]) as Pkm
  } else {
    for (let i = 0; i < rarities.length; i++) {
      const rarity = rarities[i]
      const rarityProbability = BoosterRarityProbability[rarity]
      threshold += rarityProbability
      if (seed < threshold) {
        const candidates: Pkm[] = (
          PRECOMPUTED_POKEMONS_PER_RARITY[rarity] ?? []
        ).filter(
          (p) =>
            Unowns.includes(p) === false &&
            getPokemonData(p).skill !== Ability.DEFAULT
        )
        if (candidates.length > 0) {
          pkm = pickRandomIn(candidates) as Pkm
          break
        }
      }
    }
  }

  const availableEmotions = Object.values(Emotion).filter(
    (e, i) => PRECOMPUTED_EMOTIONS_PER_POKEMON_INDEX[PkmIndex[pkm]]?.[i] === 1
  )
  emotion = pickRandomIn(availableEmotions)

  return { name: pkm, shiny, emotion }
}

export class ChangeNameCommand extends Command<
  CustomLobbyRoom,
  { client: Client; name: string }
> {
  async execute({ client, name }: { client: Client; name: string }) {
    try {
      const user = this.room.users.get(client.auth.uid)
      if (!user) return
      if (USERNAME_REGEXP.test(name)) {
        user.displayName = name
        const mongoUser = await UserMetadata.findOne({ uid: client.auth.uid })
        if (mongoUser) {
          mongoUser.displayName = name
          await mongoUser.save()
        }
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

export class ChangeTitleCommand extends Command<
  CustomLobbyRoom,
  { client: Client; title: Title | "" }
> {
  async execute({ client, title }: { client: Client; title: Title | "" }) {
    try {
      const user = this.room.users.get(client.auth.uid)
      if (title !== "" && user?.titles.includes(title) === false) {
        throw new Error("User does not have this title unlocked")
      }
      if (user) {
        if (user.title === title) {
          title = "" // remove title if user already has it
        }
        user.title = title
        const mongoUser = await UserMetadata.findOne({ uid: client.auth.uid })
        if (mongoUser) {
          mongoUser.title = title
          await mongoUser.save()
        }
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

export class ChangeSelectedEmotionCommand extends Command<
  CustomLobbyRoom,
  { client: Client; index: string; emotion: Emotion; shiny: boolean }
> {
  async execute({
    client,
    emotion,
    index,
    shiny
  }: {
    client: Client
    index: string
    emotion: Emotion
    shiny: boolean
  }) {
    try {
      const user = this.room.users.get(client.auth.uid)
      if (!user) return
      const pokemonConfig = user.pokemonCollection.get(index)
      if (pokemonConfig) {
        const emotionsToCheck = shiny
          ? pokemonConfig.shinyEmotions
          : pokemonConfig.emotions
        if (
          emotionsToCheck.includes(emotion) &&
          (emotion != pokemonConfig.selectedEmotion ||
            shiny != pokemonConfig.selectedShiny)
        ) {
          pokemonConfig.selectedEmotion = emotion
          pokemonConfig.selectedShiny = shiny
          const mongoUser = await UserMetadata.findOne({ uid: client.auth.uid })
          const pkmConfig = mongoUser?.pokemonCollection.get(index)
          if (mongoUser && pkmConfig) {
            pkmConfig.selectedEmotion = emotion
            pkmConfig.selectedShiny = shiny
            await mongoUser.save()
          }
        }
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

export class ChangeAvatarCommand extends Command<
  CustomLobbyRoom,
  { client: Client; index: string; emotion: Emotion; shiny: boolean }
> {
  async execute({
    client,
    index,
    emotion,
    shiny
  }: {
    client: Client
    index: string
    emotion: Emotion
    shiny: boolean
  }) {
    try {
      const user = this.room.users.get(client.auth.uid)
      const mongoUser = await UserMetadata.findOne({ uid: client.auth.uid })
      if (!user) return
      if (!mongoUser) return
      const config = mongoUser.pokemonCollection.get(index)
      if (config) {
        const emotionsToCheck = shiny ? config.shinyEmotions : config.emotions
        if (emotionsToCheck.includes(emotion)) {
          const portrait = getPortraitSrc(index, shiny, emotion)
            .replace(CDN_PORTRAIT_URL, "")
            .replace(".png", "")
          user.avatar = portrait
          mongoUser.avatar = portrait
          mongoUser.save()
        }
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

export class BuyEmotionCommand extends Command<
  CustomLobbyRoom,
  { client: Client; index: string; emotion: Emotion; shiny: boolean }
> {
  async execute({
    client,
    emotion,
    index,
    shiny
  }: {
    client: Client
    index: string
    emotion: Emotion
    shiny: boolean
  }) {
    try {
      const user = this.room.users.get(client.auth.uid)
      const cost = getEmotionCost(emotion, shiny)
      if (!user || !PkmByIndex.hasOwnProperty(index)) return
      const pokemonConfig = user.pokemonCollection.get(index)
      if (!pokemonConfig) return

      const mongoUser = await UserMetadata.findOneAndUpdate(
        {
          uid: client.auth.uid,
          $and: [
            { [`pokemonCollection.${index}.dust`]: { $gte: cost } },
            {
              [`pokemonCollection.${index}.${shiny ? "shinyEmotions" : "emotions"}`]:
                { $ne: emotion }
            }
          ]
        },
        {
          $inc: { [`pokemonCollection.${index}.dust`]: -cost },
          $push: {
            [`pokemonCollection.${index}.${shiny ? "shinyEmotions" : "emotions"}`]:
              emotion
          },
          [`pokemonCollection.${index}.selectedEmotion`]: emotion,
          [`pokemonCollection.${index}.selectedShiny`]: shiny
        },
        { new: true }
      )

      // const mongoUser = await UserMetadata.findOne({ uid: client.auth.uid })
      if (!mongoUser) return

      const mongoPokemonConfig = mongoUser.pokemonCollection.get(index)
      if (!mongoPokemonConfig) return

      pokemonConfig.dust = mongoPokemonConfig.dust // resync shards to database value, db authoritative
      pokemonConfig.selectedShiny = mongoPokemonConfig.selectedShiny
      pokemonConfig.selectedEmotion = mongoPokemonConfig.selectedEmotion

      if (shiny && mongoPokemonConfig.shinyEmotions.includes(emotion)) {
        pokemonConfig.shinyEmotions.push(emotion)
      }

      if (!shiny && mongoPokemonConfig.emotions.includes(emotion)) {
        pokemonConfig.emotions.push(emotion)
      }

      if (!mongoUser.titles.includes(Title.SHINY_SEEKER)) {
        // update titles
        let numberOfShinies = 0
        mongoUser.pokemonCollection.forEach((c) => {
          numberOfShinies += c.shinyEmotions.length
        })
        if (numberOfShinies >= 30) {
          mongoUser.titles.push(Title.SHINY_SEEKER)
        }
      }

      if (!mongoUser.titles.includes(Title.DUKE)) {
        let countProfile = 0
        mongoUser.pokemonCollection.forEach((c) => {
          countProfile += c.emotions.length + c.shinyEmotions.length
        })
        if (countProfile >= 30) {
          mongoUser.titles.push(Title.DUKE)
        }
      }

      if (
        emotion === Emotion.ANGRY &&
        index === PkmIndex[Pkm.ARBOK] &&
        !mongoUser.titles.includes(Title.DENTIST)
      ) {
        mongoUser.titles.push(Title.DENTIST)
      }

      if (
        !mongoUser.titles.includes(Title.ARCHEOLOGIST) &&
        Unowns.some((unown) => index === PkmIndex[unown]) &&
        Unowns.every((name) => {
          const index = PkmIndex[name]
          const collection = mongoUser.pokemonCollection.get(index)
          const isUnlocked =
            collection &&
            (collection.emotions.length > 0 ||
              collection.shinyEmotions.length > 0)
          return isUnlocked || index === index
        })
      ) {
        mongoUser.titles.push(Title.ARCHEOLOGIST)
      }

      if (
        !mongoUser.titles.includes(Title.DUCHESS) &&
        mongoPokemonConfig.shinyEmotions.length >=
          Object.keys(Emotion).length &&
        mongoPokemonConfig.emotions.length >= Object.keys(Emotion).length
      ) {
        mongoUser.titles.push(Title.DUCHESS)
      }

      await mongoUser.save()
      client.send(Transfer.USER_PROFILE, mongoUser)
    } catch (error) {
      logger.error(error)
    }
  }
}

export class BuyBoosterCommand extends Command<
  CustomLobbyRoom,
  { client: Client; index: string }
> {
  async execute({ client, index }: { client: Client; index: string }) {
    try {
      const user = this.room.users.get(client.auth.uid)
      if (!user) return

      const pkm = PkmByIndex[index]
      if (!pkm) return

      const rarity = getPokemonData(pkm).rarity
      const boosterCost = BoosterPriceByRarity[rarity]

      const mongoUser = await UserMetadata.findOneAndUpdate(
        {
          uid: client.auth.uid,
          [`pokemonCollection.${index}.dust`]: { $gte: boosterCost }
        },
        {
          $inc: {
            booster: 1,
            [`pokemonCollection.${index}.dust`]: -boosterCost
          }
        },
        { new: true }
      )
      if (!mongoUser) return

      const pokemonConfig = user.pokemonCollection.get(index)
      if (!pokemonConfig) return

      const mongoPokemonConfig = mongoUser.pokemonCollection.get(index)
      if (!mongoPokemonConfig) return

      user.booster = mongoUser.booster
      pokemonConfig.dust = mongoPokemonConfig.dust // resync shards to database value, db authoritative
      client.send(Transfer.USER_PROFILE, mongoUser)
    } catch (error) {
      logger.error(error)
    }
  }
}

export class OnSearchByIdCommand extends Command<
  CustomLobbyRoom,
  { client: Client; uid: string }
> {
  async execute({ client, uid }: { client: Client; uid: string }) {
    try {
      const user = await UserMetadata.findOne({ uid: uid })
      if (user) {
        client.send(Transfer.USER, user)
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

export class OnSearchCommand extends Command<
  CustomLobbyRoom,
  { client: Client; name: string }
> {
  async execute({ client, name }: { client: Client; name: string }) {
    try {
      const searchTerm = name.trim()
      const escapedSearchTerm = searchTerm.replace(
        /[-\/\\^$*+?.()|[\]{}]/g,
        "\\$&"
      )
      const regExp = new RegExp("^" + escapedSearchTerm, "i")
      const user = this.room.users.get(client.auth.uid)
      const showBanned =
        user?.role === Role.ADMIN || user?.role === Role.MODERATOR
      const users = await UserMetadata.find(
        {
          displayName: { $regex: regExp },
          ...(showBanned ? {} : { banned: false })
        },
        [
          "uid",
          "elo",
          "displayName",
          "level",
          "avatar",
          ...(showBanned ? ["banned"] : [])
        ],
        { limit: 100, sort: { level: -1 } }
      )
      if (users) {
        const suggestions: Array<ISuggestionUser> = users.map((u) => {
          return {
            id: u.uid,
            elo: u.elo,
            name: u.displayName,
            level: u.level,
            avatar: u.avatar,
            banned: u.banned
          }
        })
        client.send(Transfer.SUGGESTIONS, suggestions)
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

export class BanUserCommand extends Command<
  CustomLobbyRoom,
  { client: Client; uid: string; reason: string }
> {
  async execute({
    client,
    uid,
    reason
  }: {
    client: Client
    uid: string
    reason: string
  }) {
    try {
      const bannedUser = await UserMetadata.findOne({ uid: uid })
      const user = this.room.users.get(client.auth.uid)
      if (
        user &&
        bannedUser &&
        (user.role === Role.ADMIN || user.role === Role.MODERATOR) &&
        bannedUser.role !== Role.ADMIN
      ) {
        this.state.removeMessages(uid)
        if (!bannedUser.banned) {
          await UserMetadata.updateOne({ uid }, { banned: true })
          client.send(
            Transfer.BANNED,
            `${user.displayName} banned the user ${bannedUser.displayName}`
          )

          discordService.announceBan(user, bannedUser, reason)
          bannedUser.banned = true
          client.send(Transfer.USER, bannedUser)
        } else {
          client.send(
            Transfer.BANNED,
            `${bannedUser.displayName} was already banned`
          )
        }
        this.room.clients.forEach((c) => {
          if (c.auth.uid === uid) {
            c.leave(CloseCodes.USER_BANNED)
          }
        })
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

export class UnbanUserCommand extends Command<
  CustomLobbyRoom,
  { client: Client; uid: string; name: string }
> {
  async execute({
    client,
    uid,
    name
  }: {
    client: Client
    uid: string
    name: string
  }) {
    try {
      const user = this.room.users.get(client.auth.uid)
      if (user && (user.role === Role.ADMIN || user.role === Role.MODERATOR)) {
        const res = await UserMetadata.updateOne({ uid }, { banned: false })
        if (res.modifiedCount > 0) {
          client.send(
            Transfer.BANNED,
            `${user.displayName} unbanned the user ${name}`
          )
          discordService.announceUnban(user, name)
          const unbannedUser = await UserMetadata.findOne({ uid })
          if (unbannedUser) client.send(Transfer.USER, unbannedUser)
        }
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

export class SelectLanguageCommand extends Command<
  CustomLobbyRoom,
  { client: Client; message: Language }
> {
  async execute({ client, message }: { client: Client; message: Language }) {
    try {
      const u = this.room.users.get(client.auth.uid)
      if (client.auth.uid && u) {
        const user = await UserMetadata.findOne({ uid: client.auth.uid })
        if (user) {
          user.language = message
          await user.save()
        }
        u.language = message
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

export class AddBotCommand extends Command<
  CustomLobbyRoom,
  { client: Client; url: string }
> {
  async execute({ client, url }: { client: Client; url: string }) {
    try {
      const user = this.room.users.get(client.auth.uid)
      if (
        user &&
        (user.role === Role.ADMIN ||
          user.role === Role.BOT_MANAGER ||
          user.role === Role.MODERATOR)
      ) {
        const id = url.slice(21)
        client.send(Transfer.BOT_DATABASE_LOG, `retrieving id : ${id} ...`)
        client.send(Transfer.BOT_DATABASE_LOG, "retrieving data ...")
        const data = await pastebinService.getPaste(id, false)
        if (data) {
          client.send(Transfer.BOT_DATABASE_LOG, "parsing JSON data ...")
          const json = JSON.parse(data)
          const resultDelete = await BotV2.deleteMany({
            avatar: json.avatar,
            author: json.author
          })
          const keys = new Array<string>()
          this.room.bots.forEach((b) => {
            if (b.avatar === json.avatar && b.author === json.author) {
              keys.push(b.id)
            }
          })
          keys.forEach((k) => {
            this.room.bots.delete(k)
          })
          client.send(
            Transfer.BOT_DATABASE_LOG,
            JSON.stringify(resultDelete, null, 2)
          )
          client.send(
            Transfer.BOT_DATABASE_LOG,
            `creating Bot ${json.avatar} by ${json.author}...`
          )

          const resultCreate = await addBotToDatabase({
            name: json.name,
            avatar: json.avatar,
            elo: json.elo ? json.elo : 1200,
            author: json.author,
            steps: json.steps
          })

          discordService.announceBotAddition(resultCreate, url, user)

          this.room.bots.set(resultCreate.id, resultCreate)
        } else {
          client.send(
            Transfer.BOT_DATABASE_LOG,
            `no pastebin found with given url ${url}`
          )
        }
      }
    } catch (error) {
      logger.error(error)
      client.send(Transfer.BOT_DATABASE_LOG, JSON.stringify(error))
    }
  }
}

export class DeleteBotCommand extends Command<
  CustomLobbyRoom,
  { client: Client; message: string }
> {
  async execute({ client, message }: { client: Client; message: string }) {
    try {
      const user = this.room.users.get(client.auth.uid)
      if (
        user &&
        (user.role === Role.ADMIN ||
          user.role === Role.BOT_MANAGER ||
          user.role === Role.MODERATOR)
      ) {
        const id = message
        const botData = getBotData(id)
        if (!botData) {
          client.send(Transfer.BOT_DATABASE_LOG, `Bot not found:${id}`)
          return
        }
        client.send(
          Transfer.BOT_DATABASE_LOG,
          `deleting bot ${botData?.name}by @${botData?.author} id ${id}`
        )
        const resultDelete = await deleteBotFromDatabase(id)
        client.send(
          Transfer.BOT_DATABASE_LOG,
          JSON.stringify(resultDelete, null, 2)
        )
        discordService.announceBotDeletion(botData, user)

        this.room.bots.delete(id)
      }
    } catch (error) {
      logger.error(error)
      client.send(Transfer.BOT_DATABASE_LOG, JSON.stringify(error))
    }
  }
}

export class JoinOrOpenRoomCommand extends Command<
  CustomLobbyRoom,
  { client: Client; gameMode: GameMode }
> {
  async execute({ client, gameMode }: { client: Client; gameMode: GameMode }) {
    const user = this.room.users.get(client.auth.uid)
    if (!user) return

    switch (gameMode) {
      case GameMode.CUSTOM_LOBBY:
        return [new OpenGameCommand().setPayload({ gameMode, client })]

      case GameMode.QUICKPLAY: {
        const existingQuickplay = this.room.rooms?.find(
          (room) =>
            room.name === "preparation" &&
            room.metadata?.gameMode === GameMode.QUICKPLAY &&
            room.clients < MAX_PLAYERS_PER_GAME
        )
        if (existingQuickplay) {
          client.send(Transfer.REQUEST_ROOM, existingQuickplay.roomId)
        } else {
          return [new OpenGameCommand().setPayload({ gameMode, client })]
        }
        break
      }

      case GameMode.RANKED: {
        const userRank = getRank(user.elo)
        let minRank = EloRank.LEVEL_BALL
        let maxRank = EloRank.BEAST_BALL
        switch (userRank) {
          case EloRank.LEVEL_BALL:
          case EloRank.NET_BALL:
            minRank = EloRank.LEVEL_BALL
            maxRank = EloRank.NET_BALL
            break
          case EloRank.SAFARI_BALL:
          case EloRank.LOVE_BALL:
          case EloRank.PREMIER_BALL:
            minRank = EloRank.SAFARI_BALL
            maxRank = EloRank.PREMIER_BALL
            break
          case EloRank.QUICK_BALL:
          case EloRank.POKE_BALL:
          case EloRank.SUPER_BALL:
            minRank = EloRank.QUICK_BALL
            maxRank = EloRank.SUPER_BALL
            break
          case EloRank.ULTRA_BALL:
          case EloRank.MASTER_BALL:
          case EloRank.BEAST_BALL:
            minRank = EloRank.ULTRA_BALL
            maxRank = EloRank.BEAST_BALL
            break
        }
        const existingRanked = this.room.rooms?.find(
          (room) =>
            room.name === "preparation" &&
            room.metadata?.gameMode === GameMode.RANKED &&
            room.metadata?.minRank === minRank &&
            room.clients < MAX_PLAYERS_PER_GAME
        )
        if (existingRanked) {
          client.send(Transfer.REQUEST_ROOM, existingRanked.roomId)
        } else {
          return [
            new OpenGameCommand().setPayload({
              gameMode,
              client,
              minRank,
              maxRank
            })
          ]
        }
        break
      }

      case GameMode.SCRIBBLE: {
        const existingScribble = this.room.rooms?.find(
          (room) =>
            room.name === "preparation" &&
            room.metadata?.gameMode === GameMode.SCRIBBLE &&
            room.clients < MAX_PLAYERS_PER_GAME
        )
        if (existingScribble) {
          client.send(Transfer.REQUEST_ROOM, existingScribble.roomId)
        } else {
          return [new OpenGameCommand().setPayload({ gameMode, client })]
        }
        break
      }
    }
  }
}

export class OpenGameCommand extends Command<
  CustomLobbyRoom,
  {
    gameMode: GameMode
    client: Client
    minRank?: EloRank
    maxRank?: EloRank
  }
> {
  async execute({
    gameMode,
    client,
    minRank,
    maxRank
  }: {
    gameMode: GameMode
    client: Client
    minRank?: EloRank
    maxRank?: EloRank
  }) {
    const user = this.room.users.get(client.auth.uid)
    if (!user) return
    let roomName = `${user.displayName}'${user.displayName.endsWith("s") ? "" : "s"} room`
    let noElo: boolean = false
    let password: string | null = null
    let ownerId: string | null = null

    if (gameMode === GameMode.RANKED) {
      roomName = "Ranked Match"
    } else if (gameMode === GameMode.SCRIBBLE) {
      roomName = "Smeargle's Scribble"
      noElo = true
    } else if (gameMode === GameMode.CUSTOM_LOBBY) {
      ownerId = user.uid
      password = Math.random().toString(36).substring(2, 6).toUpperCase()
    } else if (gameMode === GameMode.QUICKPLAY) {
      roomName = "Quick play"
    }

    const newRoom = await matchMaker.createRoom("preparation", {
      gameMode,
      minRank,
      maxRank,
      noElo,
      password,
      ownerId,
      roomName
    })
    client.send(Transfer.REQUEST_ROOM, newRoom.roomId)
  }
}

export class OnCreateTournamentCommand extends Command<
  CustomLobbyRoom,
  { client: Client; name: string; startDate: string }
> {
  async execute({
    client,
    name,
    startDate
  }: {
    client: Client
    name: string
    startDate: string
  }) {
    try {
      const user = this.room.users.get(client.auth.uid)
      if (user && user.role && user.role === Role.ADMIN) {
        await this.state.createTournament(name, startDate)
        await this.room.fetchTournaments()
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

export class DeleteTournamentCommand extends Command<
  CustomLobbyRoom,
  { client: Client; tournamentId: string }
> {
  execute({ client, tournamentId }: { client: Client; tournamentId: string }) {
    try {
      const user = this.room.users.get(client.auth.uid)
      if (user && user.role && user.role === Role.ADMIN) {
        this.state.removeTournament(tournamentId)
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

export class ParticipateInTournamentCommand extends Command<
  CustomLobbyRoom,
  { client: Client; tournamentId: string; participate: boolean }
> {
  async execute({
    client,
    tournamentId,
    participate
  }: {
    client: Client
    tournamentId: string
    participate: boolean
  }) {
    try {
      if (!client.auth.uid || this.room.users.has(client.auth.uid) === false)
        return
      const tournament = this.state.tournaments.find(
        (t) => t.id === tournamentId
      )

      if (!tournament)
        return logger.error(`Tournament not found: ${tournamentId}`)

      const user = await UserMetadata.findOne({ uid: client.auth.uid })
      if (!user) return

      if (participate) {
        //logger.debug(`${user.uid} participates in tournament ${tournamentId}`)
        const tournamentPlayer = new TournamentPlayerSchema(
          user.displayName,
          user.avatar,
          user.elo
        )

        tournament.players.set(user.uid, tournamentPlayer)
      } else if (tournament.players.has(user.uid)) {
        /*logger.debug(
          `${user.uid} no longer participates in tournament ${tournamentId}`
        )*/
        tournament.players.delete(user.uid)
      }

      const mongoTournament = await Tournament.findById(tournamentId)
      if (mongoTournament) {
        mongoTournament.players = convertSchemaToRawObject(tournament.players)
        mongoTournament.save()
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

export class NextTournamentStageCommand extends Command<
  CustomLobbyRoom,
  { tournamentId: string }
> {
  async execute({ tournamentId }: { tournamentId: string }) {
    try {
      logger.debug(`Tournament ${tournamentId} is moving to next stage`)
      const tournament = this.state.tournaments.find(
        (t) => t.id === tournamentId
      )
      if (!tournament)
        return logger.error(`Tournament not found: ${tournamentId}`)

      const remainingPlayers = getRemainingPlayers(tournament)
      if (
        remainingPlayers.length <= 4 &&
        remainingPlayers.some((p) => p.ranks.length > 0)
      ) {
        // finals ended
        return [new EndTournamentCommand().setPayload({ tournamentId })]
      } else {
        return [
          new CreateTournamentLobbiesCommand().setPayload({ tournamentId })
        ]
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

export class CreateTournamentLobbiesCommand extends Command<
  CustomLobbyRoom,
  { client?: Client; tournamentId: string }
> {
  async execute({
    tournamentId,
    client
  }: {
    tournamentId: string
    client?: Client
  }) {
    try {
      if (client) {
        const user = this.room.users.get(client.auth.uid)
        if (!user || !user.role || user.role !== Role.ADMIN) {
          return
        }
      }

      logger.debug(`Creating tournament lobbies for tournament ${tournamentId}`)
      const tournament = this.state.tournaments.find(
        (t) => t.id === tournamentId
      )
      if (!tournament)
        return logger.error(`Tournament not found: ${tournamentId}`)

      this.state.addAnnouncement(
        `${tournament.name} ${getTournamentStage(tournament)} are starting !`
      )

      const brackets = makeBrackets(tournament)
      tournament.brackets.clear()

      for (const bracket of brackets) {
        const bracketId = nanoid()
        logger.info(`Creating tournament game ${bracket.name} id: ${bracketId}`)
        tournament.brackets.set(
          bracketId,
          new TournamentBracketSchema(bracket.name, bracket.playersId)
        )

        await matchMaker.createRoom("preparation", {
          gameMode: GameMode.TOURNAMENT,
          noElo: true,
          ownerId: null,
          roomName: bracket.name,
          autoStartDelayInSeconds: 10 * 60,
          whitelist: bracket.playersId,
          tournamentId,
          bracketId
        })
        await wait(1000)
      }

      //save brackets to db
      const mongoTournament = await Tournament.findById(tournamentId)
      if (mongoTournament) {
        mongoTournament.brackets = convertSchemaToRawObject(tournament.brackets)
        await mongoTournament.save()
      }

      tournament.pendingLobbiesCreation = false
    } catch (error) {
      logger.error(error)
    }
  }
}

export class RemakeTournamentLobbyCommand extends Command<
  CustomLobbyRoom,
  { client?: Client; tournamentId: string; bracketId: string }
> {
  async execute({
    tournamentId,
    bracketId,
    client
  }: {
    tournamentId: string
    bracketId: string
    client?: Client
  }) {
    try {
      if (client) {
        const user = this.room.users.get(client.auth.uid)
        if (!user || !user.role || user.role !== Role.ADMIN) {
          return
        }
      }

      const tournament = this.state.tournaments.find(
        (t) => t.id === tournamentId
      )
      if (!tournament)
        return logger.error(`Tournament not found: ${tournamentId}`)

      const bracket = tournament.brackets.get(bracketId)
      if (!bracket)
        return logger.error(`Tournament bracket not found: ${bracketId}`)

      logger.info(`Remaking tournament game ${bracket.name} id: ${bracketId}`)
      tournament.brackets.set(
        bracketId,
        new TournamentBracketSchema(bracket.name, bracket.playersId)
      )

      await matchMaker.createRoom("preparation", {
        gameMode: GameMode.TOURNAMENT,
        noElo: true,
        ownerId: null,
        roomName: bracket.name,
        autoStartDelayInSeconds: 10 * 60,
        whitelist: bracket.playersId,
        tournamentId,
        bracketId
      })

      //save brackets to db
      const mongoTournament = await Tournament.findById(tournamentId)
      if (mongoTournament) {
        mongoTournament.brackets = convertSchemaToRawObject(tournament.brackets)
        await mongoTournament.save()
      }

      tournament.pendingLobbiesCreation = false
    } catch (error) {
      logger.error(error)
    }
  }
}

export class EndTournamentMatchCommand extends Command<
  CustomLobbyRoom,
  {
    tournamentId: string
    bracketId: string
    players: { id: string; rank: number }[]
  }
> {
  async execute({
    tournamentId,
    bracketId,
    players
  }: {
    tournamentId: string
    bracketId: string
    players: IPlayer[]
  }) {
    logger.debug(`Tournament ${tournamentId} bracket ${bracketId} has ended`)
    try {
      const tournament = this.state.tournaments.find(
        (t) => t.id === tournamentId
      )
      if (!tournament)
        return logger.error(`Tournament not found: ${tournamentId}`)

      const bracket = tournament.brackets.get(bracketId)
      if (!bracket)
        return logger.error(`Tournament bracket not found: ${bracketId}`)

      bracket.finished = true

      players.forEach((p) => {
        const player = tournament.players.get(p.id)
        if (player) {
          player.ranks.push(p.rank)
          if (p.rank > 4) {
            // eliminate players whose rank is > 4
            player.eliminated = true
          }
        }
      })

      bracket.playersId.forEach((playerId) => {
        const player = tournament.players.get(playerId)
        if (player && players.every((p) => p.id !== playerId)) {
          // eliminate players who did not attend their bracket
          player.eliminated = true
        }
      })

      if (
        !tournament.pendingLobbiesCreation &&
        values(tournament.brackets).every((b) => b.finished)
      ) {
        tournament.pendingLobbiesCreation = true // prevent executing command multiple times
        //save brackets and player ranks to db before moving to next stage
        const mongoTournament = await Tournament.findById(tournamentId)
        if (mongoTournament) {
          mongoTournament.players = convertSchemaToRawObject(tournament.players)
          mongoTournament.brackets = convertSchemaToRawObject(
            tournament.brackets
          )
          mongoTournament.save()
        }

        return [new NextTournamentStageCommand().setPayload({ tournamentId })]
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

export class EndTournamentCommand extends Command<
  CustomLobbyRoom,
  { tournamentId: string }
> {
  async execute({ tournamentId }: { tournamentId: string }) {
    try {
      logger.debug(`Tournament ${tournamentId} is finished`)
      const tournament = this.state.tournaments.find(
        (t) => t.id === tournamentId
      )
      if (!tournament)
        return logger.error(`Tournament not found: ${tournamentId}`)

      let finalists: (ITournamentPlayer & { id: string })[] = [],
        nbMatchsPlayed = 0

      tournament.players.forEach((player, playerId) => {
        if (player.ranks.length > nbMatchsPlayed) {
          finalists = []
          nbMatchsPlayed = player.ranks.length
        }
        if (player.ranks.length === nbMatchsPlayed) {
          finalists.push({
            id: playerId,
            ...player
          })
        }
      })

      const winner = finalists.find((p) => p.ranks.at(-1) === 1)
      if (winner) {
        this.room.presence.publish("tournament-winner", winner)
      }

      for (const player of finalists) {
        const rank = player.ranks.at(-1) ?? 1
        const user = this.room.users.get(player.id)

        const mongoUser = await UserMetadata.findOne({ uid: player.id })
        if (mongoUser == null || user == null) continue

        mongoUser.booster += 3 // 3 boosters for top 8
        if (mongoUser.titles.includes(Title.ACE_TRAINER) === false) {
          mongoUser.titles.push(Title.ACE_TRAINER)
          user.titles.push(Title.ACE_TRAINER)
        }

        if (rank <= 4) {
          mongoUser.booster += 3 // 6 boosters for top 4
          if (mongoUser.titles.includes(Title.ELITE_FOUR_MEMBER) === false) {
            mongoUser.titles.push(Title.ELITE_FOUR_MEMBER)
            user.titles.push(Title.ELITE_FOUR_MEMBER)
          }
        }

        if (rank === 1) {
          mongoUser.booster += 4 // 10 boosters for top 1
          if (mongoUser.titles.includes(Title.CHAMPION) === false) {
            mongoUser.titles.push(Title.CHAMPION)
            user.titles.push(Title.CHAMPION)
          }
        }

        user.booster = mongoUser.booster
        await mongoUser.save()
      }

      tournament.brackets.clear()
      tournament.finished = true

      const mongoTournament = await Tournament.findById(tournamentId)
      if (mongoTournament) {
        mongoTournament.finished = true
        mongoTournament.brackets = convertSchemaToRawObject(tournament.brackets)
        await mongoTournament.save()
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

export class DeleteRoomCommand extends Command<
  CustomLobbyRoom,
  {
    client: Client
    roomId?: string
    tournamentId?: string
    bracketId?: string
  }
> {
  async execute({ client, roomId, tournamentId, bracketId }) {
    try {
      if (client) {
        const user = this.room.users.get(client.auth.uid)
        if (!user || !user.role || user.role !== Role.ADMIN) {
          return
        }
      }

      const roomsToDelete: Room<any>[] = []
      if (roomId) {
        const roomToDelete = matchMaker.getRoomById(roomId)
        if (roomToDelete) roomsToDelete.push(roomToDelete)
      } else if (tournamentId) {
        const tournament = this.state.tournaments.find(
          (t) => t.id === tournamentId
        )
        if (!tournament)
          return logger.error(
            `DeleteRoomCommand ; Tournament not found: ${tournamentId}`
          )

        const allRooms = await matchMaker.query({})
        roomsToDelete.push(
          ...allRooms
            .filter(
              (result) =>
                result.metadata?.tournamentId === tournamentId &&
                (bracketId === "all" ||
                  result.metadata?.bracketId === bracketId)
            )
            .map((result) => matchMaker.getRoomById(result.roomId))
            .filter((room) => room != null)
        )
      }

      if (roomsToDelete.length === 0) {
        return logger.error(
          `DeleteRoomCommand ; room not found with query: roomId: ${roomId} tournamentId: ${tournamentId} bracketId: ${bracketId}`
        )
      }

      roomsToDelete.forEach((roomToDelete) => {
        roomToDelete.clients.forEach((cli) => {
          cli.leave(CloseCodes.ROOM_DELETED)
        })
        roomToDelete.disconnect()
      })
    } catch (error) {
      logger.error(`DeleteRoomCommand error:`, error)
    }
  }
}
