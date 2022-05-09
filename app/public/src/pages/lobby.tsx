import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Chat from './component/chat/chat';
import CurrentUsers from './component/available-user-menu/current-users';
import RoomMenu from './component/available-room-menu/room-menu';
import TabMenu from './component/lobby-menu/tab-menu';
import firebase from 'firebase/compat/app';
import { FIREBASE_CONFIG } from './utils/utils';
import { Client, Room, RoomAvailable } from 'colyseus.js';
import DiscordButton from './component/buttons/discord-button';
import DonateButton from './component/buttons/donate-button';
import PolicyButton from './component/buttons/policy-button';
import CreditsButton from './component/buttons/credits-button';
import Wiki from './component/wiki/wiki';
import TeamBuilder from './component/bot-builder/team-builder';
import MetaReport from './component/meta-report/meta-report';
import { useAppDispatch, useAppSelector } from '../hooks';
import { joinLobby, logIn, logOut, requestMeta, requestBotList } from '../stores/NetworkStore';
import { setBotData, setBotList, setPastebinUrl, setMetaItems, setMeta, addRoom, addUser, changeUser, pushBotLeaderboard, pushLeaderboard, pushMessage, removeRoom, removeUser, setSearchedUser, setUser, leaveLobby, changePokemonConfig, addPokemonConfig, setBoosterContent, setBotMonitor } from '../stores/LobbyStore';
import { ICustomLobbyState, Transfer } from '../../../types';
import LobbyUser from '../../../models/colyseus-models/lobby-user';
import { IBot } from '../../../models/mongo-models/bot-v2';
import { IMeta } from '../../../models/mongo-models/meta';
import { IItemsStatistic } from '../../../models/mongo-models/items-statistic';
import PokemonCollection from './component/collection/pokemon-collection';
import PokemonConfig from '../../../models/colyseus-models/pokemon-config';
import Booster from './component/booster/booster';
import { IBotMonitoring } from '../../../models/mongo-models/bot-monitoring';

export default function Lobby(){
    const dispatch = useAppDispatch();

    const client: Client = useAppSelector(state=>state.network.client);
    const uid: string = useAppSelector(state=>state.network.uid);
    const meta: IMeta[] = useAppSelector(state=>state.lobby.meta);
    const metaItems: IItemsStatistic[] = useAppSelector(state=>state.lobby.metaItems);
    const botList: {name: string, avatar: string}[] = useAppSelector(state=>state.lobby.botList);
    
    const [lobbyJoined, setLobbyJoined] = useState<boolean>(false);
    const [showWiki, toggleWiki] = useState<boolean>(false);
    const [showMeta, toggleMeta] = useState<boolean>(false);
    const [showBuilder, toggleBuilder] = useState<boolean>(false);
    const [showCollection, toggleCollection] = useState<boolean>(false);
    const [showBooster, toggleBooster] = useState<boolean>(false);
    const [toPreparation, setToPreparation] = useState<boolean>(false);
    
    const lobbyStyle = {display:'flex',justifyContent:'space-between'};
    const buttonStyle= {marginLeft:'10px',marginTop:'10px',marginRight:'10px'};
    

    useEffect(()=>{

        const join = async () => {
            if (!firebase.apps.length) {
                firebase.initializeApp(FIREBASE_CONFIG);
            } 
            firebase.auth().onAuthStateChanged(async user => {
                if(user) {
                    dispatch(logIn(user));
                    const token = await user.getIdToken();
                    const room: Room<ICustomLobbyState> = await client.joinOrCreate('lobby', {idToken: token});
                    room.state.messages.onAdd = (m) => {dispatch(pushMessage(m))};
    
                    room.state.users.onAdd = (u) => {
                        dispatch(addUser(u));
                        if(u.id == user.uid){
                            u.pokemonCollection.onAdd = (pokemonConfig, key) => {
                                const p = pokemonConfig as PokemonConfig;
                                dispatch(addPokemonConfig(p));
                                p.onChange = (changes) => {
                                    changes.forEach(change=>{
                                        dispatch(changePokemonConfig({id: key, field: change.field, value: change.value}));
                                    });
                                }
                            }
                            dispatch(setUser(u));
                            setSearchedUser(u);
                        }
                        u.onChange = (changes) => {
                            changes.forEach(change=>{
                                dispatch(changeUser({id: u.id, field: change.field, value: change.value}));
                            });
                        };
                    };

                    room.state.users.onRemove = (u) => {dispatch(removeUser(u.id))};

                    room.state.leaderboard.onAdd = (l) => {dispatch(pushLeaderboard(l))};
                    
                    room.state.botLeaderboard.onAdd = (l) => {dispatch(pushBotLeaderboard(l))};

                    room.onMessage(Transfer.PASTEBIN_URL, (json: { url: string; }) => {dispatch(setPastebinUrl(json.url))});

                    room.onMessage('rooms', (rooms: RoomAvailable[]) => {rooms.forEach(room=>dispatch(addRoom(room)))});

                    room.onMessage(Transfer.REQUEST_BOT_LIST, (bots: {name: string, avatar: string}[]) => {dispatch(setBotList(bots))});
                    
                    room.onMessage('+', ([roomId, room]) => {if(room.name == 'room'){dispatch(addRoom(room))}});
                
                    room.onMessage('-', (roomId: string) => dispatch(removeRoom(roomId)));

                    room.onMessage(Transfer.USER, (user: LobbyUser) => dispatch(setSearchedUser(user)));

                    room.onMessage(Transfer.REQUEST_META, (meta: IMeta[]) => {dispatch(setMeta(meta))});

                    room.onMessage(Transfer.REQUEST_META_ITEMS, (metaItems: IItemsStatistic[]) => {dispatch(setMetaItems(metaItems))});

                    room.onMessage(Transfer.REQUEST_BOT_MONITOR, (botMonitor: IBotMonitoring[]) => {dispatch(setBotMonitor(botMonitor))});

                    room.onMessage(Transfer.REQUEST_BOT_DATA, (data: IBot) => { dispatch(setBotData(data))});

                    room.onMessage(Transfer.BOOSTER_CONTENT, (boosterContent: string[]) => {dispatch(setBoosterContent(boosterContent))});

                    dispatch(joinLobby(room));
                }
            });
        };
        if(!lobbyJoined){
            join();
            setLobbyJoined(true);
        }
    });

    if(!uid){
        return <div>
        </div>;
      }
      if(toPreparation){
          return <Navigate to='/preparation'></Navigate>
      }
      if(showCollection){
          return <PokemonCollection toggleCollection={()=>toggleCollection(!showCollection)}/>;
      }
      if(showBooster){
          return <Booster toggle={()=>{toggleBooster(!showBooster)}}/>;
      }
      if(showWiki){
        return <Wiki toggleWiki={()=>toggleWiki(!showWiki)}/>;
      }
      if(showMeta && meta.length > 0 && metaItems.length > 0){
          return <MetaReport toggleMeta={()=>toggleMeta(!showMeta)} meta={meta} metaItems={metaItems}/>;
      }
      if(showBuilder){
          return <TeamBuilder 
          toggleBuilder={()=>toggleBuilder(!showBuilder)}
          />
      }
      else{
        return (
            <div className='App'>
                <div style={{display:'flex'}}>
                    <Link to='/auth'>
                            <button className='nes-btn is-error' style={buttonStyle} onClick={()=>{firebase.auth().signOut(); dispatch(leaveLobby()); dispatch(logOut())}}>Sign Out</button>
                    </Link>
                    <button className='nes-btn is-primary' style={buttonStyle} onClick={()=>{toggleCollection(!showCollection)}}>Collection</button>
                    <button className='nes-btn is-primary' style={buttonStyle} onClick={()=>{toggleBooster(!showBooster)}}>Booster</button>
                    <DiscordButton/>
                    <button className='nes-btn is-success' style={buttonStyle} onClick={()=>{toggleWiki(!showWiki)}}>Wiki</button>
                    <button className='nes-btn is-success' style={buttonStyle} onClick={()=>{
                        if(botList.length == 0) {
                            dispatch(requestBotList());
                        }
                        toggleBuilder(!showBuilder)
                        }}>BOT Builder</button>
                    <button className='nes-btn is-success' style={buttonStyle} onClick={()=>{
                        if(meta.length == 0 || metaItems.length == 0){
                            dispatch(requestMeta());
                        }
                        toggleMeta(!showMeta);
                        }}>Meta Report</button>
                    <DonateButton/>
                    <PolicyButton/>
                    <CreditsButton/>
                </div>

                <div style={lobbyStyle}>
                    <TabMenu/>
                    <RoomMenu toPreparation={toPreparation} setToPreparation={setToPreparation}/>
                    <CurrentUsers/>
                    <Chat source='lobby'/>
                </div>
            </div>
        );
    }
}