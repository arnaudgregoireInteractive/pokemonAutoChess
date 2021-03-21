import GameScene from './scenes/game-scene';
import MoveToPlugin from 'phaser3-rex-plugins/plugins/moveto-plugin.js';
import WebFontLoaderPlugin from 'phaser3-rex-plugins/plugins/webfontloader-plugin.js';
import {MAP_TYPE, LAST_BATTLE_RESULT_TRADUCTION, WORDS} from '../../../models/enum.js';

class GameContainer {
  constructor(room, div) {
    this.room = room;
    this.div = div;
    this.game = null;
    this.player = null;
    this.initialize();
  }

  initialize() {
    this.initializeEvents();
  }

  initializeGame() {
    // Create Phaser game
    const config = {
      type: Phaser.CANVAS,
      width: 2000,
      height: 1000,
      parent: this.div,
      pixelArt: true,
      scene: [GameScene],
      scale: {mode: Phaser.Scale.FIT},
      plugins: {
        global: [{
          key: 'rexMoveTo',
          plugin: MoveToPlugin,
          start: true
        },
        {
          key: 'rexWebFontLoader',
          plugin: WebFontLoaderPlugin,
          start: true
        }],
      }
    };
    window.state = this.room.state;
    this.game = new Phaser.Game(config);
  }

  initializeEvents() {
    // Room event listener
    window.sessionId = this.room.sessionId;
    this.room.onStateChange.once((state) => {
      window.state = state;
    });

    this.room.state.players.onAdd = (player) => this.initializePlayer(player);
    this.room.state.players.onRemove = (player, key) => this.onPlayerRemove(player, key);
    this.room.onMessage('DragDropFailed', (message) => this.handleDragDropFailed(message));
    this.room.onMessage('kick-out', (message) => this.handleKickOut());
    this.room.onMessage('metadata', (metadata) => {
      _client.auth.metadata = metadata;
    });
    this.room.onMessage('info',(message)=> this.handleServerInfo(message));
    this.room.onLeave((client) => this.handleRoomLeft(client));
    this.room.onError((err) => console.log('room error', err));
    this.room.state.onChange = (changes) => {
      changes.forEach((change) => {
        this.handleRoomStateChange(change);
      });
    };
    // Game event listener
    document.getElementById('game').addEventListener('shop-click', (e) => this.onShopClick(e));
    document.getElementById('game').addEventListener('player-click', (e) => this.onPlayerClick(e));
    document.getElementById('game').addEventListener('refresh-click', (e) => this.onRefreshClick(e));
    document.getElementById('game').addEventListener('lock-click', (e) => this.onLockClick(e));
    document.getElementById('game').addEventListener('level-click', (e) => this.onLevelClick(e));
    document.getElementById('game').addEventListener('drag-drop', (e) => this.onDragDrop(e));
    document.getElementById('game').addEventListener('sell-drop', (e) => this.onSellDrop(e));
    document.getElementById('game').addEventListener('leave-game', (e) => this.onLeaveGame(e));
  }

  initializePlayer(player) {
    // //console.log(player);
    const self = this;
    if (this.room.sessionId == player.id) {
      this.player = player;
    }
    player.onChange = ((changes) => {
      changes.forEach((change) => self.handlePlayerChange(change, player));
    });

    player.board.onAdd = function(pokemon, key) {
      pokemon.onChange = function(changes) {
        changes.forEach((change) => {
          self.handleBoardPokemonChange(player, pokemon, change);
        });
      };

      pokemon.items.onChange = function(changes) {
        changes.forEach((change) => {
          self.handleBoardPokemonChange(player, pokemon, change);
        });
      };
      self.handleBoardPokemonAdd(player, pokemon);
    };

    player.board.onRemove = function(pokemon, key) {
      self.handleBoardPokemonRemove(player, pokemon);
    };

    player.shop.onAdd = function(pokemon, key) {
      self.handleAddShopPokemon(player, pokemon, key);
    };

    player.shop.onRemove = function(pokemon, key) {
      self.handleRemoveShopPokemon(player, key);
    };

    player.shop.onChange = function(pokemon, index) {
      if(pokemon !== undefined){
        if (player.shop[index] == '') {
          self.handleRemoveShopPokemon(player, index);
        } else {
          self.handleAddShopPokemon(player, player.shop[index], index);
        }
      }
    };


    player.experienceManager.onChange = ((changes) => {
      changes.forEach((change) => this.handleExperienceChange(change, player));
    });

    player.synergies.onChange = ((changes) => {
      changes.forEach((change) => this.handleSynergiesChange(change, player));
    });

    player.stuff.onChange = ((changes) =>{
      changes.forEach((change) => this.handleStuffChange(change, player));
    });

    player.simulation.onChange = ((changes) => {
      if (player.id == this.room.sessionId && this.game.scene.getScene('gameScene') != null) {
        changes.forEach((change) =>{
          // console.log('simulation change ', change.field, change.value);
          if (change.field == 'climate') {
            this.handleClimateChange(change, player);
          } else if (change.field == 'redRocks') {
            if (change.value) {
              this.game.scene.getScene('gameScene').entryHazardsManager.addRedRocks();
            } else {
              this.game.scene.getScene('gameScene').entryHazardsManager.clearRedRocks();
            }
          } else if (change.field == 'blueRocks') {
            if (change.value) {
              this.game.scene.getScene('gameScene').entryHazardsManager.addBlueRocks();
            } else {
              this.game.scene.getScene('gameScene').entryHazardsManager.clearBlueRocks();
            }
          } else if (change.field == 'redSpikes') {
            if (change.value) {
              this.game.scene.getScene('gameScene').entryHazardsManager.addRedSpikes();
            } else {
              this.game.scene.getScene('gameScene').entryHazardsManager.clearRedSpikes();
            }
          } else if (change.field == 'blueSpikes') {
            if (change.value) {
              this.game.scene.getScene('gameScene').entryHazardsManager.addBlueSpikes();
            } else {
              this.game.scene.getScene('gameScene').entryHazardsManager.clearBlueSpikes();
            }
          }
        });
      }
    });

    player.simulation.dpsMeter.onAdd = (dps, key) => {
      // console.log('add Dps');
      this.handleDpsAdd(player.id, dps);
      dps.onChange = (changes) => {
        changes.forEach((change) => {
          this.handleDpsChange(player.id, change, dps);
        });
      };
    };
    player.simulation.dpsMeter.onRemove = (dps, key) => {
      // console.log('remove Dps');
      this.handleDpsRemove(player.id, dps);
    };

    player.simulation.blueTeam.onAdd = (pokemon, key) => {
      // console.log('add pokemon');
      this.handlePokemonAdd(player.id, pokemon);
      pokemon.onChange = (changes) => {
        // console.log('change pokemon');
        changes.forEach((change) => {
          // console.log(change.field);
          this.handlePokemonChange(player.id, change, pokemon);
        });
      };
      pokemon.items.onChange = (changes) => {
        // console.log('change item');
        changes.forEach((change) => {
          this.handlePokemonItemsChange(player.id, change, pokemon);
        });
      };
    };

    player.simulation.redTeam.onAdd = (pokemon, key) => {
      // console.log('add pokemon');
      this.handlePokemonAdd(player.id, pokemon);
      pokemon.onChange = (changes) => {
        // console.log('change pokemon');
        changes.forEach((change) => {
          this.handlePokemonChange(player.id, change, pokemon);
        });
      };
      pokemon.items.onChange = (changes) => {
        // console.log('change item');
        changes.forEach((change) => {
          this.handlePokemonItemsChange(player.id, change, pokemon);
        });
      };
    };
    player.simulation.blueTeam.onRemove = (pokemon, key) => {
      // console.log('remove pokemon');
      this.handlePokemonRemove(player.id, pokemon);
    };
    player.simulation.redTeam.onRemove = (pokemon, key) => {
      // console.log('remove pokemon');
      this.handlePokemonRemove(player.id, pokemon);
    };
    player.triggerAll();
    this.onPlayerAdd(player);
  }

  handleRoomStateChange(change) {
    if (change.field == 'mapType') {
      const keys = Object.keys(MAP_TYPE);
      if (keys.includes(change.value)) {
        this.initializeGame();
      }
    }
    if (window.state == null || this.game == null || this.game.scene == null || this.game.scene.getScene('gameScene') == null || this.game.scene.getScene('gameScene').timeText == null) return;
    switch (change.field) {
      case 'roundTime':
        this.game.scene.getScene('gameScene').updateTime();
        if (change.value <= 5) {
          this.game.scene.getScene('gameScene').displayCountDown(change.value);
        }
        break;

      case 'phase':
        this.game.scene.getScene('gameScene').updatePhase();
        break;

      case 'stageLevel':
        this.game.scene.getScene('gameScene').turnText.setText(change.value);
      default:
        break;
    }
  }

  handleDpsAdd(playerId, dps) {
    if (playerId == this.game.scene.getScene('gameScene').dpsMeterContainer.player.id) {
      this.game.scene.getScene('gameScene').dpsMeterContainer.addDps(dps);
    }
  }

  handleDpsRemove(playerId, dps) {
    if (playerId == this.game.scene.getScene('gameScene').dpsMeterContainer.player.id) {
      this.game.scene.getScene('gameScene').dpsMeterContainer.removeDps(dps);
    }
  }

  handleDpsChange(playerId, change, dps) {
    if (playerId == this.game.scene.getScene('gameScene').dpsMeterContainer.player.id) {
      this.game.scene.getScene('gameScene').dpsMeterContainer.changeDps(dps, change);
    }
  }

  handlePokemonAdd(playerId, pokemon) {
    // console.log('simulation add' + pokemon.name);
    this.game.scene.getScene('gameScene').battleManager.addPokemon(playerId, pokemon);
  }

  handlePokemonRemove(playerId, pokemon) {
    // console.log('simulation remove' + pokemon.name);
    this.game.scene.getScene('gameScene').battleManager.removePokemon(playerId, pokemon);
  }

  handleStuffChange(change, player) {
    if (player.id == this.room.sessionId && this.game.scene.getScene('gameScene') != null) {
      this.game.scene.getScene('gameScene').itemsContainer.changeStuff(change.field, change.value);
    }
  }

  handlePokemonChange(playerId, change, pokemon) {
    // console.log('simulation change' + change.field);
    this.game.scene.getScene('gameScene').battleManager.changePokemon(playerId, change, pokemon);
  }

  handlePokemonItemsChange(playerId, change, pokemon) {
    this.game.scene.getScene('gameScene').battleManager.changePokemonItems(playerId, change, pokemon);
  }

  handleSynergiesChange(change, player) {
    if (this.game.scene.getScene('gameScene') != null && this.game.scene.getScene('gameScene').synergiesContainer && player.id == this.game.scene.getScene('gameScene').synergiesContainer.player.id) {
      this.game.scene.getScene('gameScene').synergiesContainer.updateSynergy(change.field, change.value);
    }
  }

  handleClimateChange(change, player) {
    if (player.id == this.room.sessionId && this.game.scene.getScene('gameScene') != null) {
      switch (change.value) {
        case 'RAIN':
          this.game.scene.getScene('gameScene').weatherManager.addRain();
          break;

        case 'SUN':
          this.game.scene.getScene('gameScene').weatherManager.addSun();
          break;

        case 'SANDSTORM':
          this.game.scene.getScene('gameScene').weatherManager.addSandstorm();
          break;

        case 'SNOW':
          this.game.scene.getScene('gameScene').weatherManager.addSnow();
          break;

        case 'NEUTRAL':
          this.game.scene.getScene('gameScene').weatherManager.clearWeather();
          break;

        default:
          break;
      }
    }
  }

  handleBoardPokemonAdd(player, pokemon) {
    if (this.game.scene.getScene('gameScene') != null && this.game.scene.getScene('gameScene').boardManager && this.game.scene.getScene('gameScene').boardManager.player.id == player.id) {
      this.game.scene.getScene('gameScene').boardManager.addPokemon(pokemon);
      if(pokemon.positionY != 0){
        this.game.scene.getScene('gameScene').synergiesContainer.enablePokemon(pokemon);
      }
    }
  }

  handleBoardPokemonRemove(player, pokemon) {
    if (this.game.scene.getScene('gameScene') != null && this.game.scene.getScene('gameScene').boardManager && this.game.scene.getScene('gameScene').boardManager.player.id == player.id) {
      this.game.scene.getScene('gameScene').boardManager.removePokemon(pokemon);
      this.game.scene.getScene('gameScene').synergiesContainer.disablePokemon(pokemon);
    }
  }

  handleBoardPokemonChange(player, pokemon, change) {
    if (this.game.scene.getScene('gameScene') != null && this.game.scene.getScene('gameScene').boardManager && this.game.scene.getScene('gameScene').boardManager.player.id == player.id) {
      this.game.scene.getScene('gameScene').boardManager.changePokemon(pokemon, change);
      if(pokemon.positionY == 0){
        this.game.scene.getScene('gameScene').synergiesContainer.disablePokemon(pokemon);
      }
      else{
        this.game.scene.getScene('gameScene').synergiesContainer.enablePokemon(pokemon);
      }
    }
  }

  handleAddShopPokemon(player, pokemon, key) {
    if (this.game.scene.getScene('gameScene') != null && this.game.scene.getScene('gameScene').shopContainer && this.room.sessionId == player.id) {
      this.game.scene.getScene('gameScene').shopContainer.addPortrait(pokemon, key);
    }
  }

  handleRemoveShopPokemon(player, index) {
    if (this.game.scene.getScene('gameScene') != null && this.game.scene.getScene('gameScene').shopContainer && this.room.sessionId == player.id) {
      this.game.scene.getScene('gameScene').shopContainer.removePortrait(index);
    }
  }

  handleExperienceChange(change, player) {
    if (player.id == this.room.sessionId && this.game.scene.getScene('gameScene') != null && this.game.scene.getScene('gameScene').playerContainer && this.game.scene.getScene('gameScene').shopContainer) {
      switch (change.field) {
        case 'level':
          this.game.scene.getScene('gameScene').shopContainer.levelUpButton.changeLevel(change.value);
          this.game.scene.getScene('gameScene').maxBoardSizeText.setText(change.value);
          break;

        case 'experience':
          this.game.scene.getScene('gameScene').shopContainer.levelUpButton.changeExperience(change.value);
          break;

        case 'expNeeded':
          this.game.scene.getScene('gameScene').shopContainer.levelUpButton.changeExpNeeded(change.value);
          break;

        default:
          break;
      }
    }
    if (change.field == 'level' && this.game.scene.getScene('gameScene') != null) {
      this.game.scene.getScene('gameScene').playerContainer.onLevelChange(player.id, change.value);
    }
  }


  handlePlayerChange(change, player) {
    if (this.game == null || this.game.scene.getScene('gameScene') == null || this.game.scene.getScene('gameScene').playerContainer == null ) return;
    switch (change.field) {
      case 'money':
        if (this.room.sessionId == player.id) {
          this.game.scene.getScene('gameScene').moneyContainer.onMoneyChange(change.value);
        }
        this.game.scene.getScene('gameScene').playerContainer.onMoneyChange(player.id, change.value);
        break;

      case 'streak':
        if (this.room.sessionId == player.id) {
          this.game.scene.getScene('gameScene').moneyContainer.onStreakChange(change.value);
        }
        break;

      case 'interest':
        if (this.room.sessionId == player.id) {
          this.game.scene.getScene('gameScene').moneyContainer.onInterestChange(change.value);
        }
        break;

      case 'lastBattleResult':
        if (this.room.sessionId == player.id) {
          this.game.scene.getScene('gameScene').moneyContainer.onWonChange(change.value);
          this.game.scene.getScene('gameScene').lastBattleResult.setText(LAST_BATTLE_RESULT_TRADUCTION[change.value][window.langage]);
        }
        break;

      case 'opponentName':
        if (this.room.sessionId == player.id) {
          this.game.scene.getScene('gameScene').battleManager.setOpponentName(change.value.slice(0, 10));
        }
        break;

      case 'boardSize':
        if (this.room.sessionId == player.id) {
          this.game.scene.getScene('gameScene').boardSizeText.setText(player.boardSize);
        }
        break;

      case 'life':
        this.game.scene.getScene('gameScene').playerContainer.onLifeChange(player.id, change.value);
        break;

      case 'shopLocked':
        if (this.room.sessionId == player.id) {
          this.game.scene.getScene('gameScene').shopContainer.lockButton.updateState();
        }
        break;

      case 'rank':
        this.game.scene.getScene('gameScene').playerContainer.onRankChange(player.id, change.value);
        break;

      case 'alive':
        if (this.room.sessionId == player.id) {
          let rankPhrase = `${WORDS.PLACE[window.langage]} no ${player.rank}`;
          let titlePhrase = WORDS.RANKING[window.langage];
          if(!change.value){
            this.game.scene.getScene('gameScene').showPopup(
              {
                title: titlePhrase,
                info: rankPhrase
              }
            )
          }
        }
        break;
    }
  }

  handleDragDropFailed(message) {
    if (message.updateBoard) {
      const coordinates = window.transformCoordinate(window.lastDragDropPokemon.positionX, window.lastDragDropPokemon.positionY);
      window.lastDragDropPokemon.x = coordinates[0];
      window.lastDragDropPokemon.y = coordinates[1];
    }

    if (message.updateItems) {
      this.game.scene.getScene('gameScene').itemsContainer.updateItem(message.field);
    }
  }

  handleServerInfo(message){
    this.game.scene.getScene('gameScene').showPopup(message);
  }

  handleKickOut() {
    // console.log('kicked out');

    _client.joinOrCreate('lobby', {}).then((room) => {
      this.room.leave();
      // console.log('joined room:', room);
      document.getElementById('game').dispatchEvent(new CustomEvent('render-lobby', {detail: {room: room}}));
    }).catch((e) => {
      console.error('join error', e);
    });
  }

  handleRoomLeft(client) {
    // sessionStorage.setItem("PAC_Room_ID", room.id);
    // sessionStorage.setItem("PAC_Session_ID", room.sessionId);
    // console.log(client.id, 'left');
  }

  onPlayerClick(event) {
    const scene = this.game.scene.getScene('gameScene');

    // scene.fade();
    scene.boardManager.setPlayer(window.state.players[event.detail.id]);
    scene.battleManager.setPlayer(window.state.players[event.detail.id]);
    scene.synergiesContainer.changePlayer(window.state.players[event.detail.id]);
    scene.dpsMeterContainer.changePlayer(window.state.players[event.detail.id]);
  }

  onShopClick(event) {
    this.room.send('shop', {'id': event.detail.id});
  }

  onRefreshClick(event) {
    this.room.send('refresh');
  }

  onLockClick(event) {
    this.room.send('lock');
  }

  onLevelClick(event) {
    this.room.send('levelUp');
  }

  onDragDrop(event) {
    this.room.send('dragDrop', {'detail': event.detail});
  }

  onSellDrop(event) {
    this.room.send('sellDrop', {'detail': event.detail});
  }


  onLeaveGame(event){
/*
    window.removeEventListener('shop-click', this.onShopClick);
    window.removeEventListener('player-click', this.onPlayerClick);
    window.removeEventListener('refresh-click', this.onRefreshClick);
    window.removeEventListener('lock-click', this.onLockClick);
    window.removeEventListener('level-click', this.onLevelClick);
    window.removeEventListener('drag-drop', this.onDragDrop);
    window.removeEventListener('sell-drop', this.onSellDrop);
    window.removeEventListener('leave-game', this.onLeaveGame);
*/
    this.game.destroy(true);

    if(this.room.state.afterGameId == ''){
      let savePlayers = [];
      this.room.state.players.forEach(player => savePlayers.push(this.transformToSimplePlayer(player)));
      _client.create('after-game', {'players':savePlayers}).then((room) => {
        //this.room.send('set-afterGameId', {'id': room.id});
        this.room.leave();
        document.getElementById('game').dispatchEvent(new CustomEvent('render-after-game', {detail: {room: room}}));
        //console.log('joined room:', room);
      }).catch((e) => {
        console.error('join error', e);
      });
    }
    else{
      let savePlayers = [];
      this.room.state.players.forEach(player => savePlayers.push(this.transformToSimplePlayer(player)));
      _client.joinById(this.room.state.afterGameId, {'players':savePlayers}).then((room) => {
        this.room.leave();
        document.getElementById('game').dispatchEvent(new CustomEvent('render-after-game', {detail: {room: room}}));
        //console.log('joined room:', room);
      }).catch((e) => {
        console.error('join error', e);
      });
    }
  }

  transformToSimplePlayer(player){
    let simplePlayer = {
      name: player.name,
      id: player.id,
      rank: player.rank,
      avatar: player.avatar,
      pokemons: [],
      exp: player.exp
    };
    player.board.forEach(pokemon => {
      if(pokemon.positionY != 0){
        simplePlayer.pokemons.push(pokemon.name);
      }
    });
    return simplePlayer;
  }

  onPlayerRemove(player, key) {
    if (this.game == null || this.game.scene == null || this.game.scene.getScene('gameScene') == null || this.game.scene.getScene('gameScene').playerContainer == null) return;
    this.game.scene.getScene('gameScene').playerContainer.removePlayer(key);
  }

  onPlayerAdd(player) {
    if (this.game == null || this.game.scene == null || this.game.scene.getScene('gameScene') == null || this.game.scene.getScene('gameScene').playerContainer == null) return;
    this.game.scene.getScene('gameScene').playerContainer.addPlayer(player);
  }
}

export default GameContainer;
