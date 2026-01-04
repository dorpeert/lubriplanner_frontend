// src/layouts/DashboardLayout.jsx
import * as React from "react";
import { useAuth } from "../context/AuthContext";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import CustomModal from "../components/CustomModal.jsx";
import { useState, useEffect } from "react";

import { styled, useTheme } from "@mui/material/styles";
import {
  Box,
  Drawer as MuiDrawer,
  AppBar as MuiAppBar,
  Toolbar,
  List,
  CssBaseline,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Link,
  Tooltip,
} from "@mui/material";

// import { NavLink } from "react-router-dom";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import HomeIcon from "@mui/icons-material/Home";
import SettingsIcon from "@mui/icons-material/Settings";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import BarChartIcon from "@mui/icons-material/BarChart";
import FormatColorFillOutlinedIcon from "@mui/icons-material/FormatColorFillOutlined";
import WorkIcon from "@mui/icons-material/Work";

import logo from "../assets/DistricandelariaLogo2.svg";

import AccountCircle from "@mui/icons-material/AccountCircle";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { NavLink } from "react-router-dom";
import BreadcrumbNav from "../components/BreadcrumbNav";

const drawerWidth = 240;

const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: "hidden",
});

const closedMixin = (theme) => ({
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: "hidden",
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up("sm")]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
}));

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(["width", "margin"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  variants: [
    {
      props: ({ open }) => open,
      style: {
        marginLeft: drawerWidth,
        width: `calc(100% - ${drawerWidth}px)`,
        transition: theme.transitions.create(["width", "margin"], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
      },
    },
  ],
}));

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  width: drawerWidth,
  flexShrink: 0,
  whiteSpace: "nowrap",
  boxSizing: "border-box",
  ...(open && {
    ...openedMixin(theme),
    "& .MuiDrawer-paper": {
      ...openedMixin(theme),
      boxShadow: "4px 0 10px rgba(0, 0, 0, 0.2)", // 👈 sombra lateral
    },
  }),
  ...(!open && {
    ...closedMixin(theme),
    "& .MuiDrawer-paper": {
      ...closedMixin(theme),
      boxShadow: "2px 0 8px rgba(0, 0, 0, 0.15)", // 👈 sombra cuando está cerrado
    },
  }),
}));

export default function HomeLayout() {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const pathnames = location.pathname.split("/").filter(Boolean);
  const capitalize = (s) => s?.charAt(0)?.toUpperCase() + s.slice(1) || s;

  const menuItems = [
    {
      text: "Inicio",
      icon: (
        <Tooltip arrow placement="right" title="Inicio">
          <HomeIcon />
        </Tooltip>
      ),
      path: "/home",
    },
    {
      text: "Configuración",
      icon: (
        <Tooltip arrow placement="right" title="Configuración">
          <SettingsIcon />
        </Tooltip>
      ),
      path: "/configuracion",
    },
    {
      text: "Lubricantes",
      icon: (
        <Tooltip arrow placement="right" title="Lubricantes">
          <FormatColorFillOutlinedIcon />
        </Tooltip>
      ),
      path: "/lubricantes",
    },
    {
      text: "Clientes",
      icon: (
        <Tooltip arrow placement="right" title="Clientes">
          <WorkIcon />
        </Tooltip>
      ),
      path: "/clientes",
    },
    {
      text: "Componentes",
      icon: (
        <Tooltip arrow placement="right" title="Componentes">
          <PrecisionManufacturingIcon />
        </Tooltip>
      ),
      path: "/componentes",
    },
    {
      text: "Reportes",
      icon: (
        <Tooltip arrow placement="right" title="Reportes">
          <BarChartIcon />
        </Tooltip>
      ),
      path: "/reportes",
    },
  ];

  const AppBar = styled(MuiAppBar, {
    shouldForwardProp: (prop) => prop !== "open",
  })(({ theme, open }) => ({
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    ...(open && {
      marginLeft: drawerWidth,
      width: `calc(100% - ${drawerWidth}px)`,
      transition: theme.transitions.create(["width", "margin"], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
      }),
    }),
  }));

  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const friendlyNames = {
    home: "Inicio",
    configuracion: "Configuración",
    componentes: "Componentes",
    reportes: "Reportes",
  };

useEffect(() => {
  const onStorage = (e) => {
    if (
      (e.key === "access_token" && !e.newValue) ||
      e.key === "SESSION_EXPIRED"
    ) {
      window.location.href = "/login";
    }
  };

  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}, []);

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      {/* AppBar */}
      <AppBar position="fixed" open={open}>
        <Toolbar>
          {/* ícono hamburguesa*/}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={() => setOpen(true)}
            edge="start"
            sx={[
              {
                marginRight: 5,
              },
              open && { display: "none" },
            ]}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            LubriPlanner
          </Typography>
          <Box sx={{ flexGrow: 1 }} />{" "}
          {/* empuja el icono al extremo derecho */}
          {/* Menú de usuario */}
          <IconButton
            size="large"
            edge="end"
            color="inherit"
            onClick={handleMenuOpen}
          >
            {user?.picture ? (
              <Avatar
                src={user.picture}
                alt={user.name}
                sx={{ width: 32, height: 32 }}
              />
            ) : (
              <AccountCircle fontSize="large" />
            )}
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
          >
            <MenuItem disabled>{user?.name || "Usuario"}</MenuItem>
            <Divider />
            <MenuItem
              onClick={() => {
                navigate("/configuracion");
                handleMenuClose();
              }}
            >
              Perfil
            </MenuItem>
            <MenuItem
              onClick={() => {
                logout();
                handleMenuClose();
              }}
            >
              Cerrar sesión
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Drawer className="menuPrincipal" variant="permanent" open={open}>
        <DrawerHeader
          className="menuPrincipalHeader"
          sx={{ display: "flex", flexDirection: "column", minHeight: 48 }}
        >
          <Box
            sx={{
              width: "100%",
              height: "64px",
              display: "flex",
              alignItems: "center",
              justifyContent: open ? "flex-end" : "center",
            }}
          >
            <IconButton onClick={() => setOpen(false)}>
              {theme.direction === "rtl" ? (
                <ChevronRightIcon />
              ) : (
                <ChevronLeftIcon />
              )}
            </IconButton>
          </Box>

          {/* Logo empresa */}
          <Box
            sx={{
              display: open ? "flex" : "none",
              alignItems: "center",
              justifyContent: open ? "center" : "center",
              flexDirection: "column",
              transition: "all 0.3s ease",
            }}
          >
            <img
              src={logo}
              alt="DistriCandelaria"
              style={{
                paddingBottom: "40px",
                width: open ? "128px" : "40px",
                transition: "all 0.3s ease",
              }}
            />
          </Box>
        </DrawerHeader>

        {open && (
          <Divider
            sx={{
              borderColor: "#3A4D9C",
              transition: "opacity 0.3s ease",
              opacity: open ? 1 : 0,
            }}
          />
        )}

        <List sx={{ pt: open ? 0 : 8 }}>
          {menuItems.map(({ text, icon, path }) => (
            <ListItem key={text} disablePadding sx={{ display: "block" }}>
              <ListItemButton
                component={NavLink}
                to={path}
                sx={[
                  {
                    minHeight: 48,
                    px: 2.5,
                    color: "#edededff",
                    "&.active": {
                      backgroundColor: "rgba(58, 77, 156, 0.25)", // fondo cuando está activo
                      color: "#1976d2", // color principal del texto/icono activo
                    },
                    "&:hover": {
                      backgroundColor: "rgba(255,255,255,0.08)",
                    },
                  },
                  open
                    ? { justifyContent: "initial" }
                    : { justifyContent: "center" },
                ]}
              >
                <ListItemIcon
                  sx={[
                    {
                      minWidth: 0,
                      justifyContent: "center",
                      color: "rgba(0, 0, 0, 0.56)",
                    },
                    open ? { mr: 3 } : { mr: "auto" },
                  ]}
                >
                  {icon}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography
                      sx={{
                        fontSize: "0.75rem",

                        color: "text.primary",
                      }}
                      noWrap
                    >
                      {text}
                    </Typography>
                  }
                  sx={open ? { opacity: 1 } : { opacity: 0 }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Contenido dinámico */}
      <Box component="main" sx={{ flexGrow: 1, p: 0 }}>
        <DrawerHeader sx={{ pl: 3 }} />
        <BreadcrumbNav />

        <Box className="content-container" sx={{ px: 3 }}>
          <Outlet key={location.pathname + location.search} />
        </Box>
      </Box>
    </Box>
  );
}
