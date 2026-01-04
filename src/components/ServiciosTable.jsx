import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  CircularProgress,
  Chip,
  Button,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EventAvailableIcon from "@mui/icons-material/EventAvailable"; // Agendar
import DoneAllIcon from "@mui/icons-material/DoneAll"; // Completar

import {
  fetchServicios,
  agendarServicio,
  completarServicio,
  fetchServiciosPorComponente,
  crearServicioPorComponente,
} from "../api/apiServicios";

import CustomModal from "./CustomModal";
import CompleteServiceModal from "./CompleteServiceModal";

const ServiciosTable = ({ componenteId }) => {

  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openView, setOpenView] = useState(null);
  const [openComplete, setOpenComplete] = useState(null);

  // 🔹 Carga general de servicios
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchServicios();
      setServicios(data);
    } catch (e) {
      console.error("❌ Error cargando servicios generales:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔹 Cargar todos si NO hay componenteId
  useEffect(() => {
    if (!componenteId) {
      load();
    }
  }, [load, componenteId]);

  // 🔹 Cargar filtrados si hay componenteId
  useEffect(() => {

    if (!componenteId) return;

    setLoading(true);

    fetchServiciosPorComponente(componenteId)
      .then((res) => {
        setServicios(res.data);
      })
      .catch((err) =>
        console.error("❌ Error obteniendo servicios por componente:", err)
      )
      .finally(() => setLoading(false));
  }, [componenteId]);

  // 🔹 Acción: Agendar
  const handleAgendar = async (serv) => {
    const today = new Date().toISOString().slice(0, 10);
    await agendarServicio(serv.id, today);

    if (componenteId) {
      // recarga filtrada
      const res = await fetchServiciosPorComponente(componenteId);
      setServicios(res.data);
    } else {
      await load();
    }
  };

  // 🔹 Abrir modal Ver
  const handleViewOpen = (serv) => setOpenView(serv);

  // 🔹 Abrir modal Completar
  const handleCompleteOpen = (serv) => setOpenComplete(serv);

  // 🔹 Acción: Completar servicio
  const handleCompleteSubmit = async (id, payload) => {
    await completarServicio(id, payload);
    setOpenComplete(null);

    if (componenteId) {
      const res = await fetchServiciosPorComponente(componenteId);
      setServicios(res.data);
    } else {
      await load();
    }
  };

  // dentro del componente ServiciosTable, justo antes del return de TableContainer:

  const handleCrearServicio = async () => {
    try {
      await crearServicioPorComponente(componenteId);
      await load();
    } catch (e) {
      console.error("Error creando servicio:", e);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, display: "flex" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!loading && servicios.length === 0) {
    return (
      <Box
        sx={{
          width: "100%",
          p: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          justifyContent: "center",
        }}
      >
        <Typography>No hay servicios para este componente.</Typography>
        <Button variant="contained" onClick={handleCrearServicio}>
          Crear primer servicio
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>N° servicio</TableCell>
              <TableCell>Fecha último servicio</TableCell>
              <TableCell>Fecha próximo servicio</TableCell>
              <TableCell>Tiempo faltante</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {servicios.map((s) => {
              const fechaUlt =
                s.fecha_completado || s.fecha_ultimo_servicio || "-";

              const fechaProx = s.fecha_proximo_servicio || "-";

              const faltante = calcDaysRemaining(fechaProx);

              const isGrayed = s.estado === "completado";

              return (
                <TableRow key={s.id} sx={isGrayed ? { opacity: 0.5 } : {}}>
                  <TableCell>{s.numero_servicio || s.id}</TableCell>
                  <TableCell>{fechaUlt}</TableCell>
                  <TableCell>{fechaProx}</TableCell>
                  <TableCell>
                    <Chip label={faltante.label} color={faltante.color} />
                  </TableCell>
                  <TableCell>
                    <Chip label={s.estado} size="small" />
                  </TableCell>

                  <TableCell align="center">
                    <IconButton onClick={() => handleViewOpen(s)}>
                      <VisibilityIcon />
                    </IconButton>

                    {/* Botones dinámicos */}
                    {s.estado === "en_espera" && (
                      <IconButton disabled>
                        <EventAvailableIcon />
                      </IconButton>
                    )}

                    {s.estado === "notificado" && (
                      <IconButton
                        onClick={() => handleAgendar(s)}
                        title="Agendar"
                      >
                        <EventAvailableIcon />
                      </IconButton>
                    )}

                    {s.estado === "agendado" && (
                      <IconButton
                        onClick={() => handleCompleteOpen(s)}
                        title="Completar"
                      >
                        <DoneAllIcon />
                      </IconButton>
                    )}

                    {s.estado === "completado" && null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modales */}
      {openView && (
        <CustomModal
          open={!!openView}
          onClose={() => setOpenView(null)}
          servicio={openView}
        />
      )}

      {openComplete && (
        <CompleteServiceModal
          open={!!openComplete}
          servicio={openComplete}
          onClose={() => setOpenComplete(null)}
          onSubmit={handleCompleteSubmit}
        />
      )}
    </Box>
  );
};

function calcDaysRemaining(fechaProx) {
  if (!fechaProx) return { label: "—", color: "default" };

  const now = new Date();
  const target = new Date(fechaProx);
  const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: "Vencido", color: "error" };
  if (diffDays === 0) return { label: "Hoy", color: "warning" };
  if (diffDays <= 3) return { label: `${diffDays} días`, color: "warning" };

  return { label: `${diffDays} días`, color: "success" };
}

export default ServiciosTable;
