import React, { useState, useEffect, useCallback } from "react";
import {
  Autocomplete,
  TextField,
  CircularProgress,
} from "@mui/material";
import apiListasClient from "../api/apiListasClient";

export default function GenericAutocomplete({
  endpoint,
  label,
  name,
  value,
  onChange,

  // Opcionales
  placeholder = "",
  disabled = false,
  limit = 40,
  sortBy = null,
  sortOrder = "asc",
  customDataMapper = null,
  returnLabel = false,
  sx = {},
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const BASE_URL = "https://lightcoral-emu-437776.hostingersite.com/web";

  const fetchOptions = useCallback(
    async (searchQuery = "") => {
      setLoading(true);

      try {
        let url = `${BASE_URL}${endpoint}`;
        const params = new URLSearchParams();

        if (searchQuery) params.append("filter[search]", searchQuery);
        if (limit) params.append("page[limit]", limit);
        if (sortBy) params.append("sort", `${sortOrder === "desc" ? "-" : ""}${sortBy}`);

        if (params.toString()) url += `?${params.toString()}`;

        const response = await apiListasClient.get(url);
        let rawData = response.data?.data || response.data || [];

        const mapped = rawData.map((item) => {
          if (customDataMapper) {
            return customDataMapper(item);
          }
          return {
            value: item.id,
            label: item.title || item.name || "Sin nombre",
            raw: item,
          };
        });

        setOptions(mapped);
      } catch (err) {
        console.error("❌ Error cargando:", err);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    },
    [endpoint, sortBy, sortOrder, limit]
  );

  // Fetch inicial
  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  // Fetch en búsqueda con debounce
  useEffect(() => {
    const t = setTimeout(() => fetchOptions(search), 350);
    return () => clearTimeout(t);
  }, [search, fetchOptions]);

  // Resuelve valor preseleccionado (edición)
  const selectedOption =
    options.find((o) => o.value === value) ||
    null;

  return (
    <Autocomplete
      options={options}
      loading={loading}
      value={selectedOption}
      onChange={(e, selected) => {
        if (!selected) {
          onChange({ target: { name, value: "", raw: null } });
          return;
        }

        onChange({
          target: {
            name,
            value: selected.value,
            raw: selected.raw,
          },
        });
      }}
      onInputChange={(e, newInput) => {
        setSearch(newInput);
      }}
      getOptionLabel={(option) => option?.label || ""}
      isOptionEqualToValue={(opt, val) => opt.value === val.value}
      disabled={disabled}
      noOptionsText="Sin resultados"
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          variant="filled"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      sx={sx}
    />
  );
}
