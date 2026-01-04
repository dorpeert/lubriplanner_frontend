// src/forms/ComponenteFormContent.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Grid,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Paper,
  Divider,
  Button,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import GenericSelect from "../components/GenericSelect";
import InlineEdit from "../components/InlineEdit";
import ServiciosTable from "../components/ServiciosTable";
import GenericAutocomplete from "../components/GenericAutocomplete";

import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { componenteValidationSchema } from "../validations/componenteValidationSchema";

const ComponenteFormContent = ({
  formId,
  formData: initialData = {},
  isViewMode = false,
  loading = false,
  onValidationChange,
  editingItem = null,
  onSubmit,
}) => {
  const navigate = useNavigate();

  /* =========================
     VALIDACIÓN
  ========================== */
  const validationSchema = useMemo(
    () => componenteValidationSchema(editingItem?.id),
    [editingItem]
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors, isValid, isDirty },
  } = useForm({
    resolver: yupResolver(validationSchema),
    mode: "onChange",
    defaultValues: initialData,
  });

  /* =========================
     ACTUALIZAR DATA + NOTIFICACIÓN
  ========================== */
  useEffect(() => {
    reset(initialData);
  }, [initialData, reset]);

  useEffect(() => {
    onValidationChange?.(isValid, isDirty);
  }, [isValid, isDirty, onValidationChange]);

  /* =========================
     CARGA DE DATOS (CLIENTES Y LUBRICANTES)
  ========================== */
  const [clientes, setClientes] = useState([]);
  const [activos, setActivos] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [lubricantes, setLubricantes] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(
        "https://lightcoral-emu-437776.hostingersite.com/web/api/clientes",
        { credentials: "include" }
      ).then((r) => r.json()),

      fetch(
        "https://lightcoral-emu-437776.hostingersite.com/web/api/lubricantes",
        { credentials: "include" }
      ).then((r) => r.json()),
    ])
      .then(([clientesData, lubricantesData]) => {
        setClientes(clientesData || []);
        setLubricantes(lubricantesData || []);
        setDataLoading(false);

        const clienteId = initialData.cliente_id;
        if (clienteId && clientesData?.length) {
          const cliente = clientesData.find((c) => c.id == clienteId);
          if (cliente?.activos) {
            const acts = cliente.activos.map((a) => ({
              id: a.id,
              nombre: a.activo,
              ...a,
            }));
            setActivos(acts);

            const activoNombre = initialData.activo;
            if (activoNombre) {
              const activo = cliente.activos.find(
                (a) => a.activo === activoNombre
              );
              if (activo?.equipos) {
                setEquipos(activo.equipos || []);
              }
            }
          }
        }
      })
      .catch((err) => {
        console.error("Error cargando datos iniciales:", err);
        setDataLoading(false);
      });
  }, []); // Solo una vez al montar

  /* =========================
     REACTIVIDAD DE CASCADA
  ========================== */
  const watchedClienteId = watch("cliente_id");
  const watchedActivo = watch("activo");

  useEffect(() => {
    if (!clientes.length || !watchedClienteId) {
      setActivos([]);
      setEquipos([]);
      setValue("activo", "");
      setValue("equipo", "");
      setValue("activo_id", null);
      setValue("equipo_id", null);
      setValue("modelo_equipo", "");
      setValue("fabricante_equipo", "");
      return;
    }

    const cliente = clientes.find((c) => c.id == watchedClienteId);
    if (!cliente) return;

    const nuevosActivos =
      cliente.activos?.map((a) => ({
        id: a.id,
        nombre: a.activo,
        ...a,
      })) || [];
    setActivos(nuevosActivos);

    // Limpiar campos inferiores
    setValue("activo", "");
    setValue("equipo", "");
    setValue("activo_id", null);
    setValue("equipo_id", null);
    setValue("modelo_equipo", "");
    setValue("fabricante_equipo", "");
  }, [watchedClienteId, clientes, setValue]);

  useEffect(() => {
    if (!watchedClienteId || !watchedActivo || !clientes.length) {
      setEquipos([]);
      setValue("equipo", "");
      setValue("equipo_id", null);
      setValue("modelo_equipo", "");
      setValue("fabricante_equipo", "");
      return;
    }

    const cliente = clientes.find((c) => c.id == watchedClienteId);
    const activo = cliente?.activos?.find((a) => a.activo === watchedActivo);
    setEquipos(activo?.equipos || []);

    setValue("equipo", "");
    setValue("equipo_id", null);
    setValue("modelo_equipo", "");
    setValue("fabricante_equipo", "");
  }, [watchedActivo, watchedClienteId, clientes, setValue]);

  /* =========================
     HANDLERS DE SELECCIÓN
  ========================== */
  const handleClienteChange = (e) => {
    const id = e.target.value;
    const cliente = clientes.find((c) => c.id == id) || {};
    setValue("cliente_id", id, { shouldDirty: true });
    setValue("cliente", cliente.cliente || "", { shouldDirty: true });
  };

  const handleActivoChange = (e) => {
    const nombre = e.target.value;
    const cliente = clientes.find((c) => c.id == watchedClienteId);
    const activo = cliente?.activos?.find((a) => a.activo === nombre) || {};

    setValue("activo", nombre, { shouldDirty: true });
    setValue("activo_id", activo.id || null, { shouldDirty: true });
  };

  const handleEquipoChange = (e) => {
    const nombreEquipo = e.target.value;
    const equipo = equipos.find((eq) => eq.equipo === nombreEquipo) || {};

    setValue("equipo", equipo.equipo || "", { shouldDirty: true });
    setValue("equipo_id", equipo.id || null, { shouldDirty: true });
    setValue("modelo_equipo", equipo.modelo || "", { shouldDirty: true });
    setValue("fabricante_equipo", equipo.fabricante || "", {
      shouldDirty: true,
    });
  };

  const handleLubricanteChange = (e) => {
    const raw = e.target.raw;
    setValue("lubricante_id", e.target.value, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("lubricante", raw?.title || "", { shouldDirty: true });
    setValue("lubricante_codigo", raw?.codigo || "", { shouldDirty: true });
  };

  /* =========================
     CLASE MODAL (MANTIENE COMPORTAMIENTO ORIGINAL)
  ========================== */
  useEffect(() => {
    const modal = document.querySelector(".MuiModal-root");
    if (!modal) return;

    if (isViewMode) {
      modal.classList.add("componentesForm-page");
    } else {
      modal.classList.remove("componentesForm-page");
    }

    return () => modal.classList.remove("componentesForm-page");
  }, [isViewMode]);

  /* =========================
     SUBMIT
  ========================== */
  const submitForm = (data) => {
    onSubmit(data);
  };

  if (dataLoading) {
    return <CircularProgress sx={{ m: 4 }} />;
  }

  /* =========================
     RENDER
  ========================== */
  return (
    <form id={formId} onSubmit={handleSubmit(submitForm)}>
      <Grid sx={{ display: "flex", gap: "1em", flexDirection: "column" }}>
        {/* Título */}
        {isViewMode ? (
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="h5" sx={{ fontSize: "1.5rem" }}>
              {initialData.title || "—"}
            </Typography>
            <Button
              startIcon={<ArrowBackIcon />}
              variant="outlined"
              onClick={() => navigate(-1)}
            >
              Volver
            </Button>
          </Box>
        ) : (
          <InlineEdit
            value={getValues("title") || ""}
            displayValue="Nombre del componente"
            placeholder="Nombre del componente"
            onChange={(val) =>
              setValue("title", val, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            sx={{ fontSize: "1.5rem", color: "#3A4D9C", pb: 0.5 }}
            textProps={{ variant: "h6" }}
            error={!!errors.title}
            helperText={errors.title?.message}
          />
        )}

        <Paper sx={{ p: ".5em 1em 1em 1em", borderRadius: 1 }}>
          <Typography variant="subtitle1" gutterBottom color="#212121">
            Información del componente
          </Typography>
          <Divider sx={{ mb: 1 }} />

          <Box sx={{ display: "flex", flexDirection: "column", gap: "1em" }}>
            {/* Cliente - Activo - Equipo */}
            <Grid sx={{ display: "flex", gap: "1em" }}>
              <GenericSelect
                label="Cliente"
                value={getValues("cliente_id") || ""}
                onChange={handleClienteChange}
                disabled={isViewMode || loading || dataLoading}
                optionsOverride={clientes.map((c) => ({
                  value: c.id,
                  label: c.cliente,
                }))}
                fullWidth
                sx={{ width: "calc(100% / 3)" }}
                error={!!errors.cliente_id}
                helperText={errors.cliente_id?.message}
              />

              <GenericSelect
                label="Activo"
                value={getValues("activo") || ""}
                onChange={handleActivoChange}
                disabled={isViewMode || loading || activos.length === 0}
                optionsOverride={activos.map((a) => ({
                  value: a.nombre,
                  label: a.nombre,
                }))}
                fullWidth
                sx={{ width: "calc(100% / 3)" }}
                error={!!errors.activo}
                helperText={errors.activo?.message}
              />

              <GenericSelect
                label="Equipo"
                value={getValues("equipo") || ""}
                onChange={handleEquipoChange}
                disabled={isViewMode || loading || equipos.length === 0}
                optionsOverride={equipos.map((eq) => ({
                  value: eq.equipo,
                  label: eq.equipo,
                }))}
                fullWidth
                sx={{ width: "calc(100% / 3)" }}
                error={!!errors.equipo}
                helperText={errors.equipo?.message}
              />
            </Grid>

            {/* Lubricante y frecuencias */}
            <Grid sx={{ display: "flex", gap: "1em" }}>
              <GenericAutocomplete
                sx={{ width: "calc(100% / 3)" }}
                endpoint="/api/lubricantes"
                label="Lubricante"
                value={getValues("lubricante_id") || ""}
                disabled={isViewMode || loading}
                placeholder="Buscar lubricante..."
                sortBy="codigo"
                customDataMapper={(item) => ({
                  value: item.id,
                  label: `${item.codigo} - ${item.title}`,
                  raw: item,
                })}
                onChange={handleLubricanteChange}
                error={!!errors.lubricante_id}
                helperText={errors.lubricante_id?.message}
              />

              <TextField
                label="Frecuencia Cambio (horas)"
                type="number"
                {...register("frecuencia_cambio")}
                disabled={isViewMode || loading}
                fullWidth
                variant="filled"
                sx={{ width: "calc(100% / 3)" }}
                error={!!errors.frecuencia_cambio}
                helperText={errors.frecuencia_cambio?.message}
              />

              <TextField
                label="Frecuencia Muestreo (horas)"
                type="number"
                {...register("frecuencia_muestreo")}
                disabled={isViewMode || loading}
                fullWidth
                variant="filled"
                sx={{ width: "calc(100% / 3)" }}
                error={!!errors.frecuencia_muestreo}
                helperText={errors.frecuencia_muestreo?.message}
              />
            </Grid>

            {/* Volumen y observaciones */}
            <Grid sx={{ display: "flex", gap: "1em" }}>
              <TextField
                label="Volumen Requerido (L)"
                type="number"
                step="0.1"
                {...register("volumen_requerido")}
                disabled={isViewMode || loading}
                fullWidth
                variant="filled"
                sx={{ width: "25%" }}
              />

              <TextField
                label="Observaciones"
                {...register("observaciones")}
                disabled={isViewMode || loading}
                fullWidth
                variant="filled"
                multiline
                sx={{ width: "75%" }}
              />
            </Grid>
          </Box>
        </Paper>

        {/* Historial solo en modo vista */}
        {isViewMode && (
          <Paper sx={{ p: ".5em 1em 1em 1em", borderRadius: 1 }}>
            <Typography variant="subtitle1" gutterBottom color="#212121">
              Historial de servicios
            </Typography>
            <Divider sx={{ mb: 1 }} />
            <ServiciosTable componenteId={initialData.id} />
          </Paper>
        )}
      </Grid>
    </form>
  );
};

export default React.memo(ComponenteFormContent);
