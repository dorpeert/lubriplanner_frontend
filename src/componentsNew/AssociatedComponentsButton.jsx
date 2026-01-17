// src/componentsNew/AssociatedComponentsButton.jsx
import React, { useMemo } from "react";
import { Button } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";

export default function AssociatedComponentsButton({
  label = "Componentes asociados",
  params = {}, // { lubricante, cliente, activo, equipo }
  to = "/componentes",
  variant = "outlined",
  size = "small",
  color = "primary",
  startIcon = null,
  disabled = false,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const href = useMemo(() => {
    const qs = new URLSearchParams();

    // filtros (solo si existen)
    Object.entries(params).forEach(([k, v]) => {
      if (v === null || v === undefined || v === "") return;
      qs.set(k, String(v));
    });

    // retorno (incluye ?view= si el modal está URL-driven)
    qs.set("returnTo", `${location.pathname}${location.search}`);

    return `${to}?${qs.toString()}`;
  }, [params, to, location.pathname, location.search]);

  return (
    <Button
      variant={variant}
      size={size}
      color={color}
      startIcon={startIcon}
      disabled={disabled}
      onClick={() => navigate(href)}
    >
      {label}
    </Button>
  );
}
