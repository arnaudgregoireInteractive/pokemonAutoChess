import { Emotion } from "."
import { EloRank } from "./enum/EloRank"
import { AttackType, Rarity, Stat } from "./enum/Game"
import { FishingRod, Item } from "./enum/Item"
import { Pkm, PkmDuo, PkmProposition } from "./enum/Pokemon"
import { Synergy } from "./enum/Synergy"
import { Weather } from "./enum/Weather"

export const ON_ATTACK_MANA = 5
export const MANA_SCARF_MANA = 8
export const SCOPE_LENS_MANA = 15
export const ARMOR_FACTOR = 0.05
export const BOARD_WIDTH = 8
export const BOARD_HEIGHT = 6
export const BOARD_SIDE_HEIGHT = 4 // 0 = bench

export const RarityHpCost: { [key in Rarity]: number } = Object.freeze({
  [Rarity.COMMON]: 1,
  [Rarity.UNCOMMON]: 1,
  [Rarity.RARE]: 2,
  [Rarity.EPIC]: 2,
  [Rarity.ULTRA]: 3,
  [Rarity.UNIQUE]: 3,
  [Rarity.LEGENDARY]: 3,
  [Rarity.SPECIAL]: 1,
  [Rarity.HATCH]: 4
})

// used to evaluate unit value, even if some categories are not found in shop
export const RarityCost: { [key in Rarity]: number } = Object.freeze({
  [Rarity.SPECIAL]: 0, // many edgecases with custom buy/sell prices
  [Rarity.COMMON]: 1,
  [Rarity.UNCOMMON]: 2,
  [Rarity.RARE]: 3,
  [Rarity.EPIC]: 4,
  [Rarity.ULTRA]: 5,
  [Rarity.HATCH]: 9,
  [Rarity.UNIQUE]: 10,
  [Rarity.LEGENDARY]: 20
})

export const EmotionCost: { [key in Emotion]: number } = {
  [Emotion.NORMAL]: 50,
  [Emotion.HAPPY]: 100,
  [Emotion.PAIN]: 100,
  [Emotion.ANGRY]: 100,
  [Emotion.WORRIED]: 100,
  [Emotion.SAD]: 100,
  [Emotion.CRYING]: 100,
  [Emotion.SHOUTING]: 150,
  [Emotion.TEARY_EYED]: 150,
  [Emotion.DETERMINED]: 150,
  [Emotion.JOYOUS]: 150,
  [Emotion.INSPIRED]: 150,
  [Emotion.SURPRISED]: 150,
  [Emotion.DIZZY]: 150,
  [Emotion.SPECIAL0]: 200,
  [Emotion.SPECIAL1]: 200,
  [Emotion.SIGH]: 200,
  [Emotion.STUNNED]: 200,
  [Emotion.SPECIAL2]: 200,
  [Emotion.SPECIAL3]: 200
}

export function getEmotionCost(emotion: Emotion, isShiny: boolean): number {
  return isShiny ? EmotionCost[emotion] * 3 : EmotionCost[emotion]
}

export const ExpTable: { [key: number]: number } = Object.freeze({
  1: 0,
  2: 2,
  3: 6,
  4: 10,
  5: 22,
  6: 34,
  7: 52,
  8: 72,
  9: 255
})

export const SynergyTriggers: { [key in Synergy]: number[] } = {
  [Synergy.NORMAL]: [3, 5, 7, 9],
  [Synergy.GRASS]: [3, 5, 7],
  [Synergy.FIRE]: [2, 4, 6, 8],
  [Synergy.WATER]: [3, 6, 9],
  [Synergy.ELECTRIC]: [3, 6, 9],
  [Synergy.FIGHTING]: [2, 4, 6, 8],
  [Synergy.PSYCHIC]: [2, 4, 6],
  [Synergy.DARK]: [3, 5, 7],
  [Synergy.STEEL]: [2, 4, 6, 8],
  [Synergy.GROUND]: [2, 4, 6, 8],
  [Synergy.POISON]: [3, 5, 7],
  [Synergy.DRAGON]: [3, 5, 7],
  [Synergy.FIELD]: [3, 6, 9],
  [Synergy.MONSTER]: [2, 4, 6, 9],
  [Synergy.HUMAN]: [2, 4, 6],
  [Synergy.AQUATIC]: [2, 4, 6],
  [Synergy.BUG]: [2, 4, 6, 8],
  [Synergy.FLYING]: [2, 4, 6, 8],
  [Synergy.FLORA]: [3, 4, 5, 6],
  [Synergy.ROCK]: [2, 4, 6],
  [Synergy.GHOST]: [2, 4, 6, 8],
  [Synergy.FAIRY]: [2, 4, 6, 8],
  [Synergy.ICE]: [2, 4, 6, 8],
  [Synergy.FOSSIL]: [2, 4, 6],
  [Synergy.SOUND]: [2, 4, 6],
  [Synergy.ARTIFICIAL]: [2, 4, 6],
  [Synergy.BABY]: [3, 5, 7],
  [Synergy.LIGHT]: [2, 3, 4, 5],
  [Synergy.WILD]: [2, 4, 6, 9],
  [Synergy.AMORPHOUS]: [3, 5, 7],
  [Synergy.GOURMET]: [3, 4, 5]
}

// games that finish before level 10 are not counted for XP and ELO to avoid potential abuse
export const MinStageLevelForGameToCount = 10

export const ExpPlace = [700, 400, 350, 300, 250, 200, 200, 200]

export const RarityColor: { [key in Rarity]: string } = {
  [Rarity.COMMON]: "#a0a0a0",
  [Rarity.UNCOMMON]: "#3bc95e",
  [Rarity.RARE]: "#41bfcc",
  [Rarity.EPIC]: "#ca6cee",
  [Rarity.ULTRA]: "#E53B3B",
  [Rarity.UNIQUE]: "#ffffff",
  [Rarity.LEGENDARY]: "#e6cb49",
  [Rarity.SPECIAL]: "#967FFF",
  [Rarity.HATCH]: "#b9915a"
}

export const BoosterRarityProbability: { [key in Rarity]: number } = {
  [Rarity.COMMON]: 0.12,
  [Rarity.UNCOMMON]: 0.2,
  [Rarity.RARE]: 0.2,
  [Rarity.EPIC]: 0.18,
  [Rarity.ULTRA]: 0.06,
  [Rarity.UNIQUE]: 0.1,
  [Rarity.LEGENDARY]: 0.05,
  [Rarity.HATCH]: 0.06,
  [Rarity.SPECIAL]: 0.03
}

// should be proportional to rarity, see above
export const BoosterPriceByRarity: { [key in Rarity]: number } = {
  [Rarity.COMMON]: 600,
  [Rarity.UNCOMMON]: 1000,
  [Rarity.RARE]: 1000,
  [Rarity.EPIC]: 900,
  [Rarity.ULTRA]: 300,
  [Rarity.UNIQUE]: 500,
  [Rarity.LEGENDARY]: 250,
  [Rarity.HATCH]: 300,
  [Rarity.SPECIAL]: 500 // special is a bit more expensive due to unowns farming
}

export const DITTO_RATE = 0.005
export const KECLEON_RATE = 1 / 100
export const ARCEUS_RATE = 1 / 100

export const AttackTypeColor: { [key in AttackType] } = {
  [AttackType.PHYSICAL]: "#FF6E55",
  [AttackType.SPECIAL]: "#7FC9FF",
  [AttackType.TRUE]: "#FFD800"
}

export const RarityProbabilityPerLevel: { [key: number]: number[] } = {
  1: [1, 0, 0, 0, 0],
  2: [1, 0, 0, 0, 0],
  3: [0.7, 0.3, 0, 0, 0],
  4: [0.5, 0.4, 0.1, 0, 0],
  5: [0.36, 0.42, 0.2, 0.02, 0],
  6: [0.25, 0.4, 0.3, 0.05, 0],
  7: [0.16, 0.33, 0.35, 0.15, 0.01],
  8: [0.11, 0.27, 0.35, 0.22, 0.05],
  9: [0.05, 0.2, 0.35, 0.3, 0.1]
}

export const EvolutionTime = {
  EGG_HATCH: 5,
  EVOLVE_HATCH: 5
}

export const KECLEON_SHOP_COST = 10

export const PoolSize: { [key in Rarity]: [number, number, number] } = {
  [Rarity.COMMON]: [1, 18, 29],
  [Rarity.UNCOMMON]: [1, 13, 22],
  [Rarity.RARE]: [1, 9, 18],
  [Rarity.EPIC]: [1, 7, 14],
  [Rarity.ULTRA]: [1, 5, 10],
  [Rarity.UNIQUE]: [1, 1, 1],
  [Rarity.LEGENDARY]: [1, 1, 1],
  [Rarity.SPECIAL]: [0, 0, 0],
  [Rarity.HATCH]: [0, 0, 0]
}

export const UniquePool = new Array<PkmProposition>(
  Pkm.AERODACTYL,
  Pkm.BLACEPHALON,
  Pkm.REGIDRAGO,
  Pkm.REGIELEKI,
  Pkm.CASTFORM,
  Pkm.REGICE,
  Pkm.REGISTEEL,
  Pkm.REGIROCK,
  Pkm.UXIE,
  Pkm.MESPRIT,
  Pkm.AZELF,
  PkmDuo.LATIOS_LATIAS,
  Pkm.LAPRAS,
  Pkm.ABSOL,
  Pkm.SPIRITOMB,
  Pkm.ROTOM,
  Pkm.PHIONE,
  Pkm.TAPU_KOKO,
  Pkm.TAPU_LELE,
  Pkm.SEVIPER,
  Pkm.KECLEON,
  Pkm.MAWILE,
  Pkm.TAUROS,
  Pkm.RELICANTH,
  Pkm.CHATOT,
  Pkm.FARFETCH_D,
  Pkm.TAPU_BULU,
  Pkm.TAPU_FINI,
  Pkm.MIMIKYU,
  Pkm.TYROGUE,
  Pkm.ZERAORA,
  Pkm.SHUCKLE,
  Pkm.LUNATONE,
  Pkm.SOLROCK,
  Pkm.MILTANK,
  Pkm.MARACTUS,
  PkmDuo.PLUSLE_MINUN,
  Pkm.PINSIR,
  Pkm.GLIGAR,
  Pkm.DELIBIRD,
  Pkm.TORKOAL,
  Pkm.IRON_BUNDLE,
  Pkm.CHINGLING,
  Pkm.DHELMISE,
  Pkm.SPINDA,
  Pkm.HERACROSS,
  PkmDuo.ILLUMISE_VOLBEAT,
  Pkm.TANDEMAUS,
  Pkm.TROPIUS,
  Pkm.CARNIVINE,
  Pkm.HOOPA,
  Pkm.COMFEY,
  Pkm.SABLEYE,
  Pkm.DRACOVISH,
  Pkm.DRACOZOLT,
  Pkm.ARCTOVISH,
  Pkm.ARCTOZOLT,
  Pkm.GIMMIGHOUL,
  Pkm.BRUXISH,
  Pkm.CYCLIZAR,
  Pkm.MINIOR,
  Pkm.MORPEKO,
  Pkm.TYPE_NULL,
  Pkm.KANGASKHAN,
  Pkm.DRUDDIGON,
  Pkm.COSMOG,
  Pkm.SCYTHER,
  Pkm.ZANGOOSE,
  Pkm.SMEARGLE,
  Pkm.STANTLER,
  Pkm.KLEFKI,
  Pkm.HEATMOR,
  Pkm.HAWLUCHA,
  Pkm.STONJOURNER,
  Pkm.CRAMORANT,
  Pkm.PYUKUMUKU,
  Pkm.POIPOLE,
  Pkm.LUVDISC,
  Pkm.AUDINO,
  Pkm.MANTYKE,
  Pkm.DURANT,
  Pkm.SKARMORY,
  Pkm.SIGILYPH,
  Pkm.OGERPON_TEAL,
  Pkm.OGERPON_WELLSPRING,
  Pkm.OGERPON_HEARTHFLAME,
  Pkm.OGERPON_CORNERSTONE,
  Pkm.IRON_HANDS,
  Pkm.TURTONATOR,
  Pkm.CRYOGONAL,
  Pkm.DRAMPA,
  Pkm.APPLIN,
  Pkm.MILCERY
)

export const LegendaryPool = new Array<PkmProposition>(
  Pkm.KYUREM,
  Pkm.RESHIRAM,
  Pkm.ZEKROM,
  Pkm.STAKATAKA,
  Pkm.GENESECT,
  Pkm.GUZZLORD,
  Pkm.ETERNATUS,
  Pkm.MELOETTA,
  Pkm.MEW,
  Pkm.MEWTWO,
  Pkm.ENTEI,
  Pkm.SUICUNE,
  Pkm.RAIKOU,
  Pkm.REGIGIGAS,
  Pkm.CELEBI,
  Pkm.VICTINI,
  Pkm.JIRACHI,
  Pkm.ARCEUS,
  Pkm.DEOXYS,
  Pkm.SHAYMIN,
  Pkm.GIRATINA,
  Pkm.DARKRAI,
  Pkm.CRESSELIA,
  Pkm.HEATRAN,
  Pkm.LUGIA,
  Pkm.HO_OH,
  Pkm.PALKIA,
  Pkm.DIALGA,
  Pkm.RAYQUAZA,
  Pkm.KYOGRE,
  Pkm.GROUDON,
  Pkm.VOLCANION,
  Pkm.MARSHADOW,
  Pkm.XERNEAS,
  Pkm.YVELTAL,
  Pkm.ZAPDOS,
  Pkm.MOLTRES,
  Pkm.ARTICUNO,
  Pkm.GALARIAN_ARTICUNO,
  Pkm.GALARIAN_ZAPDOS,
  Pkm.GALARIAN_MOLTRES,
  Pkm.SPECTRIER,
  Pkm.KARTANA,
  Pkm.NECROZMA,
  Pkm.XURKITREE,
  Pkm.NIHILEGO,
  Pkm.PHEROMOSA,
  Pkm.TORNADUS,
  Pkm.THUNDURUS,
  Pkm.LANDORUS,
  Pkm.ENAMORUS,
  Pkm.MAGEARNA,
  Pkm.MELMETAL,
  Pkm.ZYGARDE_50,
  Pkm.TERRAKION,
  Pkm.VIRIZION,
  Pkm.COBALION,
  Pkm.KELDEO
)

export const NB_UNIQUE_PROPOSITIONS = 6
export const SHOP_SIZE = 6

export const FishRarityProbability: {
  [rod in FishingRod]: {
    [key in Rarity]?: number
  }
} = {
  [Item.OLD_ROD]: {
    [Rarity.SPECIAL]: 0.55,
    [Rarity.COMMON]: 0.35,
    [Rarity.UNCOMMON]: 0.1,
    [Rarity.RARE]: 0,
    [Rarity.EPIC]: 0
  },
  [Item.GOOD_ROD]: {
    [Rarity.SPECIAL]: 0.3,
    [Rarity.COMMON]: 0.3,
    [Rarity.UNCOMMON]: 0.3,
    [Rarity.RARE]: 0.1,
    [Rarity.EPIC]: 0
  },
  [Item.SUPER_ROD]: {
    [Rarity.SPECIAL]: 0.35,
    [Rarity.COMMON]: 0.05,
    [Rarity.UNCOMMON]: 0.25,
    [Rarity.RARE]: 0.25,
    [Rarity.EPIC]: 0.1
  }
}

export const MAX_POOL_CONNECTIONS_SIZE = 16
export const MAX_CONCURRENT_PLAYERS_ON_SERVER = 1000
export const MAX_CONCURRENT_PLAYERS_ON_LOBBY = 500
export const MAX_PLAYERS_PER_GAME = 8
export const MIN_HUMAN_PLAYERS = process.env.MIN_HUMAN_PLAYERS
  ? parseInt(process.env.MIN_HUMAN_PLAYERS)
  : 1
export const INACTIVITY_TIMEOUT = 60 * 1000 * 10

export const DEFAULT_ATK_SPEED = 0.75
export const DEFAULT_CRIT_CHANCE = 10
export const DEFAULT_CRIT_POWER = 2
export const PROJECTILE_SPEED = 4

export const StageDuration: Record<number | "DEFAULT", number> = {
  0: 22, // adjusted for treasure town theme
  1: 30,
  3: 40,
  5: 40,
  8: 40,
  9: 40,
  10: 50,
  11: 40,
  15: 40,
  19: 40,
  20: 50,
  DEFAULT: 30
}
export const FIGHTING_PHASE_DURATION = 40000
export const ITEM_CAROUSEL_BASE_DURATION = 15000
export const PORTAL_CAROUSEL_BASE_DURATION = 22500

export const ItemCarouselStages = [4, 12, 17, 22, 27, 34]
export const ItemProposalStages = [3, 15]
export const AdditionalPicksStages = [5, 8, 11]
export const PortalCarouselStages = [0, 10, 20]

export const EloRankThreshold: { [key in EloRank]: number } = {
  [EloRank.LEVEL_BALL]: 0,
  [EloRank.NET_BALL]: 1050,
  [EloRank.SAFARI_BALL]: 1100,
  [EloRank.LOVE_BALL]: 1150,
  [EloRank.PREMIER_BALL]: 1200,
  [EloRank.QUICK_BALL]: 1250,
  [EloRank.POKE_BALL]: 1300,
  [EloRank.SUPER_BALL]: 1350,
  [EloRank.ULTRA_BALL]: 1400,
  [EloRank.MASTER_BALL]: 1500,
  [EloRank.BEAST_BALL]: 1700
}

export const WeatherThreshold: { [weather in Weather]: number } = {
  [Weather.MISTY]: 8,
  [Weather.NEUTRAL]: 8,
  [Weather.NIGHT]: 8,
  [Weather.BLOODMOON]: 8,
  [Weather.RAIN]: 8,
  [Weather.SANDSTORM]: 8,
  [Weather.SNOW]: 8,
  [Weather.STORM]: 8,
  [Weather.SUN]: 8,
  [Weather.WINDY]: 8,
  [Weather.SMOG]: 8
}

// 4  A  1
// D  X  B
// 3  C  2

export const MaskCoordinate: { [key in Mask]: { x: number; y: number } } =
  Object.freeze({
    X: { x: 4, y: 1 },
    A: { x: 4, y: 4 },
    B: { x: 3, y: 3 },
    C: { x: 4, y: 2 },
    D: { x: 5, y: 3 },
    AB: { x: 3, y: 2 },
    AC: { x: 3, y: 1 },
    AD: { x: 5, y: 1 },
    BC: { x: 3, y: 0 },
    BD: { x: 4, y: 0 },
    CD: { x: 5, y: 0 },
    ABC: { x: 5, y: 4 },
    ABD: { x: 2, y: 4 },
    ACD: { x: 3, y: 4 },
    BCD: { x: 2, y: 3 },
    ABCD: { x: 4, y: 3 },
    A1B: { x: 0, y: 2 },
    B2C: { x: 0, y: 0 },
    C3D: { x: 2, y: 0 },
    AD4: { x: 2, y: 2 },
    A1BC: { x: 2, y: 5 },
    AB2C: { x: 2, y: 6 },
    B2CD: { x: 5, y: 5 },
    BC3D: { x: 4, y: 5 },
    AC3D: { x: 3, y: 6 },
    ACD4: { x: 3, y: 5 },
    A1BD: { x: 5, y: 6 },
    ABD4: { x: 4, y: 6 },
    A1B2C: { x: 0, y: 1 },
    B2C3D: { x: 1, y: 0 },
    AC3D4: { x: 2, y: 1 },
    A1BD4: { x: 1, y: 2 },
    A1BCD: { x: 2, y: 7 },
    AB2CD: { x: 0, y: 7 },
    ABC3D: { x: 1, y: 7 },
    ABCD4: { x: 3, y: 7 },
    A1B2CD: { x: 1, y: 3 },
    AB2C3D: { x: 0, y: 4 },
    ABC3D4: { x: 0, y: 3 },
    A1BCD4: { x: 1, y: 4 },
    A1B2C3D: { x: 1, y: 6 },
    AB2C3D4: { x: 0, y: 6 },
    A1BC3D4: { x: 0, y: 5 },
    A1B2CD4: { x: 1, y: 5 },
    A1BC3D: { x: 4, y: 7 },
    AB2CD4: { x: 5, y: 7 },
    A1B2C3D4: { x: 1, y: 1 }
  })

export enum Mask {
  X = "X",
  A = "A",
  B = "B",
  C = "C",
  D = "D",
  AB = "AB",
  AC = "AC",
  AD = "AD",
  BC = "BC",
  BD = "BD",
  CD = "CD",
  ABC = "ABC",
  ABD = "ABD",
  ACD = "ACD",
  BCD = "BCD",
  ABCD = "ABCD",
  A1B = "A1B",
  B2C = "B2C",
  C3D = "C3D",
  AD4 = "AD4",
  A1BC = "A1BC",
  AB2C = "AB2C",
  B2CD = "B2CD",
  BC3D = "BC3D",
  AC3D = "AC3D",
  ACD4 = "ACD4",
  A1BD = "A1BD",
  ABD4 = "ABD4",
  A1B2C = "A1B2C",
  B2C3D = "B2C3D",
  AC3D4 = "AC3D4",
  A1BD4 = "A1BD4",
  A1BCD = "A1BCD",
  AB2CD = "AB2CD",
  ABC3D = "ABC3D",
  ABCD4 = "ABCD4",
  A1B2CD = "A1B2CD",
  AB2C3D = "AB2C3D",
  ABC3D4 = "ABC3D4",
  A1BCD4 = "A1BCD4",
  A1B2C3D = "A1B2C3D",
  AB2C3D4 = "AB2C3D4",
  A1BC3D4 = "A1BC3D4",
  A1B2CD4 = "A1B2CD4",
  A1BC3D = "A1BC3D",
  AB2CD4 = "AB2CD4",
  A1B2C3D4 = "A1B2C3D4"
}

export enum TerrainType {
  WALL,
  WATER,
  GROUND
}

export const IdTable: { [key: number]: Mask } = {
  0: Mask.X,
  1: Mask.A,
  2: Mask.B,
  4: Mask.C,
  8: Mask.D,
  3: Mask.AB,
  5: Mask.AC,
  9: Mask.AD,
  6: Mask.BC,
  10: Mask.BD,
  12: Mask.CD,
  7: Mask.ABC,
  11: Mask.ABD,
  13: Mask.ACD,
  14: Mask.BCD,
  15: Mask.ABCD,
  19: Mask.A1B,
  38: Mask.B2C,
  76: Mask.C3D,
  137: Mask.AD4,
  23: Mask.A1BC,
  39: Mask.AB2C,
  46: Mask.B2CD,
  78: Mask.BC3D,
  77: Mask.AC3D,
  141: Mask.ACD4,
  27: Mask.A1BD,
  139: Mask.ABD4,
  55: Mask.A1B2C,
  110: Mask.B2C3D,
  205: Mask.AC3D4,
  155: Mask.A1BD4,
  31: Mask.A1BCD,
  47: Mask.AB2CD,
  79: Mask.ABC3D,
  143: Mask.ABCD4,
  63: Mask.A1B2CD,
  111: Mask.AB2C3D,
  207: Mask.ABC3D4,
  159: Mask.A1BCD4,
  127: Mask.A1B2C3D,
  239: Mask.AB2C3D4,
  223: Mask.A1BC3D4,
  191: Mask.A1B2CD4,
  95: Mask.A1BC3D,
  175: Mask.AB2CD4,
  255: Mask.A1B2C3D4
}

export type TilesetExchangeFile = {
  tileset_0: DtefTileset | undefined
  tileset_1: DtefTileset | undefined
  tileset_2: DtefTileset | undefined
}

export type DtefTileset = {
  static: StaticFrame
  animation: AnimatedFrame[]
}

export type StaticFrame = {
  firstgid: number
  name: string
  maskDefinition: MaskDefinition
}

export type MaskDefinition = {
  [TerrainType.GROUND]: Mask[]
  [TerrainType.WALL]: Mask[]
  [TerrainType.WATER]: Mask[]
}

export type AnimatedFrame = {
  frameDuration: number
  numberOfFrames: number
  name: string
  maskDefinition: MaskDefinition
  firstgid: number
}

export const DTEF_WIDTH = 144
export const DTEF_HEIGHT = 192
export const DTEF_TILESET_WIDTH = 6
export const DTEF_TILESET_HEIGHT = 8
export const DTEF_TILESET_TILE_WIDTH = 24

export const SCRIBBLE_LOBBY_CRON = "0 0 0-20/4 * * *" // every four hours from 00h to 20h
export const GREATBALL_RANKED_LOBBY_CRON = "0 0 2,6,14,18 * * *" // every four hours from 2h to 22h
export const ULTRABALL_RANKED_LOBBY_CRON = "0 0 22 * * *" // every day 22h

export const DUST_PER_BOOSTER = 50
export const DUST_PER_SHINY = 250

export const TOURNAMENT_REGISTRATION_TIME = 60 * 60 * 1000 // 1 hour
export const TOURNAMENT_CLEANUP_DELAY = 24 * 60 * 60 * 1000 // 1 day

export const MAX_SIMULATION_DELTA_TIME = 50 // milliseconds

export const CRON_ELO_DECAY_DELAY = 86400 * 1000 * 15 // 15 days
export const CRON_ELO_DECAY_MINIMUM_ELO = 1100
export const CRON_HISTORY_CLEANUP_DELAY = 86400 * 1000 * 30 // 30 days

export const BOTS_ENABLED = true

export { EloRank }
