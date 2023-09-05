import React, { useState } from "react"
import { useAppDispatch, useAppSelector } from "../../../hooks"
import { sendMessage } from "../../../stores/NetworkStore"
import ChatHistory from "./chat-history"
import "./chat.css"
import { useTranslation } from "react-i18next"

const MAX_MESSAGE_LENGTH = 250

export default function Chat(props: { source: string }) {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const [currentText, setCurrentText] = useState<string>("")
  const user = useAppSelector((state) => state[props.source].user)

  return (
    <div className="nes-container user-chat custom-bg">
      <h1>{user?.anonymous ? t("chat_disabled_anonymous") : "Chat"}</h1>
      <ChatHistory source={props.source} />
      <form
        onSubmit={(e) => {
          if (!user?.anonymous) {
            e.preventDefault()
            dispatch(sendMessage(currentText))
            setCurrentText("")
          }
        }}
      >
        <input
          placeholder={
            user?.anonymous ? t("chat_disabled_anonymous") : t("type_here")
          }
          disabled={user?.anonymous}
          type="text"
          title={
            user?.anonymous ? t("chat_disabled_anonymous") : t("type_here")
          }
          onChange={(e) => {
            setCurrentText(e.target.value)
          }}
          value={currentText}
          maxLength={MAX_MESSAGE_LENGTH}
          className="my-input"
        />
        <button
          className="bubbly blue"
          disabled={user?.anonymous}
          title={
            user?.anonymous ? t("chat_disabled_anonymous") : t("send_message")
          }
        >
          {t("send")}
        </button>
      </form>
    </div>
  )
}
