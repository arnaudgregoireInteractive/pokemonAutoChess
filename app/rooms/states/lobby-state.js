const schema = require('@colyseus/schema');
const Message = require('../../models/colyseus-models/message');
const GameUser = require('../../models/colyseus-models/game-user');
const LeaderboardPlayer = require('../../models/colyseus-models/leaderboard-player');
const Chat = require('../../models/mongo-models/chat');
const Filter = require('bad-words');

class LobbyState extends schema.Schema {
  constructor() {
    super();
    this.messages = new schema.ArraySchema();
    this.leaderboard = new schema.ArraySchema();
    this.users = new schema.MapSchema();
    this.filter = new Filter();
  }

  addMessage(name, payload, avatar, time, save) {
    if (this.messages.length > 200) {
      this.messages.splice(0, 1);
    }
    const safeName = name.split('@')[0];
    if(safeName.includes('guest')){
    }
    else{
      let safePayload = payload;
      try{
        safePayload = this.filter.clean(payload);
      }
      catch (error) {
      console.error('bad words library error');
      } 
      const message = new Message(safeName, safePayload, avatar, time);
      this.messages.push(message);
      // console.log(message.name);
      if (save) {
        Chat.create({'name': message.name, 'avatar': message.avatar, 'payload': message.payload, 'time': message.time});
      }
    }
  }
}

schema.defineTypes(LobbyState, {
  messages: [Message],
  users: {map: GameUser},
  leaderboard: [LeaderboardPlayer]
});

module.exports = LobbyState;
