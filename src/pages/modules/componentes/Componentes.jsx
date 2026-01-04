// Componentes.jsx
import React, { useEffect, useState } from "react";
import GenericTaxonomyTable from "../../../components/GenericTaxonomyTable.jsx";
import ComponenteFormContent from "../../../forms/ComponenteFormContent";
import { useNavigate, useSearchParams } from "react-router-dom";
import { slugify } from "../../../utils/slugify";
import { useLocation } from "react-router-dom";
import apiListasClient from "../../../api/apiListasClient";  // Asegúrate de importarlo

const BASE_URL = "https://lightcoral-emu-437776.hostingersite.com/web";

const mapComponente = (item) => ({
  id: item.id,
  attributes: {
    id: item.id,
    name: item.title,
    title: item.title,

    cliente: item.cliente || "-",
    cliente_id: item.cliente_id,

    activo: item.activo || "-",
    activo_id: item.activo_id,

    equipo: item.equipo || "-",
    equipo_id: item.equipo_id,

    lubricante: item.lubricante || "-",
    lubricante_id: item.lubricante_id,

    frecuencia_cambio: item.frecuencia_cambio || "-",
    frecuencia_muestreo: item.frecuencia_muestreo || "-",
    volumen_requerido: item.volumen_requerido || "-",
    observaciones: item.observaciones,
  },
});

export default function Componentes() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const clienteId = searchParams.get("cliente");
  const activoId = searchParams.get("activo");
  const equipoId = searchParams.get("equipo");
  const lubricanteId = searchParams.get("lubricante");

  const isContextMode = Boolean(clienteId || activoId || equipoId || lubricanteId);

  const [initialFilters, setInitialFilters] = useState({});

  useEffect(() => {
    const mapFilters = async () => {
      if (!clienteId && !activoId && !equipoId && !lubricanteId) {
        setInitialFilters({});
        return;
      }

      try {
        const resClientes = await apiListasClient.get(`${BASE_URL}/api/clientes`);
        const clientes = Array.isArray(resClientes.data) ? resClientes.data : resClientes.data?.data || [];

        const filters = {};

        if (clienteId) {
          const cliente = clientes.find(c => String(c.id) === clienteId);
          filters.cliente = cliente?.cliente || '';
        }

        if (activoId) {
          let activoNombre = '';
          for (const c of clientes) {
            const activo = c.activos?.find(a => String(a.id) === activoId);
            if (activo) {
              activoNombre = activo.activo;
              if (!filters.cliente) filters.cliente = c.cliente;
              break;
            }
          }
          filters.activo = activoNombre;
        }

        if (equipoId) {
          let equipoNombre = '';
          for (const c of clientes) {
            for (const a of c.activos || []) {
              const eq = a.equipos?.find(e => String(e.id) === equipoId);
              if (eq) {
                equipoNombre = eq.equipo;
                if (!filters.activo) filters.activo = a.activo;
                if (!filters.cliente) filters.cliente = c.cliente;
                break;
              }
            }
            if (equipoNombre) break;
          }
          filters.equipo = equipoNombre;
        }

        if (lubricanteId) {
          // Opcional: Mapear ID a nombre si necesitas (fetch lubricantes)
          // const resLub = await apiListasClient.get(`${BASE_URL}/api/lubricantes`);
          // const lubricantes = resLub.data || [];
          // const lub = lubricantes.find(l => String(l.id) === lubricanteId);
          // filters.lubricante = lub ? [lub.title] : [];  // Si usas nombres
          filters.lubricante = [lubricanteId];  // Si usas IDs (ok para multiselect)
        }

        setInitialFilters(filters);
      } catch (err) {
        console.error('Error mapeando filtros iniciales:', err);
        setInitialFilters({});
      }
    };

    mapFilters();
  }, [clienteId, activoId, equipoId, lubricanteId]);

  return (
    <GenericTaxonomyTable
      key={location.search}
      title="Componentes"
      addButtonText="Componente"
      endpoint="/api/componentes"
      dataMapper={mapComponente}
      customFormContent={ComponenteFormContent}
      showExport={true}
      showFilters={!isContextMode}
      showAddButton={!isContextMode}
      showBackButton={isContextMode}
      botonCompAsociados={false}
      initialFilters={initialFilters}
      onViewItem={(item) => {
        const slug = slugify(item.attributes.name);
        navigate(`/componentes/${item.id}-${slug}`);
      }}
      searchFields={[
        {
          name: "title",
          label: "Nombre del componente",
          type: "text",
          field: "name",
        },
        {
          name: "cliente",
          label: "Cliente",
          type: "select",
          endpoint: "/api/clientes",
          labelField: "cliente",
          valueField: "cliente",  // ← Cambiado: usa nombres
        },
        {
          name: "activo",
          label: "Activo",
          type: "select",
          custom: true,
        },
        {
          name: "equipo",
          label: "Equipo",
          type: "select",
          custom: true,
        },
        {
          name: "lubricante",
          label: "Lubricante",
          type: "selectMultiple",
          endpoint: "/api/lubricantes",
          labelField: "title",
          valueField: "id",  // IDs ok aquí
        },
      ]}
      tableColumns={[
        { field: "name", header: "Nombre", width: 280 },
        { field: "cliente", header: "Cliente", width: 180 },
        { field: "activo", header: "Activo", width: 180 },
        { field: "equipo", header: "Equipo", width: 200 },
        { field: "lubricante", header: "Lubricante", width: 200 },
        {
          field: "frecuencia_cambio",
          header: "Frec. Cambio",
          width: 120,
          align: "center",
        },
        {
          field: "frecuencia_muestreo",
          header: "Frec. Muestreo",
          width: 140,
          align: "center",
        },
        {
          field: "volumen_requerido",
          header: "Volumen (L)",
          width: 110,
          align: "center",
        },
      ]}
    />
  );
}