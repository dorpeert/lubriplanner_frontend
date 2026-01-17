import React, { useState, useEffect, useCallback, useRef } from "react";
import { Autocomplete, TextField, CircularProgress } from "@mui/material";
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
  returnLabel = false, // compat
  sx = {},
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const BASE_URL = "https://lightcoral-emu-437776.hostingersite.com/web";
  const isHostinger = BASE_URL.includes("hostingersite.com");
const modernUnsupportedRef = useRef(isHostinger); // ✅ si es Hostinger: legacy desde el inicio


  const normalizeItems = (raw) =>
    Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];

  const mapItem = useCallback(
    (item) => {
      if (customDataMapper) return customDataMapper(item);
      return {
        value: item.id,
        label: item.title || item.name || "Sin nombre",
        raw: item,
      };
    },
    [customDataMapper]
  );

  const buildUrl = useCallback(
    (searchQuery = "", mode = "modern") => {
      let url = `${BASE_URL}${endpoint}`;
      const params = new URLSearchParams();

      if (mode === "modern") {
        if (searchQuery) params.append("filter[search]", searchQuery);
        if (limit) params.append("page[limit]", String(limit));
        if (sortBy) {
          params.append(
            "sort",
            `${sortOrder === "desc" ? "-" : ""}${sortBy}`
          );
        }
      } else {
        // fallback legacy: evita 400 por sort/page[limit]/filter[search]
        if (limit) params.append("limit", String(limit));
        // Si quieres búsqueda legacy y tu backend la soporta:
        // if (searchQuery) params.append("title", searchQuery);
      }

      if (params.toString()) url += `?${params.toString()}`;
      return url;
    },
    [BASE_URL, endpoint, limit, sortBy, sortOrder]
  );

  const fetchOptions = useCallback(
    async (searchQuery = "") => {
      setLoading(true);

      const q = (searchQuery || "").trim();

      try {
        // ✅ Si ya sabemos que modern falla, NO lo intentamos más
        if (modernUnsupportedRef.current) {
          const urlLegacy = buildUrl(q, "legacy");
          const response2 = await apiListasClient.get(urlLegacy);

          const items2 = normalizeItems(response2?.data);
          setOptions(items2.map(mapItem));
          return;
        }

        // 1) Intento modern (solo si no se ha marcado como incompatible)
        const urlModern = buildUrl(q, "modern");
        const response = await apiListasClient.get(urlModern);

        const items = normalizeItems(response?.data);
        setOptions(items.map(mapItem));
      } catch (err) {
        const status = err?.response?.status;

        // 2) Si modern da 400 → marcamos como incompatible y vamos a legacy
        if (status === 400) {
          modernUnsupportedRef.current = true;

          try {
            const urlLegacy = buildUrl(q, "legacy");
            const response2 = await apiListasClient.get(urlLegacy);

            const items2 = normalizeItems(response2?.data);
            setOptions(items2.map(mapItem));
          } catch (err2) {
            console.error("❌ Error cargando (legacy):", err2);
            setOptions([]);
          }
        } else {
          console.error("❌ Error cargando:", err);
          setOptions([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [buildUrl, mapItem]
  );

  // Fetch inicial (1 vez)
  useEffect(() => {
    fetchOptions("");
  }, [fetchOptions]);

  // ✅ Debounce SOLO si hay texto (evita spam con search vacío)
  useEffect(() => {
    const q = (search || "").trim();
    if (!q) return;

    const t = setTimeout(() => fetchOptions(q), 350);
    return () => clearTimeout(t);
  }, [search, fetchOptions]);

  const selectedOption =
    options.find((o) => String(o.value) === String(value)) || null;

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
      onInputChange={(e, newInput, reason) => {
        // ✅ Evita requests por "reset" cuando cambia el value (MUI lo dispara)
        if (reason === "input") {
          setSearch(newInput);
        }

        if (reason === "clear") {
          setSearch("");
          // opcional: recargar lista base al limpiar
          fetchOptions("");
        }
      }}
      getOptionLabel={(option) => option?.label || ""}
      isOptionEqualToValue={(opt, val) =>
        String(opt.value) === String(val.value)
      }
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
