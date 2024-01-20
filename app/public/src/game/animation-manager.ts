/* eslint-disable @typescript-eslint/no-extra-semi */
/* eslint-disable max-len */
import {
  Orientation,
  SpriteType,
  PokemonTint,
  PokemonActionState,
  OrientationFlip,
  Stat
} from "../../../types/enum/Game"
import { AnimationType, AnimationComplete } from "../../../types/Animation"
import { Ability } from "../../../types/enum/Ability"
import Pokemon from "./components/pokemon"
import durations from "../../dist/client/assets/pokemons/durations.json"
import indexList from "../../dist/client/assets/pokemons/indexList.json"
import { logger } from "../../../utils/logger"
import { AnimationConfig, Pkm, PkmIndex } from "../../../types/enum/Pokemon"
import { Effect } from "../../../types/enum/Effect"
import { Berries } from "../../../types/enum/Item"
import { fixedFps } from "../../../utils/number"

export default class AnimationManager {
  game: Phaser.Scene

  constructor(game: Phaser.Scene) {
    this.game = game

    indexList.forEach((index) => {
      const tints = Object.values(PokemonTint) as PokemonTint[]
      tints.forEach((shiny) => {
        const actions: AnimationType[] = [
          AnimationType.Idle,
          AnimationType.Walk,
          AnimationType.Sleep,
          AnimationType.Hop,
          AnimationType.Hurt
        ]

        const conf = (Object.keys(PkmIndex) as Pkm[]).find(
          (p) => index === PkmIndex[p]
        )

        if (conf && AnimationConfig[conf]) {
          if (
            AnimationConfig[conf].shinyUnavailable &&
            shiny === PokemonTint.SHINY
          )
            return
          if (!actions.includes(AnimationConfig[conf as Pkm].attack)) {
            actions.push(AnimationConfig[conf as Pkm].attack)
          }
          if (!actions.includes(AnimationConfig[conf as Pkm].ability)) {
            actions.push(AnimationConfig[conf as Pkm].ability)
          }
          if (!actions.includes(AnimationConfig[conf as Pkm].emote)) {
            actions.push(AnimationConfig[conf as Pkm].emote)
          }
        } else {
          actions.push(AnimationType.Attack)
        }

        //logger.debug(`Init animations: ${index} => ${actions.join(",")}`)

        actions.forEach((action) => {
          const modes = Object.values(SpriteType) as SpriteType[]
          modes.forEach((mode) => {
            const directionArray =
              AnimationComplete[action] === false
                ? [Orientation.DOWN]
                : Object.values(Orientation)
            directionArray.forEach((direction) => {
              const durationArray: number[] =
                durations[`${index}/${shiny}/${action}/${mode}`]
              if (durationArray) {
                const frameArray = this.game.anims.generateFrameNames(index, {
                  start: 0,
                  end: durationArray.length - 1,
                  zeroPad: 4,
                  prefix: `${shiny}/${action}/${mode}/${direction}/`
                })
                for (let i = 0; i < durationArray.length; i++) {
                  if (frameArray[i]) {
                    frameArray[i]["duration"] = durationArray[i] * 10
                  }
                }
                const shouldLoop = [
                  AnimationType.Idle,
                  AnimationType.Sleep,
                  AnimationType.Hop
                ].includes(action)

                this.game.anims.create({
                  key: `${index}/${shiny}/${action}/${mode}/${direction}`,
                  frames: frameArray,
                  repeat: shouldLoop ? -1 : 0
                })
              } else {
                logger.warn(
                  "duration array missing for",
                  `${index}/${shiny}/${action}/${mode}`
                )
              }
            })
          })
        })
      })
    })
    this.createAttacksAnimations()
    this.createSpecialAttacksAnimations()
    this.createZoneEffectsAnimations()
    this.createMinigameAnimations()
    this.createEnvironmentAnimations()
    createStatusAnimations(this.game)
  }

  createSpecialAttacksAnimations() {
    this.game.anims.create({
      key: Ability.COSMIC_POWER,
      frames: this.game.anims.generateFrameNames("COSMIC_POWER", {
        start: 0,
        end: 29,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.SOFT_BOILED,
      frames: this.game.anims.generateFrameNames("SOFT_BOILED", {
        start: 0,
        end: 28,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.DYNAMIC_PUNCH,
      frames: this.game.anims.generateFrameNames("pmd-replace", {
        start: 0,
        end: 12,
        zeroPad: 3,
        prefix: `${Ability.DYNAMIC_PUNCH}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.CORRUPTED_NATURE,
      frames: this.game.anims.generateFrameNames("pmd-replace", {
        start: 0,
        end: 45,
        zeroPad: 3,
        prefix: `${Ability.CORRUPTED_NATURE}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.CRABHAMMER,
      frames: this.game.anims.generateFrameNames("pmd-replace", {
        start: 0,
        end: 5,
        zeroPad: 3,
        prefix: `${Ability.CRABHAMMER}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.DIAMOND_STORM,
      frames: this.game.anims.generateFrameNames("pmd-replace", {
        start: 0,
        end: 16,
        zeroPad: 3,
        prefix: `${Ability.DIAMOND_STORM}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.DRACO_ENERGY,
      frames: this.game.anims.generateFrameNames("pmd-replace", {
        start: 0,
        end: 13,
        zeroPad: 3,
        prefix: `${Ability.DRACO_ENERGY}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.DYNAMAX_CANNON,
      frames: this.game.anims.generateFrameNames("pmd-replace", {
        start: 0,
        end: 38,
        zeroPad: 3,
        prefix: `${Ability.DYNAMAX_CANNON}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.ELECTRO_BOOST,
      frames: this.game.anims.generateFrameNames("pmd-replace", {
        start: 3,
        end: 32,
        zeroPad: 3,
        prefix: `${Ability.ELECTRO_BOOST}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.ELECTRO_WEB,
      frames: this.game.anims.generateFrameNames("pmd-replace", {
        start: 0,
        end: 10,
        zeroPad: 3,
        prefix: `${Ability.ELECTRO_WEB}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.FIRE_TRICK,
      frames: this.game.anims.generateFrameNames("pmd-replace", {
        start: 0,
        end: 11,
        zeroPad: 3,
        prefix: `${Ability.FIRE_TRICK}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.FLAME_CHARGE,
      frames: this.game.anims.generateFrameNames("pmd-replace", {
        start: 0,
        end: 40,
        zeroPad: 3,
        prefix: `${Ability.FLAME_CHARGE}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.LEECH_SEED,
      frames: this.game.anims.generateFrameNames("pmd-replace", {
        start: 0,
        end: 10,
        zeroPad: 3,
        prefix: `${Ability.LEECH_SEED}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.LOCK_ON,
      frames: this.game.anims.generateFrameNames("pmd-replace", {
        start: 0,
        end: 25,
        zeroPad: 3,
        prefix: `${Ability.LOCK_ON}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.PSYCH_UP,
      frames: this.game.anims.generateFrameNames("pmd-replace", {
        start: 0,
        end: 26,
        zeroPad: 3,
        prefix: `${Ability.PSYCH_UP}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.MAGIC_POWDER,
      frames: this.game.anims.generateFrameNames(Ability.MAGIC_POWDER, {
        start: 0,
        end: 7,
        prefix: `magic-powder-`,
        suffix: ".png"
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.RAZOR_WIND,
      frames: this.game.anims.generateFrameNames("pmd-replace", {
        start: 0,
        end: 7,
        zeroPad: 3,
        prefix: `${Ability.RAZOR_WIND}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.TWISTING_NETHER,
      frames: this.game.anims.generateFrameNames("pmd-replace", {
        start: 0,
        end: 59,
        zeroPad: 3,
        prefix: `${Ability.TWISTING_NETHER}/`
      }),
      duration: 2000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.FIRE_BLAST,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 16,
        zeroPad: 3,
        prefix: `${Ability.FIRE_BLAST}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.SEISMIC_TOSS,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 5,
        zeroPad: 3,
        prefix: `${Ability.SEISMIC_TOSS}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.GUILLOTINE,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 5,
        zeroPad: 3,
        prefix: `${Ability.GUILLOTINE}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.ROCK_SLIDE,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 78,
        zeroPad: 3,
        prefix: `${Ability.ROCK_SLIDE}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.HEAT_WAVE,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 49,
        zeroPad: 3,
        prefix: `${Ability.HEAT_WAVE}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.THUNDER,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 8,
        zeroPad: 3,
        prefix: `${Ability.THUNDER}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.HYDRO_PUMP,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 19,
        zeroPad: 3,
        prefix: `${Ability.HYDRO_PUMP}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.DRACO_METEOR,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 32,
        zeroPad: 3,
        prefix: `${Ability.DRACO_METEOR}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.BLAZE_KICK,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 14,
        zeroPad: 3,
        prefix: `${Ability.BLAZE_KICK}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.WISH,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 14,
        zeroPad: 3,
        prefix: `${Ability.WISH}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.CALM_MIND,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 37,
        zeroPad: 3,
        prefix: `${Ability.CALM_MIND}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.DEFENSE_CURL,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 17,
        zeroPad: 3,
        prefix: `${Ability.DEFENSE_CURL}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.METRONOME,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 36,
        zeroPad: 3,
        prefix: `${Ability.METRONOME}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.SOAK,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 42,
        zeroPad: 3,
        prefix: `${Ability.SOAK}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.BLAST_BURN,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 14,
        zeroPad: 3,
        prefix: `${Ability.BLAST_BURN}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.CHARGE,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 7,
        zeroPad: 3,
        prefix: `${Ability.CHARGE}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.DISCHARGE,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 3,
        zeroPad: 3,
        prefix: `${Ability.DISCHARGE}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.BITE,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 11,
        zeroPad: 3,
        prefix: `${Ability.BITE}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.DRAGON_TAIL,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 23,
        zeroPad: 3,
        prefix: `${Ability.DRAGON_TAIL}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.DRAGON_BREATH,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 9,
        zeroPad: 3,
        prefix: `${Ability.DRAGON_BREATH}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.ICICLE_CRASH,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 26,
        zeroPad: 3,
        prefix: `${Ability.ICICLE_CRASH}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.ROOT,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 45,
        zeroPad: 3,
        prefix: `${Ability.ROOT}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.TORMENT,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 19,
        zeroPad: 3,
        prefix: `${Ability.TORMENT}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.STOMP,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 9,
        zeroPad: 3,
        prefix: `${Ability.STOMP}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.PAYBACK,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 18,
        zeroPad: 3,
        prefix: `${Ability.PAYBACK}/`
      }),
      duration: 1000,
      repeat: 0
    })

    /*this.game.anims.create({
      key: Ability.WONDER_ROOM,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 4,
        zeroPad: 3,
        prefix: `${Ability.WONDER_ROOM}/`
      }),
      duration: 1000,
      repeat: 0
    })*/

    this.game.anims.create({
      key: Ability.BUG_BUZZ,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 28,
        zeroPad: 3,
        prefix: `${Ability.BUG_BUZZ}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.VENOSHOCK,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 12,
        zeroPad: 3,
        prefix: `${Ability.VENOSHOCK}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.LEECH_LIFE,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 19,
        zeroPad: 3,
        prefix: `${Ability.LEECH_LIFE}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.HAPPY_HOUR,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 20,
        zeroPad: 3,
        prefix: `${Ability.HAPPY_HOUR}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.TELEPORT,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 5,
        zeroPad: 3,
        prefix: `${Ability.TELEPORT}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.NASTY_PLOT,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 5,
        zeroPad: 3,
        prefix: `${Ability.NASTY_PLOT}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.THIEF,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 7,
        zeroPad: 3,
        prefix: `${Ability.THIEF}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.STUN_SPORE,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 21,
        zeroPad: 3,
        prefix: `${Ability.STUN_SPORE}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.METEOR_MASH,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 35,
        zeroPad: 3,
        prefix: `${Ability.METEOR_MASH}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.HURRICANE,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 51,
        zeroPad: 3,
        prefix: `${Ability.HURRICANE}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.IRON_TAIL,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 6,
        zeroPad: 3,
        prefix: `${Ability.IRON_TAIL}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.ROAR_OF_TIME,
      frames: this.game.anims.generateFrameNames("ROAR_OF_TIME", {
        start: 0,
        end: 27,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.ROCK_TOMB,
      frames: this.game.anims.generateFrameNames("ROCK_TOMB", {
        start: 0,
        end: 21,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.ROCK_SMASH,
      frames: this.game.anims.generateFrameNames("ROCK_SMASH", {
        start: 0,
        end: 8,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.VOLT_SWITCH,
      frames: this.game.anims.generateFrameNames(Ability.VOLT_SWITCH, {
        start: 0,
        end: 6
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.STEAM_ERUPTION,
      frames: this.game.anims.generateFrameNames(Ability.STEAM_ERUPTION, {
        start: 0,
        end: 10,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.ICY_WIND,
      frames: this.game.anims.generateFrameNames(Ability.ICY_WIND, {
        start: 0,
        end: 3,
        zeroPad: 3
      }),
      duration: 300,
      repeat: 4
    })

    this.game.anims.create({
      key: Ability.APPLE_ACID,
      frames: this.game.anims.generateFrameNames(Ability.APPLE_ACID, {
        start: 0,
        end: 3,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.PSYCHIC_FANGS,
      frames: this.game.anims.generateFrameNames(Ability.PSYCHIC_FANGS, {
        start: 0,
        end: 30
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.WHIRLWIND,
      frames: this.game.anims.generateFrameNames(Ability.WHIRLWIND, {
        start: 0,
        end: 51
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.EMPTY_LIGHT,
      frames: this.game.anims.generateFrameNames(Ability.EMPTY_LIGHT, {
        start: 0,
        end: 31
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.AIR_SLASH,
      frames: this.game.anims.generateFrameNames(Ability.AIR_SLASH, {
        start: 0,
        end: 7
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.VINE_WHIP,
      frames: this.game.anims.generateFrameNames(Ability.VINE_WHIP, {
        start: 0,
        end: 8
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.WHEEL_OF_FIRE,
      frames: this.game.anims.generateFrameNames(Ability.WHEEL_OF_FIRE, {
        start: 0,
        end: 4
      }),
      duration: 250,
      repeat: 1
    })

    this.game.anims.create({
      key: Ability.INFERNAL_PARADE,
      frames: this.game.anims.generateFrameNames(Ability.INFERNAL_PARADE, {
        start: 0,
        end: 4
      }),
      duration: 250,
      repeat: 1
    })

    this.game.anims.create({
      key: "FLAME_HIT",
      frames: this.game.anims.generateFrameNames("FLAME_HIT", {
        start: 0,
        end: 11
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.BARB_BARRAGE,
      frames: this.game.anims.generateFrameNames(Ability.BARB_BARRAGE, {
        start: 0,
        end: 6
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.OUTRAGE,
      frames: this.game.anims.generateFrameNames(Ability.OUTRAGE, {
        start: 0,
        end: 12,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.KNOCK_OFF,
      frames: this.game.anims.generateFrameNames(Ability.KNOCK_OFF, {
        start: 0,
        end: 9
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.SLASH,
      frames: this.game.anims.generateFrameNames(Ability.SLASH, {
        start: 0,
        end: 3
      }),
      duration: 400,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.EGGSPLOSION,
      frames: this.game.anims.generateFrameNames(Ability.EGGSPLOSION, {
        start: 0,
        end: 15
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.POPULATION_BOMB,
      frames: this.game.anims.generateFrameNames(Ability.POPULATION_BOMB, {
        start: 0,
        end: 10
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.SCREECH,
      frames: this.game.anims.generateFrameNames(Ability.SCREECH, {
        start: 0,
        end: 6
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.SAND_TOMB,
      frames: this.game.anims.generateFrameNames(Ability.SAND_TOMB, {
        start: 0,
        end: 6
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.NIGHT_SHADE,
      frames: this.game.anims.generateFrameNames(Ability.NIGHT_SHADE, {
        start: 0,
        end: 33
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.NATURAL_GIFT,
      frames: this.game.anims.generateFrameNames(Ability.NATURAL_GIFT, {
        start: 0,
        end: 44
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.PRISMATIC_LASER,
      frames: this.game.anims.generateFrameNames(Ability.PRISMATIC_LASER, {
        start: 0,
        end: 8,
        zeroPad: 3
      }),
      duration: 500,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.MAGICAL_LEAF,
      frames: this.game.anims.generateFrameNames(Ability.MAGICAL_LEAF, {
        start: 0,
        end: 8
      }),
      duration: 500,
      repeat: 0
    })

    this.game.anims.create({
      key: "MAGICAL_LEAF_CHARGE",
      frames: this.game.anims.generateFrameNames("MAGICAL_LEAF_CHARGE", {
        start: 0,
        end: 26
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.BRAVE_BIRD,
      frames: this.game.anims.generateFrameNames(Ability.BRAVE_BIRD, {
        start: 0,
        end: 6,
        zeroPad: 3
      }),
      duration: 600,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.AQUA_RING,
      frames: this.game.anims.generateFrameNames(Ability.AQUA_RING, {
        start: 0,
        end: 20,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.FISSURE,
      frames: this.game.anims.generateFrameNames(Ability.FISSURE, {
        start: 0,
        end: 3,
        zeroPad: 3
      }),
      duration: 200,
      repeat: 7
    })

    this.game.anims.create({
      key: Ability.ASSURANCE,
      frames: this.game.anims.generateFrameNames(Ability.ASSURANCE, {
        start: 0,
        end: 20,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.CLOSE_COMBAT,
      frames: this.game.anims.generateFrameNames(Ability.CLOSE_COMBAT, {
        start: 0,
        end: 6,
        zeroPad: 3
      }),
      duration: 500,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.TEETER_DANCE,
      frames: this.game.anims.generateFrameNames(Ability.TEETER_DANCE, {
        start: 0,
        end: 41,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.SUPER_FANG,
      frames: this.game.anims.generateFrameNames(Ability.SUPER_FANG, {
        start: 0,
        end: 3,
        zeroPad: 3
      }),
      duration: 500,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.PARABOLIC_CHARGE,
      frames: this.game.anims.generateFrameNames(Ability.PARABOLIC_CHARGE, {
        start: 0,
        end: 12,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.PLAY_ROUGH,
      frames: this.game.anims.generateFrameNames(Ability.PLAY_ROUGH, {
        start: 0,
        end: 22,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.WATER_PULSE,
      frames: this.game.anims.generateFrameNames(Ability.WATER_PULSE, {
        start: 0,
        end: 21,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.AERIAL_ACE,
      frames: this.game.anims.generateFrameNames(Ability.AERIAL_ACE, {
        start: 0,
        end: 3,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.ATTRACT,
      frames: this.game.anims.generateFrameNames(Ability.ATTRACT, {
        start: 0,
        end: 43,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.PSYCHIC,
      frames: this.game.anims.generateFrameNames(Ability.PSYCHIC, {
        start: 0,
        end: 16,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.PSYBEAM,
      frames: this.game.anims.generateFrameNames(Ability.PSYBEAM, {
        start: 0,
        end: 14,
        zeroPad: 3
      }),
      duration: 600,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.ANCHOR_SHOT,
      frames: this.game.anims.generateFrameNames(Ability.ANCHOR_SHOT, {
        start: 0,
        end: 34,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.HYPERSPACE_FURY,
      frames: this.game.anims.generateFrameNames(Ability.ANCHOR_SHOT, {
        start: 15,
        end: 34,
        zeroPad: 3
      }),
      duration: 500,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.LEAF_BLADE,
      frames: this.game.anims.generateFrameNames(Ability.LEAF_BLADE, {
        start: 0,
        end: 25,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.PRESENT,
      frames: this.game.anims.generateFrameNames(Ability.PRESENT, {
        start: 0,
        end: 20,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.WHIRLPOOL,
      frames: this.game.anims.generateFrameNames(Ability.WHIRLPOOL, {
        start: 0,
        end: 10,
        zeroPad: 3
      }),
      duration: 500,
      repeat: 1
    })

    this.game.anims.create({
      key: Ability.PYRO_BALL,
      frames: this.game.anims.generateFrameNames(Ability.PYRO_BALL, {
        start: 0,
        end: 3,
        zeroPad: 3
      }),
      duration: 200,
      repeat: -1
    })

    this.game.anims.create({
      key: Ability.WATERFALL,
      frames: this.game.anims.generateFrameNames(Ability.WATERFALL, {
        start: 0,
        end: 7,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.HELPING_HAND,
      frames: this.game.anims.generateFrameNames(Ability.HELPING_HAND, {
        start: 0,
        end: 13,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.MUD_BUBBLE,
      frames: this.game.anims.generateFrameNames(Ability.MUD_BUBBLE, {
        start: 0,
        end: 5,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.ERUPTION,
      frames: this.game.anims.generateFrameNames(Ability.ERUPTION, {
        start: 0,
        end: 10,
        zeroPad: 3
      }),
      duration: 500,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.SLASHING_CLAW,
      frames: this.game.anims.generateFrameNames(Ability.SLASHING_CLAW, {
        start: 0,
        end: 13,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.MAGMA_STORM,
      frames: this.game.anims.generateFrameNames(Ability.MAGMA_STORM, {
        start: 0,
        end: 6,
        zeroPad: 3
      }),
      duration: 800,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.SOLAR_BEAM,
      frames: this.game.anims.generateFrameNames(Ability.SOLAR_BEAM, {
        start: 0,
        end: 3,
        zeroPad: 3
      }),
      duration: 120,
      repeat: 4
    })

    this.game.anims.create({
      key: Ability.THRASH,
      frames: this.game.anims.generateFrameNames(Ability.THRASH, {
        start: 0,
        end: 6,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.ROLLOUT,
      frames: this.game.anims.generateFrameNames(Ability.ROLLOUT, {
        start: 0,
        end: 6,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.ABSORB,
      frames: this.game.anims.generateFrameNames(Ability.ABSORB, {
        start: 0,
        end: 2,
        zeroPad: 3
      }),
      duration: 600,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.ACROBATICS,
      frames: this.game.anims.generateFrameNames(Ability.ACROBATICS, {
        start: 0,
        end: 3,
        zeroPad: 3
      }),
      duration: 300,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.GIGATON_HAMMER,
      frames: this.game.anims.generateFrameNames(Ability.GIGATON_HAMMER, {
        start: 0,
        end: 3,
        zeroPad: 3
      }),
      duration: 200,
      repeat: 4
    })

    this.game.anims.create({
      key: Ability.COUNTER,
      frames: this.game.anims.generateFrameNames(Ability.COUNTER, {
        start: 0,
        end: 11,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.HEX,
      frames: this.game.anims.generateFrameNames(Ability.HEX, {
        start: 0,
        end: 19,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.SPECTRAL_THIEF,
      frames: this.game.anims.generateFrameNames(Ability.SPECTRAL_THIEF, {
        start: 0,
        end: 11,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.ASTRAL_BARRAGE,
      frames: this.game.anims.generateFrameNames(Ability.ASTRAL_BARRAGE, {
        start: 0,
        end: 2,
        zeroPad: 3
      }),
      duration: 150,
      repeat: -1
    })

    this.game.anims.create({
      key: Ability.PLASMA_FIST,
      frames: this.game.anims.generateFrameNames(Ability.PLASMA_FIST, {
        start: 0,
        end: 5,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.SACRED_SWORD,
      frames: this.game.anims.generateFrameNames(Ability.SACRED_SWORD, {
        start: 0,
        end: 30,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.JUDGEMENT,
      frames: this.game.anims.generateFrameNames(Ability.JUDGEMENT, {
        start: 0,
        end: 30,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.SHADOW_SNEAK,
      frames: this.game.anims.generateFrameNames(Ability.SHADOW_SNEAK, {
        start: 0,
        end: 31,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.DIVE,
      frames: this.game.anims.generateFrameNames(Ability.DIVE, {
        start: 0,
        end: 6,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.SMOKE_SCREEN,
      frames: this.game.anims.generateFrameNames(Ability.SMOKE_SCREEN, {
        start: 0,
        end: 11,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.LIQUIDATION,
      frames: this.game.anims.generateFrameNames(Ability.LIQUIDATION, {
        start: 0,
        end: 17,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.FISHIOUS_REND,
      frames: this.game.anims.generateFrameNames(Ability.LIQUIDATION, {
        start: 0,
        end: 4,
        zeroPad: 3
      }),
      duration: 200,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.GOLD_RUSH,
      frames: this.game.anims.generateFrameNames(Ability.GOLD_RUSH, {
        start: 0,
        end: 11
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.POLTERGEIST,
      frames: this.game.anims.generateFrameNames(Ability.POLTERGEIST, {
        start: 0,
        end: 7
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.PAYDAY,
      frames: this.game.anims.generateFrameNames(Ability.PAYDAY, {
        start: 0,
        end: 80,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.SHADOW_CLONE,
      frames: this.game.anims.generateFrameNames(Ability.SHADOW_CLONE, {
        start: 0,
        end: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.HYPER_VOICE,
      frames: this.game.anims.generateFrameNames(Ability.HYPER_VOICE, {
        start: 0,
        end: 3
      }),
      duration: 300,
      repeat: 3
    })

    this.game.anims.create({
      key: Ability.PETAL_DANCE,
      frames: this.game.anims.generateFrameNames(Ability.PETAL_DANCE, {
        start: 0,
        end: 53,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.ECHO,
      frames: this.game.anims.generateFrameNames(Ability.ECHO, {
        start: 0,
        end: 22,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.EXPLOSION,
      frames: this.game.anims.generateFrameNames(Ability.EXPLOSION, {
        start: 0,
        end: 22,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.SHADOW_BALL,
      frames: this.game.anims.generateFrameNames(Ability.SHADOW_BALL, {
        start: 0,
        end: 39,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.SPIKE_ARMOR,
      frames: this.game.anims.generateFrameNames(Ability.SPIKE_ARMOR, {
        start: 0,
        end: 13,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: -1
    })

    this.game.anims.create({
      key: Ability.MAGIC_BOUNCE,
      frames: this.game.anims.generateFrameNames(Ability.MAGIC_BOUNCE, {
        start: 0,
        end: 13,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: -1
    })

    this.game.anims.create({
      key: Ability.SEED_FLARE,
      frames: this.game.anims.generateFrameNames(Ability.SEED_FLARE, {
        start: 0,
        end: 30,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.ORIGIN_PULSE,
      frames: this.game.anims.generateFrameNames(Ability.ORIGIN_PULSE, {
        start: 0,
        end: 3,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: -1,
      yoyo: true
    })

    this.game.anims.create({
      key: Ability.SONG_OF_DESIRE,
      frames: this.game.anims.generateFrameNames(Ability.SONG_OF_DESIRE, {
        start: 0,
        end: 41,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.CONFUSING_MIND,
      frames: this.game.anims.generateFrameNames(Ability.CONFUSING_MIND, {
        start: 0,
        end: 36,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.BONEMERANG,
      frames: this.game.anims.generateFrameNames(Ability.BONEMERANG, {
        start: 0,
        end: 7,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 3
    })

    this.game.anims.create({
      key: Ability.GROWL,
      frames: this.game.anims.generateFrameNames(Ability.GROWL, {
        start: 0,
        end: 19,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.HIGH_JUMP_KICK,
      frames: this.game.anims.generateFrameNames(Ability.HIGH_JUMP_KICK, {
        start: 0,
        end: 20,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.TRI_ATTACK,
      frames: this.game.anims.generateFrameNames(Ability.TRI_ATTACK, {
        start: 0,
        end: 10,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.BLUE_FLARE,
      frames: this.game.anims.generateFrameNames(Ability.BLUE_FLARE, {
        start: 0,
        end: 14,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.FUSION_BOLT,
      frames: this.game.anims.generateFrameNames(Ability.FUSION_BOLT, {
        start: 0,
        end: 12,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.CHATTER,
      frames: this.game.anims.generateFrameNames(Ability.CHATTER, {
        start: 0,
        end: 25,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.DISARMING_VOICE,
      frames: this.game.anims.generateFrameNames(Ability.DISARMING_VOICE, {
        start: 0,
        end: 38,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.RELIC_SONG,
      frames: this.game.anims.generateFrameNames(Ability.RELIC_SONG, {
        start: 0,
        end: 34,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.CLANGOROUS_SOUL,
      frames: this.game.anims.generateFrameNames(Ability.CLANGOROUS_SOUL, {
        start: 0,
        end: 17,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.EARTHQUAKE,
      frames: this.game.anims.generateFrameNames(Ability.EARTHQUAKE, {
        start: 0,
        end: 10,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.AQUA_JET,
      frames: this.game.anims.generateFrameNames(Ability.AQUA_JET, {
        start: 0,
        end: 19,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.MIND_BLOWN,
      frames: this.game.anims.generateFrameNames(Ability.MIND_BLOWN, {
        start: 0,
        end: 12,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.FUTURE_SIGHT,
      frames: this.game.anims.generateFrameNames(Ability.FUTURE_SIGHT, {
        start: 0,
        end: 10,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.SMOG,
      frames: this.game.anims.generateFrameNames(Ability.SMOG, {
        start: 0,
        end: 8,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.AURORA_BEAM,
      frames: this.game.anims.generateFrameNames(Ability.AURORA_BEAM, {
        start: 0,
        end: 6,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 3
    })

    this.game.anims.create({
      key: "HEAL_ORDER",
      frames: this.game.anims.generateFrameNames("HEAL_ORDER", {
        start: 0,
        end: 35,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: "ATTACK_ORDER",
      frames: this.game.anims.generateFrameNames("ATTACK_ORDER", {
        start: 0,
        end: 28,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.SHELL_TRAP,
      frames: this.game.anims.generateFrameNames(Ability.SHELL_TRAP, {
        start: 0,
        end: 7,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.STEALTH_ROCKS,
      frames: this.game.anims.generateFrameNames(Ability.STEALTH_ROCKS, {
        start: 0,
        end: 13,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: "MIND_BLOWN_SELF",
      frames: this.game.anims.generateFrameNames("MIND_BLOWN_SELF", {
        start: 0,
        end: 11,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: "FIELD_DEATH",
      frames: this.game.anims.generateFrameNames("FIELD_DEATH", {
        start: 0,
        end: 8,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: "FAIRY_CRIT",
      frames: this.game.anims.generateFrameNames("FAIRY_CRIT", {
        start: 0,
        end: 14,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.HEAD_SMASH,
      frames: this.game.anims.generateFrameNames("specials", {
        start: 0,
        end: 78,
        zeroPad: 3,
        prefix: `${Ability.ROCK_SLIDE}/`
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: "ground-grow",
      frames: this.game.anims.generateFrameNames("attacks", {
        start: 0,
        end: 56,
        zeroPad: 3,
        prefix: "GROUND/cell/"
      }),
      duration: 800,
      repeat: 0
    })

    this.game.anims.create({
      key: "INCENSE_DAMAGE",
      frames: this.game.anims.generateFrameNames("INCENSE_DAMAGE", {
        start: 0,
        end: 6,
        zeroPad: 3
      }),
      duration: 500,
      repeat: 0
    })

    this.game.anims.create({
      key: "STATIC",
      frames: this.game.anims.generateFrameNames("STATIC", {
        start: 0,
        end: 13,
        zeroPad: 3
      }),
      duration: 500,
      repeat: 0
    })

    this.game.anims.create({
      key: "BRIGHT_POWDER",
      frames: this.game.anims.generateFrameNames("BRIGHT_POWDER", {
        start: 0,
        end: 18,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: "AURASPHERE",
      frames: this.game.anims.generateFrameNames("AURASPHERE", {
        start: 0,
        end: 11,
        zeroPad: 3
      }),
      duration: 600,
      repeat: -1
    })
  }

  createZoneEffectsAnimations() {
    this.game.anims.create({
      key: Effect.GAS,
      frames: this.game.anims.generateFrameNames(Effect.GAS, {
        start: 0,
        end: 3,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: -1
    })
  }

  createAttacksAnimations() {
    this.game.anims.create({
      key: "GRASS/range",
      frames: this.game.anims.generateFrameNames("attacks", {
        start: 0,
        end: 10,
        zeroPad: 3,
        prefix: "GRASS/range/"
      }),
      duration: 1000,
      repeat: -1
    })

    this.game.anims.create({
      key: "GRASS/melee",
      frames: this.game.anims.generateFrameNames("attacks", {
        start: 0,
        end: 25,
        zeroPad: 3,
        prefix: "GRASS/melee/"
      }),
      duration: 1000,
      repeat: -1
    })

    this.game.anims.create({
      key: "WATER/range",
      frames: this.game.anims.generateFrameNames("attacks", {
        start: 0,
        end: 18,
        zeroPad: 3,
        prefix: "WATER/range/"
      }),
      duration: 1000,
      repeat: -1
    })

    this.game.anims.create({
      key: "WATER/melee",
      frames: this.game.anims.generateFrameNames("attacks", {
        start: 0,
        end: 7,
        zeroPad: 3,
        prefix: "WATER/melee/"
      }),
      duration: 1000,
      repeat: -1
    })

    this.game.anims.create({
      key: "FIRE/melee",
      frames: this.game.anims.generateFrameNames("attacks", {
        start: 0,
        end: 8,
        zeroPad: 3,
        prefix: "FIRE/melee/"
      }),
      duration: 1000,
      repeat: -1
    })

    this.game.anims.create({
      key: "FIRE/range",
      frames: this.game.anims.generateFrameNames("attacks", {
        start: 0,
        end: 30,
        zeroPad: 3,
        prefix: "FIRE/range/"
      }),
      duration: 1000,
      repeat: -1
    })

    this.game.anims.create({
      key: "ROCK/melee",
      frames: this.game.anims.generateFrameNames("attacks", {
        start: 0,
        end: 10,
        zeroPad: 3,
        prefix: "ROCK/melee/"
      }),
      duration: 1000,
      repeat: -1
    })

    this.game.anims.create({
      key: "FIGHTING/melee",
      frames: this.game.anims.generateFrameNames("attacks", {
        start: 0,
        end: 12,
        zeroPad: 3,
        prefix: "FIGHTING/melee/"
      }),
      duration: 1000,
      repeat: -1
    })

    this.game.anims.create({
      key: "FIGHTING/range",
      frames: this.game.anims.generateFrameNames("attacks", {
        start: 9,
        end: 37,
        zeroPad: 3,
        prefix: "FIGHTING/range/"
      }),
      duration: 1000,
      repeat: -1
    })

    this.game.anims.create({
      key: "DRAGON/melee",
      frames: this.game.anims.generateFrameNames("attacks", {
        start: 0,
        end: 10,
        zeroPad: 3,
        prefix: "DRAGON/melee/"
      }),
      duration: 1000,
      repeat: -1
    })

    this.game.anims.create({
      key: "NORMAL/melee",
      frames: this.game.anims.generateFrameNames("attacks", {
        start: 0,
        end: 7,
        zeroPad: 3,
        prefix: "NORMAL/melee/"
      }),
      duration: 1000,
      repeat: -1
    })

    this.game.anims.create({
      key: "DRAGON/range",
      frames: this.game.anims.generateFrameNames("attacks", {
        start: 0,
        end: 35,
        zeroPad: 3,
        prefix: "DRAGON/range/"
      }),
      duration: 1000,
      repeat: -1
    })

    this.game.anims.create({
      key: "POISON/range",
      frames: this.game.anims.generateFrameNames("attacks", {
        start: 0,
        end: 27,
        zeroPad: 3,
        prefix: "POISON/range/"
      }),
      duration: 1000,
      repeat: -1
    })

    this.game.anims.create({
      key: "POISON/melee",
      frames: this.game.anims.generateFrameNames("attacks", {
        start: 0,
        end: 12,
        zeroPad: 3,
        prefix: "POISON/melee/"
      }),
      duration: 1000,
      repeat: -1
    })

    this.game.anims.create({
      key: "ELECTRIC/melee",
      frames: this.game.anims.generateFrameNames("attacks", {
        start: 0,
        end: 3,
        zeroPad: 3,
        prefix: "ELECTRIC/melee/"
      }),
      duration: 1000,
      repeat: -1
    })

    this.game.anims.create({
      key: "GHOST/range",
      frames: this.game.anims.generateFrameNames("attacks", {
        start: 0,
        end: 23,
        zeroPad: 3,
        prefix: "GHOST/range/"
      }),
      duration: 1000,
      repeat: -1
    })

    this.game.anims.create({
      key: "PSYCHIC/range",
      frames: this.game.anims.generateFrameNames("attacks", {
        start: 0,
        end: 38,
        zeroPad: 3,
        prefix: "PSYCHIC/range/"
      }),
      duration: 1000,
      repeat: -1
    })

    this.game.anims.create({
      key: "ELECTRIC/range",
      frames: this.game.anims.generateFrameNames("attacks", {
        start: 0,
        end: 5,
        zeroPad: 3,
        prefix: "ELECTRIC/range/"
      }),
      duration: 1000,
      repeat: -1
    })

    this.game.anims.create({
      key: "FAIRY/melee",
      frames: this.game.anims.generateFrameNames("attacks", {
        start: 0,
        end: 25,
        zeroPad: 3,
        prefix: "FAIRY/melee/"
      }),
      duration: 1000,
      repeat: -1
    })

    this.game.anims.create({
      key: "FAIRY/range",
      frames: this.game.anims.generateFrameNames("attacks", {
        start: 0,
        end: 13,
        zeroPad: 3,
        prefix: "FAIRY/range/"
      }),
      duration: 1000,
      repeat: -1
    })

    this.game.anims.create({
      key: "FLYING/melee",
      frames: this.game.anims.generateFrameNames("attacks", {
        start: 0,
        end: 24,
        zeroPad: 3,
        prefix: "FLYING/melee/"
      }),
      duration: 1000,
      repeat: -1
    })

    this.game.anims.create({
      key: "FLYING/range",
      frames: this.game.anims.generateFrameNames("attacks", {
        start: 0,
        end: 7,
        zeroPad: 3,
        prefix: "FLYING/range/"
      }),
      duration: 1000,
      repeat: -1
    })

    this.game.anims.create({
      key: "BUG/melee",
      frames: this.game.anims.generateFrameNames("attacks", {
        start: 0,
        end: 15,
        zeroPad: 3,
        prefix: "BUG/melee/"
      }),
      duration: 1000,
      repeat: -1
    })

    this.game.anims.create({
      key: "ICE/melee",
      frames: this.game.anims.generateFrameNames("attacks", {
        start: 0,
        end: 8,
        zeroPad: 3,
        prefix: "ICE/melee/"
      }),
      duration: 1000,
      repeat: -1
    })

    this.game.anims.create({
      key: "ICE/range",
      frames: this.game.anims.generateFrameNames("ICE_RANGE", {
        start: 0,
        end: 13,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: -1
    })

    this.game.anims.create({
      key: "STEEL/melee",
      frames: this.game.anims.generateFrameNames("STEEL/melee", {
        start: 0,
        end: 7,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: -1
    })

    this.game.anims.create({
      key: "WATER/cell",
      frames: this.game.anims.generateFrameNames("attacks", {
        start: 0,
        end: 6,
        zeroPad: 3,
        prefix: "WATER/cell/"
      }),
      duration: 200,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.FAKE_TEARS,
      frames: this.game.anims.generateFrameNames(Ability.FAKE_TEARS, {
        start: 0,
        end: 17,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.SPARKLING_ARIA,
      frames: this.game.anims.generateFrameNames(Ability.SPARKLING_ARIA, {
        start: 0,
        end: 43,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.SKY_ATTACK,
      frames: this.game.anims.generateFrameNames(Ability.SKY_ATTACK, {
        start: 0,
        end: 5,
        zeroPad: 3
      }),
      duration: 500,
      repeat: 2
    })

    this.game.anims.create({
      key: Ability.ILLUSION,
      frames: this.game.anims.generateFrameNames(Ability.ILLUSION, {
        start: 0,
        end: 14,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.SPIRIT_SHACKLE,
      frames: this.game.anims.generateFrameNames(Ability.SPIRIT_SHACKLE, {
        start: 0,
        end: 3,
        zeroPad: 3
      }),
      duration: 160,
      repeat: -1
    })

    this.game.anims.create({
      key: Ability.WATER_SHURIKEN,
      frames: this.game.anims.generateFrameNames(Ability.WATER_SHURIKEN, {
        start: 0,
        end: 7,
        zeroPad: 3
      }),
      duration: 333,
      repeat: -1
    })

    this.game.anims.create({
      key: Ability.WONDER_GUARD,
      frames: this.game.anims.generateFrameNames(Ability.WONDER_GUARD, {
        start: 0,
        end: 3,
        zeroPad: 3
      }),
      duration: 250,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.X_SCISSOR,
      frames: this.game.anims.generateFrameNames(Ability.X_SCISSOR, {
        start: 0,
        end: 9,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.GEOMANCY,
      frames: this.game.anims.generateFrameNames(Ability.GEOMANCY, {
        start: 0,
        end: 11,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.DEATH_WING,
      frames: this.game.anims.generateFrameNames(Ability.DEATH_WING, {
        start: 0,
        end: 14,
        zeroPad: 3,
        suffix: ".png"
      }),
      duration: 1000,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.MIST_BALL,
      frames: this.game.anims.generateFrameNames(Ability.MIST_BALL, {
        start: 0,
        end: 4,
        zeroPad: 3
      }),
      yoyo: true,
      duration: 500,
      repeat: 2
    })

    this.game.anims.create({
      key: Ability.LUSTER_PURGE,
      frames: this.game.anims.generateFrameNames(Ability.LUSTER_PURGE, {
        start: 0,
        end: 4,
        zeroPad: 3
      }),
      yoyo: true,
      duration: 500,
      repeat: 2
    })

    this.game.anims.create({
      key: Ability.CRUSH_GRIP,
      frames: this.game.anims.generateFrameNames(Ability.CRUSH_GRIP, {
        start: 0,
        end: 7,
        zeroPad: 3
      }),
      duration: 800,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.OVERDRIVE,
      frames: this.game.anims.generateFrameNames(Ability.OVERDRIVE, {
        start: 0,
        end: 21,
        zeroPad: 3,
        suffix: ".png"
      }),
      duration: fixedFps(22),
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.LINK_CABLE,
      frames: this.game.anims.generateFrameNames(Ability.LINK_CABLE, {
        start: 0,
        end: 4,
        zeroPad: 3
      }),
      duration: 500,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.SNIPE_SHOT + "_shot",
      frames: this.game.anims.generateFrameNames(Ability.SNIPE_SHOT, {
        start: 1,
        end: 4,
        prefix: "shot",
        suffix: ".png"
      }),
      duration: 120,
      repeat: 0
    })

    this.game.anims.create({
      key: Ability.SNIPE_SHOT + "_projectile",
      frames: this.game.anims.generateFrameNames(Ability.SNIPE_SHOT, {
        start: 1,
        end: 3,
        prefix: "projectile",
        suffix: ".png"
      }),
      duration: 150,
      repeat: -1
    })

    this.game.anims.create({
      key: Ability.NIGHT_SLASH,
      frames: this.game.anims.generateFrameNames(Ability.NIGHT_SLASH, {
        start: 0,
        end: 14,
        zeroPad: 3,
        suffix: ".png"
      }),
      duration: fixedFps(15),
      repeat: 0
    })

    this.game.anims.create({
      key: "HIT_NEUTRAL",
      frames: this.game.anims.generateFrameNames("HIT_NEUTRAL", {
        start: 0,
        end: 3,
        zeroPad: 3
      }),
      duration: 300,
      yoyo: true
    })

    this.game.anims.create({
      key: "LIGHT_CELL",
      frames: this.game.anims.generateFrameNames("LIGHT_CELL", {
        start: 0,
        end: 5,
        zeroPad: 3
      }),
      duration: 1000,
      repeat: -1,
      yoyo: true
    })

    const statBoost = [
      Stat.AP,
      Stat.ATK_SPEED,
      Stat.DEF,
      Stat.HP,
      Stat.SHIELD,
      Stat.SPE_DEF,
      Stat.ATK
    ]
    statBoost.forEach((stat) =>
      this.game.anims.create({
        key: `BOOST_${stat}`,
        frames: this.game.anims.generateFrameNames(`BOOST_${stat}`, {
          start: 0,
          end: 12
        }),
        duration: 800
      })
    )
  }

  createMinigameAnimations() {
    this.game.anims.create({
      key: "portal",
      frames: this.game.anims.generateFrameNames("portal", {
        start: 0,
        end: 7,
        zeroPad: 3
      }),
      duration: 600,
      repeat: -1
    })

    this.game.anims.create({
      key: "open_chest",
      frames: this.game.anims.generateFrameNames("chest", {
        start: 1,
        end: 4,
        suffix: ".png"
      }),
      duration: 600,
      repeat: 0
    })

    this.game.anims.create({
      key: "shine",
      frames: this.game.anims.generateFrameNames("shine", {
        start: 0,
        end: 47,
        suffix: ".png"
      }),
      duration: 1000,
      repeat: -1
    })
  }

  createEnvironmentAnimations() {
    Berries.forEach((berryName) => {
      for (let step = 1; step <= 3; step++) {
        this.game.anims.create({
          key: `${berryName}_TREE_STEP_${step}`,
          frames: this.game.anims.generateFrameNames("berry_trees", {
            start: step * 2 - 1,
            end: step * 2,
            prefix: berryName + "_"
          }),
          duration: 600,
          repeat: -1
        })
      }
    })

    this.game.anims.create({
      key: `CROP`,
      frames: this.game.anims.generateFrameNames("berry_trees", {
        start: 1,
        end: 2,
        prefix: "CROP_"
      }),
      duration: 600,
      repeat: -1
    })
  }

  convertPokemonActionStateToAnimationType(
    state: PokemonActionState,
    entity: Pokemon
  ): AnimationType {
    switch (state) {
      case PokemonActionState.HOP:
      case PokemonActionState.FISH:
        return AnimationType.Hop
      case PokemonActionState.HURT:
        return AnimationType.Hurt
      case PokemonActionState.SLEEP:
        return AnimationType.Sleep
      case PokemonActionState.WALK:
        return AnimationType.Walk
      case PokemonActionState.ATTACK:
        return AnimationConfig[entity.name as Pkm].attack
      case PokemonActionState.EMOTE:
        return AnimationConfig[entity.name as Pkm].emote
      case PokemonActionState.IDLE:
      default:
        return AnimationType.Idle
    }
  }

  animatePokemon(entity: Pokemon, action: PokemonActionState, flip: boolean) {
    const animation = this.convertPokemonActionStateToAnimationType(
      action,
      entity
    )

    let lock = false
    let repeat: number | undefined
    if (
      action === PokemonActionState.HOP ||
      action === PokemonActionState.HURT
    ) {
      lock = true
      repeat = -1
    }

    try {
      this.play(entity, animation, { flip, lock, repeat })
    } catch (err) {
      logger.warn(`Can't play animation ${animation} for ${entity.name}`, err)
    }
  }

  play(
    entity: Pokemon,
    animation: AnimationType,
    config: { flip?: boolean; repeat?: number; lock?: boolean } = {}
  ) {
    if (entity.animationLocked) return

    const orientation = config.flip
      ? OrientationFlip[entity.orientation]
      : entity.orientation

    const orientationCorrected =
      AnimationComplete[animation] === true ? orientation : Orientation.DOWN

    const textureIndex =
      entity.scene && entity.scene.textures.exists(entity.index)
        ? entity.index
        : "0000"
    const tint =
      entity.shiny && !AnimationConfig[entity.name].shinyUnavailable
        ? PokemonTint.SHINY
        : PokemonTint.NORMAL
    const animKey = `${textureIndex}/${tint}/${animation}/${SpriteType.ANIM}/${orientationCorrected}`
    const shadowKey = `${textureIndex}/${tint}/${animation}/${SpriteType.SHADOW}/${orientationCorrected}`

    entity.sprite.anims.play({ key: animKey, repeat: config.repeat })
    entity.shadow.anims.play({ key: shadowKey, repeat: config.repeat })
    if (config.lock) {
      entity.animationLocked = true
    }
  }
}

export function createStatusAnimations(game: Phaser.Scene) {
  game.anims.create({
    key: "poison",
    frames: game.anims.generateFrameNames("status", {
      start: 0,
      end: 14,
      zeroPad: 3,
      prefix: "status/poison/"
    }),
    frameRate: 15,
    repeat: -1
  })

  game.anims.create({
    key: "sleep",
    frames: game.anims.generateFrameNames("status", {
      start: 0,
      end: 9,
      zeroPad: 3,
      prefix: "status/sleep/"
    }),
    frameRate: 15,
    repeat: -1
  })

  game.anims.create({
    key: "silence",
    frames: game.anims.generateFrameNames("status", {
      start: 0,
      end: 8,
      zeroPad: 3,
      prefix: "status/silence/"
    }),
    frameRate: 15,
    repeat: -1
  })

  game.anims.create({
    key: "protect",
    frames: game.anims.generateFrameNames("status", {
      start: 0,
      end: 9,
      zeroPad: 3,
      prefix: "status/protect/"
    }),
    frameRate: 15,
    repeat: -1
  })

  game.anims.create({
    key: "freeze",
    frames: game.anims.generateFrameNames("status", {
      start: 0,
      end: 5,
      zeroPad: 3,
      prefix: "status/freeze/"
    }),
    frameRate: 15,
    repeat: -1
  })

  game.anims.create({
    key: "confusion",
    frames: game.anims.generateFrameNames("status", {
      start: 0,
      end: 3,
      zeroPad: 3,
      prefix: "status/confusion/"
    }),
    frameRate: 4,
    repeat: -1
  })

  game.anims.create({
    key: "burn",
    frames: game.anims.generateFrameNames("status", {
      start: 0,
      end: 6,
      zeroPad: 3,
      prefix: "status/burn/"
    }),
    frameRate: 15,
    repeat: -1
  })

  game.anims.create({
    key: "wound",
    frames: game.anims.generateFrameNames("wound", {
      start: 0,
      end: 3,
      zeroPad: 3
    }),
    frameRate: 3,
    repeat: -1
  })

  game.anims.create({
    key: "resurection",
    frames: game.anims.generateFrameNames("resurection", {
      start: 0,
      end: 3,
      zeroPad: 3
    }),
    frameRate: 3,
    repeat: -1
  })

  game.anims.create({
    key: "RESURECT",
    frames: game.anims.generateFrameNames("RESURECT", {
      start: 0,
      end: 56,
      zeroPad: 3
    }),
    frameRate: 28,
    repeat: 0
  })

  /*game.anims.create({
    key: "smoke",
    frames: game.anims.generateFrameNames("smoke", {
      start: 0,
      end: 9,
      zeroPad: 3
    }),
    frameRate: 3,
    repeat: -1
  })*/

  game.anims.create({
    key: "paralysis",
    frames: game.anims.generateFrameNames("paralysis", {
      start: 0,
      end: 4,
      zeroPad: 3
    }),
    frameRate: 8,
    repeat: -1,
    repeatDelay: 500
  })

  game.anims.create({
    key: "armorReduction",
    frames: game.anims.generateFrameNames("armorReduction", {
      start: 0,
      end: 1,
      zeroPad: 3
    }),
    frameRate: 3,
    repeat: -1
  })

  game.anims.create({
    key: "charm",
    frames: game.anims.generateFrameNames("charm", {
      start: 0,
      end: 3,
      zeroPad: 3
    }),
    frameRate: 8,
    repeat: -1
  })

  game.anims.create({
    key: "flinch",
    frames: game.anims.generateFrameNames("flinch", {
      start: 0,
      end: 8,
      zeroPad: 3
    }),
    frameRate: 8,
    repeat: -1
  })

  game.anims.create({
    key: "curse",
    frames: game.anims.generateFrameNames("curse", {
      start: 0,
      end: 5
    }),
    frameRate: 8,
    repeat: -1
  })
  game.anims.create({
    key: "CURSE_EFFECT",
    frames: game.anims.generateFrameNames("CURSE_EFFECT", {
      start: 0,
      end: 10
    }),
    frameRate: 8,
    repeat: 0
  })

  game.anims.create({
    key: "VOID_BOOST",
    frames: game.anims.generateFrameNames("VOID_BOOST", {
      start: 0,
      end: 7,
      zeroPad: 3
    }),
    frameRate: 9,
    repeat: -1
  })

  game.anims.create({
    key: "ELECTRIC_SURGE",
    frames: game.anims.generateFrameNames("ELECTRIC_SURGE", {
      start: 0,
      end: 6,
      zeroPad: 3
    }),
    frameRate: 9,
    repeat: -1
  })

  game.anims.create({
    key: "PSYCHIC_SURGE",
    frames: game.anims.generateFrameNames("PSYCHIC_SURGE", {
      start: 0,
      end: 3,
      zeroPad: 3
    }),
    frameRate: 6,
    repeat: -1,
    yoyo: true
  })

  game.anims.create({
    key: Ability.MISTY_SURGE,
    frames: game.anims.generateFrameNames(Ability.MISTY_SURGE, {
      start: 0,
      end: 2,
      zeroPad: 3
    }),
    duration: 1000,
    repeat: -1
  })

  game.anims.create({
    key: Ability.GRASSY_SURGE,
    frames: game.anims.generateFrameNames(Ability.GRASSY_SURGE, {
      start: 0,
      end: 7,
      zeroPad: 3
    }),
    duration: 1000,
    repeat: -1,
    yoyo: false
  })

  game.anims.create({
    key: "rune_protect",
    frames: game.anims.generateFrameNames("rune_protect", {
      start: 0,
      end: 9,
      zeroPad: 3
    }),
    frameRate: 6,
    repeat: -1,
    yoyo: true
  })

  game.anims.create({
    key: "GRASS_HEAL",
    frames: game.anims.generateFrameNames("GRASS_HEAL", {
      start: 0,
      end: 4,
      zeroPad: 3
    }),
    frameRate: 8,
    repeat: 0
  })
}
