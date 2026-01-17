import EntityCrudPage from "../../../../componentsNew/EntityCrudPage.jsx";
import LobFormContent from "../../../../forms/listas/LobFormContent";

export default function Lobs() {
  const endpoint = "/api/listas/lob";

  const filtersConfig = [
    { name: "name", label: "Buscar Lob", type: "text" },
  ];

  const columns = [
  //  { field: "tid", header: "id" },
    { field: "name", header: "Nombre del Lob" },
  ];

  return (
    <EntityCrudPage
      title="LOBs"
      entityName="Lob"
      endpoint={endpoint}
      filtersConfig={filtersConfig}
      columns={columns}
      FormContent={LobFormContent}
      formId="lob-form"
      queryMode="drupalFilter"
      getRowId={(row) => row?.tid}
      messages={{
        createSuccess: "Lob creado correctamente",
        editSuccess: "Lob actualizado correctamente",
        deleteSuccess: "Lob eliminado correctamente",
      }}
    />
  );
}
