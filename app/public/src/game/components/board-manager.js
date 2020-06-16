import Pokemon from "./pokemon";

export default class BoardManager {
  constructor(scene, group, player) {
    this.group = group;
    this.scene = scene;
    this.player = player;
  }

  addPokemon(pokemon) {
    let presence = false;
    this.group.getChildren().forEach(pkm => {
      if (pkm.id == pokemon.id) {
        pkm.destroy();
      }
    });
    if(!presence){
      let coordinates = window.transformCoordinate(pokemon.positionX, pokemon.positionY);
      let pokemonUI = new Pokemon(this.scene, coordinates[0], coordinates[1], pokemon);

      if (window.sessionId == this.player.id) {
        pokemonUI.setInteractive();
        this.scene.input.setDraggable(pokemonUI);
      }
      window.animationManager.animatePokemon(pokemonUI);
      this.group.add(pokemonUI);
    }
  }

  clear() {
    this.group.clear(false, true);
  }

  clearBoard(){
    for (let id in this.player.board) {
      let pokemon = this.player.board[id];
      if(pokemon.positionY != 0){
        this.removePokemon(pokemon.id);
      }
    }
  }

  removePokemon(id) {
    this.group.getChildren().forEach(pokemon => {
      if (pokemon.id == id) {
        pokemon.destroy();
      }
    });
  }

  buildPokemons() {
    for (let id in this.player.board) {
      let pokemon = this.player.board[id];
      if(window.state.phase == "FIGHT"){
        if(pokemon.positionY == 0){
          this.addPokemon(pokemon);
        }
      }
      else{
        this.addPokemon(pokemon);
      }
    }
  }

  setPlayer(player) {
    if (player.id != this.player.id) {
      this.player = player;
      this.group.clear(true, true);
      this.buildPokemons();
    }
  }

  update() {
    for (let id in this.player.board) {
      let pokemon = this.player.board[id];
      let found = false;
      this.group.getChildren().forEach(pokemonUI => {
        if (pokemon.id == pokemonUI.id) {
          found = true;

          if (pokemonUI.positionX != pokemon.positionX || pokemonUI.positionY != pokemon.positionY) {
            pokemonUI.positionX = pokemon.positionX;
            let coordinates = window.transformCoordinate(pokemon.positionX, pokemon.positionY);
            pokemonUI.x = coordinates[0];
            pokemonUI.y = coordinates[1];
          }
          if (pokemonUI.x != pokemon.positionX || pokemonUI.y != pokemon.positionY) {
            let coordinates = window.transformCoordinate(pokemon.positionX, pokemon.positionY);
            pokemonUI.x = coordinates[0];
            pokemonUI.y = coordinates[1];
          }
        }
      });
      if (!found) {
        if(window.state.phase =="FIGHT"){
          if(pokemon.positionY ==0){
            this.addPokemon(pokemon);
          }
        }
        else{
          this.addPokemon(pokemon);
        }
      }
    }
    let ids = [];
    this.group.getChildren().forEach(pokemonUI => {
      if (!(pokemonUI.id in this.player.board)) {
        ids.push(pokemonUI.id);
      }
    });
    ids.forEach(id => {
      this.removePokemon(id);
    });
  }
}