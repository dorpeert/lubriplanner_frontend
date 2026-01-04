import { Link } from "react-router-dom";

import { Box, IconButton } from "@mui/material";
import { Typography } from "@mui/material";
import { Paper } from "@mui/material";
import { Button } from "@mui/material";

import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";

export default function Configuracion() {
  return (
    <Box
      sx={{
        height: "calc(100vh - 15vh)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h5" color="primary">
          Configuración
        </Typography>
      </Box>

      <Paper
        sx={{
          height: "calc(100% - 23px)", // resta el header
          p: 4,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "flex-start",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "row", gap: 3 }}>
          <Button
            className="content-icon"
            component={Link}
            to="usuarios"
            sx={{
              flexDirection: "column",
              textAlign: "center",
              maxWidth: 100,
              border: "none",
              justifyContent: "flex-start",
              gap: .5,
            }}
            variant="outlined"
            startIcon={<PeopleOutlinedIcon />}
          >
            <Typography variant="body1" color="primary" textTransform="none">
              Usuarios
            </Typography>
          </Button>

          <Button
            className="content-icon"
            component={Link}
            to="permisosyperfiles"
            sx={{
              flexDirection: "column",
              textAlign: "center",
              maxWidth: 100,
              border: "none",
              justifyContent: "flex-start",
              gap: .5,
            }}
            variant="outlined"
            startIcon={<ManageAccountsIcon />}
          >
            <Typography variant="body1" color="primary" textTransform="none">
              Permisos y perfiles
            </Typography>
          </Button>

          <Button
            className="content-icon"
            component={Link}
            to="listas"
            sx={{
              flexDirection: "column",
              textAlign: "center",
              maxWidth: 100,
              border: "none",
              justifyContent: "flex-start",
              gap: .5,
            }}
            variant="outlined"
            startIcon={<FormatListBulletedIcon />}
          >
            <Typography variant="body1" color="primary" textTransform="none">
              Listas
            </Typography>
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
