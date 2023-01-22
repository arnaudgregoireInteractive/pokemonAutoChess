import { Schema, type } from "@colyseus/schema"
import Board, { Cell } from "../../core/board"
import PokemonEntity from "../../core/pokemon-entity"
import { IStatus } from "../../types"
import { Ability } from "../../types/enum/Ability"
import { Item } from "../../types/enum/Item"

export default class Status extends Schema implements IStatus {
  @type("boolean") burn = false
  @type("boolean") silence = false
  @type("boolean") poison = false
  @type("boolean") freeze = false
  @type("boolean") protect = false
  @type("boolean") sleep = false
  @type("boolean") confusion = false
  @type("boolean") wound = false
  @type("boolean") resurection = false
  @type("boolean") smoke = false
  @type("boolean") armorReduction = false
  @type("boolean") runeProtect = false
  @type("boolean") electricField = false
  @type("boolean") psychicField = false
  soulDew = false
  brightPowder = false
  deltaOrb = false
  burnOrigin: PokemonEntity | undefined = undefined
  poisonOrigin: PokemonEntity | undefined = undefined
  burnCooldown = 0
  silenceCooldown = 0
  poisonCooldown = 0
  freezeCooldown = 0
  protectCooldown = 0
  sleepCooldown = 0
  confusionCooldown = 0
  woundCooldown = 0
  soulDewCooldown = 0
  brightPowderCooldown = 0
  smokeCooldown = 0
  armorReductionCooldown = 0
  runeProtectCooldown = 0

  clearNegativeStatus() {
    this.burnCooldown = 0
    this.silenceCooldown = 0
    this.poisonCooldown = 0
    this.freezeCooldown = 0
    this.sleepCooldown = 0
    this.confusionCooldown = 0
    this.woundCooldown = 0
    this.smokeCooldown = 0
  }

  triggerArmorReduction(timer: number) {
    if (!this.armorReduction) {
      this.armorReduction = true
      this.armorReductionCooldown = timer
    }
  }

  updateArmorReduction(dt: number) {
    if (this.armorReductionCooldown - dt <= 0) {
      this.armorReduction = false
    } else {
      this.armorReductionCooldown = this.armorReductionCooldown - dt
    }
  }

  triggerSoulDew(timer: number) {
    // console.log('sould dew');
    if (!this.soulDew) {
      this.soulDew = true
      this.soulDewCooldown = timer
    }
  }

  updateSoulDew(dt: number, pkm: PokemonEntity) {
    if (this.soulDewCooldown - dt <= 0) {
      this.soulDew = false
      pkm.addSpellDamage(10)
      if (pkm.items.has(Item.SOUL_DEW)) {
        this.triggerSoulDew(2000)
      }
    } else {
      this.soulDewCooldown = this.soulDewCooldown - dt
    }
  }

  triggerBurn(
    timer: number,
    pkm: PokemonEntity,
    origin: PokemonEntity | undefined,
    board: Board
  ) {
    if (!this.burn && !pkm.items.has(Item.FLUFFY_TAIL)) {
      this.burn = true
      this.burnCooldown = timer
      if (origin) {
        this.burnOrigin = origin
      }
      if (pkm.skill === Ability.SYNCHRO) {
        board.forEach((x: number, y: number, tg: PokemonEntity | undefined) => {
          if (tg && tg.team !== pkm.team) {
            tg.status.triggerBurn(timer, tg, pkm, board)
          }
        })
      }
    }
  }

  updateBurn(dt: number) {
    if (this.burnCooldown - dt <= 0) {
      this.burn = false
      this.burnOrigin = undefined
    } else {
      this.burnCooldown = this.burnCooldown - dt
    }
  }

  triggerSilence(timer: number, pkm: PokemonEntity, board: Board) {
    if (!this.silence && !pkm.items.has(Item.FLUFFY_TAIL)) {
      this.silence = true
      this.silenceCooldown = timer
      if (pkm.skill === Ability.SYNCHRO) {
        board.forEach((x: number, y: number, tg: PokemonEntity | undefined) => {
          if (tg && tg.team !== pkm.team) {
            tg.status.triggerSilence(timer, tg, board)
          }
        })
      }
    }
  }

  updateSilence(dt: number) {
    if (this.silenceCooldown - dt <= 0) {
      this.silence = false
    } else {
      this.silenceCooldown = this.silenceCooldown - dt
    }
  }

  triggerPoison(
    timer: number,
    pkm: PokemonEntity,
    origin: PokemonEntity | undefined,
    board: Board
  ) {
    if (!this.poison && !pkm.items.has(Item.FLUFFY_TAIL)) {
      this.poison = true
      this.poisonCooldown = timer
      if (origin) {
        this.poisonOrigin = origin
      }
      if (pkm.skill === Ability.SYNCHRO) {
        board.forEach((x: number, y: number, tg: PokemonEntity | undefined) => {
          if (tg && tg.team !== pkm.team) {
            tg.status.triggerPoison(timer, tg, pkm, board)
          }
        })
      }
    }
  }

  updatePoison(dt: number) {
    if (this.poisonCooldown - dt <= 0) {
      this.poison = false
      this.poisonOrigin = undefined
    } else {
      this.poisonCooldown = this.poisonCooldown - dt
    }
  }

  triggerFreeze(timer: number, pkm: PokemonEntity) {
    if (!this.freeze && !pkm.items.has(Item.FLUFFY_TAIL)) {
      this.freeze = true
      this.freezeCooldown = timer
    }
  }

  updateFreeze(dt: number) {
    if (this.freezeCooldown - dt <= 0) {
      this.freeze = false
    } else {
      this.freezeCooldown = this.freezeCooldown - dt
    }
  }

  triggerProtect(timer: number) {
    if (!this.protect) {
      this.protect = true
      this.protectCooldown = timer
    }
  }

  updateProtect(dt: number) {
    if (this.protectCooldown - dt <= 0) {
      this.protect = false
    } else {
      this.protectCooldown = this.protectCooldown - dt
    }
  }

  triggerSleep(timer: number, pkm: PokemonEntity) {
    if (!this.sleep && !pkm.items.has(Item.FLUFFY_TAIL)) {
      this.sleep = true
      this.sleepCooldown = timer
    }
  }

  updateSleep(dt: number) {
    if (this.sleepCooldown - dt <= 0) {
      this.sleep = false
    } else {
      this.sleepCooldown = this.sleepCooldown - dt
    }
  }

  triggerConfusion(timer: number, pkm: PokemonEntity) {
    if (!this.confusion && !pkm.items.has(Item.FLUFFY_TAIL)) {
      this.confusion = true
      this.confusionCooldown = timer
    }
  }

  updateConfusion(dt: number) {
    if (this.confusionCooldown - dt <= 0) {
      this.confusion = false
    } else {
      this.confusionCooldown = this.confusionCooldown - dt
    }
  }

  triggerWound(timer: number, pkm: PokemonEntity, board: Board) {
    if (!this.wound && !pkm.items.has(Item.FLUFFY_TAIL)) {
      this.wound = true
      this.woundCooldown = timer
      if (pkm.skill === Ability.SYNCHRO) {
        board.forEach((x: number, y: number, tg: PokemonEntity | undefined) => {
          if (tg && tg.team !== pkm.team) {
            tg.status.triggerWound(timer, tg, board)
          }
        })
      }
    }
  }

  updateWound(dt: number) {
    if (this.woundCooldown - dt <= 0) {
      this.wound = false
    } else {
      this.woundCooldown = this.woundCooldown - dt
    }
  }

  triggerBrightPowder(timer: number) {
    if (!this.brightPowder) {
      this.brightPowder = true
      this.brightPowderCooldown = timer
    }
  }

  updateBrightPowder(dt: number, pokemon: PokemonEntity, board: Board) {
    if (this.brightPowderCooldown - dt <= 0) {
      this.brightPowder = false
      const cells = board.getAdjacentCells(pokemon.positionX, pokemon.positionY)

      let c = 1
      cells.forEach((cell) => {
        if (cell.value && pokemon.team !== cell.value.team && c > 0) {
          cell.value.handleAttackSpeed(-30)
          cell.value.count.brightPowderCount++
          c--
        }
      })

      if (pokemon.items.has(Item.BRIGHT_POWDER)) {
        pokemon.status.triggerBrightPowder(4000)
        pokemon.count.brightPowderCount++
      }
    } else {
      this.brightPowderCooldown = this.brightPowderCooldown - dt
    }
  }

  triggerSmoke(timer: number, pkm: PokemonEntity) {
    if (!this.smoke && !pkm.items.has(Item.FLUFFY_TAIL)) {
      this.smoke = true
      pkm.handleAttackSpeed(-40)
      this.smokeCooldown = timer
    }
  }

  updateSmoke(dt: number, pkm: PokemonEntity) {
    if (this.smokeCooldown - dt <= 0) {
      this.smoke = false
      pkm.handleAttackSpeed(40)
    } else {
      this.smokeCooldown = this.smokeCooldown - dt
    }
  }

  triggerRuneProtect(timer: number) {
    if (!this.runeProtect) {
      this.runeProtect = true
      this.runeProtectCooldown = timer
    }
  }

  updateRuneProtect(dt: number) {
    if (this.runeProtectCooldown - dt <= 0) {
      this.runeProtect = false
    } else {
      this.runeProtectCooldown = this.runeProtectCooldown - dt
    }
  }
}
