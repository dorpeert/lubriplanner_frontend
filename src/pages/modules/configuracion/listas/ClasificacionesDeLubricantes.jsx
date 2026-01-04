import { Box } from "@mui/material";
import ClaseFormContent from "../../../../forms/listas/ClaseFormContent";
import GenericTaxonomyTable from "../../../../components/GenericTaxonomyTable";
export default function ClasificacionesDeLubricantes() {
  return (
    <Box>
      <GenericTaxonomyTable
        botonCompAsociados={false}
        title="Clases de Lubricantes"
        addButtonText="Clase"
        endpoint="/api/listas/clasificaciones"
        createFormFields={[{ name: "name", label: "Nombre de la Clase" }]}
        tableColumns={[{ field: "name", header: "Clase de Lubricante" }]}
        customFormContent={ClaseFormContent}
      />
    </Box>
  );
}
