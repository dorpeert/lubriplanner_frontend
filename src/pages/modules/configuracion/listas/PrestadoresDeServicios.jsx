import EntityCrudPage from "../../../../componentsNew/EntityCrudPage.jsx";
import PrestadorFormContent from "../../../../forms/listas/PrestadorFormContent";

export default function Prestadores() {
  const endpoint = "/api/listas/prestadores_de_servicios";

  const filtersConfig = [
    { name: "name", label: "Buscar Prestador", type: "text" },
  ];

  const columns = [
  //  { field: "tid", header: "id" },
    { field: "name", header: "Prestador de Servicio" },
  ];

  return (
    <EntityCrudPage
      title="Prestadores de Servicio"
      entityName="Prestador"
      endpoint={endpoint}
      filtersConfig={filtersConfig}
      columns={columns}
      FormContent={PrestadorFormContent}
      formId="prestador-form"
      queryMode="drupalFilter"
      getRowId={(row) => row?.tid}
      messages={{
        createSuccess: "Prestador creado correctamente",
        editSuccess: "Prestador actualizado correctamente",
        deleteSuccess: "Prestador eliminado correctamente",
      }}
    />
  );
}