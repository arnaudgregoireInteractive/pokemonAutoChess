import React from "react"

export default function DiscordButton() {
  function handleDiscordClick() {
    window.location.href = "https://discord.gg/6JMS7tr"
  }
  return (
    <button
      type="button"
      className="bubbly"
      onClick={() => {
        handleDiscordClick()
      }}
    >
      <img src="assets/ui/discord.svg" style={{ height: "100%" }} />
    </button>
  )
}
