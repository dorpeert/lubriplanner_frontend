import EntityCrudPage from "../../../../componentsNew/EntityCrudPage.jsx";
import EmpaqueFormContent from "../../../../forms/Listas/TipoEmpaqueFormContent.jsx";

export default function Empaques() {
  const endpoint = "/api/listas/empaques";

  const filtersConfig = [
    { name: "name", label: "Buscar empaque", type: "text" },
  ];

  const columns = [
  //  { field: "tid", header: "id" },
    { field: "name", header: "Empaque" },
  ];

  return (
    <EntityCrudPage
      title="Empaques"
      entityName="Empaque"
      endpoint={endpoint}
      filtersConfig={filtersConfig}
      columns={columns}
      FormContent={EmpaqueFormContent}
      formId="empaque-form"
      queryMode="drupalFilter"
      getRowId={(row) => row?.tid} // importante para taxonomías
      messages={{
        createSuccess: "Empaque creado correctamente",
        editSuccess: "Empaque actualizado correctamente",
        deleteSuccess: "Empaque eliminado correctamente",
      }}
    />
  );
}
