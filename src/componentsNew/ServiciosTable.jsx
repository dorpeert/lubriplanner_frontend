import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  Tooltip,
} from "@mui/material";

import VisibilityIcon from "@mui/icons-material/Visibility";
import CalculateIcon from "@mui/icons-material/Calculate";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import AppSnackbar from "./AppSnackbar";

import EntityModal from "./EntityModal";
import ServicioFormContent from "../forms/ServicioFormContent";

import apiClient from "../api/apiClient";

const ServiciosTable = ({ componenteId }) => {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // create | recalcular | notificar | completar | informe | view
  const [selectedServicio, setSelectedServicio] = useState(null);

  // payload que construye el form (un solo form, por modo)
  const [draftPayload, setDraftPayload] = useState({});
  const [isValid, setIsValid] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const openModal = (mode, servicio = null) => {
    setModalMode(mode);
    setSelectedServicio(servicio);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedServicio(null);
    setDraftPayload({});
    setIsValid(false);
    setActionLoading(false);
  };

  // ==========
  // Cargar servicios
  // ==========
  const loadServicios = useCallback(async () => {
    setLoading(true);
    try {
      if (!componenteId) {
        // si algún día necesitas listar todos, puedes implementar /api/servicios aquí:
        const res = await apiClient.get("/api/servicios", {
          params: { "page[limit]": 200, sort: "-created" },
        });
        const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
        setServicios(data);
      } else {
        const res = await apiClient.get(
          `/api/servicios/componente/${componenteId}`
        );
        // tu backend devuelve array directo (ideal) o {data: []}
        const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
        setServicios(data);
      }
    } catch (e) {
      console.error("❌ Error obteniendo servicios:", e);
      setServicios([]);
    } finally {
      setLoading(false);
    }
  }, [componenteId]);

  useEffect(() => {
    loadServicios();
  }, [loadServicios]);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // ==========
  // Acción primaria (según modo)
  // ==========
  const primaryAction = useCallback(async () => {
    setActionLoading(true);

    try {
      if (modalMode === "create") {
        // POST /api/servicios  body: { componente, tipo_servicio }
        await apiClient.post("/api/servicios", draftPayload);

        setSnackbar({
          open: true,
          message: "Servicio creado con éxito",
          severity: "success",
        });
      }

      if (modalMode === "recalcular") {
        // POST /api/servicios/{nid}/recalcular body: { trabajo_real }
        const id = selectedServicio?.id;
        await apiClient.post(`/api/servicios/${id}/recalcular`, draftPayload);

        setSnackbar({
          open: true,
          message:
            "La fecha del próximo servicio ha sido recalculada con éxito",
          severity: "success",
        });
      }

      if (modalMode === "agendar") {
        const id = selectedServicio?.id;
        await apiClient.post(`/api/servicios/${id}/agendar`, {});
        closeModal();
        setSnackbar({
          open: true,
          message: "Servicio agendado con éxito",
          severity: "success",
        });
      }

      if (modalMode === "notificar") {
        const id = selectedServicio?.id;

        const res = await apiClient.post(`/api/servicios/${id}/notificar`, {});
        const notify = res?.data?.notify_result;

        if (notify) {
          setSnackbar({
            open: true,
            message: notify.message,
            severity: notify.ok ? "success" : "warning",
          });
        } else {
          setSnackbar({
            open: true,
            message:
              "Se ha notificado al cliente la fecha del próximo servicio",
            severity: "success",
          });
        }
      }

      if (modalMode === "completar") {
        // POST /api/servicios/{nid}/complete body: { responsable, ... }
        const id = selectedServicio?.id;
        const res = await apiClient.post(
          `/api/servicios/${id}/complete`,
          draftPayload
        );

        const notify = res?.data?.notify_result;

        if (notify) {
          setSnackbar({
            open: true,
            message: notify.message,
            severity: notify.ok ? "success" : "warning",
          });
        } else {
          setSnackbar({
            open: true,
            message: "Servicio completado con éxito",
            severity: "success",
          });
        }
      }

      if (modalMode === "informe") {
        const id = selectedServicio?.id;
        const res = await apiClient.post(
          `/api/servicios/${id}/informe`,
          draftPayload
        );

        closeModal();

        const notify = res?.data?.notify_result;
        if (notify) {
          setSnackbar({
            open: true,
            message: notify.message,
            severity: notify.ok ? "success" : "warning",
          });
        } else {
          setSnackbar({
            open: true,
            message: "Informe subido y servicio finalizado.",
            severity: "success",
          });
        }
      }

      await loadServicios();
      closeModal(); // ✅ solo una vez, al final
    } catch (e) {
      console.error("❌ Error ejecutando acción:", e);

      // 🔎 Intentar leer notify_result del backend
      const notify =
        e?.response?.data?.notify_result || e?.response?.data?.notifyResult;

      if (notify?.message) {
        setSnackbar({
          open: true,
          message: notify.message,
          severity: notify.ok ? "success" : "warning",
        });
      } else {
        setSnackbar({
          open: true,
          message:
            e?.response?.data?.error ||
            "Ocurrió un error ejecutando la acción. Intenta nuevamente.",
          severity: "error",
        });
      }
    } finally {
      setActionLoading(false); // ✅ siempre
    }
  }, [modalMode, draftPayload, selectedServicio, loadServicios, closeModal]);

  // ==========
  // Labels/título según modo
  // ==========
  const modalTitle = useMemo(() => {
    switch (modalMode) {
      case "create":
        return "Nuevo servicio";
      case "recalcular":
        return "Recalcular servicio";
      case "notificar":
        return "Notificar servicio";
      case "completar":
        return "Completar servicio";
      case "informe":
        return "Subir informe";
      case "view":
      default:
        return "Ver servicio";
    }
  }, [modalMode]);

  const saveLabel = useMemo(() => {
    switch (modalMode) {
      case "create":
        return "Crear";
      case "recalcular":
        return "Recalcular";
      case "notificar":
        return "Notificar";
      case "completar":
        return "Completar";
      case "informe":
        return "Subir informe";
      default:
        return "Guardar";
    }
  }, [modalMode]);

  const downloadInforme = async (id) => {
    const token = localStorage.getItem("access_token");
    const res = await fetch(
      `https://lightcoral-emu-437776.hostingersite.com/web/api/servicios/${id}/informe/download`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) throw new Error("No se pudo descargar el informe.");

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `informe_servicio_${id}`; // si quieres, luego leemos filename del header
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const downloadHistorial = async () => {
    try {
      const res = await apiClient.get(
        `/api/servicios/componente/${componenteId}/historial/download`,
        { responseType: "blob" }
      );

      // Si por error llega HTML, abortamos con mensaje útil
      const contentType = res?.headers?.["content-type"] || "";
      if (contentType.includes("text/html")) {
        throw new Error(
          "La API devolvió HTML (probable ruta incorrecta o no se limpió cache)."
        );
      }

      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const today = new Date().toISOString().slice(0, 10);

      a.href = url;
      a.download = `Historial_Servicios_Componente_${componenteId}_${today}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setSnackbar?.({
        open: true,
        message: "Historial descargado con éxito",
        severity: "success",
      });
    } catch (e) {
      console.error("DOWNLOAD HISTORIAL ERROR:", e);
      setSnackbar?.({
        open: true,
        message: e?.message || "No se pudo descargar el historial.",
        severity: "error",
      });
    }
  };
  // dentro de ServiciosTable (arriba del return)
  const emptyServicio = useMemo(() => ({}), []);

  // ==========
  // Estado vacío
  // ==========
  if (!loading && servicios.length === 0 && componenteId) {
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
        <Button variant="contained" onClick={() => openModal("create", null)}>
          Nuevo servicio
        </Button>

        <EntityModal
          open={modalOpen}
          onClose={closeModal}
          title={modalTitle}
          size="M"
          isViewMode={modalMode === "view"}
          submitDisabled={modalMode !== "view" && !isValid}
          onPrimaryAction={modalMode === "view" ? null : primaryAction}
          primaryActionLoading={actionLoading}
          saveLabel={saveLabel}
        >
          <ServicioFormContent
            mode={modalMode}
            formData={selectedServicio ?? emptyServicio}
            componenteId={componenteId}
            isViewMode={modalMode === "view"}
            onPayloadChange={setDraftPayload}
            onValidationChange={setIsValid}
          />
        </EntityModal>
      </Box>
    );
  }

  // ==========
  // UI tabla
  // ==========
  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{ display: "flex", justifyContent: "space-between", mb: 1, gap: 2 }}
      >
        <Typography variant="h6">Historial de servicios</Typography>

        {componenteId && (
          <Button variant="contained" onClick={() => openModal("create")}>
            Nuevo servicio
          </Button>
        )}
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>N° servicio</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Fecha último</TableCell>
              <TableCell>Fecha próximo</TableCell>
              <TableCell>Tiempo faltante</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={22} />
                </TableCell>
              </TableRow>
            ) : (
              servicios.map((s) => {
                const fechaUlt = s.fecha_ultimo_servicio || "—";
                const fechaProx = s.fecha_proximo_servicio || "—";
                const faltante = calcDaysRemaining(s.fecha_proximo_servicio);

                const isInactive =
                  s.estado === "completado" || s.estado === "finalizado";

                return (
                  <TableRow
                    key={s.id}
                    sx={{
                      opacity: isInactive ? 0.55 : 1,
                      transition: "opacity .2s ease",
                    }}
                  >
                    <TableCell>
                      {s.numero_servicio || s.title || s.id}
                    </TableCell>
                    <TableCell>{s.tipo_servicio || "—"}</TableCell>
                    <TableCell>{fechaUlt}</TableCell>
                    <TableCell>{fechaProx}</TableCell>

                    <TableCell>
                      <Chip label={faltante.label} color={faltante.color} />
                    </TableCell>

                    <TableCell>
                      <Chip label={s.estado || "—"} size="small" />
                    </TableCell>

                    <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                      <Tooltip title="Ver">
                        <IconButton onClick={() => openModal("view", s)}>
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>

                      {/* ===== flujo por etapas ===== */}

                      {s.estado === "en_espera" && (
                        <>
                          <Tooltip title="Recalcular">
                            <IconButton
                              onClick={() => openModal("recalcular", s)}
                            >
                              <CalculateIcon />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Agendar">
                            <IconButton onClick={() => openModal("agendar", s)}>
                              <EventAvailableIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}

                      {s.estado === "agendado" && (
                        <Tooltip title="Notificar">
                          <IconButton onClick={() => openModal("notificar", s)}>
                            <NotificationsActiveIcon />
                          </IconButton>
                        </Tooltip>
                      )}

                      {s.estado === "notificado" && (
                        <Tooltip title="Completar">
                          <IconButton onClick={() => openModal("completar", s)}>
                            <DoneAllIcon />
                          </IconButton>
                        </Tooltip>
                      )}

                      {(s.estado === "completado" ||
                        s.estado === "finalizado") && (
                        <>
                          {/* Informe: si ya existe informe_servicio → icono descargar, si no → subir */}
                          {s.informe_servicio ? (
                            <Tooltip title="Descargar informe">
                              <IconButton onClick={() => downloadInforme(s.id)}>
                                <DownloadIcon />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Tooltip title="Subir informe">
                              <IconButton
                                onClick={() => openModal("informe", s)}
                              >
                                <UploadFileIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <Button variant="outlined" onClick={downloadHistorial}>
          Descargar historial
        </Button>
      </TableContainer>

      {/* ===== Modal único ===== */}
      <EntityModal
        open={modalOpen}
        onClose={closeModal}
        title={modalTitle}
        size="M"
        isViewMode={modalMode === "view"}
        submitDisabled={modalMode !== "view" && !isValid}
        onPrimaryAction={modalMode === "view" ? null : primaryAction}
        primaryActionLoading={actionLoading}
        saveLabel={saveLabel}
      >
        <ServicioFormContent
          mode={modalMode}
          formData={selectedServicio ?? emptyServicio}
          componenteId={componenteId}
          isViewMode={modalMode === "view"}
          onPayloadChange={setDraftPayload}
          onValidationChange={setIsValid}
        />
      </EntityModal>

      <AppSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      />
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
