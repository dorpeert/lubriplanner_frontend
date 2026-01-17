import React, { useEffect, useMemo, useState } from "react";
import EntityCrudPage from "../../../componentsNew/EntityCrudPage.jsx";
import ComponenteFormContent from "../../../forms/ComponenteFormContent";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { slugify } from "../../../utils/slugify";
import apiListasClient from "../../../api/apiListasClient";

const BASE_URL = "https://lightcoral-emu-437776.hostingersite.com/web";

export default function Componentes() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const clienteId = searchParams.get("cliente");
  const activoId = searchParams.get("activo");
  const equipoId = searchParams.get("equipo");
  const lubricanteId = searchParams.get("lubricante");

  const isContextMode = Boolean(
    clienteId || activoId || equipoId || lubricanteId
  );

  const initialFilters = useMemo(() => {
    const f = {};

    if (clienteId) f.cliente = clienteId;
    if (activoId) f.activo = activoId;
    if (equipoId) f.equipo = equipoId;
    if (lubricanteId) f.lubricante = lubricanteId;

    return f;
  }, [clienteId, activoId, equipoId, lubricanteId]);

  // ✅ Filtros para EntityCrudPage:
  // (Aquí lo dejamos simple y estable; luego afinamos dependencias cliente→activo→equipo si quieres)
  const filtersConfig = useMemo(
    () => [
      { name: "title", label: "Nombre del componente", type: "text" },
      { name: "cliente", label: "Cliente", type: "text" },
      { name: "activo", label: "Activo", type: "text" },
      { name: "equipo", label: "Equipo", type: "text" },
      { name: "lubricante", label: "Lubricante", type: "text" },
    ],
    []
  );

  // ✅ Columnas DataTable (deben coincidir con el shape que devuelve /api/componentes)
  const columns = useMemo(
    () => [
      { field: "title", header: "Nombre" },
      { field: "cliente", header: "Cliente" },
      { field: "activo", header: "Activo" },
      { field: "equipo", header: "Equipo" },
      { field: "lubricante", header: "Lubricante" },
      { field: "frecuencia_cambio", header: "Frec. Cambio" },
      { field: "frecuencia_muestreo", header: "Frec. Muestreo" },
      { field: "volumen_requerido", header: "Volumen (L)" },
    ],
    []
  );

  return (
    <EntityCrudPage
      key={location.search}
      title="Componentes"
      entityName="Componente"
      endpoint="/api/componentes"
      FormContent={ComponenteFormContent}
      formId="componente-form"
      queryMode="drupalFilter"
      getRowId={(row) => row?.id}
      filtersConfig={filtersConfig}
      columns={columns}
      // ✅ importante: “ver” por ruta
      viewMode="route"
      onViewRoute={(row) => {
        const name = row?.title || row?.name || "componente";
        const slug = slugify(name);
        navigate(`/componentes/${row.id}-${slug}`);
      }}
      // ✅ filtros iniciales por contexto (si tu useEntityList lo soporta)
      // Si tu useEntityList ya inicia con `filters` internos vacíos, el paso siguiente
      // es agregar `initialFilters` en EntityCrudPage (como hiciste en GenericTaxonomyTable).
      // Por ahora lo dejamos listo aquí:
      initialFilters={initialFilters}
      // ✅ UX: en modo contexto típicamente ocultas filtros + botón agregar.
      // Si todavía no existen estas props en EntityCrudPage, en el siguiente paso las añadimos.
      showFilters={!isContextMode}
      showAddButton={!isContextMode}
      showBackButton={isContextMode}
      onBack={() => navigate(-1)}
    />
  );
}
