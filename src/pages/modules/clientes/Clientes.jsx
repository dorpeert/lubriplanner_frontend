// src/pages/Clientes.jsx
import GenericTaxonomyTable from "../../../components/GenericTaxonomyTable";
import ClienteFormContent from "../../../forms/ClienteFormContent";
import { useNavigate, useLocation } from "react-router-dom";

const toAbsolute = (url) => {
  if (!url) return null;
  if (url.startsWith("http")) return url; // ya es absoluta
  return `https://lightcoral-emu-437776.hostingersite.com${url}`;
};

const mapCliente = (item) => ({
  id: item.id,
  attributes: {
    // Para mostrar en la tabla
    name: item.cliente,
    numero: item.field_numero_de_contacto || "-",
    email: item.email || "-",
    notificaciones: item.field_enviar_notificaciones === true ? "Sí" : "No",
    activos_count: item.activos?.length || 0,
    prestador: item.field_prestador_de_servicio || "-",

    // Datos completos para el formulario
    cliente_id: item.id,
    title: item.cliente,
    field_enviar_notificaciones: item.field_enviar_notificaciones || false,
    field_numero_de_contacto: item.field_numero_de_contacto || "",
    field_email_de_contacto: item.email || "",
    field_logo_del_cliente: item.field_logo_del_cliente || null,
    field_prestador_de_servicio: item.field_prestador_de_servicio,

    // Activos (con equipos)
    field_activos: (item.activos || []).map((a) => ({
      activo: a.activo,
      activo_id: a.id,
      imagen_url: toAbsolute(a.imagen_del_activo),
      imagen_fid: null, // el backend no lo da en GET
      equipos: a.equipos || [],
    })),
  },
});

export default function Clientes() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigateToComponents = (params) => {
    const search = new URLSearchParams(params).toString();

    navigate(`/componentes?${search}`, {
      state: {
        from: location.pathname,
        reopenModal: {
          entity: "cliente",
          id: params.cliente,
          mode: "view",
          extra: {
            activo: params.activo,
            equipo: params.equipo,
          },
        },
      },
    });
  };

  return (
    <GenericTaxonomyTable
      modalSize="L"
      title="Clientes"
      addButtonText="Cliente"
      endpoint="/api/clientes"
      dataMapper={mapCliente}
      customFormContent={ClienteFormContent}
      showExport={true}
      componentesAsociadosConfig={{
        param: "cliente",
        idField: "id",
      }}
      formExtraProps={{
        onNavigateToComponents: handleNavigateToComponents,
      }}
      tableColumns={[
        { field: "name", header: "Nombre" },
        { field: "prestador", header: "Prestador" },
        { field: "numero", header: "Número" },
        { field: "email", header: "E-Mail" },
        { field: "notificaciones", header: "Notificaciones" },
        { field: "activos_count", header: "Activos" },
      ]}
      showFilters={true}
      searchFields={[
        { name: "title", label: "Nombre de Cliente", field: "name" },

        {
          name: "prestador",
          label: "Prestador de servicio",
          type: "selectMultiple",
          endpoint: "/api/listas/prestadores_de_servicios",
          labelField: "name",
          valueField: "id",
          multiple: true,
        },

        {
          name: "field_numero_de_contacto",
          label: "Número de Contacto",
          field: "field_numero_de_contacto",
        },
        {
          name: "field_email_de_contacto",
          label: "E-mail de Contacto",
          field: "email",
        },
      ]}
    />
  );
}
