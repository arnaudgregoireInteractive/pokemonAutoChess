import { GameObjects } from "phaser"
import { getPortraitSrc } from "../../utils"
import GameScene from "../scenes/game-scene"
import indexList from "../../../src/assets/pokemons/indexList.json"
import { t } from "i18next"
import AnimatedTiles from "phaser-animated-tiles-phaser3.5/dist/AnimatedTiles.min.js"
import atlas from "../../assets/atlas.json"

export default class LoadingManager {
  scene: Phaser.Scene
  loadingBar: GameObjects.Container
  statusMessage: string

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.statusMessage = t("loading")

    this.scene.load.on("fileprogress", (file, percentComplete) => {
      if (percentComplete < 1) {
        this.statusMessage = t("loading_asset") + " " + file.key
      }
    })

    this.scene.load.on("complete", () => {
      this.statusMessage = t("loading_complete")
    })

    this.preload()
  }

  preload() {
    const scene = this.scene
    scene.load.scenePlugin(
      "animatedTiles",
      AnimatedTiles,
      "animatedTiles",
      "animatedTiles"
    )
    indexList.forEach((id) => {
      scene.load.image(`portrait-${id}`, getPortraitSrc(id))
      scene.load.multiatlas(
        id,
        `/assets/pokemons/${id}.json`,
        "/assets/pokemons"
      )
    })

    if (scene instanceof GameScene && scene.tilemap) {
      scene.load.audio("music_" + scene.dungeonMusic, [
        `https://raw.githubusercontent.com/keldaanCommunity/pokemonAutoChessMusic/main/music/${scene.dungeonMusic}.mp3`
      ])
      scene.tilemap.tilesets.forEach((t) => {
        scene.load.image(
          t.name,
          "/assets/tilesets/" + scene.dungeon + "/" + t.image
        )
      })

      scene.load.tilemapTiledJSON("map", scene.tilemap)
    }
    scene.load.image("rain", "/assets/ui/rain.png")
    scene.load.image("sand", "/assets/ui/sand.png")
    scene.load.image("wind", "/assets/ui/wind.png")
    scene.load.image("sun", "/assets/ui/sun.png")
    scene.load.image("clouds", "/assets/ui/clouds.png")
    scene.load.multiatlas(
      "snowflakes",
      "/assets/ui/snowflakes.json",
      "/assets/ui/"
    )

    scene.load.image("money", "/assets/icons/money.svg")
    scene.load.image("arrowDown", "/assets/ui/arrowDown.png")

    scene.load.multiatlas("item", "/assets/item/item.json", "/assets/item/")

    for (let pack in atlas.packs) {
      scene.load.multiatlas(
        atlas.packs[pack].name,
        `/assets/${pack}/${atlas.packs[pack].name}.json`,
        `/assets/${pack}/`
      )
    }

    loadEnvironmentMultiAtlas(this.scene)
  }
}

export function loadEnvironmentMultiAtlas(scene: Phaser.Scene) {
  scene.load.multiatlas(
    "portal",
    "/assets/environment/portal.json",
    "/assets/environment/"
  )
  scene.load.multiatlas(
    "chest",
    "/assets/environment/chest.json",
    "/assets/environment/"
  )
  scene.load.multiatlas(
    "shine",
    "/assets/environment/shine.json",
    "/assets/environment/"
  )

  scene.load.multiatlas(
    "berry_trees",
    "/assets/environment/berry_trees.json",
    "/assets/environment/"
  )
}
