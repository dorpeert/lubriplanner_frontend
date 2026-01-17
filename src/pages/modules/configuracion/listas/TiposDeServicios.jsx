import EntityCrudPage from "../../../../componentsNew/EntityCrudPage.jsx";
import TipoServicioFormContent from "../../../../forms/listas/TipoServicioFormContent.jsx";

export default function Prestadores() {
  const endpoint = "/api/listas/tipos_de_servicios";

  const filtersConfig = [
    { name: "name", label: "Buscar Tipo de Servicio", type: "text" },
  ];

  const columns = [
  //  { field: "tid", header: "id" },
    { field: "name", header: "Tipo de Servicio" },
  ];

  return (
    <EntityCrudPage
      title="Tipos de Servicio"
      entityName="Tipo de Servicio"
      endpoint={endpoint}
      filtersConfig={filtersConfig}
      columns={columns}
      FormContent={TipoServicioFormContent}
      formId="tipo-servicio-form"
      queryMode="drupalFilter"
      getRowId={(row) => row?.tid}
      messages={{
        createSuccess: "Tipo de Servicio creado correctamente",
        editSuccess: "Tipo de Servicio actualizado correctamente",
        deleteSuccess: "Tipo de Servicio eliminado correctamente",
      }}
    />
  );
}