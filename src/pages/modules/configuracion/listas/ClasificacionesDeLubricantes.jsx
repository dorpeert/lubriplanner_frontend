import EntityCrudPage from "../../../../componentsNew/EntityCrudPage.jsx";
import ClaseFormContent from "../../../../forms/listas/ClaseFormContent";

export default function ClasificacionesDeLubricante() {
  const endpoint = "/api/listas/clasificaciones";

  const filtersConfig = [{ name: "name", label: "Buscar clase", type: "text" }];

  const columns = [
    //  { field: "tid", header: "id" },
    { field: "name", header: "Clase de Lubricante" },
  ];

  return (
    <EntityCrudPage
      title="Clases de Lubricantes"
      entityName="Clase de Lubricante"
      endpoint={endpoint}
      filtersConfig={filtersConfig}
      columns={columns}
      FormContent={ClaseFormContent}
      formId="clase-form"
      queryMode="drupalFilter"
      getRowId={(row) => row?.tid} // importante para taxonomías
      messages={{
        createSuccess: "Clase creada correctamente",
        editSuccess: "Clase actualizada correctamente",
        deleteSuccess: "Clase eliminada correctamente",
      }}
    />
  );
}
