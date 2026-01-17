import EntityCrudPage from "../../../../componentsNew/EntityCrudPage.jsx";
import TipoLubricanteFormContent from "../../../../forms/listas/TipoLubricanteFormContent";

export default function TiposDeLubricantes() {
  const endpoint = "/api/listas/tipos_de_lubricante";

  const filtersConfig = [
    { name: "name", label: "Buscar tipo", type: "text" },
  ];

  const columns = [
  //  { field: "tid", header: "id" },
    { field: "name", header: "Tipo de Lubricante" },
  ];

  return (
    <EntityCrudPage
      title="Tipos de Lubricantes"
      entityName="Tipo de Lubricante"
      endpoint={endpoint}
      filtersConfig={filtersConfig}
      columns={columns}
      FormContent={TipoLubricanteFormContent}
      formId="lubbricante-form"
      queryMode="drupalFilter"
      getRowId={(row) => row?.tid} // importante para taxonomías
      messages={{
        createSuccess: "Lubricante creado correctamente",
        editSuccess: "Lubricante actualizado correctamente",
        deleteSuccess: "Lubricante eliminado correctamente",
      }}
    />
  );
}

