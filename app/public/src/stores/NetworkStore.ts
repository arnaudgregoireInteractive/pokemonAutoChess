import { User } from "@firebase/auth-types"
import { PayloadAction, createSlice } from "@reduxjs/toolkit"
import { Client, Room } from "colyseus.js"
import { IBot } from "../../../models/mongo-models/bot-v2"
import { IUserMetadata } from "../../../models/mongo-models/user-metadata"
import AfterGameState from "../../../rooms/states/after-game-state"
import GameState from "../../../rooms/states/game-state"
import PreparationState from "../../../rooms/states/preparation-state"
import {
  Emotion,
  ICustomLobbyState,
  Role,
  Title,
  Transfer
} from "../../../types"
import { EloRank } from "../../../types/Config"
import { BotDifficulty } from "../../../types/enum/Game"
import { Item } from "../../../types/enum/Item"
import { Language } from "../../../types/enum/Language"
import { PkmProposition } from "../../../types/enum/Pokemon"
import { SpecialGameRule } from "../../../types/enum/SpecialGameRule"
import { logger } from "../../../utils/logger"
import { getAvatarString } from "../../../utils/avatar"

export interface INetwork {
  client: Client
  lobby: Room<ICustomLobbyState> | undefined
  preparation: Room<PreparationState> | undefined
  game: Room<GameState> | undefined
  after: Room<AfterGameState> | undefined
  uid: string
  displayName: string
  profile: IUserMetadata | undefined
  error: string | null
}

const endpoint = `${window.location.protocol.replace("http", "ws")}//${
  window.location.host
}`
logger.info(endpoint)

const initalState: INetwork = {
  client: new Client(endpoint),
  lobby: undefined,
  preparation: undefined,
  game: undefined,
  after: undefined,
  uid: "",
  displayName: "",
  profile: undefined,
  error: null
}

export const networkSlice = createSlice({
  name: "network",
  initialState: initalState,
  reducers: {
    logIn: (state, action: PayloadAction<User>) => {
      if (action.payload) {
        state.uid = action.payload.uid
        state.displayName = action.payload.displayName ?? "Anonymous"
      }
    },
    logOut: (state) => {
      state.client = new Client(endpoint)
      state.uid = ""
      state.preparation?.connection.isOpen && state.preparation?.leave(true)
      state.preparation = undefined
      state.lobby?.connection.isOpen && state.lobby?.leave(true)
      state.lobby = undefined
      state.game?.connection.isOpen && state.game?.leave(true)
      state.game = undefined
      state.after?.connection.isOpen && state.after?.leave(true)
      state.after = undefined
    },
    setProfile: (state, action: PayloadAction<IUserMetadata>) => {
      state.profile = action.payload
      state.profile.pokemonCollection = new Map(
        Object.entries(action.payload.pokemonCollection)
      )
    },
    joinLobby: (state, action: PayloadAction<Room<ICustomLobbyState>>) => {
      state.lobby = action.payload
      state.preparation?.connection.isOpen && state.preparation?.leave(true)
      state.preparation = undefined
      state.game?.connection.close() // still allow to reconnect if left by mistake
      state.game = undefined
      state.after?.connection.isOpen && state.after?.leave(true)
      state.after = undefined
    },
    joinPreparation: (state, action: PayloadAction<Room<PreparationState>>) => {
      state.preparation = action.payload
      state.lobby?.connection.isOpen && state.lobby?.leave(true)
      state.lobby = undefined
      state.game?.connection.close() // still allow to reconnect if left by mistake
      state.game = undefined
      state.after?.connection.isOpen && state.after?.leave(true)
      state.after = undefined
    },
    joinGame: (state, action: PayloadAction<Room<GameState>>) => {
      Object.assign(state, { game: action.payload })
      state.preparation?.connection.isOpen && state.preparation?.leave(true)
      state.preparation = undefined
      state.lobby?.connection.isOpen && state.lobby?.leave(true)
      state.lobby = undefined
      state.after?.connection.isOpen && state.after?.leave(true)
      state.after = undefined
    },
    joinAfter: (state, action: PayloadAction<Room<AfterGameState>>) => {
      state.after = action.payload
      state.game?.connection.close() // still allow to reconnect if left by mistake
      state.game = undefined
      state.lobby?.connection.isOpen && state.lobby?.leave(true)
      state.lobby = undefined
      state.preparation?.connection.isOpen && state.preparation?.leave(true)
      state.preparation = undefined
    },
    sendMessage: (state, action: PayloadAction<string>) => {
      if (state.lobby) {
        state.lobby.send(Transfer.NEW_MESSAGE, action.payload)
      }
      if (state.preparation) {
        state.preparation.send(Transfer.NEW_MESSAGE, action.payload)
      }
    },
    removeMessage: (state, action: PayloadAction<{ id: string }>) => {
      if (state.lobby) {
        state.lobby.send(Transfer.REMOVE_MESSAGE, action.payload)
      }
      if (state.preparation) {
        state.preparation.send(Transfer.REMOVE_MESSAGE, action.payload)
      }
    },
    searchName: (state, action: PayloadAction<string>) => {
      state.lobby?.send(Transfer.SEARCH, { name: action.payload })
    },
    changeName: (state, action: PayloadAction<string>) => {
      if (state.profile) state.profile.displayName = action.payload
      state.lobby?.send(Transfer.CHANGE_NAME, { name: action.payload })
    },
    changeAvatar: (
      state,
      action: PayloadAction<{ index: string; emotion: Emotion; shiny: boolean }>
    ) => {
      if (state.profile)
        state.profile.avatar = getAvatarString(
          action.payload.index,
          action.payload.shiny,
          action.payload.emotion
        )
      state.lobby?.send(Transfer.CHANGE_AVATAR, action.payload)
    },
    addBot: (state, action: PayloadAction<BotDifficulty | IBot>) => {
      state.preparation?.send(Transfer.ADD_BOT, action.payload)
    },
    removeBot: (state, action: PayloadAction<string>) => {
      state.preparation?.send(Transfer.REMOVE_BOT, action.payload)
    },
    toggleReady: (state, action: PayloadAction<boolean>) => {
      state.preparation?.send(Transfer.TOGGLE_READY, action.payload)
    },
    setNoElo: (state, action: PayloadAction<boolean>) => {
      state.preparation?.send(Transfer.CHANGE_NO_ELO, action.payload)
    },
    lockShop: (state) => {
      state.game?.send(Transfer.LOCK)
    },
    levelClick: (state) => {
      state.game?.send(Transfer.LEVEL_UP)
    },
    shopClick: (state, action: PayloadAction<number>) => {
      state.game?.send(Transfer.SHOP, { id: action.payload })
    },
    pokemonPropositionClick: (state, action: PayloadAction<PkmProposition>) => {
      state.game?.send(Transfer.POKEMON_PROPOSITION, action.payload)
    },
    itemClick: (state, action: PayloadAction<Item>) => {
      state.game?.send(Transfer.ITEM, action.payload)
    },
    gameStartRequest: (state, action: PayloadAction<string>) => {
      state.preparation?.send(Transfer.GAME_START_REQUEST, {
        token: action.payload
      })
    },
    changeRoomName: (state, action: PayloadAction<string>) => {
      state.preparation?.send(Transfer.CHANGE_ROOM_NAME, action.payload)
    },
    changeRoomPassword: (state, action: PayloadAction<string | null>) => {
      state.preparation?.send(Transfer.CHANGE_ROOM_PASSWORD, action.payload)
    },
    changeRoomMinMaxRanks: (
      state,
      action: PayloadAction<{
        minRank: EloRank | null
        maxRank: EloRank | null
      }>
    ) => {
      state.preparation?.send(Transfer.CHANGE_ROOM_RANKS, action.payload)
    },
    setSpecialRule: (state, action: PayloadAction<SpecialGameRule | null>) => {
      state.preparation?.send(Transfer.CHANGE_SPECIAL_RULE, action.payload)
    },
    changeSelectedEmotion: (
      state,
      action: PayloadAction<{ index: string; emotion: Emotion; shiny: boolean }>
    ) => {
      if (state.profile) {
        const pokemonConfig = state.profile.pokemonCollection.get(
          action.payload.index
        )
        if (pokemonConfig) {
          pokemonConfig.selectedEmotion = action.payload.emotion
          pokemonConfig.selectedShiny = action.payload.shiny
        }
      }
      state.lobby?.send(Transfer.CHANGE_SELECTED_EMOTION, action.payload)
    },
    buyEmotion: (
      state,
      action: PayloadAction<{ index: string; emotion: Emotion; shiny: boolean }>
    ) => {
      state.lobby?.send(Transfer.BUY_EMOTION, action.payload)
    },
    buyBooster: (state, action: PayloadAction<{ index: string }>) => {
      state.lobby?.send(Transfer.BUY_BOOSTER, action.payload)
    },
    openBooster: (state) => {
      state.lobby?.send(Transfer.OPEN_BOOSTER)
    },
    showEmote: (state, action: PayloadAction<string | undefined>) => {
      state.game?.send(Transfer.SHOW_EMOTE, action.payload)
    },
    searchById: (state, action: PayloadAction<string>) => {
      state.lobby?.send(Transfer.SEARCH_BY_ID, action.payload)
    },
    setTitle: (state, action: PayloadAction<Title>) => {
      if (state.profile) state.profile.title = action.payload
      state.lobby?.send(Transfer.SET_TITLE, action.payload)
    },
    deleteTournament: (state, action: PayloadAction<{ id: string }>) => {
      state.lobby?.send(Transfer.DELETE_TOURNAMENT, action.payload)
    },
    remakeTournamentLobby: (
      state,
      action: PayloadAction<{ tournamentId: string; bracketId: string }>
    ) => {
      state.lobby?.send(Transfer.REMAKE_TOURNAMENT_LOBBY, action.payload)
    },
    participateInTournament: (
      state,
      action: PayloadAction<{ tournamentId: string; participate: boolean }>
    ) => {
      state.lobby?.send(Transfer.PARTICIPATE_TOURNAMENT, action.payload)
    },
    giveBooster: (
      state,
      action: PayloadAction<{ uid: string; numberOfBoosters: number }>
    ) => {
      state.lobby?.send(Transfer.GIVE_BOOSTER, action.payload)
    },
    heapSnapshot: (state) => {
      state.lobby?.send(Transfer.HEAP_SNAPSHOT)
    },
    giveRole: (state, action: PayloadAction<{ uid: string; role: Role }>) => {
      state.lobby?.send(Transfer.SET_ROLE, action.payload)
    },
    giveTitle: (
      state,
      action: PayloadAction<{ uid: string; title: Title }>
    ) => {
      state.lobby?.send(Transfer.GIVE_TITLE, action.payload)
    },
    kick: (state, action: PayloadAction<string>) => {
      state.preparation?.send(Transfer.KICK, action.payload)
    },
    deleteRoom: (state) => {
      state.preparation?.send(Transfer.DELETE_ROOM)
    },
    ban: (state, action: PayloadAction<{ uid: string; reason: string }>) => {
      state.lobby?.send(Transfer.BAN, action.payload)
    },
    unban: (state, action: PayloadAction<{ uid: string; name: string }>) => {
      state.lobby?.send(Transfer.UNBAN, action.payload)
    },
    deleteBotDatabase: (state, action: PayloadAction<string>) => {
      state.lobby?.send(Transfer.DELETE_BOT_DATABASE, action.payload)
    },
    addBotDatabase: (state, action: PayloadAction<string>) => {
      state.lobby?.send(Transfer.ADD_BOT_DATABASE, action.payload)
    },
    selectLanguage: (state, action: PayloadAction<Language>) => {
      state.lobby?.send(Transfer.SELECT_LANGUAGE, action.payload)
    },
    createTournament: (
      state,
      action: PayloadAction<{ name: string; startDate: string }>
    ) => {
      state.lobby?.send(Transfer.NEW_TOURNAMENT, action.payload)
    },
    setErrorAlertMessage: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    }
  }
})

export const {
  heapSnapshot,
  selectLanguage,
  unban,
  deleteBotDatabase,
  addBotDatabase,
  ban,
  pokemonPropositionClick,
  giveTitle,
  giveRole,
  removeMessage,
  deleteTournament,
  remakeTournamentLobby,
  participateInTournament,
  giveBooster,
  showEmote,
  openBooster,
  changeSelectedEmotion,
  buyEmotion,
  buyBooster,
  changeRoomName,
  changeRoomPassword,
  changeRoomMinMaxRanks,
  setSpecialRule,
  gameStartRequest,
  logIn,
  logOut,
  setProfile,
  joinLobby,
  sendMessage,
  searchName,
  joinPreparation,
  joinGame,
  joinAfter,
  changeName,
  changeAvatar,
  addBot,
  removeBot,
  toggleReady,
  setNoElo,
  itemClick,
  shopClick,
  levelClick,
  lockShop,
  searchById,
  setTitle,
  kick,
  deleteRoom,
  createTournament,
  setErrorAlertMessage
} = networkSlice.actions

export default networkSlice.reducer
