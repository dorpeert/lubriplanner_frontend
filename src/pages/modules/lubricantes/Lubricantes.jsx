// Lubricantes.jsx (PRO - EntityCrudPage)
import EntityCrudPage from "../../../componentsNew/EntityCrudPage.jsx";
import LubricanteFormContent from "../../../forms/LubricanteFormContent.jsx";
import GenericMultiSelect from "../../../componentsNew/GenericMultiSelect.jsx"; // ✅ ajusta la ruta si tu carpeta es otra

export default function Lubricantes() {
  const endpoint = "/api/lubricantes";

  const origenOptions = [
    { value: "Nacional", label: "Nacional" },
    { value: "Importado", label: "Importado" },
  ];

  const filtersConfig = [
    { name: "codigo", label: "Código", type: "text" },
    { name: "descripcion", label: "Descripción", type: "text" },

    {
      name: "origen",
      label: "Origen",
      render: ({ value, onChange }) => (
        <GenericMultiSelect
          label="Origen"
          name="origen"
          value={value || []}
          onChange={(e) => onChange(e.target.value)}
          size="small"
          optionsOverride={origenOptions}
        />
      ),
    },

    {
      name: "clasificacion",
      label: "Clasificación",
      render: ({ value, onChange }) => (
        <GenericMultiSelect
          label="Clasificación"
          name="clasificacion"
          endpoint="/api/listas/clasificaciones"
          value={Array.isArray(value) ? value : []}
          onChange={(e) => onChange(e.target.value)} // ✅ FiltersPanel espera value
          size="small"
          labelField="name"
          valueField="name"
          placeholder="Seleccione..."
          limit={100}
        />
      ),
    },

    {
      name: "tipo_de_lubricante",
      label: "Tipo",
      render: ({ value, onChange }) => (
        <GenericMultiSelect
          label="Tipo"
          name="tipo_de_lubricante"
          endpoint="/api/listas/tipos_de_lubricante"
          value={Array.isArray(value) ? value : []}
          onChange={(e) => onChange(e.target.value)}
          size="small"
          labelField="name"
          valueField="name"
          placeholder="Seleccione..."
          limit={100}
        />
      ),
    },

    {
      name: "fabricante",
      label: "Fabricante",
      render: ({ value, onChange }) => (
        <GenericMultiSelect
          label="Fabricante"
          name="fabricante"
          endpoint="/api/listas/fabricantes_de_lubricantes"
          value={Array.isArray(value) ? value : []}
          onChange={(e) => onChange(e.target.value)}
          size="small"
          labelField="name"
          valueField="name"
          placeholder="Seleccione..."
          limit={100}
        />
      ),
    },
  ];

  const columns = [
    { field: "codigo", header: "Código" },
    { field: "title", header: "Nombre" },
    { field: "descripcion", header: "Descripción" },
    { field: "familia", header: "Familia" },
    { field: "origen", header: "Origen" },
    { field: "clasificacion", header: "Clasificación" },
    { field: "tipo_lubricante", header: "Tipo" },
    { field: "fabricante", header: "Fabricante" },
  ];

  return (
    <EntityCrudPage
      title="Lubricantes"
      entityName="Lubricante"
      endpoint={endpoint}
      filtersConfig={filtersConfig}
      columns={columns}
      FormContent={LubricanteFormContent}
      formId="lubricante-form"
      queryMode="drupalFilter"
      getRowId={(row) => row?.id}
      messages={{
        createSuccess: "Lubricante creado correctamente",
        editSuccess: "Lubricante actualizado correctamente",
        deleteSuccess: "Lubricante eliminado correctamente",
      }}
    />
  );
}
