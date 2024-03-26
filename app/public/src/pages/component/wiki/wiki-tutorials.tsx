import React from "react"
import { useTranslation } from "react-i18next"

export default function WikiTutorials() {
  const { t } = useTranslation()
  return (
    <div className="wiki-tutorials">
      <ul>
        <li className="nes-container">
          <iframe
            src="https://www.youtube.com/embed/Uq-r48kV0t0"
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          ></iframe>
          <h3>{t("tutorial.start")}</h3>
        </li>
        <li className="nes-container">
          <iframe
            src="https://www.youtube.com/embed/E_vvXdHosXg"
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          ></iframe>
          <h3>{t("tutorial.friends")}</h3>
        </li>
        <li className="nes-container">
          <iframe
            src="https://www.youtube.com/embed/LCU5oSyZagw"
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          ></iframe>
          <h3>{t("tutorial.screen")}</h3>
        </li>
        <li className="nes-container">
          <iframe
            src="https://www.youtube.com/embed/UjV2TkGYIuM"
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          ></iframe>
          <h3>{t("tutorial.tips")}</h3>
        </li>
      </ul>
      <p>
        {t("thanks_to")}&nbsp;
        <a href="https://www.youtube.com/@batotsu2751" target="_blank">
          Batotsu
        </a>{" "}
        {t("tutorial_work")}
      </p>
    </div>
  )
}
