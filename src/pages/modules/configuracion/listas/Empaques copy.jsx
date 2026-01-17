import { Box } from "@mui/material";
import GenericTaxonomyTable from "../../../../components/GenericTaxonomyTable";
import TipoEmpaqueFormContent from "../../../../forms/listas/TipoEmpaqueFormContent";

export default function Empaques() {
  return (
    <Box>
      <GenericTaxonomyTable
        botonCompAsociados={false}
        title="Tipos de Empaques"
        addButtonText="Tipo de empaque"
        endpoint="/api/listas/empaques"
        createFormFields={[{ name: "name", label: "Tipo de Empaque" }]}
        tableColumns={[{ field: "name", header: "Tipo de Empaque" }]}
        customFormContent={TipoEmpaqueFormContent}
        showExport={true}
      />
    </Box>
  );
}
