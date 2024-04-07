import React, { useState } from "react"
import { useTranslation } from "react-i18next"

import Button from "react-bootstrap/Button"
import Form from "react-bootstrap/Form"
import InputGroup from "react-bootstrap/InputGroup"

export function SearchBar({ onChange }) {
  const [searchQuery, setSearchQuery] = useState<string>("")
  const { t } = useTranslation()

  return (
    <InputGroup className="search-bar">
      <Form.Control
        type="text"
        placeholder={t("search_player")}
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value)
          onChange(e.target.value)
        }}
      />
      <Button
        className="clear-button"
        variant="tertiary"
        onClick={() => {
          setSearchQuery("")
          onChange(undefined)
        }}
      >
        X
      </Button>
    </InputGroup>
  )
}
