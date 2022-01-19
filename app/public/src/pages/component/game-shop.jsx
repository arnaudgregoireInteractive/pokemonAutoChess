import React, { Component } from 'react';
import GameRefresh from './game-refresh';
import GameLock from './game-lock';
import GameLevel from './game-level';
import GameExperience from './game-experience';
import GameStore from './game-store';
import GameMoneyDetail from './game-money-detail';
import ReactTooltip from 'react-tooltip';

class GameShop extends Component{

    render(){
        const style = {
            position:'absolute',
            left:'5%',
            bottom:'0.5%',
            width:'90%',
            height:'15%',
            backgroundColor: 'rgba(255, 255, 255, 0.7)'
        }

        return <div style={style} className='nes-container'>
            <div style={{position: 'absolute', bottom:'15%', left:'1%', fontSize: '22px'}}
                data-tip
                data-for={'money-tooltip'}>
                 <ReactTooltip id={'money-tooltip'} 
                    className='customeTheme' 
                    textColor='#000000' 
                    backgroundColor='rgba(255,255,255,1)' 
                    effect='solid'
                >
                    <GameMoneyDetail money={this.props.money} interest={this.props.interest} streak={this.props.streak} history={this.props.history}/>
                </ReactTooltip>
                {this.props.money}<img style={{width:'25px', marginBottom:'6px'}} src="/assets/ui/money.png"/>
            </div>
            <GameLock  shopLocked={this.props.shopLocked} lock={this.props.lock}/>
            <GameRefresh refresh={this.props.refresh}/>
            <GameLevel level={this.props.level}/>
            <GameExperience level={this.props.levelExp} experience={this.props.experience} experienceNeeded={this.props.experienceNeeded}/>
            <GameStore shop={this.props.shop} shopClick={this.props.shopClick}/>
        </div>;
    }
}

export default GameShop;