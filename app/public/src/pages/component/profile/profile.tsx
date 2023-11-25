import React, { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { Tab, Tabs, TabList, TabPanel } from "react-tabs"
import PlayerBox from "./player-box"
import History from "./history"
import { useAppDispatch, useAppSelector } from "../../../hooks"
import {
  ban,
  giveBooster,
  giveRole,
  giveTitle,
  searchName,
  unban
} from "../../../stores/NetworkStore"
import { SearchBar } from "./search-bar"
import { NameTab } from "./name-tab"
import { AvatarTab } from "./avatar-tab"
import { TitleTab } from "./title-tab"
import { Title, Role } from "../../../../../types"
import SearchResults from "./search-results"
import "./profile.css"
import { setSearchedUser, setSuggestions } from "../../../stores/LobbyStore"
import { GadgetsTab } from "./gadgets-tab"

export default function Profile() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.lobby.user)
  const suggestions = useAppSelector((state) => state.lobby.suggestions)
  const searchedUser = useAppSelector((state) => state.lobby.searchedUser)

  const profile = searchedUser ?? user

  function onSearchQueryChange(query: string) {
    if (query) {
      dispatch(searchName(query))
    } else {
      resetSearch()
    }
  }

  const resetSearch = useCallback(() => {
    dispatch(setSearchedUser(undefined))
    dispatch(setSuggestions([]))
  }, [dispatch])

  return (
    <div className="nes-container profile">
      <div className="profile-box">
        <h1>{t("profile")}</h1>
        {profile && <PlayerBox user={profile} />}
      </div>

      <SearchBar onChange={onSearchQueryChange} />

      <div className="profile-actions">
        {searchedUser ? (
          <OtherProfileActions resetSearch={resetSearch} />
        ) : suggestions.length > 0 ? (
          <SearchResults />
        ) : (
          <MyProfileMenu />
        )}
      </div>

      {profile && <History history={profile.history} />}
    </div>
  )
}

function MyProfileMenu() {
  const { t } = useTranslation()
  return (
    <Tabs>
      <TabList>
        <Tab>{t("name")}</Tab>
        <Tab>{t("avatar")}</Tab>
        <Tab>{t("title_label")}</Tab>
        <Tab>{t("gadgets")}</Tab>
      </TabList>

      <TabPanel>
        <NameTab />
      </TabPanel>
      <TabPanel>
        <AvatarTab />
      </TabPanel>
      <TabPanel>
        <TitleTab />
      </TabPanel>
      <TabPanel>
        <GadgetsTab />
      </TabPanel>
    </Tabs>
  )
}

function OtherProfileActions({ resetSearch }) {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const role = useAppSelector((state) => state.lobby.user?.role)
  const user = useAppSelector((state) => state.lobby.searchedUser)
  const [title, setTitle] = useState<Title>(user?.title || Title.ACE_TRAINER)
  const [profileRole, setProfileRole] = useState<Role>(user?.role ?? Role.BASIC)

  const giveButton =
    user && role && role === Role.ADMIN ? (
      <button
        className="bubbly green"
        onClick={() => {
          dispatch(
            giveBooster({
              numberOfBoosters: Number(prompt("How many boosters ?")) || 1,
              uid: user.id
            })
          )
        }}
      >
        <p style={{ margin: "0px" }}>{t("give_boosters")}</p>
      </button>
    ) : null

  const banButton =
    user && role && (role === Role.ADMIN || role === Role.MODERATOR) ? (
      <button
        className="bubbly red"
        onClick={() => {
          const reason = prompt(`Reason for the ban:`)
          dispatch(
            ban({ uid: user.id, name: user.name, reason: reason ? reason : "" })
          )
        }}
      >
        <p style={{ margin: "0px" }}>{t("ban_user")}</p>
      </button>
    ) : null

  const unbanButton =
    user && role && (role === Role.ADMIN || role === Role.MODERATOR) ? (
      <button
        className="bubbly red"
        onClick={() => {
          dispatch(unban({ uid: user.id, name: user.name }))
        }}
      >
        <p style={{ margin: "0px" }}>{t("unban_user")}</p>
      </button>
    ) : null

  const roleButton =
    user && role && role === Role.ADMIN ? (
      <div style={{ display: "flex" }}>
        <button
          className="bubbly orange"
          onClick={() => {
            dispatch(giveRole({ uid: user.id, role: profileRole }))
          }}
        >
          {t("give_role")}
        </button>
        <select
          value={profileRole}
          onChange={(e) => {
            setProfileRole(e.target.value as Role)
          }}
        >
          {Object.keys(Role).map((r) => (
            <option key={r} value={r}>
              {t("role." + r).toUpperCase()}
            </option>
          ))}
        </select>
      </div>
    ) : null

  const titleButton =
    user && role && role === Role.ADMIN ? (
      <div style={{ display: "flex" }}>
        <button
          className="bubbly blue"
          onClick={() => {
            dispatch(giveTitle({ uid: user.id, title: title }))
          }}
        >
          {t("give_title")}
        </button>
        <select
          value={title}
          onChange={(e) => {
            setTitle(e.target.value as Title)
          }}
        >
          {Object.keys(Title).map((ti) => (
            <option key={ti} value={ti}>
              {ti}
            </option>
          ))}
        </select>
      </div>
    ) : null

  return role === Role.ADMIN || role === Role.MODERATOR ? (
    <div className="actions">
      {giveButton}
      {roleButton}
      {titleButton}
      {banButton}
      {unbanButton}
      <button className="bubbly blue" onClick={resetSearch}>
        {t("back_to_my_profile")}
      </button>
    </div>
  ) : null
}
