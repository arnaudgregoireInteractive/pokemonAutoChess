/* eslint-disable @typescript-eslint/no-empty-function */
import { Item } from "../types/enum/Item"
import { Pkm } from "../types/enum/Pokemon"
import { Effect } from "../types/enum/Effect"
import { AttackType, HealType, PokemonActionState } from "../types/enum/Game"
import PokemonFactory from "../models/pokemon-factory"
import Board from "./board"
import PokemonEntity from "./pokemon-entity"
import { IPokemonEntity, Transfer, FIGHTING_PHASE_DURATION } from "../types"
import { Synergy } from "../types/enum/Synergy"
import { Ability } from "../types/enum/Ability"
import { FlyingProtectThreshold } from "../types/Config"
import { pickRandomIn } from "../utils/random"

export default class PokemonState {
  handleHeal(
    pokemon: IPokemonEntity,
    heal: number,
    caster: IPokemonEntity,
    apBoost?: boolean
  ): void {
    if (
      pokemon.life > 0 &&
      pokemon.life < pokemon.hp &&
      !pokemon.status.wound
    ) {
      const boost = apBoost ? (heal * pokemon.ap) / 100 : 0
      let healBoosted = Math.round(heal + boost)
      if (pokemon.skill === Ability.WONDER_GUARD) {
        healBoosted = 1
      }

      const healTaken = Math.min(pokemon.hp - pokemon.life, healBoosted)

      pokemon.life = Math.min(pokemon.hp, pokemon.life + healBoosted)

      if (caster && healTaken > 0) {
        if (pokemon.simulation.room.state.time < FIGHTING_PHASE_DURATION) {
          pokemon.simulation.room.broadcast(Transfer.POKEMON_HEAL, {
            index: caster.index,
            type: HealType.HEAL,
            amount: healTaken,
            x: pokemon.positionX,
            y: pokemon.positionY,
            id: pokemon.simulation.id
          })
        }
        caster.healDone += healTaken
      }
    }
  }

  handleShield(
    pokemon: IPokemonEntity,
    shield: number,
    caster: IPokemonEntity,
    apBoost?: boolean
  ) {
    if (pokemon.life > 0) {
      const boost = apBoost ? (shield * pokemon.ap) / 100 : 0
      const shieldBoosted = Math.round(shield + boost)
      pokemon.shield += shieldBoosted
      if (caster && shieldBoosted > 0) {
        if (pokemon.simulation.room.state.time < FIGHTING_PHASE_DURATION) {
          pokemon.simulation.room.broadcast(Transfer.POKEMON_HEAL, {
            index: caster.index,
            type: HealType.SHIELD,
            amount: shieldBoosted,
            x: pokemon.positionX,
            y: pokemon.positionY,
            id: pokemon.simulation.id
          })
        }
        caster.shieldDone += shieldBoosted
      }
    }
  }

  handleDamage(
    pokemon: PokemonEntity,
    damage: number,
    board: Board,
    attackType_: AttackType,
    attacker: PokemonEntity,
    dodgeable: boolean
  ): boolean {
    let death: boolean
    let attackType = attackType_
    if (pokemon.life == 0) {
      death = true
    } else {
      death = false
      if (!pokemon.status.protect) {
        let reducedDamage = damage

        if (pokemon.items.has(Item.POKE_DOLL)) {
          reducedDamage = Math.ceil(reducedDamage * 0.7)
        }

        if (attacker && attacker.status.electricField) {
          reducedDamage = Math.ceil(reducedDamage * 1.3)
        }

        if (attacker && attacker.status.psychicField) {
          reducedDamage = Math.ceil(reducedDamage * 1.3)
        }

        if (attacker && attacker.status.grassField) {
          reducedDamage = Math.ceil(reducedDamage * 1.3)
        }

        if (attacker && attacker.status.fairyField) {
          reducedDamage = Math.ceil(reducedDamage * 1.3)
        }

        if (attacker && attacker.items.has(Item.FIRE_GEM)) {
          reducedDamage = Math.ceil(reducedDamage + pokemon.hp * 0.08)
        }

        if (
          attacker &&
          attacker.skill == Ability.LOCK_ON &&
          pokemon.status.armorReduction
        ) {
          attackType = AttackType.TRUE
        }
        const armorFactor = 0.1
        const def = pokemon.status.armorReduction
          ? Math.round(pokemon.def / 2)
          : pokemon.def
        const speDef = pokemon.status.armorReduction
          ? Math.round(pokemon.speDef / 2)
          : pokemon.speDef
        if (attackType == AttackType.PHYSICAL) {
          const ritodamage = damage / (1 + armorFactor * def)
          reducedDamage = Math.max(0, Math.round(ritodamage))
        } else if (attackType == AttackType.SPECIAL) {
          const ritodamage = damage / (1 + armorFactor * speDef)
          reducedDamage = Math.max(0, Math.round(ritodamage))
        } else if (attackType == AttackType.TRUE) {
          reducedDamage = damage
        }

        if (!reducedDamage) {
          reducedDamage = 0
          // console.log(`error calculating damage, damage: ${damage}, defenseur: ${pokemon.name}, attaquant: ${attacker.name}, attack type: ${attackType}, defense : ${pokemon.def}, spedefense: ${pokemon.speDef}, life: ${pokemon.life}`);
        }

        if (dodgeable && pokemon.dodge > Math.random()) {
          if (!(attacker && attacker.items.has(Item.XRAY_VISION))) {
            reducedDamage = 0
            pokemon.count.dodgeCount += 1
          }
        }

        let residualDamage = reducedDamage

        if (pokemon.shield > 0) {
          residualDamage = Math.max(0, reducedDamage - pokemon.shield)
          pokemon.shield = Math.max(0, pokemon.shield - reducedDamage)
        }

        if (
          attackType !== AttackType.TRUE &&
          (pokemon.effects.includes(Effect.GUTS) ||
            pokemon.effects.includes(Effect.DEFIANT) ||
            pokemon.effects.includes(Effect.JUSTIFIED))
        ) {
          const damageReduction = pokemon.effects.includes(Effect.GUTS)
            ? 4
            : pokemon.effects.includes(Effect.DEFIANT)
            ? 7
            : 10
          residualDamage = residualDamage - damageReduction
        }

        if (pokemon.skill == Ability.WONDER_GUARD) {
          residualDamage = 1
        }

        const takenDamage = Math.max(
          1,
          Math.round(Math.min(residualDamage, pokemon.life))
        )

        if (attacker && residualDamage > 0) {
          switch (attackType) {
            case AttackType.PHYSICAL:
              attacker.physicalDamage += takenDamage
              break

            case AttackType.SPECIAL:
              attacker.specialDamage += takenDamage
              break

            case AttackType.TRUE:
              attacker.trueDamage += takenDamage
              break

            default:
              break
          }
        }

        if (attacker && takenDamage > 0) {
          pokemon.simulation.room.broadcast(Transfer.POKEMON_DAMAGE, {
            index: attacker.index,
            type: attackType,
            amount: takenDamage,
            x: pokemon.positionX,
            y: pokemon.positionY,
            id: pokemon.simulation.id
          })
        }

        if (pokemon.shield > 0) {
          residualDamage = Math.max(0, reducedDamage - pokemon.shield)
          pokemon.shield = Math.max(0, pokemon.shield - reducedDamage)
        }

        pokemon.life = Math.max(0, pokemon.life - residualDamage)

        // console.log(`${pokemon.name} took ${damage} and has now ${pokemon.life} life shield ${pokemon.shield}`);

        if (pokemon) {
          pokemon.setMana(pokemon.mana + Math.ceil(residualDamage / 10))

          if (
            pokemon.items.has(Item.DEFENSIVE_RIBBON) &&
            pokemon.count.defensiveRibbonCount < 10
          ) {
            pokemon.addAttack(1)
            pokemon.addDefense(1)
            pokemon.addSpecialDefense(1)
            pokemon.handleAttackSpeed(5)
            pokemon.count.defensiveRibbonCount++
          }

          if (pokemon.status.sleep) {
            pokemon.status.updateSleep(100)
          }

          if (pokemon.life && pokemon.life > 0) {
            if (pokemon.flyingProtection) {
              const t = FlyingProtectThreshold[Effect.TAILWIND]
              const f = FlyingProtectThreshold[Effect.FEATHER_DANCE]
              const ma = FlyingProtectThreshold[Effect.MAX_AIRSTREAM]
              const mg = FlyingProtectThreshold[Effect.MAX_GUARD]

              if (pokemon.effects.includes(Effect.TAILWIND) && t) {
                if (pokemon.life / pokemon.hp < t.threshold) {
                  pokemon.status.triggerProtect(t.duration)
                  pokemon.flyingProtection = false
                }
              } else if (pokemon.effects.includes(Effect.FEATHER_DANCE) && f) {
                if (pokemon.life / pokemon.hp < f.threshold) {
                  pokemon.status.triggerProtect(f.duration)
                  pokemon.flyingProtection = false
                }
              } else if (pokemon.effects.includes(Effect.MAX_AIRSTREAM) && ma) {
                if (pokemon.life / pokemon.hp < ma.threshold) {
                  pokemon.status.triggerProtect(ma.duration)
                  pokemon.flyingProtection = false
                }
              } else if (pokemon.effects.includes(Effect.MAX_GUARD) && mg) {
                if (pokemon.life / pokemon.hp < mg.threshold) {
                  pokemon.status.triggerProtect(mg.duration)
                  pokemon.flyingProtection = false
                }
              }
            }
          }
        }

        if (attacker) {
          attacker.setMana(attacker.mana + 5)
          if (
            attacker.effects.includes(Effect.CALM_MIND) ||
            attacker.effects.includes(Effect.FOCUS_ENERGY) ||
            attacker.effects.includes(Effect.MEDITATE)
          ) {
            let lifesteal = 0
            if (attacker.effects.includes(Effect.MEDITATE)) {
              lifesteal = 0.15
            } else if (attacker.effects.includes(Effect.FOCUS_ENERGY)) {
              lifesteal = 0.3
            } else if (attacker.effects.includes(Effect.CALM_MIND)) {
              lifesteal = 0.6
            }
            attacker.handleHeal(
              Math.floor(lifesteal * residualDamage),
              attacker,
              false
            )
          }
          if (attacker.items.has(Item.SHELL_BELL)) {
            attacker.handleHeal(
              Math.floor(0.3 * residualDamage),
              attacker,
              false
            )
          }

          if (
            attacker.effects.includes(Effect.BLAZE) ||
            attacker.effects.includes(Effect.DROUGHT) ||
            attacker.effects.includes(Effect.DESOLATE_LAND)
          ) {
            let burnChance = 0
            if (attacker.effects.includes(Effect.BLAZE)) {
              burnChance = 0.2
            }
            if (attacker.effects.includes(Effect.VICTORY_STAR)) {
              burnChance = 0.2
            } else if (attacker.effects.includes(Effect.DROUGHT)) {
              burnChance = 0.3
            } else if (attacker.effects.includes(Effect.DESOLATE_LAND)) {
              burnChance = 0.4
            }
            if (Math.random() < burnChance) {
              pokemon.status.triggerBurn(2000, pokemon, attacker, board)
            }
          }
        }

        if (!pokemon.life || pokemon.life <= 0) {
          if (pokemon.items.has(Item.MAX_REVIVE)) {
            pokemon.life = pokemon.hp
            pokemon.items.delete(Item.MAX_REVIVE)
          } else if (pokemon.effects.includes(Effect.ANCIENT_POWER)) {
            pokemon.status.triggerProtect(1000)
            pokemon.life = pokemon.hp * 0.4
            pokemon.addAttack(pokemon.baseAtk * 0.3)
            pokemon.effects.splice(
              pokemon.effects.findIndex((e) => e === Effect.ANCIENT_POWER),
              1
            )
          } else if (pokemon.effects.includes(Effect.ELDER_POWER)) {
            pokemon.status.triggerProtect(1000)
            pokemon.life = pokemon.hp * 0.8
            pokemon.addAttack(pokemon.baseAtk * 0.6)
            pokemon.effects.splice(
              pokemon.effects.findIndex((e) => e === Effect.ELDER_POWER),
              1
            )
          } else if (pokemon.status.resurection) {
            pokemon.status.resurection = false
            pokemon.life = pokemon.hp
          } else {
            const isWorkUp = pokemon.effects.includes(Effect.BULK_UP)
            const isRage = pokemon.effects.includes(Effect.RAGE)
            const isAngerPoint = pokemon.effects.includes(Effect.ANGER_POINT)

            if (isWorkUp || isRage || isAngerPoint) {
              let boost = 0
              let speedBoost = 0
              if (isWorkUp) {
                boost = 20
                speedBoost = 15
              } else if (isRage) {
                boost = 30
                speedBoost = 20
              } else if (isAngerPoint) {
                boost = 40
                speedBoost = 30
              }
              board.forEach((r, c, value) => {
                if (
                  value !== undefined &&
                  value.team == pokemon.team &&
                  value.types.includes(Synergy.FIELD)
                ) {
                  let _pokemon = pokemon // beware of closure vars
                  pokemon.simulation.room.clock.setTimeout(() => {
                    value.count.fieldCount++
                    value.handleHeal((boost / 100) * value.hp, _pokemon, false)
                    value.handleAttackSpeed(speedBoost)
                  }, 16) // delay to next tick, targeting 60 ticks per second
                }
              })
            }

            board.setValue(pokemon.positionX, pokemon.positionY, undefined)
            death = true
          }
        }
      }
    }

    if (death && pokemon) {
      if (
        attacker &&
        attacker.items.has(Item.AMULET_COIN) &&
        attacker.team === 0 &&
        attacker.simulation.player &&
        attacker.count.moneyCount < 5
      ) {
        attacker.simulation.player.money += 1
        attacker.count.moneyCount++
      }
      if (
        attacker &&
        (attacker.effects.includes(Effect.PURSUIT) ||
          attacker.effects.includes(Effect.BRUTAL_SWING) ||
          attacker.effects.includes(Effect.POWER_TRIP))
      ) {
        const isPursuit = attacker.effects.includes(Effect.PURSUIT)
        const isBrutalSwing = attacker.effects.includes(Effect.BRUTAL_SWING)
        const isPowerTrip = attacker.effects.includes(Effect.POWER_TRIP)

        if (isPursuit || isBrutalSwing || isPowerTrip) {
          let defBoost = 0
          let healBoost = 0
          let attackBoost = 0
          if (isPursuit) {
            defBoost = 2
            healBoost = 30
            attackBoost = 3
          } else if (isBrutalSwing) {
            defBoost = 4
            healBoost = 60
            attackBoost = 6
          } else if (isPowerTrip) {
            defBoost = 6
            healBoost = 120
            attackBoost = 12
          }
          attacker.addSpecialDefense(defBoost)
          attacker.addDefense(defBoost)
          attacker.handleHeal(healBoost, attacker, false)
          attacker.addAttack(attackBoost)
          attacker.count.monsterExecutionCount++
        }
      }

      if (
        pokemon.effects.includes(Effect.ODD_FLOWER) ||
        pokemon.effects.includes(Effect.GLOOM_FLOWER) ||
        pokemon.effects.includes(Effect.VILE_FLOWER) ||
        pokemon.effects.includes(Effect.SUN_FLOWER)
      ) {
        if (!pokemon.simulation.flowerSpawn[pokemon.team]) {
          pokemon.simulation.flowerSpawn[pokemon.team] = true
          const nearestAvailableCoordinate =
            this.getFarthestTargetCoordinateAvailablePlace(pokemon, board)
          if (nearestAvailableCoordinate) {
            if (pokemon.effects.includes(Effect.ODD_FLOWER)) {
              pokemon.simulation.addPokemon(
                PokemonFactory.createPokemonFromName(Pkm.ODDISH),
                nearestAvailableCoordinate.x,
                nearestAvailableCoordinate.y,
                pokemon.team,
                true
              )
            } else if (pokemon.effects.includes(Effect.GLOOM_FLOWER)) {
              pokemon.simulation.addPokemon(
                PokemonFactory.createPokemonFromName(Pkm.GLOOM),
                nearestAvailableCoordinate.x,
                nearestAvailableCoordinate.y,
                pokemon.team,
                true
              )
            } else if (pokemon.effects.includes(Effect.VILE_FLOWER)) {
              pokemon.simulation.addPokemon(
                PokemonFactory.createPokemonFromName(Pkm.VILEPLUME),
                nearestAvailableCoordinate.x,
                nearestAvailableCoordinate.y,
                pokemon.team,
                true
              )
            } else if (pokemon.effects.includes(Effect.SUN_FLOWER)) {
              pokemon.simulation.addPokemon(
                PokemonFactory.createPokemonFromName(Pkm.BELLOSSOM),
                nearestAvailableCoordinate.x,
                nearestAvailableCoordinate.y,
                pokemon.team,
                true
              )
            }
          }
        }
      }

      if (pokemon.skill === Ability.ELECTRIC_SURGE) {
        board.forEach((x, y, v) => {
          if (v && v.status.electricField) {
            v.status.electricField = false
          }
        })
      } else if (pokemon.skill === Ability.PSYCHIC_SURGE) {
        board.forEach((x, y, v) => {
          if (v && v.status.psychicField) {
            v.status.psychicField = false
          }
        })
      } else if (pokemon.skill === Ability.GRASSY_SURGE) {
        board.forEach((x, y, v) => {
          if (v && v.status.grassField) {
            v.status.grassField = false
          }
        })
      } else if (pokemon.skill === Ability.MISTY_SURGE) {
        board.forEach((x, y, v) => {
          if (v && v.status.fairyField) {
            v.status.fairyField = false
          }
        })
      }
    }
    return death
  }

  update(pokemon: PokemonEntity, dt: number, board: Board, climate: string) {
    if (
      (pokemon.status.freeze || pokemon.status.sleep) &&
      pokemon.action !== PokemonActionState.SLEEP
    ) {
      pokemon.toIdleState()
    }
    if (
      pokemon.effects.includes(Effect.SHORE_UP) ||
      pokemon.effects.includes(Effect.ROTOTILLER) ||
      pokemon.effects.includes(Effect.SANDSTORM)
    ) {
      if (pokemon.count.growGroundCount < 4) {
        pokemon.growGroundTimer -= dt
        if (pokemon.growGroundTimer <= 0) {
          pokemon.growGroundTimer = 3000
          pokemon.count.growGroundCount += 1
          if (pokemon.effects.includes(Effect.SHORE_UP)) {
            pokemon.addDefense(1)
            pokemon.addSpecialDefense(1)
            pokemon.addAttack(1)
          } else if (pokemon.effects.includes(Effect.ROTOTILLER)) {
            pokemon.addDefense(2)
            pokemon.addSpecialDefense(2)
            pokemon.addAttack(2)
          } else if (pokemon.effects.includes(Effect.SANDSTORM)) {
            pokemon.addDefense(3)
            pokemon.addSpecialDefense(3)
            pokemon.addAttack(3)
          }
        }
      } else {
        pokemon.growGroundTimer = 3000
      }
    }

    pokemon.status.updateAllStatus(dt, pokemon, board)

    if (pokemon.manaCooldown <= 0) {
      pokemon.setMana(pokemon.mana + 10)
      pokemon.manaCooldown = 1000
    } else {
      pokemon.manaCooldown = Math.max(0, pokemon.manaCooldown - dt)
    }

    if (pokemon.cooldown <= 0) {
      if (pokemon.effects.includes(Effect.VICTORY_STAR)) {
        pokemon.addAttack(1)
      }

      if (pokemon.effects.includes(Effect.DROUGHT)) {
        pokemon.addAttack(2)
      }

      if (pokemon.effects.includes(Effect.DESOLATE_LAND)) {
        pokemon.addAttack(3)
      }

      if (
        pokemon.effects.includes(Effect.DRAGON_ENERGY) &&
        pokemon.types.includes(Synergy.DRAGON)
      ) {
        pokemon.handleAttackSpeed(5)
      }

      if (
        pokemon.effects.includes(Effect.DRAGON_DANCE) &&
        pokemon.types.includes(Synergy.DRAGON)
      ) {
        pokemon.handleAttackSpeed(10)
      }
    }
  }

  onEnter(pokemon: PokemonEntity) {}

  onExit(pokemon: PokemonEntity) {}

  isTarget(pokemon: PokemonEntity, board: Board) {
    let target = false
    board.forEach((x, y, value) => {
      if (value && value.team != pokemon.team) {
        target = true
      }
    })
    return target
  }

  getNearestTargetCoordinate(
    pokemon: PokemonEntity,
    board: Board
  ): { x: number; y: number } | undefined {
    let distance = 999
    let candidatesCoordinates: { x: number; y: number }[] = new Array<{
      x: number
      y: number
    }>()

    board.forEach((r: number, c: number, value: PokemonEntity | undefined) => {
      if (value !== undefined && value.team != pokemon.team) {
        const candidateDistance = board.distance(
          pokemon.positionX,
          pokemon.positionY,
          r,
          c
        )
        if (candidateDistance < distance) {
          distance = candidateDistance
          candidatesCoordinates = [{ x: r, y: c }]
        } else if (candidateDistance == distance) {
          candidatesCoordinates.push({ x: r, y: c })
        }
      }
    })
    if (candidatesCoordinates.length > 0) {
      return pickRandomIn(candidatesCoordinates)
    } else {
      return undefined
    }
  }

  getFarthestTargetCoordinate(
    pokemon: PokemonEntity,
    board: Board
  ): { x: number; y: number } | undefined {
    const pokemons = new Array<{ distance: number; x: number; y: number }>()

    board.forEach((r: number, c: number, value: PokemonEntity | undefined) => {
      if (value !== undefined && value.team != pokemon.team) {
        const d = board.distance(pokemon.positionX, pokemon.positionY, r, c)
        pokemons.push({ distance: d, x: r, y: c })
      }
    })

    pokemons.sort((a, b) => {
      return b.distance - a.distance
    })

    if (pokemons.length > 0) {
      return { x: pokemons[0].x, y: pokemons[0].y }
    } else {
      return undefined
    }
  }

  getMostSurroundedCoordianteAvailablePlace(
    pokemon: PokemonEntity,
    board: Board
  ): { x: number; y: number } | undefined {
    let x: number | undefined = undefined
    let y: number | undefined = undefined
    const team = pokemon.team
    const emptyPlaces = new Array<{ x: number; y: number; neighbour: number }>()
    board.forEach((r: number, c: number, value: PokemonEntity | undefined) => {
      if (value === undefined) {
        const cells = board.getAdjacentCells(r, c)
        let n = 0
        cells.forEach((cell) => {
          if (cell.value && cell.value.team !== team) {
            n++
          }
        })
        emptyPlaces.push({ x: r, y: c, neighbour: n })
      }
    })

    emptyPlaces.sort((a, b) => {
      return b.neighbour - a.neighbour
    })

    if (emptyPlaces.length > 0) {
      x = emptyPlaces[0].x
      y = emptyPlaces[0].y
    }

    if (x !== undefined && y !== undefined) {
      return { x: x, y: y }
    } else {
      return undefined
    }
  }

  getFarthestTargetCoordinateAvailablePlace(
    pokemon: PokemonEntity,
    board: Board
  ): { x: number; y: number } | undefined {
    let x: number | undefined = undefined
    let y: number | undefined = undefined
    const pokemons = new Array<{ distance: number; x: number; y: number }>()

    board.forEach((r: number, c: number, value: PokemonEntity | undefined) => {
      if (value !== undefined && value.team != pokemon.team) {
        const d = board.distance(pokemon.positionX, pokemon.positionY, r, c)
        pokemons.push({ distance: d, x: r, y: c })
      }
    })

    pokemons.sort((a, b) => {
      return b.distance - a.distance
    })

    for (let i = 0; i < pokemons.length; i++) {
      const p = pokemons[i]
      const around = board.getAdjacentCells(p.x, p.y)

      around.sort((a, b) => {
        return (
          board.distance(
            b.row,
            b.column,
            pokemon.positionX,
            pokemon.positionY
          ) -
          board.distance(a.row, a.column, pokemon.positionX, pokemon.positionY)
        )
      })
      around.forEach((cell) => {
        if (!cell.value && x === undefined && y === undefined) {
          x = cell.row
          y = cell.column
        }
      })
      if (x !== undefined && y !== undefined) {
        break
      }
    }
    if (x !== undefined && y !== undefined) {
      return { x: x, y: y }
    } else {
      return undefined
    }
  }

  getTargetCoordinateWhenConfused(
    pokemon: PokemonEntity,
    board: Board
  ): { x: number; y: number } | undefined {
    let distance = 999
    let candidatesCoordinates: { x: number; y: number }[] = new Array<{
      x: number
      y: number
    }>()

    board.forEach((r: number, c: number, value: PokemonEntity | undefined) => {
      if (value !== undefined && value.id != pokemon.id) {
        const candidateDistance = board.distance(
          pokemon.positionX,
          pokemon.positionY,
          r,
          c
        )
        if (candidateDistance < distance) {
          distance = candidateDistance
          candidatesCoordinates = [{ x: r, y: c }]
        } else if (candidateDistance == distance) {
          candidatesCoordinates.push({ x: r, y: c })
        }
      }
    })

    candidatesCoordinates.push({ x: pokemon.positionX, y: pokemon.positionY }) // sometimes attack itself when confused

    if (candidatesCoordinates.length > 0) {
      return pickRandomIn(candidatesCoordinates)
    } else {
      return undefined
    }
  }

  move(
    pokemon: PokemonEntity,
    board: Board,
    coordinates: { x: number; y: number }
  ) {}
}
