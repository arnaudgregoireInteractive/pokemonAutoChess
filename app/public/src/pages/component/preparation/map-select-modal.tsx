import React from "react"
import { useTranslation } from "react-i18next"
import { DungeonPMDO } from "../../../../../types/enum/Dungeon"
import { useAppDispatch } from "../../../hooks"
import { selectTilemap } from "../../../stores/NetworkStore"
import { BasicModal } from "../modal/modal"
import "./map-select-modal.css"

export function MapSelectModal(props: {
  show: boolean
  handleClose: () => void
}) {
  const dispatch = useAppDispatch()
  const { t } = useTranslation()
  const maps = Object.keys(DungeonPMDO).sort((a, b) =>
    (t("map." + a) as string).localeCompare(t("map." + b))
  ) as DungeonPMDO[]

  function selectMap(map: DungeonPMDO | "random") {
    dispatch(selectTilemap(map))
    props.handleClose()
  }

  return (
    <BasicModal
      title={t("select_map")}
      show={props.show}
      handleClose={() => props.handleClose()}
      body={
        <ul id="map-select-modal" className="nes-container">
          <li onClick={() => selectMap("random")}>
            <img src="/assets/maps/random.png" alt="random" />
            <span>{t("map.random")}</span>
          </li>
          {maps.map((m) => (
            <li key={m} onClick={() => selectMap(m)}>
              <img src={`/assets/maps/${m}-preview.png`} alt={m} />
              <span>{t("map." + m)}</span>
            </li>
          ))}
        </ul>
      }
    />
  )
}
