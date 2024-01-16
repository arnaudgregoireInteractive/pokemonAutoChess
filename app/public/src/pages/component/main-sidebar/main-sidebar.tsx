import React, { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { useTranslation } from "react-i18next"
import { Sidebar, Menu, MenuItem, MenuItemProps } from "react-pro-sidebar"
import { useAppDispatch, useAppSelector } from "../../../hooks"
import { setSearchedUser } from "../../../stores/LobbyStore"
import { Role } from "../../../../../types"
import { cc } from "../../utils/jsx"
import Booster from "../booster/booster"
import PokemonCollection from "../collection/pokemon-collection"
import Profile from "../profile/profile"
import GameOptionsModal from "../game/game-options-modal"
import MetaReport from "../meta-report/meta-report"
import KeybindInfo from "../keybind-info/keybind-info"
import { BasicModal } from "../modal/modal"
import Patchnotes from "../patchnotes/patchnotes"
import { usePatchVersion } from "../patchnotes/usePatchVersion"
import Wiki from "../wiki/wiki"
import TeamBuilderModal from "../bot-builder/team-builder-modal"
import Jukebox from "../jukebox/jukebox"
import { ServerAnnouncementForm } from "../server-announcement/server-announcement-form"
import { GADGETS } from "../../../../../core/gadgets"
import pkg from "../../../../../../package.json"

import "./main-sidebar.css"

export type Page = "main_lobby" | "preparation" | "game"

interface MainSidebarProps {
  page: Page
  leave: () => void
  leaveLabel: string
}

export function MainSidebar(props: MainSidebarProps) {
  const { page, leave, leaveLabel } = props
  const [collapsed, setCollapsed] = useState(true)
  const navigate = useNavigate()
  const [modal, setModal] = useState<Modals>()
  const changeModal = useCallback(
    (nextModal: Modals) => setModal(nextModal),
    []
  )
  const sidebarRef = useRef<HTMLHtmlElement>(null)

  const { t } = useTranslation()
  const user = useAppSelector((state) => state.lobby.user)
  const profile = useAppSelector((state) => state.network.profile)
  const profileLevel = profile?.level ?? 0

  const { isNewPatch, updateVersionChecked } = usePatchVersion()

  const version = pkg.version

  const numberOfBooster = profile?.booster ?? 0

  useEffect(() => {
    if (!sidebarRef.current) {
      return
    }

    const ref = sidebarRef.current

    const enableSidebar = () => {
      if (collapsed) {
        setCollapsed(false)
      }
    }

    const disableSidebar = () => {
      if (!collapsed) {
        setCollapsed(true)
      }
    }

    ref.addEventListener("mouseenter", enableSidebar)
    ref.addEventListener("mouseleave", disableSidebar)

    return () => {
      if (ref) {
        ref.removeEventListener("mouseenter", enableSidebar)
        ref.removeEventListener("mouseleave", disableSidebar)
      }
    }
  }, [collapsed])

  return (
    <Sidebar
      collapsed={collapsed}
      backgroundColor="#61738a"
      className="sidebar"
      ref={sidebarRef}
    >
      <Menu>
        <div className="sidebar-logo">
          <img src={`assets/ui/colyseus-icon.png`} />
          <div>
            <h1>Pokemon Auto Chess</h1>
            <small>v{version}</small>
          </div>
        </div>

        <NavLink
          location="news"
          svg="newspaper"
          handleClick={(newModal) => {
            changeModal(newModal)
            if (isNewPatch) {
              updateVersionChecked()
            }
          }}
          shimmer={isNewPatch}
        >
          {t("news")}
        </NavLink>

        {page === "main_lobby" && (
          <NavLink location="profile" svg="profile" handleClick={changeModal}>
            {t("profile")}
          </NavLink>
        )}

        {/** TODO Enable these once we populate preparation room pokemonCollection */}
        {page === "main_lobby" && profileLevel >= GADGETS.BAG.levelRequired && (
          <NavLink
            location="collection"
            svg="collection"
            className="blue"
            handleClick={changeModal}
          >
            {t("collection")}
          </NavLink>
        )}
        {page === "main_lobby" && profileLevel >= GADGETS.BAG.levelRequired && (
          <NavLink
            location="booster"
            svg="booster"
            className="blue"
            handleClick={changeModal}
            shimmer={numberOfBooster > 0}
          >
            {t("boosters")}
          </NavLink>
        )}
        <NavLink
          location="wiki"
          svg="wiki"
          className="green"
          handleClick={changeModal}
        >
          {t("wiki")}
        </NavLink>
        <NavLink
          svg="meta"
          className="green"
          location="meta"
          handleClick={changeModal}
        >
          {t("meta")}
        </NavLink>

        {profileLevel >= GADGETS.TEAM_PLANNER.levelRequired && (
          <NavLink
            svg="team-builder"
            location="team-builder"
            handleClick={changeModal}
          >
            {t("team_builder")}
          </NavLink>
        )}

        {page !== "game" &&
          user?.anonymous === false &&
          profileLevel >= GADGETS.BOT_BUILDER.levelRequired && (
            <NavLink svg="bot" onClick={() => navigate("/bot-builder")}>
              {t("bot_builder")}
            </NavLink>
          )}

        {page !== "game" && user?.role === Role.ADMIN && (
          <>
            <NavLink
              svg="pokemon-sprite"
              onClick={() => navigate("/sprite-viewer")}
            >
              Sprite Viewer
            </NavLink>
            <NavLink svg="map" onClick={() => navigate("/map-viewer")}>
              Map Viewer
            </NavLink>
            <>
              <NavLink
                svg="megaphone"
                location="announcement"
                handleClick={changeModal}
              >
                Announcement
              </NavLink>
            </>
          </>
        )}

        {page === "game" && (
          <NavLink svg="keyboard" location="keybinds" handleClick={changeModal}>
            {t("key_bindings")}
          </NavLink>
        )}

        {page === "game" && profileLevel >= GADGETS.JUKEBOX.levelRequired && (
          <NavLink
            svg="compact-disc"
            location="jukebox"
            handleClick={changeModal}
          >
            Jukebox
          </NavLink>
        )}

        <NavLink svg="options" location="options" handleClick={changeModal}>
          {t("options")}
        </NavLink>

        <div className="spacer"></div>

        {!collapsed && page !== "game" && (
          <div className="additional-links">
            <a
              href="https://github.com/keldaanCommunity/pokemonAutoChess/blob/master/policy.md"
              target="_blank"
            >
              {t("policy")}
            </a>
          </div>
        )}

        {page !== "game" && (
          <NavLink
            svg="donate"
            className="tipeee"
            onClick={() =>
              window.open("https://en.tipeee.com/pokemon-auto-chess", "_blank")
            }
          >
            {t("donate")}
            <img
              src="assets/ui/tipeee.svg"
              style={{
                height: "1.25em",
                display: "inline-block"
              }}
            />
          </NavLink>
        )}

        {page !== "game" && (
          <NavLink
            svg="discord"
            className="discord"
            onClick={() => window.open("https://discord.gg/6JMS7tr", "_blank")}
          >
            Discord
          </NavLink>
        )}

        <NavLink svg="exit-door" className="red logout" onClick={leave}>
          {leaveLabel}
        </NavLink>
      </Menu>

      <Modals modal={modal} setModal={setModal} page={page} />
    </Sidebar>
  )
}

type NavLinkProps = MenuItemProps &
  NavPageLink & {
    svg?: string
    png?: string
    shimmer?: boolean
    className?: string
  }

type NavPageLink = {
  location?: Modals
  handleClick?: (update: Modals) => void
}

function NavLink(props: NavLinkProps) {
  const {
    children,
    location,
    handleClick,
    shimmer = false,
    svg,
    png,
    icon,
    className = "default",
    onClick
  } = props

  return (
    <MenuItem
      className={cc("menu-item", className, shimmer ? "shimmer" : "")}
      onClick={(e) => {
        onClick?.(e)
        if (location) {
          handleClick?.(location)
        }
      }}
      icon={
        <div className="icon">
          {shimmer && (
            <span className="notification">
              <img width={10} height={10} src="assets/ui/pokeball.svg" />
            </span>
          )}
          {svg ? (
            <img width={32} height={32} src={`assets/ui/${svg}.svg`} />
          ) : png ? (
            <img height={32} src={`assets/ui/${png}.png`} />
          ) : (
            icon
          )}
        </div>
      }
    >
      {children}
    </MenuItem>
  )
}

export type Modals =
  | "profile"
  | "meta"
  | "wiki"
  | "team-builder"
  | "collection"
  | "booster"
  | "news"
  | "options"
  | "keybinds"
  | "jukebox"
  | "announcement"

function Modals({
  modal,
  setModal,
  page
}: {
  modal?: Modals
  setModal: (nextModal?: Modals) => void
  page: Page
}) {
  const searchedUser = useAppSelector((state) => state.lobby.searchedUser)

  const dispatch = useAppDispatch()

  const closeModal = useCallback(() => setModal(undefined), [setModal])
  const { t } = useTranslation()

  useEffect(() => {
    if (searchedUser && modal !== "profile") {
      setModal("profile")
    }
  }, [modal, searchedUser, setModal])

  return (
    <>
      <BasicModal
        handleClose={closeModal}
        show={modal === "news"}
        body={<Patchnotes />}
      />
      <BasicModal
        handleClose={() => {
          closeModal()
          dispatch(setSearchedUser(undefined))
        }}
        show={modal === "profile"}
        body={<Profile />}
      />
      <BasicModal
        handleClose={closeModal}
        show={modal === "collection"}
        body={<PokemonCollection />}
        centered={false}
      />
      <BasicModal
        handleClose={closeModal}
        show={modal === "booster"}
        body={<Booster />}
      />
      <BasicModal
        handleClose={closeModal}
        show={modal === "wiki"}
        body={<Wiki inGame={page === "game"} />}
      />
      <BasicModal
        show={modal === "meta"}
        handleClose={closeModal}
        body={<MetaReport />}
      />
      <BasicModal
        show={modal === "keybinds"}
        handleClose={closeModal}
        body={<KeybindInfo />}
      />
      <TeamBuilderModal
        show={modal === "team-builder"}
        handleClose={closeModal}
      />
      <GameOptionsModal
        show={modal === "options"}
        page={page}
        hideModal={closeModal}
      />
      <BasicModal
        handleClose={closeModal}
        show={modal === "announcement"}
        body={<ServerAnnouncementForm />}
      />
      <Jukebox show={modal === "jukebox"} handleClose={closeModal} />
    </>
  )
}
