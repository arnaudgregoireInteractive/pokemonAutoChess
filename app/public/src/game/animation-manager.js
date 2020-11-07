/* eslint-disable max-len */

export default class AnimationManager {
  constructor(game) {
    this.game = game;
    this.orientationTable = {
      'DOWN': 0,
      'DOWNLEFT': 1,
      'LEFT': 2,
      'UPLEFT': 3,
      'UP': 4,
      'UPRIGHT': 3,
      'RIGHT': 2,
      'DOWNRIGHT': 1
    };

    this.actionTable ={
      'MOVING': 0,
      'ATTACKING': 1
    };

    this.flipxTable = {
      'DOWNRIGHT': false,
      'DOWNLEFT': false,
      'LEFT': false,
      'UPLEFT': false,
      'UP': false,
      'UPRIGHT': true,
      'RIGHT': true,
      'DOWNRIGHT': true
    };

    [10, 11, 12, 13, 14, 15, 16, 17, 18, 74, 75, 76, 298, 183, 184, 41, 42, 169, 179, 180, 181, 173, 35, 36, 174, 39, 40, 187, 188, 189, 273, 274, 275, 396, 397, 398].forEach((num) => {
      this.createAnimations(num, 'COMMON');
    });

    [1, 2, 3, 4, 5, 6, 7, 8, 9, 29, 30, 31, 32, 33, 34, 133, 134, 135, 136, 152, 153, 154, 155, 156, 157, 158, 159, 160, 196, 197, 252, 253, 254, 255, 256, 257, 258, 259, 260, 387, 388, 389, 390, 391, 392, 393, 394, 395, 470, 700].forEach((num) => {
      this.createAnimations(num, 'UNCOMMON');
    });

    [25, 26, 60, 61, 66, 67, 68, 81, 82, 111, 112, 116, 117, 172, 175, 176, 186, 230, 270, 271, 272, 304, 305, 306, 328, 329, 330, 355, 356, 363, 364, 365, 403, 404, 405, 462, 464, 468, 477].forEach((num) => {
      this.createAnimations(num, 'RARE');
    });

    [63, 64, 65, 92, 93, 94, 125, 126, 147, 148, 149, 239, 240, 246, 247, 248, 280, 281, 282, 287, 288, 289, 371, 372, 373, 374, 375, 376, 443, 444, 445, 466, 467].forEach((num) => {
      this.createAnimations(num, 'EPIC');
    });

    [58, 59, 95, 123, 132, 143, 208, 212, 446, 447, 448, 2080, 2120, 4480, 322, 323, 3230, 307, 308, 3080].forEach((num) => {
      this.createAnimations(num, 'LEGENDARY');
    });

    [129, 130, 19, 20, 21, 22, 27, 249, 487, 144, 145, 146, 483, 484, 243, 244, 245, 377, 378, 379, 486, 382, 383, 384, 491].forEach((num) => {
      this.createAnimations(num, 'NEUTRAL');
    });

    [607,608,609].forEach((num) => {
      this.createAnimations(num, 'EPIC2');
    });

    this.createAttacksAnimations();

    this.createSpecialCellsAnimations();
  }

  createSpecialCellsAnimations(){
    this.game.anims.create({
      key: `FIRE/cell`,
      frames: this.game.anims.generateFrameNames('attacks', {start: 0, end: 56, zeroPad: 3, prefix: 'FIRE/cell/'}),
      frameRate: 30,
      repeat: -1
    });

    this.game.anims.create({
      key: `GRASS/cell`,
      frames: this.game.anims.generateFrameNames('attacks', {start: 0, end: 19, zeroPad: 3, prefix: 'GRASS/cell/'}),
      frameRate: 15,
      repeat: -1
    });

    this.game.anims.create({
      key: `WATER/cell`,
      frames: this.game.anims.generateFrameNames('attacks', {start: 0, end: 6, zeroPad: 3, prefix: 'WATER/cell/'}),
      frameRate: 15,
      repeat: -1
    });

    this.game.anims.create({
      key: `NORMAL/cell`,
      frames: this.game.anims.generateFrameNames('attacks', {start: 0, end: 51, zeroPad: 3, prefix: 'NORMAL/cell/'}),
      frameRate: 15,
      repeat: -1
    });

    this.game.anims.create({
      key: `ICE/cell`,
      frames: this.game.anims.generateFrameNames('attacks', {start: 0, end: 14, zeroPad: 3, prefix: 'ICE/cell/'}),
      frameRate: 15,
      repeat: -1
    });

    this.game.anims.create({
      key: `ROCK/cell`,
      frames: this.game.anims.generateFrameNames('attacks', {start: 0, end: 56, zeroPad: 3, prefix: 'ROCK/cell/'}),
      frameRate: 30,
      repeat: -1
    });
  }

  createAttacksAnimations() {
    this.game.anims.create({
      key: `GRASS/range`,
      frames: this.game.anims.generateFrameNames('attacks', {start: 0, end: 10, zeroPad: 3, prefix: 'GRASS/range/'}),
      frameRate: 8,
      repeat: -1
    });

    this.game.anims.create({
      key: `GRASS/melee`,
      frames: this.game.anims.generateFrameNames('attacks', {start: 0, end: 25, zeroPad: 3, prefix: 'GRASS/melee/'}),
      frameRate: 25,
      repeat: -1
    });

    this.game.anims.create({
      key: `WATER/range`,
      frames: this.game.anims.generateFrameNames('attacks', {start: 0, end: 18, zeroPad: 3, prefix: 'WATER/range/'}),
      frameRate: 8,
      repeat: -1
    });

    this.game.anims.create({
      key: `WATER/melee`,
      frames: this.game.anims.generateFrameNames('attacks', {start: 0, end: 7, zeroPad: 3, prefix: 'WATER/melee/'}),
      frameRate: 8,
      repeat: -1
    });

    this.game.anims.create({
      key: `FIRE/melee`,
      frames: this.game.anims.generateFrameNames('attacks', {start: 0, end: 8, zeroPad: 3, prefix: 'FIRE/melee/'}),
      frameRate: 8,
      repeat: -1
    });

    this.game.anims.create({
      key: `FIRE/range`,
      frames: this.game.anims.generateFrameNames('attacks', {start: 0, end: 30, zeroPad: 3, prefix: 'FIRE/range/'}),
      frameRate: 25,
      repeat: -1
    });

    this.game.anims.create({
      key: `ROCK/melee`,
      frames: this.game.anims.generateFrameNames('attacks', {start: 0, end: 10, zeroPad: 3, prefix: 'ROCK/melee/'}),
      frameRate: 8,
      repeat: -1
    });

    this.game.anims.create({
      key: `FIGHTING/melee`,
      frames: this.game.anims.generateFrameNames('attacks', {start: 0, end: 12, zeroPad: 3, prefix: 'FIGHTING/melee/'}),
      frameRate: 8,
      repeat: -1
    });

    this.game.anims.create({
      key: `FIGHTING/range`,
      frames: this.game.anims.generateFrameNames('attacks', {start: 9, end: 39, zeroPad: 3, prefix: 'FIGHTING/range/'}),
      frameRate: 25,
      repeat: -1
    });

    this.game.anims.create({
      key: `DRAGON/melee`,
      frames: this.game.anims.generateFrameNames('attacks', {start: 0, end: 10, zeroPad: 3, prefix: 'DRAGON/melee/'}),
      frameRate: 10,
      repeat: -1
    });

    this.game.anims.create({
      key: `NORMAL/melee`,
      frames: this.game.anims.generateFrameNames('attacks', {start: 0, end: 7, zeroPad: 3, prefix: 'NORMAL/melee/'}),
      frameRate: 12,
      repeat: -1
    });

    this.game.anims.create({
      key: `DRAGON/range`,
      frames: this.game.anims.generateFrameNames('attacks', {start: 0, end: 45, zeroPad: 3, prefix: 'DRAGON/range/'}),
      frameRate: 25,
      repeat: -1
    });

    this.game.anims.create({
      key: `POISON/range`,
      frames: this.game.anims.generateFrameNames('attacks', {start: 0, end: 27, zeroPad: 3, prefix: 'POISON/range/'}),
      frameRate: 25,
      repeat: -1
    });

    this.game.anims.create({
      key: `POISON/melee`,
      frames: this.game.anims.generateFrameNames('attacks', {start: 0, end: 12, zeroPad: 3, prefix: 'POISON/melee/'}),
      frameRate: 8,
      repeat: -1
    });

    this.game.anims.create({
      key: `ELECTRIC/melee`,
      frames: this.game.anims.generateFrameNames('attacks', {start: 0, end: 3, zeroPad: 3, prefix: 'ELECTRIC/melee/'}),
      frameRate: 8,
      repeat: -1
    });

    this.game.anims.create({
      key: `GHOST/range`,
      frames: this.game.anims.generateFrameNames('attacks', {start: 0, end: 23, zeroPad: 3, prefix: 'GHOST/range/'}),
      frameRate: 23,
      repeat: -1
    });

    this.game.anims.create({
      key: `PSYCHIC/range`,
      frames: this.game.anims.generateFrameNames('attacks', {start: 0, end: 38, zeroPad: 3, prefix: 'PSYCHIC/range/'}),
      frameRate: 15,
      repeat: -1
    });

    this.game.anims.create({
      key: `ELECTRIC/range`,
      frames: this.game.anims.generateFrameNames('attacks', {start: 0, end: 5, zeroPad: 3, prefix: 'ELECTRIC/range/'}),
      frameRate: 8,
      repeat: -1
    });

    this.game.anims.create({
      key: `FAIRY/melee`,
      frames: this.game.anims.generateFrameNames('attacks', {start: 0, end: 25, zeroPad: 3, prefix: 'FAIRY/melee/'}),
      frameRate: 10,
      repeat: -1
    });

    this.game.anims.create({
      key: `FAIRY/range`,
      frames: this.game.anims.generateFrameNames('attacks', {start: 0, end: 13, zeroPad: 3, prefix: 'FAIRY/range/'}),
      frameRate: 8,
      repeat: -1
    });

    this.game.anims.create({
      key: `FLYING/melee`,
      frames: this.game.anims.generateFrameNames('attacks', {start: 0, end: 24, zeroPad: 3, prefix: 'FLYING/melee/'}),
      frameRate: 10,
      repeat: -1
    });

    this.game.anims.create({
      key: `FLYING/range`,
      frames: this.game.anims.generateFrameNames('attacks', {start: 0, end: 7, zeroPad: 3, prefix: 'FLYING/range/'}),
      frameRate: 8,
      repeat: -1
    });

    this.game.anims.create({
      key: `BUG/melee`,
      frames: this.game.anims.generateFrameNames('attacks', {start: 0, end: 15, zeroPad: 3, prefix: 'BUG/melee/'}),
      frameRate: 10,
      repeat: -1
    });

    this.game.anims.create({
      key: `ICE/melee`,
      frames: this.game.anims.generateFrameNames('attacks', {start: 0, end: 8, zeroPad: 3, prefix: 'ICE/melee/'}),
      frameRate: 8,
      repeat: -1
    });
  }

  createAnimations(index, sheet) {
    /*
      0 : down
      1 : down left
      2 : left
      3 : up left
      4 : up
      */
    ['0', '1', '2', '3', '4'].forEach((orientation) => {
      this.game.anims.create({
        key: `${index}/0/${orientation}`,
        frames: this.game.anims.generateFrameNames(sheet, {frames: [0, 1, 2], prefix: index + '/0/' + orientation + '/'}),
        frameRate: 4,
        repeat: -1,
        yoyo: true
      });
      // attack
      this.game.anims.create({
        key: `${index}/1/${orientation}`,
        frames: this.game.anims.generateFrameNames(sheet, {frames: [0, 1, 2], prefix: index + '/1/' + orientation + '/'}).concat(
            this.game.anims.generateFrameNames(sheet, {frames: [0, 1, 2], prefix: index + '/0/' + orientation + '/'})
        ),
        duration: 1000,
        repeat: -1
      });
    });
  }

  animatePokemon(entity) {
    const key = this.getSpriteKey(entity);
    this.playAnimation(entity, key);
  }

  playAnimation(entity, spriteKey) {
    const sprite = entity.getFirst('objType', 'sprite');
    sprite.flipX = this.flipxTable[entity.orientation];
    sprite.anims.play(spriteKey);
  }

  playSpecialCells(entity){
    //console.log(entity);
    //console.log(window.state.mapType);
    entity.anims.play(`${window.state.mapType}/cell`);
  }

  getSpriteKey(entity) {
    return `${entity.index}/${this.actionTable[entity.action]}/${this.orientationTable[entity.orientation]}`;
  }
}
