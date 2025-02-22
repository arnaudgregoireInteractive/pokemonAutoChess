import { MapSchema, Schema, SetSchema, type } from "@colyseus/schema"
import Player from "../models/colyseus-models/player"
import { Pokemon } from "../models/colyseus-models/pokemon"
import { getWonderboxItems, ItemEffects, ItemStats } from "./items"
import PokemonFactory from "../models/pokemon-factory"
import { getPokemonData } from "../models/precomputed/precomputed-pokemon-data"
import { PRECOMPUTED_POKEMONS_PER_TYPE } from "../models/precomputed/precomputed-types"
import GameRoom from "../rooms/game-room"
import {
  IPokemon,
  IPokemonEntity,
  ISimulation,
  Title,
  Transfer
} from "../types"
import { BOARD_HEIGHT, BOARD_WIDTH } from "../types/Config"
import { Effect } from "../types/enum/Effect"
import {
  AttackType,
  BattleResult,
  Orientation,
  PokemonActionState,
  Rarity,
  Stat,
  Team
} from "../types/enum/Game"
import {
  Berries,
  CraftableItems,
  Item,
  WeatherRocksByWeather
} from "../types/enum/Item"
import { Passive } from "../types/enum/Passive"
import { Pkm } from "../types/enum/Pokemon"
import { Synergy } from "../types/enum/Synergy"
import { Weather, WeatherEffects } from "../types/enum/Weather"
import { IPokemonData } from "../types/interfaces/PokemonData"
import { count } from "../utils/array"
import { logger } from "../utils/logger"
import { isOnBench } from "../utils/board"
import {
  chance,
  pickRandomIn,
  randomBetween,
  shuffleArray
} from "../utils/random"
import { values } from "../utils/schemas"
import Board from "./board"
import Dps from "./dps"
import { PokemonEntity, getStrongestUnit, getUnitScore } from "./pokemon-entity"
import { DelayedCommand } from "./simulation-command"
import { getAvatarString } from "../utils/avatar"
import { max } from "../utils/number"
import {
  OnItemGainedEffect,
  GrowGroundEffect,
  FireHitEffect,
  MonsterKillEffect,
  SoundCryEffect,
  WaterSpringEffect,
  OnSpawnEffect
} from "./effect"
import { SynergyEffects } from "../models/effects"
import { DishEffects } from "./dishes"

export default class Simulation extends Schema implements ISimulation {
  @type("string") weather: Weather = Weather.NEUTRAL
  @type("string") winnerId = ""
  @type({ map: PokemonEntity }) blueTeam = new MapSchema<IPokemonEntity>()
  @type({ map: PokemonEntity }) redTeam = new MapSchema<IPokemonEntity>()
  @type({ map: Dps }) blueDpsMeter = new MapSchema<Dps>()
  @type({ map: Dps }) redDpsMeter = new MapSchema<Dps>()
  @type("string") id: string
  @type("string") bluePlayerId: string
  @type("string") redPlayerId: string
  @type("boolean") isGhostBattle: boolean
  room: GameRoom
  blueEffects = new Set<Effect>()
  redEffects = new Set<Effect>()
  board: Board = new Board(BOARD_HEIGHT, BOARD_WIDTH)
  finished = false
  flowerSpawn: boolean[] = [false, false]
  stageLevel = 0
  bluePlayer: Player | undefined
  redPlayer: Player | undefined
  stormLightningTimer = 0
  tidalWaveTimer = 0
  tidalWaveCounter = 0

  constructor(
    id: string,
    room: GameRoom,
    blueBoard: MapSchema<Pokemon>,
    redBoard: MapSchema<Pokemon>,
    bluePlayer: Player,
    redPlayer: Player | undefined,
    stageLevel: number,
    weather: Weather,
    isGhostBattle = false
  ) {
    super()
    this.id = id
    this.room = room
    this.bluePlayer = bluePlayer
    this.redPlayer = redPlayer
    this.bluePlayerId = bluePlayer.id
    this.redPlayerId = redPlayer?.id ?? "pve"
    this.stageLevel = stageLevel
    this.weather = weather
    this.isGhostBattle = isGhostBattle

    this.board = new Board(BOARD_HEIGHT, BOARD_WIDTH)

    // beforeSimulationStart hooks
    const playerEffects: [Player | undefined, Set<Effect>, Set<Effect>][] = [
      [this.bluePlayer, this.blueEffects, this.redEffects],
      [this.redPlayer, this.redEffects, this.blueEffects]
    ]
    for (const [player, teamEffects, opponentEffects] of playerEffects) {
      if (player) {
        player.board.forEach((pokemon, id) => {
          pokemon.beforeSimulationStart({
            weather: this.weather,
            player,
            teamEffects,
            opponentEffects
          })
        })
      }
    }

    const weatherEffect = WeatherEffects.get(this.weather)
    if (weatherEffect) {
      this.blueEffects.add(weatherEffect)
      this.redEffects.add(weatherEffect)
    }

    bluePlayer.effects.forEach((e) => this.blueEffects.add(e))
    redPlayer?.effects.forEach((e) => this.redEffects.add(e))

    this.finished = false
    this.winnerId = ""
    this.flowerSpawn = [false, false]
    this.stormLightningTimer = randomBetween(4000, 8000)

    blueBoard.forEach((pokemon) => {
      if (!isOnBench(pokemon)) {
        this.addPokemon(
          pokemon,
          pokemon.positionX,
          pokemon.positionY - 1,
          Team.BLUE_TEAM
        )
      }
    })

    redBoard.forEach((pokemon) => {
      if (!isOnBench(pokemon)) {
        this.addPokemon(
          pokemon,
          pokemon.positionX,
          5 - (pokemon.positionY - 1),
          Team.RED_TEAM
        )
      }
    })

    this.applyPostEffects(blueBoard, redBoard)

    // afterSimulationStart hooks
    for (const [player, team] of [
      [this.bluePlayer, this.blueTeam] as const,
      [this.redPlayer, this.redTeam] as const
    ]) {
      if (player) {
        player.board.forEach((pokemon) => {
          const entity = values(team).find(
            (p) => p.refToBoardPokemon === pokemon
          )
          if (entity) {
            pokemon.afterSimulationStart({
              simulation: this,
              player,
              team,
              entity
            })
          }
        })
      }
    }
  }

  getEffects(playerId: string) {
    return playerId === this.bluePlayer?.id
      ? this.blueEffects
      : playerId === this.redPlayer?.id
        ? this.redEffects
        : undefined
  }

  getDpsMeter(playerId: string) {
    return playerId === this.bluePlayer?.id
      ? this.blueDpsMeter
      : playerId === this.redPlayer?.id
        ? this.redDpsMeter
        : undefined
  }

  getTeam(playerId: string) {
    return playerId === this.bluePlayer?.id
      ? this.blueTeam
      : playerId === this.redPlayer?.id
        ? this.redTeam
        : undefined
  }

  getOpponentTeam(playerId: string) {
    return playerId === this.bluePlayer?.id
      ? this.redTeam
      : playerId === this.redPlayer?.id
        ? this.blueTeam
        : undefined
  }

  addPokemon(
    pokemon: Pokemon,
    x: number,
    y: number,
    team: Team,
    isClone = false
  ) {
    const pokemonEntity = new PokemonEntity(pokemon, x, y, team, this)
    pokemonEntity.isClone = isClone
    this.applySynergyEffects(pokemonEntity)
    this.applyItemsEffects(pokemonEntity)
    if (pokemon.meal) {
      this.applyDishEffects(pokemonEntity, pokemon.meal)
      pokemon.meal = ""
      pokemon.action = PokemonActionState.IDLE
    }

    this.board.setValue(
      pokemonEntity.positionX,
      pokemonEntity.positionY,
      pokemonEntity
    )

    const dps = new Dps(
      pokemonEntity.id,
      getAvatarString(
        pokemonEntity.index,
        pokemonEntity.shiny,
        pokemonEntity.emotion
      )
    )
    if (team == Team.BLUE_TEAM) {
      this.blueTeam.set(pokemonEntity.id, pokemonEntity)
      this.blueDpsMeter.set(pokemonEntity.id, dps)
    }
    if (team == Team.RED_TEAM) {
      this.redTeam.set(pokemonEntity.id, pokemonEntity)
      this.redDpsMeter.set(pokemonEntity.id, dps)
    }

    pokemon.onSpawn({ entity: pokemonEntity, simulation: this })
    pokemonEntity.effectsSet.forEach((effect) => {
      if (effect instanceof OnSpawnEffect) effect.apply(pokemonEntity)
    })

    return pokemonEntity
  }

  getFirstAvailablePlaceOnBoard(team: Team): { x: number; y: number } {
    let candidateX = 0,
      candidateY = 0
    if (team === Team.BLUE_TEAM) {
      outerloop: for (let y = 0; y < this.board.rows; y++) {
        for (let x = 0; x < this.board.columns; x++) {
          if (this.board.getValue(x, y) === undefined) {
            candidateX = x
            candidateY = y
            break outerloop
          }
        }
      }
    } else {
      outerloop: for (let y = 0; y < this.board.rows; y++) {
        for (let x = this.board.columns - 1; x >= 0; x--) {
          if (this.board.getValue(x, y) === undefined) {
            candidateX = x
            candidateY = y
            break outerloop
          }
        }
      }
    }
    return { x: candidateX, y: candidateY }
  }

  getClosestAvailablePlaceOnBoardTo(
    positionX: number,
    positionY: number,
    team: Team
  ): { x: number; y: number } {
    const placesToConsiderByOrderOfPriority = [
      [0, 0],
      [-1, 0],
      [+1, 0],
      [0, -1],
      [-1, -1],
      [+1, -1],
      [-1, +1],
      [+1, +1],
      [0, +1],
      [-2, 0],
      [+2, 0],
      [-2, -1],
      [+2, -1],
      [0, -2],
      [-1, -2],
      [+1, -2],
      [-2, -2],
      [+2, -2],
      [-2, +1],
      [+2, +1],
      [-3, 0],
      [+3, 0],
      [-3, -1],
      [+3, -1],
      [-3, -2],
      [+3, -2],
      [0, -3],
      [-1, -3],
      [+1, -3],
      [-2, -3],
      [+2, -3],
      [-3, -3],
      [+3, -3],
      [-3, +1],
      [+3, +1]
    ]
    for (const [dx, dy] of placesToConsiderByOrderOfPriority) {
      const x = positionX + dx
      const y =
        team === Team.BLUE_TEAM ? positionY - 1 + dy : 5 - (positionY - 1) - dy

      if (
        x >= 0 &&
        x < this.board.columns &&
        y >= 0 &&
        y < this.board.rows &&
        this.board.getValue(x, y) === undefined
      ) {
        return { x, y }
      }
    }
    return this.getFirstAvailablePlaceOnBoard(team)
  }

  getClosestAvailablePlaceOnBoardToPokemon(
    pokemon: IPokemon | IPokemonEntity,
    team: Team
  ): { x: number; y: number } {
    return this.getClosestAvailablePlaceOnBoardTo(
      pokemon.positionX,
      pokemon.positionY,
      team
    )
  }

  applyItemsEffects(pokemon: PokemonEntity) {
    if (pokemon.passive === Passive.PICKUP && pokemon.items.size === 0) {
      pokemon.items.add(pickRandomIn(CraftableItems.concat(Berries)))
    }
    // wonderbox should be applied first so that wonderbox items effects can be applied after
    if (pokemon.items.has(Item.WONDER_BOX)) {
      pokemon.items.delete(Item.WONDER_BOX)
      const randomItems = getWonderboxItems(pokemon.items)
      randomItems.forEach((item) => {
        if (pokemon.items.size < 3) {
          pokemon.items.add(item)
        }
      })
    }

    pokemon.items.forEach((item) => {
      this.applyItemEffect(pokemon, item)
    })
  }

  applyItemEffect(pokemon: PokemonEntity, item: Item) {
    Object.entries(ItemStats[item] ?? {}).forEach(([stat, value]) =>
      pokemon.applyStat(stat as Stat, value)
    )

    ItemEffects[item]
      ?.filter((effect) => effect instanceof OnItemGainedEffect)
      ?.forEach((effect) => effect.apply(pokemon))
  }

  applySynergyEffects(pokemon: PokemonEntity, singleType?: Synergy) {
    const allyEffects =
      pokemon.team === Team.BLUE_TEAM ? this.blueEffects : this.redEffects
    const player =
      pokemon.team === Team.BLUE_TEAM ? this.bluePlayer : this.redPlayer
    const apply = (effect) => {
      this.applyEffect(
        pokemon,
        pokemon.types,
        effect,
        player?.synergies.countActiveSynergies() || 0
      )
    }

    if (singleType) {
      const effect = SynergyEffects[singleType].find((e) => allyEffects.has(e))
      if (effect && !pokemon.effects.has(effect)) {
        apply(effect)
      }
    } else {
      allyEffects.forEach((effect) => {
        apply(effect)
      })
    }

    if (
      singleType === Synergy.GHOST ||
      (!singleType && pokemon.types.has(Synergy.GHOST))
    ) {
      pokemon.addDodgeChance(0.2, pokemon, 0, false)
    }

    if (
      (singleType === Synergy.SOUND ||
        (!singleType && pokemon.types.has(Synergy.SOUND))) &&
      !SynergyEffects[Synergy.SOUND].some((e) => allyEffects.has(e))
    ) {
      // allow sound pokemon to always wake up allies without searching through the board twice
      pokemon.effectsSet.add(new SoundCryEffect())
    }
  }

  applyDishEffects(pokemon: PokemonEntity, dish: Item) {
    const dishEffects = DishEffects[dish]
    if (!dishEffects) return
    dishEffects.forEach((effect) => pokemon.effectsSet.add(effect))

    if (pokemon.passive === Passive.GLUTTON) {
      pokemon.addMaxHP(10, pokemon, 0, false, true)
      if (pokemon.player && pokemon.hp > 750) {
        pokemon.player.titles.add(Title.GLUTTON)
      }
    }
  }

  applyPostEffects(
    blueBoard: MapSchema<Pokemon>,
    redBoard: MapSchema<Pokemon>
  ) {
    /*
    in order:
    - spawns (bug, rotom, white flute, etc)
    - synergy effects (dragon, normal, etc)
    - support items effects (exp share, gracidea etc)
    - target selection effects (ghost curse, comet shard etc)
    */

    // SPAWNS (bug, rotom, white flute, etc)
    for (const board of [blueBoard, redBoard]) {
      const teamIndex = board === blueBoard ? Team.BLUE_TEAM : Team.RED_TEAM
      const player = board === blueBoard ? this.bluePlayer : this.redPlayer
      const effects = board === blueBoard ? this.blueEffects : this.redEffects

      if (
        [
          Effect.COCOON,
          Effect.INFESTATION,
          Effect.HORDE,
          Effect.HEART_OF_THE_SWARM
        ].some((e) => effects.has(e))
      ) {
        const bugTeam = new Array<IPokemon>()
        board.forEach((pkm) => {
          if (pkm.types.has(Synergy.BUG) && pkm.positionY != 0) {
            bugTeam.push(pkm)
          }
        })
        bugTeam.sort((a, b) => getUnitScore(b) - getUnitScore(a))

        let numberToSpawn = 0
        if (effects.has(Effect.COCOON)) {
          numberToSpawn = 1
        }
        if (effects.has(Effect.INFESTATION)) {
          numberToSpawn = 2
        }
        if (effects.has(Effect.HORDE)) {
          numberToSpawn = 3
        }
        if (effects.has(Effect.HEART_OF_THE_SWARM)) {
          numberToSpawn = 5
        }
        numberToSpawn = Math.min(numberToSpawn, bugTeam.length)

        for (let i = 0; i < numberToSpawn; i++) {
          const pokemonCloned = bugTeam[i]
          const bug = PokemonFactory.createPokemonFromName(
            pokemonCloned.name,
            player
          )

          const coord = this.getClosestAvailablePlaceOnBoardToPokemon(
            pokemonCloned,
            teamIndex
          )
          const cloneEntity = this.addPokemon(
            bug,
            coord.x,
            coord.y,
            teamIndex,
            true
          )
          if (pokemonCloned.items.has(Item.TINY_MUSHROOM)) {
            const team =
              teamIndex === Team.BLUE_TEAM ? this.blueTeam : this.redTeam
            const clonedEntity = values(team).find(
              (p) => p.refToBoardPokemon.id === pokemonCloned.id
            )
            if (clonedEntity) {
              clonedEntity.addMaxHP(
                -0.5 * pokemonCloned.hp,
                clonedEntity,
                0,
                false
              )
            }

            cloneEntity.addMaxHP(-0.5 * bug.hp, cloneEntity, 0, false)
          }
        }
      }

      board.forEach((pokemon) => {
        if (pokemon.items.has(Item.ROTOM_PHONE) && !isOnBench(pokemon)) {
          const player = board === blueBoard ? this.bluePlayer : this.redPlayer
          const rotomDrone = PokemonFactory.createPokemonFromName(
            Pkm.ROTOM_DRONE,
            player
          )
          const coord = this.getClosestAvailablePlaceOnBoardToPokemon(
            pokemon,
            teamIndex
          )
          this.addPokemon(rotomDrone, coord.x, coord.y, teamIndex, true)
        }

        if (pokemon.items.has(Item.WHITE_FLUTE) && !isOnBench(pokemon)) {
          const wilds = PRECOMPUTED_POKEMONS_PER_TYPE[Synergy.WILD].map((p) =>
            getPokemonData(p)
          )
          const spawns: IPokemonData[] = []
          const pickWild = (rarity: Rarity, tier: number) => {
            const randomWild = pickRandomIn(
              wilds.filter((p) => p.rarity === rarity && p.stars === tier)
            )
            if (randomWild) {
              spawns.push(randomWild)
            } else {
              logger.info("no pokemon found for white flute call", rarity, tier)
            }
          }

          if (this.stageLevel <= 5) {
            pickWild(Rarity.COMMON, 1)
            pickWild(Rarity.COMMON, 1)
            pickWild(Rarity.UNCOMMON, 1)
          } else if (this.stageLevel <= 10) {
            pickWild(Rarity.COMMON, 2)
            pickWild(Rarity.COMMON, 1)
            pickWild(Rarity.UNCOMMON, 1)
          } else if (this.stageLevel <= 15) {
            pickWild(Rarity.UNCOMMON, 1)
            pickWild(Rarity.COMMON, 2)
            pickWild(Rarity.RARE, 1)
          } else if (this.stageLevel <= 20) {
            pickWild(Rarity.UNCOMMON, 2)
            pickWild(Rarity.RARE, 1)
            pickWild(Rarity.EPIC, 1)
          } else if (this.stageLevel <= 25) {
            pickWild(Rarity.UNCOMMON, 2)
            pickWild(Rarity.RARE, 2)
            pickWild(Rarity.EPIC, 1)
          } else if (this.stageLevel <= 30) {
            pickWild(Rarity.RARE, 2)
            pickWild(Rarity.EPIC, 1)
            pickWild(Rarity.EPIC, 2)
          } else if (this.stageLevel <= 35) {
            pickWild(Rarity.RARE, 2)
            pickWild(Rarity.EPIC, 2)
            pickWild(Rarity.UNIQUE, 3)
          } else {
            pickWild(Rarity.EPIC, 2)
            pickWild(Rarity.UNIQUE, 3)
            pickWild(Rarity.ULTRA, 2)
          }

          spawns.forEach((spawn) => {
            const mon = PokemonFactory.createPokemonFromName(spawn.name)
            const coord = this.getClosestAvailablePlaceOnBoardToPokemon(
              pokemon,
              teamIndex
            )
            this.addPokemon(mon, coord.x, coord.y, teamIndex, true)
          })
        }
      })
    }

    // SYNERGY EFFECTS (dragon, normal, etc)
    for (const team of [this.blueTeam, this.redTeam]) {
      const dragonLevel = values(team).reduce(
        (acc, pokemon) =>
          acc + (pokemon.types.has(Synergy.DRAGON) ? pokemon.stars : 0),
        0
      )
      team.forEach((pokemon) => {
        if (
          pokemon.effects.has(Effect.DRAGON_SCALES) ||
          pokemon.effects.has(Effect.DRAGON_DANCE)
        ) {
          pokemon.addShield(dragonLevel * 5, pokemon, 0, false)
        }
        if (pokemon.effects.has(Effect.DRAGON_DANCE)) {
          pokemon.addAbilityPower(dragonLevel, pokemon, 0, false)
          pokemon.addAttackSpeed(dragonLevel, pokemon, 0, false)
        }
        let shieldBonus = 0
        if (pokemon.effects.has(Effect.STAMINA)) {
          shieldBonus = 15
        }
        if (pokemon.effects.has(Effect.STRENGTH)) {
          shieldBonus += 25
        }
        if (pokemon.effects.has(Effect.ENDURE)) {
          shieldBonus += 35
        }
        if (pokemon.effects.has(Effect.PURE_POWER)) {
          shieldBonus += 50
        }
        if (shieldBonus >= 0) {
          pokemon.addShield(shieldBonus, pokemon, 0, false)
          const cells = this.board.getAdjacentCells(
            pokemon.positionX,
            pokemon.positionY
          )

          cells.forEach((cell) => {
            if (cell.value && pokemon.team == cell.value.team) {
              cell.value.addShield(shieldBonus, pokemon, 0, false)
            }
          })
        }
      })
    }

    // SUPPORT ITEMS EFFECTS (exp share, gracidea etc)
    for (const team of [this.blueTeam, this.redTeam]) {
      team.forEach((pokemon) => {
        if (pokemon.items.has(Item.CLEANSE_TAG)) {
          ;[-1, 0, 1].forEach((offset) => {
            const ally = this.board.getValue(
              pokemon.positionX + offset,
              pokemon.positionY
            )
            if (ally && ally.team === pokemon.team) {
              ally.addShield(Math.ceil(0.2 * ally.hp), ally, 0, false)
              ally.status.triggerRuneProtect(5000)
            }
          })
        }

        if (pokemon.items.has(Item.GRACIDEA_FLOWER)) {
          ;[-1, 0, 1].forEach((offset) => {
            const value = this.board.getValue(
              pokemon.positionX + offset,
              pokemon.positionY
            )
            if (value) {
              value.addAttackSpeed(20, pokemon, 0, false)
            }
          })
        }

        if (pokemon.items.has(Item.EXP_SHARE)) {
          ;[-1, 1].forEach((offset) => {
            const value = this.board.getValue(
              pokemon.positionX + offset,
              pokemon.positionY
            )
            if (value) {
              if (value.atk > pokemon.atk) pokemon.atk = value.atk
              if (value.def > pokemon.def) pokemon.def = value.def
              if (value.speDef > pokemon.speDef) pokemon.speDef = value.speDef
              if (value.ap > pokemon.ap) pokemon.ap = value.ap
            }
          })
        }

        if (pokemon.passive === Passive.LUVDISC) {
          const lovers = [-1, 1].map((offset) =>
            this.board.getValue(pokemon.positionX + offset, pokemon.positionY)
          )
          if (lovers[0] && lovers[1]) {
            const bestAtk = Math.max(lovers[0].atk, lovers[1].atk)
            const bestDef = Math.max(lovers[0].def, lovers[1].def)
            const bestSpeDef = Math.max(lovers[0].speDef, lovers[1].speDef)
            const bestAP = Math.max(lovers[0].ap, lovers[1].ap)
            lovers[0].atk = bestAtk
            lovers[1].atk = bestAtk
            lovers[0].def = bestDef
            lovers[1].def = bestDef
            lovers[0].speDef = bestSpeDef
            lovers[1].speDef = bestSpeDef
            lovers[0].ap = bestAP
            lovers[1].ap = bestAP
          }
        }
      })
    }

    // TARGET SELECTION EFFECTS (ghost curse, comet shard etc)
    for (const team of [this.blueTeam, this.redTeam]) {
      team.forEach((pokemon) => {
        if (pokemon.items.has(Item.COMET_SHARD)) {
          pokemon.commands.push(
            new DelayedCommand(() => {
              const farthestCoordinate =
                this.board.getFarthestTargetCoordinateAvailablePlace(pokemon)
              if (farthestCoordinate) {
                const target = farthestCoordinate.target as PokemonEntity
                pokemon.skydiveTo(
                  farthestCoordinate.x,
                  farthestCoordinate.y,
                  this.board
                )
                pokemon.targetX = target.positionX
                pokemon.targetY = target.positionY
                pokemon.status.triggerProtect(3000)
                pokemon.commands.push(
                  new DelayedCommand(() => {
                    pokemon.simulation.room.broadcast(Transfer.ABILITY, {
                      id: pokemon.simulation.id,
                      skill: "COMET_CRASH",
                      positionX: farthestCoordinate.x,
                      positionY: farthestCoordinate.y,
                      targetX: target.positionX,
                      targetY: target.positionY
                    })
                  }, 500)
                )

                pokemon.commands.push(
                  new DelayedCommand(() => {
                    if (target?.life > 0) {
                      const crit = chance(pokemon.critChance / 100, pokemon)
                      target.handleSpecialDamage(
                        3 * pokemon.atk,
                        this.board,
                        AttackType.SPECIAL,
                        pokemon as PokemonEntity,
                        crit
                      )
                      this.board
                        .getAdjacentCells(target.positionX, target.positionY)
                        .forEach((cell) => {
                          if (cell.value && cell.value.team !== pokemon.team) {
                            cell.value.handleSpecialDamage(
                              pokemon.atk,
                              this.board,
                              AttackType.SPECIAL,
                              pokemon as PokemonEntity,
                              crit
                            )
                          }
                        })
                    }
                  }, 1000)
                )
              }
            }, 100)
          )
        }
      })

      const teamEffects =
        team === this.blueTeam ? this.blueEffects : this.redEffects
      const opponentTeam =
        team === this.blueTeam ? Team.RED_TEAM : Team.BLUE_TEAM

      if (
        teamEffects.has(Effect.CURSE_OF_VULNERABILITY) ||
        teamEffects.has(Effect.CURSE_OF_WEAKNESS) ||
        teamEffects.has(Effect.CURSE_OF_TORMENT) ||
        teamEffects.has(Effect.CURSE_OF_FATE)
      ) {
        this.applyCurse(Effect.CURSE_OF_VULNERABILITY, opponentTeam)
      }

      if (
        teamEffects.has(Effect.CURSE_OF_WEAKNESS) ||
        teamEffects.has(Effect.CURSE_OF_TORMENT) ||
        teamEffects.has(Effect.CURSE_OF_FATE)
      ) {
        this.applyCurse(Effect.CURSE_OF_WEAKNESS, opponentTeam)
      }

      if (
        teamEffects.has(Effect.CURSE_OF_TORMENT) ||
        teamEffects.has(Effect.CURSE_OF_FATE)
      ) {
        this.applyCurse(Effect.CURSE_OF_TORMENT, opponentTeam)
      }

      if (teamEffects.has(Effect.CURSE_OF_FATE)) {
        this.applyCurse(Effect.CURSE_OF_FATE, opponentTeam)
      }
    }
  }

  applyEffect(
    pokemon: IPokemonEntity,
    types: SetSchema<Synergy>,
    effect: Effect,
    activeSynergies: number
  ) {
    switch (effect) {
      case Effect.HONE_CLAWS:
        if (types.has(Synergy.DARK)) {
          pokemon.addCritChance(30, pokemon, 0, false)
          pokemon.addCritPower(30, pokemon, 0, false)
          pokemon.effects.add(Effect.HONE_CLAWS)
        }
        break

      case Effect.ASSURANCE:
        if (types.has(Synergy.DARK)) {
          pokemon.addCritChance(40, pokemon, 0, false)
          pokemon.addCritPower(40, pokemon, 0, false)
          pokemon.effects.add(Effect.ASSURANCE)
        }
        break

      case Effect.BEAT_UP:
        if (types.has(Synergy.DARK)) {
          pokemon.addCritChance(50, pokemon, 0, false)
          pokemon.addCritPower(50, pokemon, 0, false)
          pokemon.effects.add(Effect.BEAT_UP)
        }
        break

      case Effect.ANCIENT_POWER:
      case Effect.ELDER_POWER:
      case Effect.FORGOTTEN_POWER:
        if (types.has(Synergy.FOSSIL)) {
          pokemon.effects.add(effect)
        }
        break

      case Effect.BLAZE:
      case Effect.VICTORY_STAR:
      case Effect.DROUGHT:
      case Effect.DESOLATE_LAND:
        if (types.has(Synergy.FIRE)) {
          pokemon.effects.add(effect)
          pokemon.effectsSet.add(new FireHitEffect(effect))
        }
        break

      case Effect.INGRAIN:
        if (types.has(Synergy.GRASS)) {
          pokemon.effects.add(Effect.INGRAIN)
        }
        break

      case Effect.GROWTH:
        if (types.has(Synergy.GRASS)) {
          pokemon.effects.add(Effect.GROWTH)
        }
        break

      case Effect.SPORE:
        if (types.has(Synergy.GRASS)) {
          pokemon.effects.add(Effect.SPORE)
        }
        break

      case Effect.RAIN_DANCE:
        if (types.has(Synergy.WATER)) {
          pokemon.effects.add(Effect.RAIN_DANCE)
        }
        break

      case Effect.DRIZZLE:
        if (types.has(Synergy.WATER)) {
          pokemon.effects.add(Effect.DRIZZLE)
        }
        break

      case Effect.PRIMORDIAL_SEA:
        if (types.has(Synergy.WATER)) {
          pokemon.effects.add(Effect.PRIMORDIAL_SEA)
        }
        break

      case Effect.STAMINA:
        if (types.has(Synergy.NORMAL)) {
          pokemon.effects.add(Effect.STAMINA)
        }
        break

      case Effect.STRENGTH:
        if (types.has(Synergy.NORMAL)) {
          pokemon.effects.add(Effect.STRENGTH)
        }
        break

      case Effect.ENDURE:
        if (types.has(Synergy.NORMAL)) {
          pokemon.effects.add(Effect.ENDURE)
        }
        break

      case Effect.PURE_POWER:
        if (types.has(Synergy.NORMAL)) {
          pokemon.effects.add(Effect.PURE_POWER)
        }
        break

      case Effect.RISING_VOLTAGE:
      case Effect.OVERDRIVE:
      case Effect.POWER_SURGE:
        if (types.has(Synergy.ELECTRIC)) {
          pokemon.effects.add(effect)
        }
        break

      case Effect.GUTS:
      case Effect.STURDY:
      case Effect.DEFIANT:
      case Effect.JUSTIFIED:
        if (types.has(Synergy.FIGHTING)) {
          pokemon.effects.add(effect)
        }
        break

      case Effect.STEEL_SURGE:
      case Effect.STEEL_SPIKE:
      case Effect.CORKSCREW_CRASH:
      case Effect.MAX_MELTDOWN:
        if (types.has(Synergy.STEEL)) {
          pokemon.effects.add(effect)
        }
        break

      case Effect.BULK_UP:
        if (types.has(Synergy.FIELD)) {
          pokemon.effects.add(Effect.BULK_UP)
        }
        break

      case Effect.RAGE:
        if (types.has(Synergy.FIELD)) {
          pokemon.effects.add(Effect.RAGE)
        }
        break

      case Effect.ANGER_POINT:
        if (types.has(Synergy.FIELD)) {
          pokemon.effects.add(Effect.ANGER_POINT)
        }
        break

      case Effect.PURSUIT:
      case Effect.BRUTAL_SWING:
      case Effect.POWER_TRIP:
      case Effect.MERCILESS:
        if (types.has(Synergy.MONSTER)) {
          pokemon.effects.add(effect)
          pokemon.effectsSet.add(new MonsterKillEffect(effect))
        }
        break

      case Effect.AMNESIA:
        if (types.has(Synergy.PSYCHIC)) {
          pokemon.effects.add(Effect.AMNESIA)
          pokemon.addAbilityPower(50, pokemon, 0, false)
        }
        break

      case Effect.LIGHT_SCREEN:
        if (types.has(Synergy.PSYCHIC)) {
          pokemon.effects.add(Effect.LIGHT_SCREEN)
          pokemon.addAbilityPower(100, pokemon, 0, false)
        }
        break

      case Effect.EERIE_SPELL:
        if (types.has(Synergy.PSYCHIC)) {
          pokemon.effects.add(Effect.EERIE_SPELL)
          pokemon.addAbilityPower(150, pokemon, 0, false)
        }
        break

      case Effect.MEDITATE:
      case Effect.FOCUS_ENERGY:
      case Effect.CALM_MIND:
        if (types.has(Synergy.HUMAN)) {
          pokemon.effects.add(effect)
        }
        break

      case Effect.TAILWIND:
        if (types.has(Synergy.FLYING)) {
          pokemon.flyingProtection = 1
          pokemon.effects.add(Effect.TAILWIND)
        }
        break

      case Effect.FEATHER_DANCE:
        if (types.has(Synergy.FLYING)) {
          pokemon.flyingProtection = 1
          pokemon.effects.add(Effect.FEATHER_DANCE)
        }
        break

      case Effect.MAX_AIRSTREAM:
        if (types.has(Synergy.FLYING)) {
          pokemon.flyingProtection = 2
          pokemon.effects.add(Effect.MAX_AIRSTREAM)
        }
        break

      case Effect.SKYDIVE:
        if (types.has(Synergy.FLYING)) {
          pokemon.flyingProtection = 2
          pokemon.effects.add(Effect.SKYDIVE)
        }
        break

      case Effect.SWIFT_SWIM:
      case Effect.HYDRATION:
      case Effect.WATER_VEIL:
        pokemon.effects.add(effect)
        this.tidalWaveTimer = 8000
        break

      case Effect.ODD_FLOWER:
        if (types.has(Synergy.FLORA)) {
          pokemon.effects.add(Effect.ODD_FLOWER)
        }
        break

      case Effect.GLOOM_FLOWER:
        if (types.has(Synergy.FLORA)) {
          pokemon.effects.add(Effect.GLOOM_FLOWER)
        }
        break

      case Effect.VILE_FLOWER:
        if (types.has(Synergy.FLORA)) {
          pokemon.effects.add(Effect.VILE_FLOWER)
        }
        break

      case Effect.SUN_FLOWER:
        if (types.has(Synergy.FLORA)) {
          pokemon.effects.add(Effect.SUN_FLOWER)
        }
        break

      case Effect.BATTLE_ARMOR:
        if (types.has(Synergy.ROCK)) {
          pokemon.addDefense(10, pokemon, 0, false)
          pokemon.effects.add(Effect.BATTLE_ARMOR)
        }
        break

      case Effect.MOUTAIN_RESISTANCE:
        if (types.has(Synergy.ROCK)) {
          pokemon.addDefense(30, pokemon, 0, false)
          pokemon.effects.add(Effect.MOUTAIN_RESISTANCE)
        }
        break

      case Effect.DIAMOND_STORM:
        if (types.has(Synergy.ROCK)) {
          pokemon.addDefense(60, pokemon, 0, false)
          pokemon.effects.add(Effect.DIAMOND_STORM)
        }
        break

      case Effect.AROMATIC_MIST:
      case Effect.FAIRY_WIND:
      case Effect.STRANGE_STEAM:
      case Effect.MOON_FORCE:
        if (types.has(Synergy.FAIRY)) {
          pokemon.effects.add(effect)
        }
        break

      case Effect.DRAGON_ENERGY:
      case Effect.DRAGON_SCALES:
      case Effect.DRAGON_DANCE:
        if (types.has(Synergy.DRAGON)) {
          pokemon.effects.add(effect)
        }
        break

      case Effect.CHILLY:
        pokemon.effects.add(Effect.CHILLY)
        pokemon.addSpecialDefense(4, pokemon, 0, false)
        break

      case Effect.FROSTY:
        pokemon.effects.add(Effect.FROSTY)
        pokemon.addSpecialDefense(12, pokemon, 0, false)
        break

      case Effect.FREEZING:
        pokemon.effects.add(Effect.FREEZING)
        pokemon.addSpecialDefense(40, pokemon, 0, false)
        break

      case Effect.SHEER_COLD:
        pokemon.effects.add(Effect.SHEER_COLD)
        pokemon.addSpecialDefense(60, pokemon, 0, false)
        break

      case Effect.POISONOUS:
      case Effect.VENOMOUS:
      case Effect.TOXIC:
        if (types.has(Synergy.POISON)) {
          pokemon.effects.add(effect)
        }
        break

      case Effect.LARGO:
      case Effect.ALLEGRO:
      case Effect.PRESTO:
        if (types.has(Synergy.SOUND)) {
          pokemon.effects.add(effect)
          pokemon.effectsSet.add(new SoundCryEffect(effect))
        }
        break

      case Effect.COCOON:
      case Effect.INFESTATION:
      case Effect.HORDE:
      case Effect.HEART_OF_THE_SWARM:
        if (types.has(Synergy.BUG)) {
          pokemon.effects.add(effect)
        }
        break

      case Effect.TILLER:
      case Effect.DIGGER:
      case Effect.DRILLER:
      case Effect.DEEP_MINER:
        if (types.has(Synergy.GROUND)) {
          pokemon.effects.add(effect)
          pokemon.effectsSet.add(new GrowGroundEffect(effect))
        }
        break

      case Effect.DUBIOUS_DISC:
      case Effect.LINK_CABLE:
      case Effect.GOOGLE_SPECS:
        if (types.has(Synergy.ARTIFICIAL) && pokemon.items.size > 0) {
          const nbItems = max(3)(
            pokemon.items.size + (pokemon.items.has(Item.WONDER_BOX) ? 1 : 0)
          )
          const attackBoost = {
            [Effect.DUBIOUS_DISC]: 0,
            [Effect.LINK_CABLE]: (8 / 100) * pokemon.baseAtk,
            [Effect.GOOGLE_SPECS]: (15 / 100) * pokemon.baseAtk
          }[effect]
          const apBoost = {
            [Effect.DUBIOUS_DISC]: 0,
            [Effect.LINK_CABLE]: 8,
            [Effect.GOOGLE_SPECS]: 15
          }[effect]
          const shieldBoost = {
            [Effect.DUBIOUS_DISC]: 0,
            [Effect.LINK_CABLE]: (8 / 100) * pokemon.hp,
            [Effect.GOOGLE_SPECS]: (15 / 100) * pokemon.hp
          }[effect]
          pokemon.addAttack(attackBoost * nbItems, pokemon, 0, false)
          pokemon.addAbilityPower(apBoost * nbItems, pokemon, 0, false)
          pokemon.addShield(shieldBoost * nbItems, pokemon, 0, false)
          pokemon.effects.add(effect)
        }
        break

      case Effect.GRASSY_TERRAIN:
        if (types.has(Synergy.GRASS)) {
          pokemon.status.grassField = true
          pokemon.effects.add(Effect.GRASSY_TERRAIN)
        }
        break

      case Effect.PSYCHIC_TERRAIN:
        if (types.has(Synergy.PSYCHIC)) {
          pokemon.status.addPsychicField(pokemon)
          pokemon.effects.add(Effect.PSYCHIC_TERRAIN)
        }
        break

      case Effect.ELECTRIC_TERRAIN:
        if (types.has(Synergy.ELECTRIC)) {
          pokemon.status.addElectricField(pokemon)
          pokemon.effects.add(Effect.ELECTRIC_TERRAIN)
        }
        break

      case Effect.MISTY_TERRAIN:
        if (types.has(Synergy.FAIRY)) {
          pokemon.status.fairyField = true
          pokemon.effects.add(Effect.MISTY_TERRAIN)
        }
        break

      case Effect.SHINING_RAY:
        if (pokemon.inSpotlight) {
          pokemon.status.light = true
          pokemon.effects.add(Effect.SHINING_RAY)
          pokemon.addAttack(Math.ceil(pokemon.atk * 0.2), pokemon, 0, false)
          pokemon.addAbilityPower(20, pokemon, 0, false)
        }
        break

      case Effect.LIGHT_PULSE:
        if (pokemon.inSpotlight) {
          pokemon.status.light = true
          pokemon.effects.add(Effect.LIGHT_PULSE)
          pokemon.addAttack(Math.ceil(pokemon.atk * 0.2), pokemon, 0, false)
          pokemon.addAbilityPower(20, pokemon, 0, false)
        }
        break

      case Effect.ETERNAL_LIGHT:
        if (pokemon.inSpotlight) {
          pokemon.status.light = true
          pokemon.effects.add(Effect.ETERNAL_LIGHT)
          pokemon.addAttack(Math.ceil(pokemon.atk * 0.2), pokemon, 0, false)
          pokemon.addAbilityPower(20, pokemon, 0, false)
          pokemon.status.triggerRuneProtect(8000)
          pokemon.addDefense(0.5 * pokemon.baseDef, pokemon, 0, false)
          pokemon.addSpecialDefense(0.5 * pokemon.baseSpeDef, pokemon, 0, false)
        }
        break

      case Effect.MAX_ILLUMINATION:
        if (pokemon.inSpotlight) {
          pokemon.status.light = true
          pokemon.effects.add(Effect.MAX_ILLUMINATION)
          pokemon.addAttack(Math.ceil(pokemon.atk * 0.2), pokemon, 0, false)
          pokemon.addAbilityPower(20, pokemon, 0, false)
          pokemon.status.triggerRuneProtect(8000)
          pokemon.addDefense(0.5 * pokemon.baseDef, pokemon, 0, false)
          pokemon.addSpecialDefense(0.5 * pokemon.baseSpeDef, pokemon, 0, false)
          pokemon.addShield(100, pokemon, 0, false)
          pokemon.status.addResurrection(pokemon)
        }
        break

      case Effect.QUICK_FEET:
        if (types.has(Synergy.WILD)) {
          pokemon.effects.add(Effect.QUICK_FEET)
          pokemon.addAttack(Math.ceil(0.3 * pokemon.baseAtk), pokemon, 0, false)
        }
        break

      case Effect.RUN_AWAY:
        if (types.has(Synergy.WILD)) {
          pokemon.effects.add(Effect.RUN_AWAY)
          pokemon.addAttack(Math.ceil(0.5 * pokemon.baseAtk), pokemon, 0, false)
        }
        break

      case Effect.HUSTLE:
        if (types.has(Synergy.WILD)) {
          pokemon.effects.add(Effect.HUSTLE)
          pokemon.addAttack(Math.ceil(0.8 * pokemon.baseAtk), pokemon, 0, false)
        }
        break

      case Effect.BERSERK:
        if (types.has(Synergy.WILD)) {
          pokemon.effects.add(Effect.BERSERK)
          pokemon.addAttack(Math.ceil(1.0 * pokemon.baseAtk), pokemon, 0, false)
          pokemon.status.enrageDelay -= 5000
        }
        break

      case Effect.FLUID: {
        pokemon.effects.add(Effect.FLUID)
        pokemon.addAttackSpeed(1 * activeSynergies, pokemon, 0, false)
        pokemon.addMaxHP(4 * activeSynergies, pokemon, 0, false)
        break
      }

      case Effect.SHAPELESS: {
        pokemon.effects.add(Effect.SHAPELESS)
        pokemon.addAttackSpeed(3 * activeSynergies, pokemon, 0, false)
        pokemon.addMaxHP(8 * activeSynergies, pokemon, 0, false)
        break
      }

      case Effect.ETHEREAL: {
        pokemon.effects.add(Effect.ETHEREAL)
        pokemon.addAttackSpeed(6 * activeSynergies, pokemon, 0, false)
        pokemon.addMaxHP(12 * activeSynergies, pokemon, 0, false)
        break
      }

      case Effect.VICTINI_PASSIVE: {
        pokemon.effects.add(effect)
        pokemon.addDodgeChance(-1, pokemon, 0, false)
        break
      }

      case Effect.GOOD_LUCK: {
        pokemon.effects.add(effect)
        pokemon.addLuck(20, pokemon, 0, false)
        break
      }

      case Effect.BAD_LUCK: {
        pokemon.effects.add(effect)
        pokemon.addLuck(-20, pokemon, 0, false)
        break
      }

      case Effect.WATER_SPRING: {
        pokemon.effectsSet.add(new WaterSpringEffect())
        break
      }

      case Effect.WINDY: {
        const player = pokemon.player
        const nbFloatStones = player ? count(player.items, Item.FLOAT_STONE) : 0
        pokemon.addAttackSpeed(
          (pokemon.types.has(Synergy.FLYING) ? 10 : 0) + nbFloatStones * 5,
          pokemon,
          0,
          false
        )
        break
      }

      case Effect.SMOG: {
        const opponentPlayer =
          pokemon.team === Team.BLUE_TEAM ? this.redPlayer : this.bluePlayer
        const nbSmellyClays = opponentPlayer
          ? count(opponentPlayer.items, Item.SMELLY_CLAY)
          : 0
        pokemon.addDodgeChance(0.15 - 0.05 * nbSmellyClays, pokemon, 0, false)
        break
      }

      case Effect.NIGHT: {
        const player = pokemon.player
        const nbBlackAugurite = player
          ? count(player.items, Item.BLACK_AUGURITE)
          : 0

        pokemon.addCritChance(10 + 5 * nbBlackAugurite, pokemon, 0, false)
        break
      }

      case Effect.MISTY: {
        const player = pokemon.player
        const nbMistStones = player ? count(player.items, Item.MIST_STONE) : 0
        if (nbMistStones > 0) {
          pokemon.addSpecialDefense(3 * nbMistStones, pokemon, 0, false)
        }
        break
      }

      default:
        break
    }
  }

  update(dt: number) {
    if (this.blueTeam.size === 0 || this.redTeam.size === 0) {
      this.onFinish()
    }

    this.blueTeam.forEach((pkm, key) => {
      this.blueDpsMeter
        .get(key)
        ?.update(
          pkm.physicalDamage,
          pkm.specialDamage,
          pkm.trueDamage,
          pkm.physicalDamageReduced,
          pkm.specialDamageReduced,
          pkm.shieldDamageTaken,
          pkm.healDone,
          pkm.shieldDone
        )

      pkm.update(dt, this.board, this.weather, this.bluePlayer)
    })

    this.redTeam.forEach((pkm, key) => {
      this.redDpsMeter
        .get(key)
        ?.update(
          pkm.physicalDamage,
          pkm.specialDamage,
          pkm.trueDamage,
          pkm.physicalDamageReduced,
          pkm.specialDamageReduced,
          pkm.shieldDamageTaken,
          pkm.healDone,
          pkm.shieldDone
        )

      pkm.update(dt, this.board, this.weather, this.redPlayer)
    })

    if (this.weather === Weather.STORM) {
      this.stormLightningTimer -= dt
      if (this.stormLightningTimer <= 0 && !this.finished) {
        this.stormLightningTimer = randomBetween(3000, 6000)
        // trigger lightning
        const x = randomBetween(0, this.board.columns - 1)
        const y = randomBetween(0, this.board.rows - 1)
        //logger.debug('lightning at ' + x + ' ' + y)
        const pokemonOnCell = this.board.getValue(x, y)
        if (pokemonOnCell) {
          const nbElectricQuartz = pokemonOnCell.player
            ? count(pokemonOnCell.player.items, Item.ELECTRIC_QUARTZ)
            : 0
          if (nbElectricQuartz > 0) {
            pokemonOnCell.addShield(
              50 * nbElectricQuartz,
              pokemonOnCell,
              0,
              false
            )
          }
          if (pokemonOnCell.types.has(Synergy.ELECTRIC) === false) {
            pokemonOnCell.handleDamage({
              damage: 100,
              board: this.board,
              attackType: AttackType.SPECIAL,
              attacker: null,
              shouldTargetGainMana: false
            })
          }
        }
        this.room.broadcast(Transfer.BOARD_EVENT, {
          simulationId: this.id,
          effect: Effect.LIGHTNING_STRIKE,
          x,
          y
        })
      }
    }

    if (this.tidalWaveTimer > 0) {
      this.tidalWaveTimer -= dt
      if (this.tidalWaveTimer <= 0) {
        this.tidalWaveCounter++
        this.triggerTidalWave()
        if (this.tidalWaveCounter < 2) {
          this.tidalWaveTimer = 8000
        }
      }
    }
  }

  stop() {
    this.blueTeam.forEach((pokemon, key) => {
      // logger.debug('deleting ' + pokemon.name);
      this.blueTeam.delete(key)
    })

    this.redTeam.forEach((pokemon, key) => {
      // logger.debug('deleting ' + pokemon.name);
      this.redTeam.delete(key)
    })

    this.weather = Weather.NEUTRAL
    this.winnerId = ""
    this.room.broadcast(Transfer.SIMULATION_STOP)
  }

  onFinish() {
    this.finished = true

    if (this.blueTeam.size === 0 && this.redTeam.size > 0) {
      this.winnerId = this.redPlayerId
    } else if (this.redTeam.size === 0 && this.blueTeam.size > 0) {
      this.winnerId = this.bluePlayerId
    }

    const winningTeam =
      this.winnerId === this.redPlayerId
        ? this.redTeam
        : this.winnerId === this.bluePlayerId
          ? this.blueTeam
          : null
    if (winningTeam) {
      winningTeam.forEach((p) => {
        p.status.clearNegativeStatus()
        if (!p.status.tree) {
          p.action = PokemonActionState.HOP
        }
      })
    }

    if (
      this.redPlayer &&
      this.id === this.redPlayer.simulationId &&
      !this.isGhostBattle
    ) {
      this.redPlayer.addBattleResult(
        this.redPlayer.opponentId,
        this.redPlayer.opponentName,
        this.winnerId === this.redPlayerId
          ? BattleResult.WIN
          : this.winnerId === this.bluePlayerId
            ? BattleResult.DEFEAT
            : BattleResult.DRAW,
        this.redPlayer.opponentAvatar,
        this.weather
      )

      const client = this.room.clients.find(
        (cli) => cli.auth.uid === this.redPlayerId
      )

      if (this.winnerId === this.redPlayerId) {
        this.redPlayer.addMoney(1, true, null)
        client?.send(Transfer.PLAYER_INCOME, 1)
      } else {
        const playerDamage = this.room.computeRoundDamage(
          this.blueTeam,
          this.stageLevel
        )
        this.redPlayer.life -= playerDamage
        if (playerDamage > 0) {
          client?.send(Transfer.PLAYER_DAMAGE, playerDamage)
        }
        if (this.bluePlayer) {
          this.bluePlayer.totalPlayerDamageDealt += playerDamage
        }
      }

      if (
        this.weather !== Weather.NEUTRAL &&
        this.redPlayer.synergies.getSynergyStep(Synergy.ROCK) > 0
      ) {
        const rockCollected = WeatherRocksByWeather.get(this.weather)
        if (rockCollected) {
          this.redPlayer.weatherRocks.push(rockCollected)
          if (this.redPlayer.weatherRocks.length > 3) {
            this.redPlayer.weatherRocks.shift()
          }
          this.redPlayer.updateWeatherRocks()
        }
      }
    }

    if (this.bluePlayer && this.id === this.bluePlayer.simulationId) {
      this.bluePlayer.addBattleResult(
        this.bluePlayer.opponentId,
        this.bluePlayer.opponentName,
        this.winnerId === this.bluePlayerId
          ? BattleResult.WIN
          : this.winnerId === this.redPlayerId
            ? BattleResult.DEFEAT
            : BattleResult.DRAW,
        this.bluePlayer.opponentAvatar,
        this.weather
      )

      const client = this.room.clients.find(
        (cli) => cli.auth.uid === this.bluePlayerId
      )

      if (this.winnerId === this.bluePlayerId) {
        if (this.redPlayerId !== "pve") {
          this.bluePlayer.addMoney(1, true, null)
          client?.send(Transfer.PLAYER_INCOME, 1)
        }
      } else {
        const playerDamage = this.room.computeRoundDamage(
          this.redTeam,
          this.stageLevel
        )
        this.bluePlayer.life -= playerDamage
        if (playerDamage > 0) {
          client?.send(Transfer.PLAYER_DAMAGE, playerDamage)
        }
        if (this.redPlayer) {
          this.redPlayer.totalPlayerDamageDealt += playerDamage
        }
      }

      if (
        this.weather !== Weather.NEUTRAL &&
        this.bluePlayer.synergies.getSynergyStep(Synergy.ROCK) > 0
      ) {
        const rockCollected = WeatherRocksByWeather.get(this.weather)
        if (rockCollected) {
          this.bluePlayer.weatherRocks.push(rockCollected)
          if (this.bluePlayer.weatherRocks.length > 3) {
            this.bluePlayer.weatherRocks.shift()
          }
          this.bluePlayer.updateWeatherRocks()
        }
      }
    }

    this.room.rankPlayers()
  }

  applyCurse(effect: Effect, opponentTeamNumber: number) {
    const opponentTeam =
      opponentTeamNumber === Team.BLUE_TEAM ? this.blueTeam : this.redTeam
    const opponentsCursable = shuffleArray([...opponentTeam.values()]).filter(
      (p) => p.life > 0
    ) as PokemonEntity[]

    if (effect === Effect.CURSE_OF_VULNERABILITY) {
      const highestDef = Math.max(
        ...opponentsCursable.map((p) => p.def + p.speDef)
      )
      const enemyWithHighestDef = pickRandomIn(
        opponentsCursable.filter((p) => p.def + p.speDef === highestDef)
      )
      if (enemyWithHighestDef) {
        enemyWithHighestDef.addDefense(-5, enemyWithHighestDef, 0, false)
        enemyWithHighestDef.addSpecialDefense(-5, enemyWithHighestDef, 0, false)
        enemyWithHighestDef.status.curseVulnerability = true
        enemyWithHighestDef.status.triggerFlinch(
          30000,
          enemyWithHighestDef,
          undefined
        )
      }
    }

    if (effect === Effect.CURSE_OF_WEAKNESS) {
      const highestAtk = Math.max(...opponentsCursable.map((p) => p.atk))
      const enemyWithHighestAtk = pickRandomIn(
        opponentsCursable.filter((p) => p.atk === highestAtk)
      )
      if (enemyWithHighestAtk) {
        enemyWithHighestAtk.addAttack(
          Math.round(-0.3 * enemyWithHighestAtk.atk),
          enemyWithHighestAtk,
          0,
          false
        )
        enemyWithHighestAtk.status.curseWeakness = true
        enemyWithHighestAtk.status.triggerParalysis(
          30000,
          enemyWithHighestAtk,
          null
        )
      }
    }

    if (effect === Effect.CURSE_OF_TORMENT) {
      const highestAP = Math.max(...opponentsCursable.map((p) => p.ap))
      const enemyWithHighestAP = pickRandomIn(
        opponentsCursable.filter((p) => p.ap === highestAP)
      )
      if (enemyWithHighestAP) {
        enemyWithHighestAP.addAbilityPower(-50, enemyWithHighestAP, 0, false)
        enemyWithHighestAP.status.curseTorment = true
        enemyWithHighestAP.status.triggerFatigue(30000, enemyWithHighestAP)
      }
    }

    if (effect === Effect.CURSE_OF_FATE) {
      const strongestEnemy = getStrongestUnit(opponentsCursable)
      if (strongestEnemy) {
        strongestEnemy.status.curseFate = true
        strongestEnemy.status.triggerCurse(7000)
      }
    }
  }

  triggerTidalWave() {
    const redWaterLevel = this.redEffects.has(Effect.WATER_VEIL)
      ? 3
      : this.redEffects.has(Effect.HYDRATION)
        ? 2
        : this.redEffects.has(Effect.SWIFT_SWIM)
          ? 1
          : 0

    if (
      (redWaterLevel > 0 && this.tidalWaveCounter === 1) ||
      (redWaterLevel === 3 && this.tidalWaveCounter === 2)
    ) {
      this.room.broadcast(Transfer.ABILITY, {
        id: this.id,
        skill: "TIDAL_WAVE",
        positionX: 0,
        positionY: 0,
        targetX: 0,
        targetY: redWaterLevel - 1,
        orientation: Orientation.DOWN
      })
      this.room.broadcast(Transfer.CLEAR_BOARD, {
        simulationId: this.id
      })

      for (let y = 0; y < this.board.rows; y++) {
        for (let x = 0; x < this.board.columns; x++) {
          const cell = this.board.getValue(x, y)
          this.board.effects[y * this.board.columns + x] = undefined // clear all board effects
          if (cell) {
            if (cell.team === Team.RED_TEAM) {
              cell.status.clearNegativeStatus()
              if (cell.types.has(Synergy.AQUATIC)) {
                cell.handleHeal(redWaterLevel * 0.1 * cell.hp, cell, 0, false)
              }
            } else {
              cell.handleDamage({
                damage: redWaterLevel * 0.05 * cell.hp,
                board: this.board,
                attackType: AttackType.TRUE,
                attacker: null,
                shouldTargetGainMana: false
              })
              let newY = y
              while (
                newY > 0 &&
                this.board.getValue(x, newY - 1) === undefined
              ) {
                newY--
              }
              if (newY !== y) {
                cell.moveTo(x, newY, this.board) // push enemies away
                cell.cooldown = 500
              }
            }
          }
        }
      }
    }

    const blueWaterLevel = this.blueEffects.has(Effect.WATER_VEIL)
      ? 3
      : this.blueEffects.has(Effect.HYDRATION)
        ? 2
        : this.blueEffects.has(Effect.SWIFT_SWIM)
          ? 1
          : 0
    if (
      (blueWaterLevel > 0 && this.tidalWaveCounter === 1) ||
      (blueWaterLevel === 3 && this.tidalWaveCounter === 2)
    ) {
      this.room.broadcast(Transfer.ABILITY, {
        id: this.id,
        skill: "TIDAL_WAVE",
        positionX: 0,
        positionY: 0,
        targetX: 0,
        targetY: blueWaterLevel - 1,
        orientation: Orientation.UP
      })
      this.room.broadcast(Transfer.CLEAR_BOARD, {
        simulationId: this.id
      })

      for (let y = this.board.rows - 1; y > 0; y--) {
        for (let x = 0; x < this.board.columns; x++) {
          const cell = this.board.getValue(x, y)
          this.board.effects[y * this.board.columns + x] = undefined // clear all board effects
          if (cell) {
            if (cell.team === Team.BLUE_TEAM) {
              cell.status.clearNegativeStatus()
              if (cell.types.has(Synergy.AQUATIC)) {
                cell.handleHeal(blueWaterLevel * 0.1 * cell.hp, cell, 0, false)
              }
            } else {
              cell.handleDamage({
                damage: blueWaterLevel * 0.05 * cell.hp,
                board: this.board,
                attackType: AttackType.TRUE,
                attacker: null,
                shouldTargetGainMana: false
              })
              let newY = y
              while (
                newY < this.board.rows - 1 &&
                this.board.getValue(x, newY + 1) === undefined
              ) {
                newY++
              }
              if (newY !== y) {
                cell.moveTo(x, newY, this.board) // push enemies away
                cell.cooldown = 500
              }
            }
          }
        }
      }
    }
  }
}
