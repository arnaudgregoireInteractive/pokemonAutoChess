import { t } from "i18next"
import React from "react"

export default function DonateButton() {
  return (
    <a href="https://en.tipeee.com/pokemon-auto-chess" target="_blank" rel="noopener noreferrer">
      <button className="bubbly pink">
        <img src="assets/ui/donate.svg" alt="" />
        <span className="btn-txt">{t("donate")}</span>
        <img
          src="assets/ui/tipeee.svg"
          style={{
            height: "1.25em",
            marginLeft: "0.25em",
            display: "inline-block"
          }}
        />
      </button>
    </a>
  )
}
