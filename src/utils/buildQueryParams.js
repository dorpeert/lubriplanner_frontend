export function buildQueryParams(filters = {}, page, limit, { mode = "drupalFilter" } = {}) {
  const params = { page, limit };

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === "string" && value.trim() === "") return;

    const normalized = Array.isArray(value) ? (value.length ? value.join(",") : null) : value;
    if (normalized === null) return;

    if (mode === "plain") {
      params[key] = normalized;
      return;
    }

    if (mode === "drupalFilter") {
      params[`filter[${key}]`] = normalized;
      return;
    }

    // ✅ AUTO: manda ambos
    if (mode === "auto") {
      params[key] = normalized;
      params[`filter[${key}]`] = normalized;
      return;
    }
  });

  return params;
}