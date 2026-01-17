// src/pages/Home.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  Pagination,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
// import "@fullcalendar/core/index.css";
// import "@fullcalendar/daygrid/index.css";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import apiClient from "../api/apiClient";
import GenericMultiSelect from "../componentsNew/GenericMultiSelect.jsx";
import { slugify } from "../utils/slugify";

const STATUS_OPTIONS = [
  { value: "en_espera", label: "En espera" },
  { value: "agendado", label: "Agendado" },
  { value: "notificado", label: "Notificado" },
];

const resolveServiceDate = (servicio) =>
  servicio?.fecha_proximo_servicio ||
  servicio?.fecha_agendado ||
  servicio?.fecha_notificado ||
  null;

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const tipoColor = (tipo) => {
  const normalized = String(tipo || "").toLowerCase();
  if (normalized === "muestreo") return "#2e7d32";
  if (normalized === "lubricacion") return "#1565c0";
  return "#455a64";
};

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [servicios, setServicios] = useState([]);
  const [selectedEstados, setSelectedEstados] = useState(["notificado"]);
  const [notifPage, setNotifPage] = useState(1);
  const notifPageSize = 5;

  const loadServicios = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.get("/api/servicios");
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setServicios(data);
    } catch (err) {
      console.error("Home load error:", err);
      setError(
        err?.response?.data?.error || "No se pudieron cargar los servicios."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServicios();
  }, [loadServicios]);

  const filteredServicios = useMemo(() => {
    if (!selectedEstados.length) return [];
    return servicios.filter((s) => selectedEstados.includes(s.estado));
  }, [servicios, selectedEstados]);

  const upcomingServicios = useMemo(() => {
    return filteredServicios
      .map((serv) => ({
        ...serv,
        _date: parseDate(serv?.fecha_proximo_servicio),
      }))
      .filter((serv) => serv._date)
      .sort((a, b) => a._date - b._date);
  }, [filteredServicios]);

  const totalNotifPages = Math.max(
    1,
    Math.ceil(upcomingServicios.length / notifPageSize)
  );

  useEffect(() => {
    if (notifPage > totalNotifPages) setNotifPage(1);
  }, [notifPage, totalNotifPages]);

  const notifSlice = useMemo(() => {
    const start = (notifPage - 1) * notifPageSize;
    return upcomingServicios.slice(start, start + notifPageSize);
  }, [notifPage, notifPageSize, upcomingServicios]);

  const events = useMemo(() => {
    return filteredServicios
      .map((serv) => {
        const dateValue = resolveServiceDate(serv);
        if (!dateValue) return null;
        const componente = serv?.componente?.title || "Componente";
        const componenteId = serv?.componente?.id;
        const tipo = serv?.tipo_servicio || "servicio";
        const equipo = serv?.equipo || "";
        const estado = serv?.estado || "";
        const color = tipoColor(tipo);
        return {
          id: String(serv?.id ?? serv?.numero_servicio ?? Math.random()),
          title: `${componente} - ${tipo}`,
          start: dateValue,
          allDay: true,
          backgroundColor: color,
          borderColor: color,
          extendedProps: {
            equipo,
            estado,
            componenteId,
            componente,
          },
        };
      })
      .filter(Boolean);
  }, [filteredServicios]);

  const renderEventContent = (eventInfo) => {
    const equipo = eventInfo.event.extendedProps?.equipo;
    const estado = eventInfo.event.extendedProps?.estado;
    return (
      <div style={{ fontSize: "0.85em", lineHeight: 1.2 }}>
        <div style={{ fontWeight: 600 }}>{eventInfo.event.title}</div>
        {equipo ? <div>{equipo}</div> : null}
        {estado ? <div>Estado: {estado}</div> : null}
      </div>
    );
  };

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5" color="primary">
          Calendario de servicios
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Hola, {user?.name}
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          Notificaciones - Proximos servicios
        </Typography>
        <Divider sx={{ my: 1 }} />
        {upcomingServicios.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No hay servicios proximos con los filtros actuales.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {notifSlice.map((serv) => {
              const componente = serv?.componente?.title || "Componente";
              const componenteId = serv?.componente?.id;
              const slug = slugify(componente);
              const to = componenteId
                ? `/componentes/${componenteId}-${slug}`
                : "#";
              return (
                <Box key={serv.id} sx={{ display: "flex", gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {serv.fecha_proximo_servicio || "-"}
                  </Typography>
                  <Link to={to} style={{ textDecoration: "none" }}>
                    <Typography variant="body2" color="primary">
                      {componente} - {serv.tipo_servicio}
                    </Typography>
                  </Link>
                  <Typography variant="body2" color="text.secondary">
                    Estado: {serv.estado}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        )}
        {totalNotifPages > 1 && (
          <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
            <Pagination
              count={totalNotifPages}
              page={notifPage}
              onChange={(_, value) => setNotifPage(value)}
              size="small"
              color="primary"
            />
          </Box>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          Filtro de estados
        </Typography>
        <Divider sx={{ my: 1 }} />
        <GenericMultiSelect
          label="Estados"
          name="estado"
          optionsOverride={STATUS_OPTIONS}
          value={selectedEstados}
          onChange={(e) => setSelectedEstados(e.target.value)}
          size="small"
        />
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}

      <Paper variant="outlined" sx={{ p: 2 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <FullCalendar
            plugins={[dayGridPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,dayGridWeek",
            }}
            height="auto"
            nowIndicator
            events={events}
            eventContent={renderEventContent}
            eventClick={(info) => {
              const compId = info.event.extendedProps?.componenteId;
              const compTitle = info.event.extendedProps?.componente || "componente";
              if (!compId) return;
              const slug = slugify(compTitle);
              navigate(`/componentes/${compId}-${slug}`);
            }}
          />
        )}
      </Paper>
    </Stack>
  );
}
