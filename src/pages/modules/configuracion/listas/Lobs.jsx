import { Box } from "@mui/material";
import GenericTaxonomyTable from "../../../../components/GenericTaxonomyTable";
import LobFormContent from "../../../../forms/listas/LobFormContent";

const formFields = [{ name: "name", label: "Nombre del LOB", type: "text" }];
const tableColumns = [{ field: "name", header: "Nombre del LOB", flex: 1 }];

export default function Lobs() {
  return (
    <Box>
      <GenericTaxonomyTable
        botonCompAsociados={false}
        title="LOBs"
        addButtonText="LOB"
        endpoint="/api/listas/lob"
        createFormFields={formFields}
        tableColumns={tableColumns}
        customFormContent={LobFormContent}
      />
    </Box>
  );
}
