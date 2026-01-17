import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ReactECharts from "echarts-for-react";

import apiClient from "../../../api/apiClient";
import GenericMultiSelect from "../../../componentsNew/GenericMultiSelect.jsx";

const STATUS_OPTIONS = [
  { value: "en_espera", label: "En espera" },
  { value: "agendado", label: "Agendado" },
  { value: "notificado", label: "Notificado" },
  { value: "completado", label: "Completado" },
  { value: "finalizado", label: "Finalizado" },
];

const TIPO_OPTIONS = [
  { value: "lubricacion", label: "Lubricacion" },
  { value: "muestreo", label: "Muestreo" },
];

const DATE_FIELDS = [
  { value: "fecha_proximo_servicio", label: "Fecha proximo" },
  { value: "fecha_ultimo_servicio", label: "Fecha ultimo" },
  { value: "fecha_agendado", label: "Fecha agendado" },
  { value: "fecha_notificado", label: "Fecha notificado" },
  { value: "fecha_completado", label: "Fecha completado" },
];

const GROUP_BY_OPTIONS = [
  { value: "month", label: "Mes" },
  { value: "week", label: "Semana" },
  { value: "day", label: "Dia" },
];

const emptyArray = [];

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeArray = (value) => (Array.isArray(value) ? value : emptyArray);

const groupCount = (items, keyGetter) => {
  const map = new Map();
  items.forEach((item) => {
    const key = keyGetter(item);
    if (!key) return;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return map;
};

const getBucketKey = (date, granularity) => {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  if (granularity === "day") return `${y}-${m}-${d}`;
  if (granularity === "week") {
    const week = Math.ceil((date.getDate() - date.getDay() + 1) / 7);
    return `${y}-W${String(week).padStart(2, "0")}`;
  }
  return `${y}-${m}`;
};

const sortKeys = (keys) => keys.slice().sort((a, b) => (a > b ? 1 : -1));

const StatCard = ({ label, value, chip = null }) => (
  <Paper
    variant="outlined"
    sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}
  >
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="h5" fontWeight={700}>
      {value}
    </Typography>
    {chip}
  </Paper>
);

const ChartCard = ({ title, children, height = 320 }) => (
  <Paper variant="outlined" sx={{ p: 2 }}>
    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
      {title}
    </Typography>
    <Box sx={{ height }}>{children}</Box>
  </Paper>
);

const TabPanel = ({ value, index, children }) => {
  if (value !== index) return null;
  return <Box sx={{ mt: 2 }}>{children}</Box>;
};

export default function Reportes() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [servicios, setServicios] = useState([]);

  const [clientesOptions, setClientesOptions] = useState([]);
  const [componentesOptions, setComponentesOptions] = useState([]);

  const [selectedClientes, setSelectedClientes] = useState([]);
  const [selectedComponentes, setSelectedComponentes] = useState([]);
  const [selectedEstados, setSelectedEstados] = useState([]);
  const [selectedTipos, setSelectedTipos] = useState([]);

  const [dateField, setDateField] = useState("fecha_proximo_servicio");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [groupBy, setGroupBy] = useState("month");
  const [topN, setTopN] = useState(8);

  const [autoRefresh, setAutoRefresh] = useState(false);
  const [demandaHasta, setDemandaHasta] = useState("");

  const loadServicios = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.get("/api/servicios");
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setServicios(data);
    } catch (err) {
      console.error("Reportes load error:", err);
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

  const loadCatalogs = useCallback(async () => {
    setCatalogError("");
    try {
      const [clientesRes, componentesRes] = await Promise.all([
        apiClient.get("/api/clientes"),
        apiClient.get("/api/componentes"),
      ]);

      const clientesRaw = Array.isArray(clientesRes.data)
        ? clientesRes.data
        : clientesRes.data?.data ?? [];
      const componentesRaw = Array.isArray(componentesRes.data)
        ? componentesRes.data
        : componentesRes.data?.data ?? [];

      setClientesOptions(
        clientesRaw
          .map((item) => ({
            value: String(item?.id ?? item?.nid ?? item?.tid ?? ""),
            label:
              item?.cliente ??
              item?.nombre ??
              item?.name ??
              item?.title ??
              "Sin nombre",
            raw: item,
          }))
          .filter((opt) => opt.value)
      );

      setComponentesOptions(
        componentesRaw
          .map((item) => ({
            value: String(item?.id ?? item?.nid ?? item?.tid ?? ""),
            label: item?.title ?? item?.name ?? "Sin nombre",
            raw: item,
          }))
          .filter((opt) => opt.value)
      );
    } catch (err) {
      console.error("Reportes catalog error:", err);
      setCatalogError(
        err?.response?.data?.error || "No se pudieron cargar los catalogos."
      );
    }
  }, []);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const id = setInterval(() => {
      loadServicios();
    }, 30000);
    return () => clearInterval(id);
  }, [autoRefresh, loadServicios]);

  const componentById = useMemo(() => {
    const map = new Map();
    componentesOptions.forEach((opt) => {
      map.set(String(opt.value), opt.raw);
    });
    return map;
  }, [componentesOptions]);

  const clienteNameById = useMemo(() => {
    const map = new Map();
    clientesOptions.forEach((opt) => {
      map.set(String(opt.value), opt.label);
    });
    return map;
  }, [clientesOptions]);

  const filteredComponentOptions = useMemo(() => {
    const clienteIds = normalizeArray(selectedClientes).map(String);
    if (!clienteIds.length) return componentesOptions;
    const clienteNames = new Set(
      clienteIds.map((id) => clienteNameById.get(String(id))).filter(Boolean)
    );

    return componentesOptions.filter((opt) => {
      const raw = opt?.raw ?? {};
      const rawClienteId =
        raw?.cliente_id ?? raw?.cliente?.id ?? raw?.cliente ?? null;
      if (rawClienteId) {
        return clienteIds.includes(String(rawClienteId));
      }
      if (typeof raw?.cliente === "string") {
        return clienteNames.has(raw.cliente);
      }
      return false;
    });
  }, [componentesOptions, selectedClientes, clienteNameById]);

  useEffect(() => {
    if (!selectedComponentes.length) return;
    const allowed = new Set(
      filteredComponentOptions.map((opt) => String(opt.value))
    );
    const next = selectedComponentes.filter((id) =>
      allowed.has(String(id))
    );
    if (next.length !== selectedComponentes.length) {
      setSelectedComponentes(next);
    }
  }, [filteredComponentOptions, selectedComponentes]);

  useEffect(() => {
    if (selectedClientes.length === 0 && selectedComponentes.length) {
      setSelectedComponentes([]);
    }
  }, [selectedClientes, selectedComponentes]);

  const filteredServicios = useMemo(() => {
    const clienteIds = normalizeArray(selectedClientes).map(String);
    const componenteIds = normalizeArray(selectedComponentes).map(String);
    const estados = normalizeArray(selectedEstados);
    const tipos = normalizeArray(selectedTipos);
    const start = parseDate(fromDate);
    const end = parseDate(toDate);

    return servicios.filter((serv) => {
      if (estados.length && !estados.includes(serv.estado)) return false;
      if (tipos.length && !tipos.includes(serv.tipo_servicio)) return false;

      if (clienteIds.length) {
        const id = serv?.cliente?.id?.toString();
        if (!id || !clienteIds.includes(id)) return false;
      }

      if (componenteIds.length) {
        const id = serv?.componente?.id?.toString();
        if (!id || !componenteIds.includes(id)) return false;
      }

      if (start || end) {
        const dateValue = parseDate(serv?.[dateField]);
        if (!dateValue) return false;
        if (start && dateValue < start) return false;
        if (end && dateValue > end) return false;
      }

      return true;
    });
  }, [
    servicios,
    selectedClientes,
    selectedComponentes,
    selectedEstados,
    selectedTipos,
    fromDate,
    toDate,
    dateField,
  ]);

  const now = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const resumen = useMemo(() => {
    const total = filteredServicios.length;
    const activos = filteredServicios.filter(
      (s) => !["completado", "finalizado"].includes(s.estado)
    ).length;
    const finalizados = filteredServicios.filter((s) =>
      ["completado", "finalizado"].includes(s.estado)
    ).length;
    const vencidos = filteredServicios.filter((s) => {
      if (["completado", "finalizado"].includes(s.estado)) return false;
      const fecha = parseDate(s.fecha_proximo_servicio);
      return fecha ? fecha < now : false;
    }).length;

    return { total, activos, finalizados, vencidos };
  }, [filteredServicios, now]);

  const estadosData = useMemo(() => {
    const map = groupCount(filteredServicios, (s) => s.estado || "sin_estado");
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredServicios]);

  const tiposData = useMemo(() => {
    const map = groupCount(filteredServicios, (s) => s.tipo_servicio || "otro");
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredServicios]);

  const clientesData = useMemo(() => {
    const map = groupCount(
      filteredServicios,
      (s) => s?.cliente?.nombre || "Sin cliente"
    );
    const items = Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, topN);
    return items;
  }, [filteredServicios, topN]);

  const timelineData = useMemo(() => {
    const map = groupCount(filteredServicios, (s) =>
      getBucketKey(parseDate(s?.[dateField]), groupBy)
    );
    const keys = sortKeys(Array.from(map.keys()));
    return {
      labels: keys,
      values: keys.map((key) => map.get(key)),
    };
  }, [filteredServicios, dateField, groupBy]);

  const estadoChartOption = useMemo(
    () => ({
      tooltip: { trigger: "item" },
      legend: { top: "bottom" },
      series: [
        {
          type: "pie",
          radius: ["40%", "70%"],
          label: { formatter: "{b}: {c}" },
          data: estadosData,
        },
      ],
      toolbox: { feature: { saveAsImage: {} } },
    }),
    [estadosData]
  );

  const tipoChartOption = useMemo(
    () => ({
      tooltip: { trigger: "item" },
      legend: { top: "bottom" },
      series: [
        {
          type: "pie",
          radius: ["40%", "70%"],
          label: { formatter: "{b}: {c}" },
          data: tiposData,
        },
      ],
      toolbox: { feature: { saveAsImage: {} } },
    }),
    [tiposData]
  );

  const clientesChartOption = useMemo(
    () => ({
      tooltip: { trigger: "axis" },
      grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
      xAxis: { type: "value" },
      yAxis: { type: "category", data: clientesData.map((c) => c.name) },
      series: [
        {
          type: "bar",
          data: clientesData.map((c) => c.value),
          itemStyle: { color: "#3A4D9C" },
        },
      ],
      toolbox: { feature: { saveAsImage: {} } },
    }),
    [clientesData]
  );

  const timelineChartOption = useMemo(
    () => ({
      tooltip: { trigger: "axis" },
      grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
      xAxis: { type: "category", data: timelineData.labels },
      yAxis: { type: "value" },
      series: [
        {
          type: "line",
          smooth: true,
          data: timelineData.values,
          areaStyle: { opacity: 0.12 },
          itemStyle: { color: "#1976d2" },
        },
      ],
      toolbox: { feature: { saveAsImage: {} } },
    }),
    [timelineData]
  );

  const todayStr = useMemo(() => {
    const t = new Date();
    const yyyy = t.getFullYear();
    const mm = String(t.getMonth() + 1).padStart(2, "0");
    const dd = String(t.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const demandaServicios = useMemo(() => {
    const clienteIds = normalizeArray(selectedClientes).map(String);
    const componenteIds = normalizeArray(selectedComponentes).map(String);
    const estados = normalizeArray(selectedEstados);
    const tipos = normalizeArray(selectedTipos);

    const start = parseDate(todayStr);
    const end = parseDate(demandaHasta);

    return servicios.filter((serv) => {
      if (estados.length && !estados.includes(serv.estado)) return false;
      if (tipos.length && !tipos.includes(serv.tipo_servicio)) return false;

      if (clienteIds.length) {
        const id = serv?.cliente?.id?.toString();
        if (!id || !clienteIds.includes(id)) return false;
      }

      if (componenteIds.length) {
        const id = serv?.componente?.id?.toString();
        if (!id || !componenteIds.includes(id)) return false;
      }

      const fecha = parseDate(serv?.fecha_proximo_servicio);
      if (!fecha) return false;
      if (start && fecha < start) return false;
      if (end && fecha > end) return false;

      return true;
    });
  }, [
    servicios,
    selectedClientes,
    selectedComponentes,
    selectedEstados,
    selectedTipos,
    demandaHasta,
    todayStr,
  ]);

  const demandaPorLubricante = useMemo(() => {
    const map = new Map();
    demandaServicios.forEach((serv) => {
      const compId = serv?.componente?.id?.toString();
      const comp = compId ? componentById.get(compId) : null;
      const lubricante =
        comp?.lubricante ??
        comp?.lubricante_nombre ??
        comp?.lubricante_name ??
        comp?.lubricante_title ??
        "Sin lubricante";
      const volumenRaw =
        comp?.volumen_requerido ??
        comp?.volumen ??
        comp?.volumen_requerido_l ??
        0;
      const volumen = Number(volumenRaw) || 0;
      map.set(lubricante, (map.get(lubricante) || 0) + volumen);
    });

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [demandaServicios, componentById]);

  const demandaTotal = useMemo(
    () => demandaPorLubricante.reduce((acc, item) => acc + item.value, 0),
    [demandaPorLubricante]
  );

  const demandaBarOption = useMemo(
    () => ({
      tooltip: { trigger: "axis" },
      grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
      xAxis: { type: "value" },
      yAxis: {
        type: "category",
        data: demandaPorLubricante.slice(0, topN).map((d) => d.name),
      },
      series: [
        {
          type: "bar",
          data: demandaPorLubricante.slice(0, topN).map((d) => d.value),
          itemStyle: { color: "#2e7d32" },
        },
      ],
      toolbox: { feature: { saveAsImage: {} } },
    }),
    [demandaPorLubricante, topN]
  );

  const demandaPieOption = useMemo(
    () => ({
      tooltip: { trigger: "item" },
      legend: { top: "bottom" },
      series: [
        {
          type: "pie",
          radius: ["35%", "70%"],
          label: { formatter: "{b}: {c} L" },
          data: demandaPorLubricante.slice(0, topN),
        },
      ],
      toolbox: { feature: { saveAsImage: {} } },
    }),
    [demandaPorLubricante, topN]
  );

  return (
    <Box>
      <Stack spacing={2}>
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="h5" color="primary">
            Reportes
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
              }
              label="Auto refresco"
            />
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadServicios}
              disabled={loading}
            >
              Refrescar
            </Button>
          </Stack>
        </Box>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            Filtros globales
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <GenericMultiSelect
                label="Clientes"
                name="clientes"
                optionsOverride={clientesOptions}
                value={selectedClientes}
                onChange={(e) => setSelectedClientes(e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <GenericMultiSelect
                label="Componentes"
                name="componentes"
                optionsOverride={filteredComponentOptions}
                value={selectedComponentes}
                onChange={(e) => setSelectedComponentes(e.target.value)}
                size="small"
                disabled={!selectedClientes.length}
                helperText={
                  !selectedClientes.length
                    ? "Selecciona cliente(s) primero"
                    : ""
                }
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <GenericMultiSelect
                label="Estado"
                name="estado"
                optionsOverride={STATUS_OPTIONS}
                value={selectedEstados}
                onChange={(e) => setSelectedEstados(e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <GenericMultiSelect
                label="Tipo servicio"
                name="tipo"
                optionsOverride={TIPO_OPTIONS}
                value={selectedTipos}
                onChange={(e) => setSelectedTipos(e.target.value)}
                size="small"
              />
            </Grid>
          </Grid>
        </Paper>

        {(error || catalogError) && (
          <Alert severity="error">{error || catalogError}</Alert>
        )}

        <Tabs
          value={activeTab}
          onChange={(_, next) => setActiveTab(next)}
          variant="scrollable"
        >
          <Tab label="Servicios" />
          <Tab label="Lubricantes" />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              Filtros por fecha
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TextField
                  select
                  label="Fecha base"
                  value={dateField}
                  onChange={(e) => setDateField(e.target.value)}
                  variant="filled"
                  size="small"
                  fullWidth
                  SelectProps={{ native: true }}
                >
                  {DATE_FIELDS.map((field) => (
                    <option key={field.value} value={field.value}>
                      {field.label}
                    </option>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Desde"
                  type="date"
                  variant="filled"
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Hasta"
                  type="date"
                  variant="filled"
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  select
                  label="Agrupar por"
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  variant="filled"
                  size="small"
                  fullWidth
                  SelectProps={{ native: true }}
                >
                  {GROUP_BY_OPTIONS.map((field) => (
                    <option key={field.value} value={field.value}>
                      {field.label}
                    </option>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </Paper>

          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <StatCard
                label="Servicios filtrados"
                value={resumen.total}
                chip={<Chip label="Total" size="small" color="primary" />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <StatCard
                label="Servicios activos"
                value={resumen.activos}
                chip={<Chip label="En flujo" size="small" color="warning" />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <StatCard
                label="Servicios vencidos"
                value={resumen.vencidos}
                chip={<Chip label="Alerta" size="small" color="error" />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <StatCard
                label="Servicios finalizados"
                value={resumen.finalizados}
                chip={<Chip label="Listo" size="small" color="success" />}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={4}>
              <ChartCard title="Distribucion por estado">
                <ReactECharts
                  option={estadoChartOption}
                  style={{ height: "100%" }}
                />
              </ChartCard>
            </Grid>
            <Grid item xs={12} md={4}>
              <ChartCard title="Distribucion por tipo">
                <ReactECharts
                  option={tipoChartOption}
                  style={{ height: "100%" }}
                />
              </ChartCard>
            </Grid>
            <Grid item xs={12} md={4}>
              <ChartCard title={`Top ${topN} clientes`}>
                <ReactECharts
                  option={clientesChartOption}
                  style={{ height: "100%" }}
                />
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  {[5, 8, 12].map((n) => (
                    <Button
                      key={n}
                      size="small"
                      variant={topN === n ? "contained" : "outlined"}
                      onClick={() => setTopN(n)}
                    >
                      Top {n}
                    </Button>
                  ))}
                </Stack>
              </ChartCard>
            </Grid>
          </Grid>

          <ChartCard title="Servicios en el tiempo" height={360}>
            <ReactECharts
              option={timelineChartOption}
              style={{ height: "100%" }}
            />
          </ChartCard>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              Horizonte de demanda
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Desde"
                  type="date"
                  variant="filled"
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={todayStr}
                  disabled
                  helperText="Inicio desde hoy"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Hasta"
                  type="date"
                  variant="filled"
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={demandaHasta}
                  onChange={(e) => setDemandaHasta(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Top lubricantes"
                  type="number"
                  variant="filled"
                  size="small"
                  fullWidth
                  inputProps={{ min: 3, max: 20 }}
                  value={topN}
                  onChange={(e) => setTopN(Number(e.target.value) || 8)}
                />
              </Grid>
            </Grid>
          </Paper>

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <StatCard
                label="Servicios en horizonte"
                value={demandaServicios.length}
                chip={<Chip label="Demanda" size="small" color="primary" />}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <StatCard
                label="Lubricantes distintos"
                value={demandaPorLubricante.length}
                chip={<Chip label="Catalogo" size="small" color="warning" />}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <StatCard
                label="Volumen total requerido"
                value={`${demandaTotal.toFixed(1)} L`}
                chip={<Chip label="Litros" size="small" color="success" />}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <ChartCard title="Demanda por lubricante">
                <ReactECharts
                  option={demandaBarOption}
                  style={{ height: "100%" }}
                />
              </ChartCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <ChartCard title="Participacion por lubricante">
                <ReactECharts
                  option={demandaPieOption}
                  style={{ height: "100%" }}
                />
              </ChartCard>
            </Grid>
          </Grid>

          <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              Detalle por lubricante
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Lubricante</TableCell>
                  <TableCell align="right">Litros</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {demandaPorLubricante.map((item) => (
                  <TableRow key={item.name}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell align="right">
                      {item.value.toFixed(1)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </TabPanel>
      </Stack>
    </Box>
  );
}
