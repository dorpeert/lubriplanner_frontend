import { useCallback, useEffect, useMemo, useState } from "react";
import apiClient from "../api/apiClient";
import { buildQueryParams } from "../utils/buildQueryParams";

// ✅ función estable (misma referencia siempre)
const defaultMapResponse = (res) => ({
  rows: res.data?.data ?? [],
  total: res.data?.total ?? 0,
});

export function useEntityList({
  endpoint,
  page,
  limit,
  filters,
  queryMode = "drupalFilter",
  mapResponse = defaultMapResponse, // ✅ ya no se recrea por render
}) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const params = useMemo(() => {
    return buildQueryParams(filters, page, limit, { mode: queryMode });
  }, [filters, page, limit, queryMode]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.get(endpoint, { params });
      const parsed = mapResponse(res);

      setRows(parsed.rows);
      setTotal(parsed.total);
    } catch (e) {
      setRows([]);
      setTotal(0);
      setError(e);
      console.error("Error cargando listado:", e);
    } finally {
      setLoading(false);
    }
  }, [endpoint, params, mapResponse]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return { rows, total, loading, error, refetch: fetchList };
}
