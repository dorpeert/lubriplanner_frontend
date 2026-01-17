// src/forms/ComponenteFormContent.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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

import GenericSelect from "../componentsNew/GenericSelect";
import InlineEdit from "../componentsNew/InlineEdit";
import ServiciosTable from "../componentsNew/ServiciosTable";
import GenericAutocomplete from "../componentsNew/GenericAutocomplete";

import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { componenteValidationSchema } from "../validations/componenteValidationSchema";

const CLIENTES_URL =
  "https://lightcoral-emu-437776.hostingersite.com/web/api/clientes";

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
     ESTADO DE LISTAS
  ========================== */
  const [clientes, setClientes] = useState([]);
  const [activos, setActivos] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  /* =========================
     WATCH (reactivo)
  ========================== */
  const watchedClienteId = watch("cliente_id");
  const watchedActivoId = watch("activo_id");
  const watchedEquipoId = watch("equipo_id");
  const watchedLubricanteId = watch("lubricante_id");

  /* =========================
     REFS
  ========================== */
  const prevClienteIdRef = useRef(null);
  const prevActivoIdRef = useRef(null);

  // Evita que los efectos de cascada “limpien” campos durante el primer ciclo de hidratación
  const isHydratingRef = useRef(true);

  /* =========================
     RESET cuando cambia initialData
  ========================== */
  useEffect(() => {
    isHydratingRef.current = true;
    reset(initialData);

    // prevs al valor actual para que NO se limpien campos al ver/editar
    prevClienteIdRef.current = initialData?.cliente_id ?? null;
    prevActivoIdRef.current = initialData?.activo_id ?? null;

    // libera el modo hidratación en el siguiente tick
    Promise.resolve().then(() => {
      isHydratingRef.current = false;
    });
  }, [initialData, reset]);

  useEffect(() => {
    onValidationChange?.(isValid, isDirty);
  }, [isValid, isDirty, onValidationChange]);

  /* =========================
     CARGA DE CLIENTES (una sola vez)
  ========================== */
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setDataLoading(true);

        const res = await fetch(CLIENTES_URL, { credentials: "include" });
        const json = await res.json();

        const clientesArray = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json)
          ? json
          : [];

        if (cancelled) return;

        setClientes(clientesArray);
        setDataLoading(false);

        // Prefill de activos/equipos si venimos con initialData
        const clienteIdInit = initialData?.cliente_id;
        const activoIdInit = initialData?.activo_id;

        if (clienteIdInit) {
          const cliente = clientesArray.find(
            (c) => String(c.id) === String(clienteIdInit)
          );

          const acts =
            cliente?.activos?.map((a) => ({
              ...a,
              id: a.id,
              nombre: a.activo,
              // ✅ en tu data real equipos vienen en "eq"
              equipos: Array.isArray(a.eq)
                ? a.eq
                : Array.isArray(a.equipos)
                ? a.equipos
                : [],
            })) || [];

          setActivos(acts);

          if (activoIdInit) {
            const act = acts.find((a) => String(a.id) === String(activoIdInit));
            setEquipos(act?.equipos || []);
          } else {
            setEquipos([]);
          }
        } else {
          setActivos([]);
          setEquipos([]);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Error cargando clientes:", err);
        setClientes([]);
        setActivos([]);
        setEquipos([]);
        setDataLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================
     CASCADA 1: Cliente -> Activos
     - Limpia SOLO si el cliente cambió realmente (no al hidratar)
  ========================== */
  useEffect(() => {
    if (!clientes.length) return;

    // Si no hay cliente seleccionado
    if (!watchedClienteId) {
      setActivos([]);
      setEquipos([]);

      // ⚠️ No limpies durante hidratación (si no, se te pierde activo/equipo en "Ver")
      if (!isHydratingRef.current) {
        setValue("activo_id", null);
        setValue("activo", "");
        setValue("equipo_id", null);
        setValue("equipo", "");
        setValue("modelo_equipo", "");
        setValue("fabricante_equipo", "");
      }

      prevClienteIdRef.current = null;
      prevActivoIdRef.current = null;
      return;
    }

    const cliente = clientes.find(
      (c) => String(c.id) === String(watchedClienteId)
    );

    const nuevosActivos =
      cliente?.activos?.map((a) => ({
        ...a,
        id: a.id,
        nombre: a.activo,
        equipos: Array.isArray(a.eq)
          ? a.eq
          : Array.isArray(a.equipos)
          ? a.equipos
          : [],
      })) || [];

    setActivos(nuevosActivos);

    const prevClienteId = prevClienteIdRef.current;

    // ✅ Limpieza SOLO si cambió el cliente (y NO estamos hidratando)
    if (
      !isHydratingRef.current &&
      prevClienteId !== null &&
      String(prevClienteId) !== String(watchedClienteId)
    ) {
      setEquipos([]);
      setValue("activo_id", null);
      setValue("activo", "");
      setValue("equipo_id", null);
      setValue("equipo", "");
      setValue("modelo_equipo", "");
      setValue("fabricante_equipo", "");
      prevActivoIdRef.current = null;
    }

    prevClienteIdRef.current = watchedClienteId;
  }, [watchedClienteId, clientes, setValue]);

  /* =========================
     CASCADA 2: Activo -> Equipos
     - NO limpia equipo al ver/editar durante hidratación
     - La limpieza “real” del equipo se hace en handleActivoChange (cuando el usuario cambia)
  ========================== */
  useEffect(() => {
    // Si no hay activo seleccionado, vacía equipos
    if (!watchedActivoId) {
      setEquipos([]);

      // ⚠️ Solo limpiar campos si el usuario está editando y ya pasó hidratación
      if (!isHydratingRef.current && !isViewMode) {
        setValue("equipo_id", null);
        setValue("equipo", "");
        setValue("modelo_equipo", "");
        setValue("fabricante_equipo", "");
      }

      prevActivoIdRef.current = null;
      return;
    }

    const activo = activos.find(
      (a) => String(a.id) === String(watchedActivoId)
    );

    // ✅ los equipos ya están normalizados en activo.equipos, pero dejamos fallback por seguridad
    const eqs = activo?.equipos || activo?.eq || [];
    setEquipos(eqs);

    const prevActivoId = prevActivoIdRef.current;

    // ✅ Solo limpiar si cambió el activo (y NO estamos hidratando, y NO en modo ver)
    if (
      !isHydratingRef.current &&
      !isViewMode &&
      prevActivoId !== null &&
      String(prevActivoId) !== String(watchedActivoId)
    ) {
      setValue("equipo_id", null);
      setValue("equipo", "");
      setValue("modelo_equipo", "");
      setValue("fabricante_equipo", "");
    }

    prevActivoIdRef.current = watchedActivoId;
  }, [watchedActivoId, activos, setValue, isViewMode]);

  /* =========================
     HANDLERS
  ========================== */
  const handleClienteChange = (e) => {
    const id = e.target.value;
    const cliente = clientes.find((c) => String(c.id) === String(id)) || {};

    setValue("cliente_id", id, { shouldDirty: true, shouldValidate: true });
    setValue("cliente", cliente.cliente || "", { shouldDirty: true });

    // Al cambiar cliente (acción de usuario) limpiamos dependientes
    setValue("activo_id", null, { shouldDirty: true, shouldValidate: true });
    setValue("activo", "", { shouldDirty: true });
    setValue("equipo_id", null, { shouldDirty: true, shouldValidate: true });
    setValue("equipo", "", { shouldDirty: true });
    setValue("modelo_equipo", "", { shouldDirty: true });
    setValue("fabricante_equipo", "", { shouldDirty: true });

    prevClienteIdRef.current = id;
    prevActivoIdRef.current = null;
  };

  const handleActivoChange = (e) => {
    const activoId = e.target.value;
    const activo = activos.find((a) => String(a.id) === String(activoId)) || {};

    setValue("activo_id", activoId, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("activo", activo.activo || activo.nombre || "", {
      shouldDirty: true,
    });

    // ✅ Esta es la limpieza correcta (solo cuando el usuario cambia activo)
    setValue("equipo_id", null, { shouldDirty: true, shouldValidate: true });
    setValue("equipo", "", { shouldDirty: true });
    setValue("modelo_equipo", "", { shouldDirty: true });
    setValue("fabricante_equipo", "", { shouldDirty: true });

    prevActivoIdRef.current = activoId;
  };

  const handleEquipoChange = (e) => {
    const equipoId = e.target.value;
    const equipo =
      equipos.find((eq) => String(eq.id) === String(equipoId)) || {};

    setValue("equipo_id", equipoId, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("equipo", equipo.equipo || "", { shouldDirty: true });
    setValue("modelo_equipo", equipo.modelo || "", { shouldDirty: true });
    setValue("fabricante_equipo", equipo.fabricante || "", {
      shouldDirty: true,
    });
  };

  const handleLubricanteChange = (eOrItem) => {
    const value = eOrItem?.target?.value ?? eOrItem?.value ?? "";
    const raw = eOrItem?.target?.raw ?? eOrItem?.raw ?? null;

    setValue("lubricante_id", value, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("lubricante", raw?.title || "", { shouldDirty: true });
    setValue("lubricante_codigo", raw?.codigo || "", { shouldDirty: true });
  };

  /* =========================
     CLASE MODAL (solo si existe modal)
  ========================== */
  useEffect(() => {
    const modal = document.querySelector(".MuiModal-root");
    if (!modal) return;

    if (isViewMode) modal.classList.add("componentesForm-page");
    else modal.classList.remove("componentesForm-page");

    return () => modal.classList.remove("componentesForm-page");
  }, [isViewMode]);

  /* =========================
     SUBMIT
  ========================== */
  const submitForm = (data) => onSubmit(data);

  if (dataLoading) return <CircularProgress sx={{ m: 4 }} />;

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
                value={watchedClienteId || ""}
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
                value={watchedActivoId || ""}
                onChange={handleActivoChange}
                disabled={isViewMode || loading || activos.length === 0}
                optionsOverride={activos.map((a) => ({
                  value: a.id,
                  label: a.nombre,
                }))}
                fullWidth
                sx={{ width: "calc(100% / 3)" }}
                error={!!errors.activo_id}
                helperText={errors.activo_id?.message}
              />

              <GenericSelect
                label="Equipo"
                value={watchedEquipoId || ""}
                onChange={handleEquipoChange}
                disabled={isViewMode || loading || equipos.length === 0}
                optionsOverride={equipos.map((eq) => ({
                  value: eq.id,
                  label: eq.equipo,
                }))}
                fullWidth
                sx={{ width: "calc(100% / 3)" }}
                error={!!errors.equipo_id}
                helperText={errors.equipo_id?.message}
              />
            </Grid>

            {/* Lubricante y frecuencias */}
            <Grid sx={{ display: "flex", gap: "1em" }}>
              <GenericAutocomplete
                sx={{ width: "calc(100% / 3)" }}
                endpoint="/api/lubricantes"
                label="Lubricante"
                value={watchedLubricanteId || ""}
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
            <ServiciosTable componenteId={initialData.id} readOnly={false} />
          </Paper>
        )}
      </Grid>
    </form>
  );
};

export default React.memo(ComponenteFormContent);
