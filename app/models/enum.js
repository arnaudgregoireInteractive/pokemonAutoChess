const TYPE = Object.freeze({
  NORMAL: "NORMAL",
  GRASS: "GRASS",
  FIRE: "FIRE",
  WATER: "WATER",
  ELECTRIC: "ELECTRIC",
  FIGHTING: "FIGHTING",
  PSYCHIC: "PSYCHIC",
  DARK: "DARK",
  METAL: "METAL",
  GROUND: "GROUND",
  POISON: "POISON",
  DRAGON: "DRAGON",
  FIELD: "FIELD",
  MONSTER: "MONSTER",
  HUMAN: "HUMAN",
  AQUATIC: "AQUATIC",
  BUG: "BUG",
  FLYING: "FLYING",
  FLORA: "FLORA",
  MINERAL: "MINERAL",
  AMORPH: "AMORPH",
  FAIRY: "FAIRY"
});

const RARITY = Object.freeze({
  COMMON: "COMMON",
  UNCOMMON: "UNCOMMON",
  RARE: "RARE",
  EPIC: "EPIC",
  LEGENDARY: "LEGENDARY"
});

const COST = Object.freeze({
  COMMON: 1,
  UNCOMMON: 2,
  RARE: 3,
  EPIC: 4,
  LEGENDARY: 5
});

const EXP_TABLE = Object.freeze({
  1: 0,
  2: 2,
  3: 6,
  4: 10,
  5: 20,
  6: 32,
  7: 50,
  8: 70
});

const STATE = Object.freeze({
  FIGHT: "FIGHT",
  PICK: "PICK"
});

const STATE_TYPE = Object.freeze({
  MOVING: "MOVING",
  ATTACKING: "ATTACKING"
});

const ORIENTATION = Object.freeze({
  DOWNLEFT: "DOWNLEFT",
  LEFT: "LEFT",
  UPLEFT: "UPLEFT",
  UP: "UP",
  UPRIGHT: "UPRIGHT",
  RIGHT: "RIGHT",
  DOWNRIGHT: "DOWNRIGHT",
  DOWN: "DOWN"
});

module.exports = { TYPE, RARITY, COST, EXP_TABLE, STATE, STATE_TYPE, ORIENTATION };