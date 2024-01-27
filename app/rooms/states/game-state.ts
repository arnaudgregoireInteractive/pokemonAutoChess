import {
  ArraySchema,
  MapSchema,
  Schema,
  SetSchema,
  type
} from "@colyseus/schema"
import BotManager from "../../core/bot-manager"
import { DesignTiled, initTilemap } from "../../core/design"
import Simulation from "../../core/simulation"
import { FloatingItem } from "../../models/colyseus-models/floating-item"
import Player from "../../models/colyseus-models/player"
import { PokemonAvatarModel } from "../../models/colyseus-models/pokemon-avatar"
import { Portal, SynergySymbol } from "../../models/colyseus-models/portal"
import Shop from "../../models/shop"
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  Dungeon,
  DungeonPMDO,
  EloRank,
  StageDuration
} from "../../types/Config"
import { GamePhaseState, LobbyType } from "../../types/enum/Game"
import { Item } from "../../types/enum/Item"
import { PkmProposition } from "../../types/enum/Pokemon"
import { Weather } from "../../types/enum/Weather"
import { SpecialLobbyRule } from "../../types/enum/SpecialLobbyRule"
import { pickRandomIn, randomBetween } from "../../utils/random"

export default class GameState extends Schema {
  @type("string") afterGameId = ""
  @type("uint8") roundTime = StageDuration[1]
  @type("uint8") phase = GamePhaseState.PICK
  @type({ map: Player }) players = new MapSchema<Player>()
  @type({ map: PokemonAvatarModel }) avatars =
    new MapSchema<PokemonAvatarModel>()
  @type({ map: FloatingItem }) floatingItems = new MapSchema<FloatingItem>()
  @type({ map: Portal }) portals = new MapSchema<Portal>()
  @type({ map: SynergySymbol }) symbols = new MapSchema<SynergySymbol>()
  @type(["string"]) additionalPokemons = new ArraySchema<PkmProposition>()
  @type("uint8") stageLevel = 1
  @type("string") mapName: string
  @type("string") weather: Weather
  @type("boolean") noElo = false
  @type("string") lobbyType: LobbyType = LobbyType.NORMAL
  @type({ set: "string" }) spectators = new SetSchema<string>()
  @type({ map: Simulation }) simulations = new MapSchema<Simulation>()
  @type("uint8") lightX = randomBetween(0, BOARD_WIDTH - 1)
  @type("uint8") lightY = randomBetween(1, BOARD_HEIGHT / 2)
  @type("string") mapMusic: Dungeon
  @type("string") specialLobbyRule: SpecialLobbyRule | null = null

  time = StageDuration[1] * 1000
  updatePhaseNeeded = false
  botManager: BotManager = new BotManager()
  shop: Shop = new Shop()
  id: DungeonPMDO
  tilemap: DesignTiled | undefined
  gameFinished = false
  gameLoaded = false
  name: string
  startTime: number
  endTime: number | undefined = undefined
  preparationId: string
  shinyEncounter = false
  pveRewards: Item[] = []
  minRank: EloRank | null = null

  constructor(
    preparationId: string,
    name: string,
    noElo: boolean,
    selectedMap: DungeonPMDO | "random",
    lobbyType: LobbyType,
    minRank: EloRank | null
  ) {
    super()
    this.preparationId = preparationId
    this.startTime = Date.now()
    this.name = name
    this.id = selectedMap === "random" ? pickRandomIn(DungeonPMDO) : selectedMap
    this.noElo = noElo
    this.lobbyType = lobbyType
    this.minRank = minRank
    this.mapName = this.id
    this.mapMusic = pickRandomIn(Object.keys(Dungeon) as Dungeon[])
    this.weather = Weather.NEUTRAL
    this.tilemap = initTilemap(this.id)
    if (lobbyType === LobbyType.SCRIBBLE) {
      this.specialLobbyRule = pickRandomIn(Object.values(SpecialLobbyRule))
    }
  }
}
