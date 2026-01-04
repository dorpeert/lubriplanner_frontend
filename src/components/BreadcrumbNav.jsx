// src/components/BreadcrumbNav.jsx
import React from "react";
import { Breadcrumbs, Link, Typography, Box } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { useLocation, useNavigate } from "react-router-dom";
import VerComponente from "../pages/modules/componentes/VerComponente";

export default function BreadcrumbNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // Divide la ruta actual por "/"
  const pathnames = location.pathname.split("/").filter((x) => x);

  // Nombres legibles para rutas
  const friendlyNames = {
    home: "Inicio",
    usuarios: "Usuarios",
    configuracion: "Configuración",
    reportes: "Reportes",
    componentes: "Componentes",
    permisosyperfiles: "Permisos y perfiles",
    vercomponente: "Ver componente",
    clasificacion_lubricantes: "Clases de lubricantes",
    tipos_lubricantes: "Tipos de lubricantes",
  };

  // Capitaliza nombres no mapeados
  const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

  return (
    <Box className="breadcrumb-nav"
      sx={{
        mb: 2,
        display: "flex",
        alignItems: "center",
        backgroundColor: "#CDD2E6",
      }}
    >
      <Breadcrumbs
        aria-label="breadcrumb"
        separator={<NavigateNextIcon fontSize="small" />}
        sx={{
          mx: 3,
          my: 1,
          "& a": { display: "flex", alignItems: "center" },
          "& svg": { mr: 0.5 },
        }}
      >
        {/* Ícono de casa */}
        <Link
          underline="hover"
          color={location.pathname === "/home" ? "primary" : "inherit"}
          onClick={() => navigate("/home")}
          sx={{
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          <HomeIcon
            fontSize="small"
            color={location.pathname === "/home" ? "primary" : "action"}
          />
            Inicio
        </Link>

        {/* Resto de la ruta */}
        {pathnames.map((value, index) => {
          if (value === "home") return null; // Evita duplicar "inicio"

          const to = `/${pathnames.slice(0, index + 1).join("/")}`;
          const isLast = index === pathnames.length - 1;
          const label = friendlyNames[value] ?? capitalize(value);

          return isLast ? (
            <Typography color="text.primary" key={to}>
              {label}
            </Typography>
          ) : (
            <Link
              underline="hover"
              color="inherit"
              key={to}
              onClick={() => navigate(to)}
              sx={{ cursor: "pointer" }}
            >
              {label}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
}
