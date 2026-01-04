import { Box } from "@mui/material";
import GenericTaxonomyTable from "../../../../components/GenericTaxonomyTable";
import TipoLubricanteFormContent from "../../../../forms/listas/TipoLubricanteFormContent";

export default function TiposDeLubricantes() {
  return (
    <Box>
      <GenericTaxonomyTable
        botonCompAsociados={false}
        title="Tipos de Lubricantes"
        addButtonText="Tipo de lubricante"
        endpoint="/api/listas/tipos_de_lubricante"
        createFormFields={[{ name: "name", label: "Tipo de Lubricante" }]}
        tableColumns={[{ field: "name", header: "Tipo de Lubricante" }]}
        customFormContent={TipoLubricanteFormContent}
      />
    </Box>
  );
}
