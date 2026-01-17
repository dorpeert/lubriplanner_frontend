import React, { useState, useEffect } from "react";
import { TextField, Typography } from "@mui/material";

/**
 * InlineEdit
 * - value: texto actual
 * - onChange: fn(newValue)
 * - disabled: si true muestra solo texto no editable
 * - textProps: props que se pasan a <Typography>
 */
const InlineEdit = ({
  value = "",
  displayValue = "",
  onChange = () => {},
  disabled = false,
  textProps = {},
  sx = {},
  placeholder = "",
}) => {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(value);

  // Mantener temp sincronizado si value cambia desde fuera
  useEffect(() => {
    setTemp(value ?? "");
  }, [value]);

  const commit = () => {
    setEditing(false);
    if ((temp ?? "") !== (value ?? "")) onChange(temp ?? "");
  };

  const cancel = () => {
    setTemp(value ?? "");
    setEditing(false);
  };

  const showText = value?.trim() !== "" ? value : displayValue;

  if (disabled) {
    return <Typography {...textProps}>{value || "—"}</Typography>;
  }

  return editing ? (
    <TextField
      placeholder={placeholder || displayValue}
      variant="standard"
      autoFocus
      value={temp}
      onChange={(e) => setTemp(e.target.value)}
      onBlur={commit}
      onClick={(e) => {
        e.stopPropagation();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") cancel();
      }}
      //sx={{ minWidth: 200 }}
    />
  ) : (
    <Typography
      {...textProps}
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setEditing(true);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={textProps["aria-label"] || "Editar texto"}
      sx={{ cursor: "text", ...sx, ...textProps.sx, opacity: value ? 1 : 0.6 }}
    >
      {showText}
    </Typography>
  );
};

export default InlineEdit;
