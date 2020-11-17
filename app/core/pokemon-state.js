const {EFFECTS, ATTACK_TYPE, TYPE, CLIMATE, ITEMS} = require('../models/enum');


class PokemonState {
  constructor() {

  }

  handleDamage(pokemon, damage, board, attackType, attacker) {

    let death = false;
    let reducedDamage = damage;
    if (attackType == ATTACK_TYPE.PHYSICAL) {
      reducedDamage = Math.max(0, damage - pokemon.def);
    }
    else if (attackType == ATTACK_TYPE.SPECIAL) {
      reducedDamage = Math.max(0, damage - pokemon.speDef);
    }
    else if(attackType == ATTACK_TYPE.TRUE){
      reducedDamage = damage;
    }

    if(attacker && attacker.team == 0){
      attacker.damageDone += reducedDamage;
    }

    pokemon.life -= reducedDamage;
    //console.log(`${pokemon.id} took ${damage} and has now ${pokemon.life} life`);
    if (pokemon.effects.includes(EFFECTS.RAGE)) {
      pokemon.attack += Math.ceil(pokemon.baseAtk * 0.05);
    }
    if (pokemon.effects.includes(EFFECTS.PURSUIT) && pokemon.life/pokemon.hp < 0.3) {
      pokemon.life = 0;
      death = true;
    }
    if (pokemon.life <= 0) {
      board.setValue(pokemon.positionX, pokemon.positionY, undefined);
      death = true;
    }
    return death;
  }

  update(pokemon, dt, board, climate) {

    if (pokemon.manaCooldown <= 0) {
      pokemon.mana = Math.min(pokemon.mana + 10, pokemon.maxMana);
      pokemon.manaCooldown = 1000;
      if(pokemon.mana >= pokemon.maxMana){

        if(pokemon.targetX == -1 || pokemon.targetY == -1){
          const targetCoordinate = this.getNearestTargetCoordinate(pokemon, board);
          if (targetCoordinate[0] !== undefined && targetCoordinate[1] !== undefined) {
              pokemon.targetX = targetCoordinate[0];
              pokemon.targetY = targetCoordinate[1];
          }
        }
        let target = board.getValue(pokemon.targetX, pokemon.targetY);
        if(target){
          pokemon.strategy.process(pokemon, this, board, target);
        }
      }
    }
    else{
      pokemon.manaCooldown = Math.max(0, pokemon.manaCooldown - dt);
    }

    if (pokemon.cooldown <= 0) {
      if (climate == CLIMATE.SANDSTORM) {
        if (!pokemon.types.includes(TYPE.GROUND) && !pokemon.types.includes(TYPE.METAL)) {
          this.handleDamage(pokemon, Math.ceil(pokemon.hp / 20), board, ATTACK_TYPE.TRUE);
        }
      }
      if (pokemon.effects.includes(EFFECTS.BLAZE)) {
        pokemon.atk += Math.ceil(pokemon.baseAtk * 0.05);
      }

      if(pokemon.effects.includes(EFFECTS.DRAGON_DANCE) && pokemon.types.includes(TYPE.DRAGON)){
        pokemon.atkSpeed = Math.max(400,pokemon.atkSpeed * 0.97);
      }

      if (pokemon.effects.includes(EFFECTS.INGRAIN)) {
        pokemon.life = Math.min(pokemon.hp, pokemon.life + Math.ceil(pokemon.hp / 20));
      }

      if (pokemon.effects.includes(EFFECTS.GRASS)) {
        pokemon.life = Math.min(pokemon.hp, pokemon.life + Math.ceil(pokemon.hp / 20));
      }
      
      if(pokemon.items.count(ITEMS.METRONOME) != 0){
        pokemon.atk = Math.ceil(pokemon.baseAtk * 1.05) * pokemon.items.count(ITEMS.METRONOME);
      }

      if(pokemon.items.count(ITEMS.SALAC_BERRY) != 0){
        if(pokemon.life <= pokemon.hp / 2){
          pokemon.atkSpeed = Math.max(400,pokemon.atkSpeed * 0.5);
         pokemon.items.remove(ITEMS.SALAC_BERRY);
        }
      }

      if(pokemon.items.count(ITEMS.LIECHI_BERRY) != 0){
        if(pokemon.life <= pokemon.hp / 2  && pokemon.attackType == ATTACK_TYPE.PHYSICAL){
          pokemon.atk = Math.ceil(pokemon.atk * 1.5);
          pokemon.items.remove(ITEMS.LIECHI_BERRY);
        }
      }

      if(pokemon.items.count(ITEMS.GANLON_BERRY) != 0){
        if(pokemon.life <= pokemon.hp / 2){
          pokemon.def = Math.ceil(pokemon.def * 1.5);
          pokemon.items.remove(ITEMS.GANLON_BERRY);
        }
      }
  
      if(pokemon.items.count(ITEMS.PETAYA_BERRY) != 0){
        if(pokemon.life <= pokemon.hp / 2 && pokemon.attackType == ATTACK_TYPE.SPECIAL){
          pokemon.atk = Math.ceil(pokemon.atk * 1.5);
          pokemon.items.remove(ITEMS.PETAYA_BERRY);
        }
      }

      if(pokemon.items.count(ITEMS.APRICOT_BERRY) != 0){
        if(pokemon.life <= pokemon.hp / 2){
          pokemon.speDef = Math.ceil(pokemon.speDef * 1.5);
          pokemon.items.remove(ITEMS.APRICOT_BERRY);
        }
      }

      if(pokemon.items.count(ITEMS.ORAN_BERRY) != 0){
        if(pokemon.life <= pokemon.hp / 4){
          pokemon.life += Math.ceil(pokemon.hp / 4);
          pokemon.items.remove(ITEMS.ORAN_BERRY);
        }
      }

      if(pokemon.items.count(ITEMS.BIG_ROOT) != 0){
        pokemon.life = Math.min(pokemon.hp, pokemon.life + Math.ceil(pokemon.hp / 20));
      }

      if (pokemon.effects.includes(EFFECTS.RAIN_DISH)) {
        pokemon.life = Math.min(pokemon.hp, pokemon.life + Math.ceil(pokemon.hp / 10));
      }

      if (pokemon.effects.includes(EFFECTS.POISON_GAS)) {
        this.handleDamage(pokemon, Math.ceil(pokemon.hp / 20), board, ATTACK_TYPE.TRUE);
      }

      if (pokemon.effects.includes(EFFECTS.TOXIC) && (!pokemon.types.includes(TYPE.POISON) && !pokemon.types.includes(TYPE.METAL))) {
        this.handleDamage(pokemon, Math.ceil(pokemon.hp / 20), board, ATTACK_TYPE.TRUE);
      }
    }
  }

  onEnter(pokemon) {
  }

  onExit(pokemon) {
  }

  isTarget(pokemon, board) {
    let target = false;
    board.forEach((x, y, value) => {
      if (value && value.team != pokemon.team) {
        target = true;
      }
    });
    return target;
  }

  getNearestTargetCoordinate(pokemon, board) {
    let x = undefined;
    let y = undefined;
    let distance = 999;
    board.forEach((r, c, value) => {
      if (value !== undefined && value.team != pokemon.team) {
        const candidateDistance = board.distance(pokemon.positionX, pokemon.positionY, r, c);
        if (candidateDistance < distance) {
          distance = candidateDistance;
          x = r;
          y = c;
        }
      }
    });
    return [x, y];
  }
};

module.exports = PokemonState;
