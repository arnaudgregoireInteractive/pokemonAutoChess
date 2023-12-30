# New Pokemons:

- Sableye
- Pheromosa
- Dracovish
- Corsola
- Galar Gorsola
- Cursola
- Gimmighoul
- Gholdengo

# Changes to Pokemon & Abilities

- Added sprites for Vanilluxe and Dragapult
- Nerf Attract: duration ~~2.5~~ 1 second
- Nerf Lotad line HP: ~~80/150/260~~ 60/115/220, def/spedef: ~~2/3/4~~ 1/2/3
- Buff Comfey HP ~~100~~ 150, Attack ~~10~~ 15
- Tandemaus is now tier-2, Maushold (4) is now tier-4; added several tiers of damage for Population Bomb
- Buff Maushold HP: ~~190/230~~ 200/240 Attack: ~~19/23~~ 20/24
- Nerf Hitmontop: Attack ~~22~~ 20, PP ~~75~~ 80
- Buff Hitmonlee: Attack ~~25~~ 30
- Buff Hoopa HP ~~150~~ 180
- Tropius: added Grass synergy ; adjusted passive: At the start of each fight, add a random berry to pokemon items. **If full, berry is added to player items instead.**
- Buff Mankey Attack ~~8~~ 10
- Buff Primeape Attack ~~21~~ 26, spe def ~~2~~ 4
- Nerf Xurkitree: Attack ~~20~~ 16 ; nerf Charge beam: ~~80~~ 60 special damage, no longer increase AP per missed target
- Buff Kartana HP: ~~200~~ 230, Spe def: ~~1~~ 2 Pp: ~~70~~ 65
- Nerf Altaria Hyper voice ~~50/100/200~~ 45/90/200 
- Nerf Disarming Voice ~~10/20/40~~ 10/20/30 pp
- Nerf Chimecho pp ~~80~~ 90
- Nerf Regieleki pp ~~80~~ 90
- Nerf Drizzile Atk ~~26~~ 23 HP ~~240~~ 200 
- Buff Breloom ~~15~~ 18
- Buff Maractus Spe def ~~3~~ 4 Atk ~~15~~ 16 Pp ~~100~~ 85
- Buff Stoutland retaliate ability ~~5/10/20~~ 10/15/25 additional damage

# Changes to Synergies

- Nerf aquatic: 35/45/55% chance to drain 20 PP from target
- Nerf ice: ~~2/4/8/15/30~~ 2/3/6/12/24 Spe def
- Add Baby 7: Golden Eggs: Eggs can be sold for 10 gold
- Light adjustments:
  - (2) Shining Ray: Increase AP and Atttack by 30%
  - (3) Light Pulse: Also give +10 PP per second
  - (4) Eternal Light: Also give 30% Attack Speed and Rune Protect for 10 seconds
  - (5) Max Illumination: Also give 100 Shield and Resurection
- Add Ground 8, removed ground effect cap, changed Sandstorm threshold to 8 units
- Psy 6 Eerie Spell also give a chance to find Unown in shop just like Psy 4 Light Screen

# Changes to Items

# UI

# Bugfix

- Arceus/Kecleon dynamic synergies should now also work in bot builder / team planner
- Fix Munchlax sometimes not carrying over its HP stacked to Snorlax
- Units now retarget correctly to the charmer after being charmed
- Prevent some ability animations to loop
- Fix Prismatic Laser animation position

# Misc

- New status Curse: KOs the unit at the end of the time limit
- Improve targeting by addding a second targeting algorithm for targets at range, more performant and precise than the previous one
- Reduce lag when switching between moving state and attacking state
- Minimum attack stat value is now 1 instead of 0
- Self damage is no longer counted in DPS report (example: Flame orb)
- Increased duration of stage 10 and 20 pick phase from 40 to 45 seconds
- Changed shop rarities percentages per level ; uncommon are more common at levels 5-6, commons are less common at levels 6-9. Full details [here](https://discord.com/channels/737230355039387749/1184447560845377719)
- Another ranked lobby opens when the previous one is full
- Further compress animations to improve loading times
