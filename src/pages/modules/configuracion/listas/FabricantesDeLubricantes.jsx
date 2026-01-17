import EntityCrudPage from "../../../../componentsNew/EntityCrudPage.jsx";
import FabricanteFormContent from "../../../../forms/Listas/FabricanteFormContent";

export default function FabricantesDeLubricantes() {
  const endpoint = "/api/listas/fabricantes_de_lubricantes";

  const filtersConfig = [
    { name: "name", label: "Buscar Fabricante", type: "text" },
  ];

  const columns = [
  //  { field: "tid", header: "id" },
    { field: "name", header: "Fabricante" },
  ];

  return (
    <EntityCrudPage
      title="Fabricantes"
      entityName="Fabricante"
      endpoint={endpoint}
      filtersConfig={filtersConfig}
      columns={columns}
      FormContent={FabricanteFormContent}
      formId="fabricante-form"
      queryMode="drupalFilter"
      getRowId={(row) => row?.tid} // importante para taxonomías
      messages={{
        createSuccess: "Fabricante creado correctamente",
        editSuccess: "Fabricante actualizado correctamente",
        deleteSuccess: "Fabricante eliminado correctamente",
      }}
    />
  );
}
