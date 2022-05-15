import PokemonCollectionItem from './pokemon-collection-item'
import PokemonFactory from '../../../../../models/pokemon-factory'
import React, { Dispatch, SetStateAction } from 'react'
import {useAppSelector} from '../../../hooks'
import { ITracker } from '../../../../../types/ITracker'
import { Ability } from '../../../../../types/enum/Ability'
import { Synergy } from '../../../../../types/enum/Synergy'
import {Pkm} from '../../../../../types/enum/Pokemon'
import { Pokemon } from '../../../../../models/colyseus-models/pokemon'


export default function PokemonCarousel(props: {type: Synergy, setPokemon:Dispatch<SetStateAction<Pkm | undefined>>, metadata:{[key: string]: ITracker}}){
    const pokemonCollection = useAppSelector(state=>state.lobby.pokemonCollection)
    const elligiblePokemons = new Array<Pokemon>();
    (Object.values(Pkm) as Pkm[]).forEach(v=>{
        const pkm = PokemonFactory.createPokemonFromName(v)
        if(pkm.skill !== Ability.DEFAULT && pkm.types.includes(Synergy[props.type])){
            elligiblePokemons.push(pkm)
        }
    })

    return <div style={{display:'flex', flexWrap:'wrap'}}>
        {elligiblePokemons.map(pkm=>{
        const pathIndex = pkm.index.split('-')
        let m: ITracker | undefined = undefined
            if(pathIndex.length == 1){
                m = props.metadata[pkm.index]
            }
            else if(pathIndex.length == 2){
                m = props.metadata[pathIndex[0]].subgroups[pathIndex[1]]
            }
            if(m){
                return <PokemonCollectionItem key={`${pkm.index}-${props.type}`} name={pkm.name} index={pkm.index} metadata={m} config={pokemonCollection.find(p=>p.id == pkm.index)} setPokemon={props.setPokemon}/>
            }
            else{
                return null
            }
        })}
    </div>
}