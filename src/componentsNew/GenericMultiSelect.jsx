// GenericMultiSelect.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  Box,
  CircularProgress,
  Alert,
  Typography,
} from "@mui/material";

import apiClient from "../api/apiClient";

const normalizeOverride = (optionsOverride) => {
  if (!Array.isArray(optionsOverride)) return null;

  // Permitir ["Nacional", "Importado"]
  if (optionsOverride.every((x) => typeof x === "string")) {
    return optionsOverride.map((s) => ({ value: s, label: s, raw: s }));
  }

  // Permitir [{value,label}] o [{id,name}] etc.
  return optionsOverride
    .map((o) => {
      if (!o) return null;

      const value =
        o.value ?? o.id ?? o.tid ?? o.key ?? o.name ?? o.title ?? null;

      const label =
        o.label ?? o.name ?? o.title ?? o.text ?? String(value ?? "");

      if (value === null || value === undefined) return null;

      return { value: String(value), label: String(label), raw: o };
    })
    .filter(Boolean);
};

const GenericMultiSelect = ({
  endpoint,
  label,
  name,
  value = [],
  optionsOverride = null,
  onChange,
  onOptionsLoaded = () => {},
  labelField = "name",
  valueField = "id",
  placeholder = "Seleccione...",
  fullWidth = true,
  size = "medium",
  disabled = false,
  required = false,
  hasError = false,
  helperText = "",
  searchEnabled = false,
  debounceDelay = 300,
  limit = 200,
  sortBy = null,
  sortOrder = "asc",
  customDataMapper = null,
  sx = {},
  labelSx = {},
}) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  const onOptionsLoadedRef = useRef(() => {});
  useEffect(() => {
    onOptionsLoadedRef.current =
      typeof onOptionsLoaded === "function" ? onOptionsLoaded : () => {};
  }, [onOptionsLoaded]);

  const BASE_URL = "https://lightcoral-emu-437776.hostingersite.com/web";

  const overrideNormalized = useMemo(
    () => normalizeOverride(optionsOverride),
    [optionsOverride]
  );

  const fetchOptions = useCallback(
    async (searchQuery = "") => {
      setError(null);

      // ✅ Si hay override, no pegues a la API
      if (overrideNormalized) {
        setOptions(overrideNormalized);
        onOptionsLoadedRef.current(overrideNormalized);
        return;
      }

      // ✅ Si no hay endpoint, no hay nada que cargar
      if (!endpoint) {
        setOptions([]);
        return;
      }

      setLoading(true);

      try {
        let url = `${BASE_URL}${endpoint}`;
        const params = new URLSearchParams();

        const isListasEndpoint = endpoint.startsWith("/api/listas/");

        // ✅ búsqueda
        if (searchQuery && searchEnabled) {
          if (isListasEndpoint) {
            // ListasApiController: soporta ?name=
            params.append("name", searchQuery);
          } else {
            // otros endpoints (si a futuro haces uno compatible)
            params.append("filter[search]", searchQuery);
          }
        }

        // ✅ limit/paginación
        if (limit) {
          if (isListasEndpoint) {
            // ListasApiController: usa ?limit=
            params.append("limit", String(limit));
            params.append("page", "0");
          } else {
            // JSON:API style
            params.append("page[limit]", String(limit));
          }
        }

        // ✅ sort
        if (sortBy && !isListasEndpoint) {
          params.append("sort", `${sortOrder === "desc" ? "-" : ""}${sortBy}`);
        }

        if (params.toString()) url += `?${params.toString()}`;

        const response = await apiClient.get(url);

        let rawData = [];
        if (Array.isArray(response.data)) rawData = response.data;
        else if (Array.isArray(response.data?.data))
          rawData = response.data.data;

        let mapped = rawData.map((item) => {
          const id =
            item?.[valueField] ??
            item?.id ??
            item?.tid ??
            item?.nid ??
            item?.attributes?.id;

          const labelValue =
            item?.[labelField] ??
            item?.attributes?.[labelField] ??
            item?.name ??
            item?.title ??
            item?.cliente ??
            item?.nombre ??
            "(SIN NOMBRE)";

          return {
            value: String(id),
            label: String(labelValue),
            raw: item,
          };
        });

        if (customDataMapper) mapped = customDataMapper(mapped);

        setOptions((prev) => {
          const same =
            prev.length === mapped.length &&
            prev.every(
              (p, i) =>
                p.value === mapped[i].value && p.label === mapped[i].label
            );
          return same ? prev : mapped;
        });

        setOptions(mapped);
        onOptionsLoadedRef.current(mapped);
      } catch (err) {
        console.error("❌ GenericMultiSelect fetch error:", err);
        setError("Error cargando opciones");
        setOptions([]);
      } finally {
        setLoading(false);
      }
    },
    [
      BASE_URL,
      endpoint,
      overrideNormalized,
      searchEnabled,
      limit,
      sortBy,
      sortOrder,
      valueField,
      labelField,
      customDataMapper,
    ]
  );

  // ✅ Primera carga / cuando cambien endpoint u override
  useEffect(() => {
    fetchOptions("");
  }, [fetchOptions]);

  // ✅ Búsqueda con debounce
  useEffect(() => {
    if (!searchEnabled) return;
    if (overrideNormalized) return;

    const id = setTimeout(() => fetchOptions(search), debounceDelay);
    return () => clearTimeout(id);
  }, [search, searchEnabled, debounceDelay, fetchOptions, overrideNormalized]);

  const safeValue = Array.isArray(value) ? value.map(String) : [];

  return (
    <FormControl
      fullWidth={fullWidth}
      size={size}
      error={hasError}
      disabled={disabled}
      required={required}
      sx={{
        maxWidth: "100%",
        ...sx, // ✅ (antes tenías .sx)
      }}
    >
      <InputLabel sx={labelSx}>{label}</InputLabel>

      <Select
        multiple
        name={name}
        value={safeValue}
        label={label}
        onChange={onChange}
        variant="filled"
        displayEmpty
        renderValue={(selected) => {
          const selectedArray = Array.isArray(selected) ? selected : [];
          if (selectedArray.length === 0) return placeholder;

          const labels = selectedArray
            .map(
              (val) =>
                options.find((opt) => String(opt.value) === String(val))?.label
            )
            .filter(Boolean);

          return labels.join(", ");
        }}
        onClose={() => setSearch("")}
        MenuProps={{
          disableAutoFocusItem: true,
          autoFocus: false,
          disablePortal: true,
          PaperProps: {
            sx: { boxShadow: "0px 4px 8px 4px #00000024 !important" },
          },
        }}
      >
        {searchEnabled && !overrideNormalized && (
          <MenuItem disabled>
            <Box sx={{ width: "100%" }}>
              <input
                style={{ width: "100%", padding: 8 }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
              />
            </Box>
          </MenuItem>
        )}

        {loading && (
          <MenuItem disabled>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="body2">Cargando...</Typography>
            </Box>
          </MenuItem>
        )}

        {error && (
          <MenuItem disabled>
            <Alert severity="error" variant="filled" sx={{ width: "100%" }}>
              {error}
            </Alert>
          </MenuItem>
        )}

        {!loading && !error && options.length === 0 && (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              No hay opciones disponibles
            </Typography>
          </MenuItem>
        )}

        {!loading &&
          !error &&
          options.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              <Checkbox checked={safeValue.includes(String(option.value))} />
              <ListItemText primary={option.label} />
            </MenuItem>
          ))}
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

export default React.memo(GenericMultiSelect);
