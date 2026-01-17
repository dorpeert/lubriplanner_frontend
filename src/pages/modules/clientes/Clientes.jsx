// Clientes.jsx (PRO - EntityCrudPage)
import EntityCrudPage from "../../../componentsNew/EntityCrudPage.jsx";
import ClienteFormContent from "../../../forms/ClienteFormContent.jsx";
import GenericMultiSelect from "../../../componentsNew/GenericMultiSelect.jsx";

export default function Clientes() {
  const endpoint = "/api/clientes";

  // ✅ Filtros
  // Nombres alineados a la salida del API (formatCliente):
  // cliente, prestador_de_servicio, numero_de_contacto, email_contacto
  const filtersConfig = [
    { name: "cliente", label: "Nombre", type: "text" },

    {
      name: "prestador_de_servicio",
      label: "Prestador de servicio",
      render: ({ value, onChange }) => (
        <GenericMultiSelect
          label="Prestador de servicio"
          name="prestador_de_servicio"
          endpoint="/api/listas/prestadores_de_servicios"
          value={Array.isArray(value) ? value : []}
          onChange={(e) => onChange(e.target.value)}
          size="small"
          // Listas devuelve {tid,name}
          labelField="name"
          valueField="name"
          placeholder="Seleccione..."
          limit={100}
        />
      ),
    },

    { name: "numero_de_contacto", label: "Número de contacto", type: "text" },
    { name: "email_contacto", label: "Email de contacto", type: "text" },
  ];

  // ✅ Columnas para DataTable (row[col.field])
  const columns = [
    { field: "cliente", header: "Cliente" },
    { field: "prestador_de_servicio", header: "Prestador" },
    { field: "field_numero_de_contacto", header: "Contacto" },
    { field: "field_email_de_contacto", header: "Email" },
  ];

  return (
    <EntityCrudPage
      title="Clientes"
      entityName="Cliente"
      endpoint={endpoint}
      filtersConfig={filtersConfig}
      columns={columns}
      FormContent={ClienteFormContent}
      formId="cliente-form"
      queryMode="drupalFilter"
      getRowId={(row) => row?.id}
      messages={{
        createSuccess: "Cliente creado correctamente",
        editSuccess: "Cliente actualizado correctamente",
        deleteSuccess: "Cliente eliminado correctamente",
      }}
      modalProps={{ size: "lg" }}
    />
  );
}
