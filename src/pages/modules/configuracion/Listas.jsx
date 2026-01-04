import { Link } from "react-router-dom";

import { Box, IconButton } from "@mui/material";
import { Typography } from "@mui/material";
import { Paper } from "@mui/material";
import { Button } from "@mui/material";

import FormatColorFillOutlinedIcon from "@mui/icons-material/FormatColorFillOutlined";
import WorkIcon from "@mui/icons-material/Work";
import FactoryIcon from "@mui/icons-material/Factory";
import OpacityIcon from "@mui/icons-material/Opacity";
import SchemaIcon from "@mui/icons-material/Schema";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import WorkspacesIcon from "@mui/icons-material/Workspaces";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";

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
          Listas
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
            to="fabricantes_lubricantes"
            sx={{
              flexDirection: "column",
              textAlign: "center",
              width: 100,
              border: "none",
              justifyContent: "flex-start",
              gap: "10px",
            }}
            variant="outlined"
            startIcon={<FactoryIcon />}
          >
            <Typography variant="body1" color="primary" textTransform="none">
              Fabricantes
            </Typography>
          </Button>

          <Button
            className="content-icon"
            component={Link}
            to="tipos_lubricantes"
            sx={{
              flexDirection: "column",
              textAlign: "center",
              width: 100,
              border: "none",
              justifyContent: "flex-start",
              gap: "10px",
            }}
            variant="outlined"
            startIcon={<OpacityIcon />}
          >
            <Typography variant="body1" color="primary" textTransform="none">
              Tipos de lubricantes
            </Typography>
          </Button>

          <Button
            className="content-icon"
            component={Link}
            to="clasificacion_lubricantes"
            sx={{
              flexDirection: "column",
              textAlign: "center",
              width: 100,
              border: "none",
              justifyContent: "flex-start",
              gap: "10px",
            }}
            variant="outlined"
            startIcon={<SchemaIcon />}
          >
            <Typography variant="body1" color="primary" textTransform="none">
              Clases de lubricantes
            </Typography>
          </Button>

          <Button
            className="content-icon"
            component={Link}
            to="empaques"
            sx={{
              flexDirection: "column",
              textAlign: "center",
              width: 100,
              border: "none",
              justifyContent: "flex-start",
              gap: "10px",
            }}
            variant="outlined"
            startIcon={<Inventory2Icon />}
          >
            <Typography variant="body1" color="primary" textTransform="none">
              Tipos de empaque
            </Typography>
          </Button>

          <Button
            className="content-icon"
            component={Link}
            to="lobs"
            sx={{
              flexDirection: "column",
              textAlign: "center",
              width: 100,
              border: "none",
              justifyContent: "flex-start",
              gap: "10px",
            }}
            variant="outlined"
            startIcon={<WorkspacesIcon />}
          >
            <Typography variant="body1" color="primary" textTransform="none">
              LOBs
            </Typography>
          </Button>

          {/*
            <Button
            className="content-icon"
            component={Link}
            to="prestadores_servicios"
            sx={{
              flexDirection: "column",
              textAlign: "center",
              width: 100,
              border: "none",
              justifyContent: "flex-start",
              gap: "10px",
            }}
            variant="outlined"
            startIcon={<SupportAgentIcon />}
          >
            <Typography variant="body1" color="primary" textTransform="none">
              Prestadores Servicios
            </Typography>
          </Button>
          */}

        </Box>
      </Paper>
    </Box>
  );
}
