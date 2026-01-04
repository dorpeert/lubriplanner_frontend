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
import apiListasClient from "../api/apiListasClient";

const GenericSelect = ({
  // Props principales
  endpoint,
  label,
  name,
  value,
  onChange,

  // Props opcionales
  labelField = "name",
  valueField = "id",
  placeholder = "",
  fullWidth = true,
  size = "medium",
  disabled = false,
  required = false,
  hasError = false,
  helperText = "",
  multiple = false,
  searchEnabled = false,
  debounceDelay = 300,
  limit = 100,
  sortBy = null,
  sortOrder = "asc",
  customDataMapper = null,
  sx = {},
  labelSx = {},
  returnLabel = false,
  optionsOverride = null, // ← Ahora es prioritario: si existe, ignora endpoint
}) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  const BASE_URL = "https://lightcoral-emu-437776.hostingersite.com/web";

  const safeValue = options.some(
  (opt) => String(opt.value) === String(value)
)
  ? value
  : "";


  // ✅ PRIORIDAD 1: Opciones manuales con optionsOverride
  useEffect(() => {
    if (optionsOverride !== null && optionsOverride !== undefined) {
      let mapped = [];

      if (Array.isArray(optionsOverride)) {
        mapped = optionsOverride.map((opt) => {
          // Soporte para string simple: ["Nacional", "Importado"]
          if (typeof opt === "string") {
            return { value: opt, label: opt, raw: opt };
          }

          // Soporte para { value: "...", label: "..." }
          if (opt.value !== undefined && opt.label !== undefined) {
            return { value: opt.value, label: opt.label, raw: opt.raw || opt };
          }

          // Soporte para objetos del backend (usa labelField/valueField)
          return {
            value: opt[valueField] || opt.id || opt.tid || opt.nid || String(opt),
            label: opt[labelField] || opt.name || opt.title || "Sin nombre",
            raw: opt,
          };
        });
      }

      setOptions(mapped);
      setLoading(false);
      // Salimos temprano: no hacemos fetch
      return;
    }
  }, [optionsOverride, labelField, valueField]);

  // ✅ FETCH solo si NO hay optionsOverride
  const fetchOptions = useCallback(
    async (searchQuery = "") => {
      if (optionsOverride !== null && optionsOverride !== undefined) {
        return; // No hacer fetch si hay override
      }

      setLoading(true);
      setError(null);

      try {
        let url = `${BASE_URL}${endpoint}`;
        const params = new URLSearchParams();

        if (searchQuery && searchEnabled) {
          params.append("filter[search]", searchQuery);
        }

        if (limit) params.append("page[limit]", limit);

        if (sortBy) {
          params.append("sort", `${sortOrder === "desc" ? "-" : ""}${sortBy}`);
        }

        if (params.toString().length > 0) {
          url = `${url}?${params.toString()}`;
        }

        const response = await apiListasClient.get(url);
        let rawData = response.data;

        if (Array.isArray(rawData)) {
          // ok
        } else if (rawData.data && Array.isArray(rawData.data)) {
          rawData = rawData.data;
        } else {
          rawData = [];
        }

        let mappedOptions = rawData.map((item) => {
          if (customDataMapper) {
            return customDataMapper(item);
          }

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

          return {
            value: id,
            label: labelValue,
            raw: item,
          };
        });

        setOptions(mappedOptions);
      } catch (err) {
        console.error("❌ GenericSelect Error:", err);
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
    ]
  );

  // Ejecutar fetch solo si no hay override
  useEffect(() => {
    if (optionsOverride === null || optionsOverride === undefined) {
      fetchOptions();
    }
  }, [fetchOptions, optionsOverride]);

  // Búsqueda en tiempo real (solo si no hay override)
  useEffect(() => {
    if (!searchEnabled || optionsOverride !== null) return;

    const timeoutId = setTimeout(() => {
      fetchOptions(search);
    }, debounceDelay);

    return () => clearTimeout(timeoutId);
  }, [search, searchEnabled, fetchOptions, debounceDelay, optionsOverride]);



  // NORMALIZACIÓN

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

  // returnLabel: value es label → buscar value real
  if (returnLabel && typeof value === "string") {
    const match = options.find((o) => o.label === value);
    return match ? match.value : "";
  }

  // value normal
  const exists = options.some(
    (o) => String(o.value) === String(value)
  );

  return exists ? value : "";
}, [value, options, multiple, returnLabel]);



  // Handler del cambio
  const handleSelectChange = (e) => {
    const selectedValue = e.target.value;
    const selectedOption = options.find((o) => o.value === selectedValue);

    const enhancedEvent = {
      ...e,
      target: {
        ...e.target,
        raw: selectedOption?.raw || null,
      },
    };

    if (returnLabel) {
      if (multiple) {
        // Múltiple con returnLabel (raro, pero soportado)
        const labels = selectedValue.map((val) =>
          options.find((o) => o.value === val)?.label || val
        );
        onChange &&
          onChange({
            ...enhancedEvent,
            target: { ...enhancedEvent.target, value: labels },
          });
      } else {
        const out = selectedOption ? selectedOption.label : selectedValue;
        onChange &&
          onChange({
            ...enhancedEvent,
            target: { ...enhancedEvent.target, value: out },
          });
      }
    } else {
      onChange && onChange(enhancedEvent);
    }
  };

  // Render de ítems
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
          <Alert severity="error" sx={{ width: "100%" }} variant="outlined">
            {error}
          </Alert>
        </MenuItem>
      );
    }

    if (options.length === 0) {
      return (
        <MenuItem disabled>
          <Typography variant="body2" color="text.secondary">
            No hay opciones disponibles
          </Typography>
        </MenuItem>
      );
    }

    return options.map((option) => (
      <MenuItem key={option.value} value={option.value}>
        {option.label}
      </MenuItem>
    ));
  };

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

  MenuProps={{
    anchorOrigin: {
      vertical: "bottom",
      horizontal: "left",
    },
    transformOrigin: {
      vertical: "top",
      horizontal: "left",
    },
    getContentAnchorEl: null,
  }}

  renderValue={(selected) => {
    if (multiple) {
      if (!selected || selected.length === 0)
        return placeholder || <em>Seleccione</em>;
      const labels = selected
        .map((val) => options.find((o) => o.value === val)?.label)
        .filter(Boolean);
      return labels.join(", ");
    }
    const selectedOption = options.find((o) => o.value === selected);
    return selectedOption ? selectedOption.label : placeholder;
  }}
>
        {/* Buscador */}
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
                  padding: "8px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                }}
              />
            </Box>
          </MenuItem>
        )}


        {/* Opciones */}
        {renderMenuItems()}
      </Select>

      {helperText && (
        <Typography variant="caption" color={hasError ? "error" : "text.secondary"}>
          {helperText}
        </Typography>
      )}
    </FormControl>
  );
};

export default React.memo(GenericSelect);