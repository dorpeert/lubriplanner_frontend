//GenericMultiSelect.jsx
import React, { useState, useEffect, useCallback } from "react";
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
import apiListasClient from "../api/apiListasClient";

const GenericMultiSelect = ({
  endpoint,
  label,
  name,
  value = [],
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

  const BASE_URL = "https://lightcoral-emu-437776.hostingersite.com/web";

  const fetchOptions = useCallback(
    async (searchQuery = "") => {
      setLoading(true);
      setError(null);

      try {
        let url = `${BASE_URL}${endpoint}`;
        const params = new URLSearchParams();

        if (searchQuery && searchEnabled) {
          params.append("filter[search]", searchQuery);
        }

        if (limit) {
          params.append("page[limit]", limit);
        }

        if (sortBy) {
          params.append("sort", `${sortOrder === "desc" ? "-" : ""}${sortBy}`);
        }

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const response = await apiListasClient.get(url);
        let rawData = [];

        // 🔒 Asegurar que rawData SIEMPRE sea un array
        if (Array.isArray(response.data)) {
          rawData = response.data; // Cliente, Activos, etc.
        } else if (Array.isArray(response.data?.data)) {
          rawData = response.data.data; // Drupal JSON:API style
        } else {
          console.warn("⚠ Formato inesperado en", endpoint, response.data);
          rawData = [];
        }

        let mappedOptions = rawData.map((item) => {
          const id =
            item[valueField] || item.id || item.tid || item.attributes?.id;

          const labelValue =
            item[labelField] ||
            item.attributes?.[labelField] ||
            item.name ||
            item.title ||
            item.cliente ||
            item.nombre ||
            "(SIN NOMBRE)";

          return {
            value: id,
            label: labelValue,
            raw: item,
          };
        });

        if (customDataMapper) {
          mappedOptions = customDataMapper(mappedOptions);
        }

        setOptions(mappedOptions);
        onOptionsLoaded(mappedOptions);
      } catch (err) {
        console.error("❌ Error cargando opciones:", err);
        setError("Error cargando opciones");
      } finally {
        setLoading(false);
      }
    },
    [endpoint, labelField, valueField, limit, sortBy, sortOrder, searchEnabled]
  );

  // Primera carga
  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  // Búsqueda en tiempo real
  useEffect(() => {
    if (!searchEnabled) return;
    const id = setTimeout(() => fetchOptions(search), debounceDelay);
    return () => clearTimeout(id);
  }, [search]);

  const safeValue = Array.isArray(value) ? value : [];

  return (
    <FormControl
      fullWidth={fullWidth}
      size={size}
      error={hasError}
      disabled={disabled}
      required={required}
      sx={{
        "& .MuiInputLabel-root": {
          transform: "translate(12px, 7px) scale(0.75) !important",
          transformOrigin: "top left",
        },
        "& .MuiInputLabel-shrink": {
          transform: "translate(12px, 7px) scale(0.75) !important",
        },
        maxWidth: "100%",
        ...sx,
      }}
    >
      <InputLabel sx={labelSx}>{label}</InputLabel>
      <Select
        multiple
        name={name}
        value={safeValue}
        label={label}
        onChange={onChange}
        renderValue={(selected) => {
          // ✔ Asegurar que selected SIEMPRE sea un array
          const selectedArray = Array.isArray(selected) ? selected : [];

          if (selectedArray.length === 0) return placeholder;

          const labels = selectedArray
            .map((val) => options.find((opt) => opt.value === val)?.label)
            .filter(Boolean);

          return labels.join(", ");
        }}
        variant="filled"
        MenuProps={{
          disableAutoFocusItem: true,
          autoFocus: false,
          disablePortal: true,

          PaperProps: {
            sx: {
              boxShadow: "0px 4px 8px 4px #00000024 !important",
            },
          },
        }}
      >
        <MenuItem disabled>
          <em>{placeholder}</em>
        </MenuItem>

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
            <Alert severity="error" variant="filled">
              {error}
            </Alert>
          </MenuItem>
        )}

        {!loading &&
          !error &&
          options.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              <Checkbox checked={value.includes(option.value)} />
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
