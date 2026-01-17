import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  CircularProgress,
  Alert,
  Typography,
} from "@mui/material";
import apiClient from "../api/apiClient";

/**
 * =========================================================
 * GenericSelect
 * ---------------------------------------------------------
 * Select genérico reutilizable basado en MUI.
 * Soporta:
 * - Fetch remoto (Drupal / API REST)
 * - Opciones manuales (optionsOverride)
 * - Single / Multiple
 * - Retorno por value o label
 * - Búsqueda con debounce
 * - Mapeo flexible de datos
 * =========================================================
 */

const BASE_URL = "https://lightcoral-emu-437776.hostingersite.com/web";

const GenericSelect = ({
  // ===== Props principales =====
  endpoint,
  label,
  name,
  value,
  onChange,

  // ===== Configuración de datos =====
  labelField = "name",
  valueField = "id",
  customDataMapper = null,
  optionsOverride = null, // 🔥 Prioridad absoluta sobre endpoint

  // ===== UI / UX =====
  placeholder = "",
  fullWidth = true,
  size = "medium",
  disabled = false,
  required = false,
  hasError = false,
  helperText = "",
  sx = {},
  labelSx = {},

  // ===== Comportamiento =====
  multiple = false,
  returnLabel = false,

  // ===== Búsqueda / Fetch =====
  searchEnabled = false,
  debounceDelay = 300,
  limit = 100,
  sortBy = null,
  sortOrder = "asc",
}) => {
  /**
   * =============================
   * ESTADOS INTERNOS
   * =============================
   */
  const [options, setOptions] = useState([]); // Opciones normalizadas
  const [loading, setLoading] = useState(false); // Estado de carga
  const [error, setError] = useState(null); // Error de API
  const [search, setSearch] = useState(""); // Texto de búsqueda

  /**
   * =========================================================
   * EFECTO 1: Opciones manuales (optionsOverride)
   * ---------------------------------------------------------
   * Si existen, NO se hace fetch remoto
   * =========================================================
   */
  useEffect(() => {
    if (optionsOverride === null || optionsOverride === undefined) return;

    let mapped = [];

    if (Array.isArray(optionsOverride)) {
      mapped = optionsOverride.map((opt) => {
        // Caso: string simple
        if (typeof opt === "string") {
          return { value: opt, label: opt, raw: opt };
        }

        // Caso: { value, label }
        if (opt?.value !== undefined && opt?.label !== undefined) {
          return { value: opt.value, label: opt.label, raw: opt.raw || opt };
        }

        // Caso: objeto backend
        return {
          value: opt[valueField] || opt.id || opt.tid || opt.nid || String(opt),
          label: opt[labelField] || opt.name || opt.title || "Sin nombre",
          raw: opt,
        };
      });
    }

    setOptions(mapped);
    setLoading(false);
  }, [optionsOverride, labelField, valueField]);

  /**
   * =========================================================
   * FETCH REMOTO DE OPCIONES
   * ---------------------------------------------------------
   * Se ejecuta SOLO si no hay override
   * =========================================================
   */
  const fetchOptions = useCallback(
    async (searchQuery = "") => {
      if (optionsOverride !== null && optionsOverride !== undefined) return;

      setLoading(true);
      setError(null);

      try {
        let url = `${BASE_URL}${endpoint}`;
        const params = new URLSearchParams();

        // Búsqueda
        if (searchQuery && searchEnabled) {
          params.append("filter[name]", searchQuery);
        }

        // Límite (API custom: ?limit=100)
        if (limit) params.append("limit", String(limit));
        if (!params.has("page")) params.append("page", "0");

        // Ordenamiento
        if (sortBy) {
          params.append("sort", `${sortOrder === "desc" ? "-" : ""}${sortBy}`);
        }

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const response = await apiClient.get(url);
        let rawData = response.data;

        // Normalización de respuesta
        if (rawData?.data && Array.isArray(rawData.data)) {
          rawData = rawData.data;
        }

        if (!Array.isArray(rawData)) rawData = [];

        const mappedOptions = rawData.map((item) => {
          if (customDataMapper) return customDataMapper(item);

          const id =
            item[valueField] ||
            item.id ||
            item.tid ||
            item.nid ||
            item.attributes?.id ||
            `id_${Math.random()}`;

          const labelValue =
            item[labelField] ||
            item.attributes?.[labelField] ||
            item.name ||
            item.title ||
            "Sin nombre";

          return { value: id, label: labelValue, raw: item };
        });

        setOptions(mappedOptions);
      } catch (err) {
        console.error("❌ GenericSelect fetch error", err);
        setError("Error cargando opciones");
      } finally {
        setLoading(false);
      }
    },
    [
      endpoint,
      labelField,
      valueField,
      limit,
      sortBy,
      sortOrder,
      searchEnabled,
      optionsOverride,
      customDataMapper,
    ]
  );

  /**
   * Fetch inicial
   */
  useEffect(() => {
    if (optionsOverride === null || optionsOverride === undefined) {
      fetchOptions();
    }
  }, [fetchOptions, optionsOverride]);

  /**
   * Búsqueda con debounce
   */
  useEffect(() => {
    if (!searchEnabled || optionsOverride !== null) return;

    const timeout = setTimeout(() => {
      fetchOptions(search);
    }, debounceDelay);

    return () => clearTimeout(timeout);
  }, [search, searchEnabled, debounceDelay, fetchOptions, optionsOverride]);

  /**
   * =========================================================
   * NORMALIZACIÓN DEL VALUE
   * ---------------------------------------------------------
   * Evita warnings MUI y valores huérfanos
   * =========================================================
   */
  const resolvedValue = useMemo(() => {
    // MULTIPLE
    if (multiple) {
      if (!Array.isArray(value)) return [];
      return value.filter((v) =>
        options.some((o) => String(o.value) === String(v))
      );
    }

    // SIMPLE
    if (value === undefined || value === null) return "";

    // returnLabel: value viene como label
    if (returnLabel && typeof value === "string") {
      const match = options.find((o) => o.label === value);
      return match ? match.value : "";
    }

    const exists = options.some((o) => String(o.value) === String(value));

    return exists ? value : "";
  }, [value, options, multiple, returnLabel]);

  /**
   * =========================================================
   * HANDLER DE CAMBIO
   * =========================================================
   */
  const handleSelectChange = (e) => {
    const selectedValue = e.target.value;

    // MULTIPLE
    if (multiple) {
      const selectedOptions = selectedValue.map((val) =>
        options.find((o) => o.value === val)
      );

      const outValue = returnLabel
        ? selectedOptions.map((o) => o?.label)
        : selectedValue;

      onChange?.({
        ...e,
        target: {
          ...e.target,
          value: outValue,
          raw: selectedOptions.map((o) => o?.raw),
        },
      });

      return;
    }

    // SIMPLE
    const selectedOption = options.find((o) => o.value === selectedValue);

    onChange?.({
      ...e,
      target: {
        ...e.target,
        value: returnLabel ? selectedOption?.label : selectedValue,
        raw: selectedOption?.raw || null,
      },
    });
  };

  /**
   * Renderizado de opciones
   */
  const renderMenuItems = () => {
    if (loading) {
      return (
        <MenuItem disabled>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="body2">Cargando...</Typography>
          </Box>
        </MenuItem>
      );
    }

    if (error) {
      return (
        <MenuItem disabled>
          <Alert severity="error" variant="outlined" sx={{ width: "100%" }}>
            {error}
          </Alert>
        </MenuItem>
      );
    }

    if (!options.length) {
      return (
        <MenuItem disabled>
          <Typography variant="body2" color="text.secondary">
            No hay opciones disponibles
          </Typography>
        </MenuItem>
      );
    }

    return options.map((opt) => (
      <MenuItem key={opt.value} value={opt.value}>
        {opt.label}
      </MenuItem>
    ));
  };

  /**
   * =========================================================
   * RENDER
   * =========================================================
   */
  return (
    <FormControl
      fullWidth={fullWidth}
      size={size}
      error={hasError}
      disabled={disabled}
      required={required}
      sx={sx}
    >
      <InputLabel sx={labelSx}>{label}</InputLabel>

      <Select
        name={name}
        value={resolvedValue}
        onChange={handleSelectChange}
        label={label}
        multiple={multiple}
        disabled={disabled || loading}
        displayEmpty
        variant="filled"
        onClose={() => setSearch("")}
        renderValue={(selected) => {
          if (multiple) {
            if (!selected.length) return placeholder || <em>Seleccione</em>;
            return selected
              .map((val) => options.find((o) => o.value === val)?.label)
              .filter(Boolean)
              .join(", ");
          }

          const opt = options.find((o) => o.value === selected);
          return opt?.label || placeholder;
        }}
      >
        {searchEnabled && !optionsOverride && (
          <MenuItem>
            <Box sx={{ width: "100%" }}>
              <input
                autoFocus
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 6,
                  border: "1px solid #ccc",
                }}
              />
            </Box>
          </MenuItem>
        )}

        {renderMenuItems()}
      </Select>

      {helperText && (
        <Typography
          variant="caption"
          color={hasError ? "error" : "text.secondary"}
        >
          {helperText}
        </Typography>
      )}
    </FormControl>
  );
};

export default React.memo(GenericSelect);
