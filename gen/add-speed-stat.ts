import { readFileSync, writeFileSync } from "fs"
import SPEED_BY_PKM from "../app/models/precomputed/speed-by-pkm.json"
import { getPokemonData } from "../app/models/precomputed/precomputed-pokemon-data"
import { max, min } from "../app/utils/number"
import { Pkm } from "../app/types/enum/Pokemon"

const filePath = "app/models/colyseus-models/pokemon.ts"

const ASBP = 0.1 // ATTACK_SPEED_BUFF_PENALTY, we assume the added value of the attack speed for on-hit effects is 10% of the attack damage ; must take into account the value of increased base ATK for effects
const PPBP = [0.15, 0.28, 0.32] // PP buff penalty, we assume PP generation from attacks is 10/28/32% of total PP generation by range
const AVERAGE_FULLY_EVOLVED_SPEED = 78 // average base Speed for a fully evolved Pokémon is 78.
const AVERAGE_TARGET_SPEED = 50
const SPEED_DIFF_ATTENUATION = 0.5
const SPEED_MODIFIER_FACTOR = AVERAGE_TARGET_SPEED / AVERAGE_FULLY_EVOLVED_SPEED

function pascalToUnderscoreUppercase(pascalCase) {
  if (typeof pascalCase !== "string") {
    throw new TypeError("Input must be a string")
  }

  if (!pascalCase) {
    return ""
  }

  const underscored = pascalCase.replace(/([A-Z])/g, "_$1").toLowerCase()
  const cleaned = underscored.startsWith("_")
    ? underscored.slice(1)
    : underscored

  return cleaned.toUpperCase()
}

try {
  // 1. Read the file
  const fileContent = readFileSync(filePath, "utf8")

  // 2. Find all values matching the pattern

  const modifiedContent = fileContent.replaceAll(
    /class (\w+) extends Pokemon \{([\s\S]*?)\n\}/gs,
    (match, className, classContent) => {
      // className: Name of the class (e.g., AlcremieMint)
      // classContent: Content within the curly braces
      if (!classContent) {
        console.error(
          `Error processing ${className}:`,
          "No class content found"
        )
        return match
      }
      const atkMatch = classContent.match(/atk = (\d+)/)
      if (!atkMatch) {
        console.error(`Error processing ${className}:`, "No attack value found")
        return match
      }
      const newPPMatch = classContent.match(/maxPP = (\d+)/)
      if (!newPPMatch) {
        console.error(`Error processing ${className}:`, "No maxPP value found")
        return match
      }

      const atk = parseInt(atkMatch[1])
      const maxPP = parseInt(newPPMatch[1])

      const pkm = pascalToUnderscoreUppercase(className)
      if (!SPEED_BY_PKM[pkm]) {
        console.error(`Error processing ${className}:`, "No PKM found: ", pkm)
        return match
      }

      const baseSpeed = SPEED_BY_PKM[pkm]
      const range = max(3)(getPokemonData(pkm as Pkm).range)
      if (!range) {
        console.error(`Error processing ${className}:`, "No range found")
        return match
      }

      if (!baseSpeed) {
        console.error(
          `Error processing ${className}:`,
          "No base speed value found"
        )
        return match
      }

      const speed = Math.round(
        (AVERAGE_FULLY_EVOLVED_SPEED +
          (baseSpeed - AVERAGE_FULLY_EVOLVED_SPEED) * SPEED_DIFF_ATTENUATION) *
          SPEED_MODIFIER_FACTOR
      )
      // newAtk = atk * 0.75/(0.4+0.007*(1+ASBP)*speed)
      /*const newAtk = min(1)(
        Math.round(
          (atk * AVERAGE_TARGET_SPEED) /
            (AVERAGE_TARGET_SPEED + (1 + ASBP) * (speed - AVERAGE_TARGET_SPEED))
        )
      )*/
      const newAtk = min(1)(
        Math.round((atk * 0.75) / (0.4 + 0.007 * (1 + ASBP) * speed))
      )
      const newMaxPP = min(10)(
        Math.round(
          (maxPP *
            (1 - (1 - (0.75 / (0.4 + 0.007 * speed)) * PPBP[range - 1]))) /
            10
        ) * 10
      )

      console.log(`New stats computed for ${className}:`, {
        atk,
        maxPP,
        speed,
        newAtk,
        newMaxPP
      })

      const modifiedClassContent = classContent
        .replace(/atk = (\d+)/, (match3, propName, propValue) => {
          return `atk = ${newAtk}\n  speed = ${speed}`
        })
        .replace(/maxPP = (\d+)/, (match3, propName, propValue) => {
          return `maxPP = ${newMaxPP}`
        })

      return `class ${className} extends Pokemon {${modifiedClassContent}}`
    }
  )

  // 3. Save the modified file
  writeFileSync(filePath, modifiedContent, "utf8")

  console.log(`File ${filePath} updated successfully.`)
} catch (error) {
  console.error(`Error processing file ${filePath}:`, error)
}
