import React from "react";
import { Box } from "@mui/material";
import GenericTaxonomyTable from "../../../../components/GenericTaxonomyTable";

export default function Lobs() {
  return (
    <Box>
      <GenericTaxonomyTable
        title="Prestadores de Servicios"
        addButtonText="Prestador"
        endpoint="/api/listas/prestadores_de_servicios"
        createFormFields={[{ name: "name", label: "Prestador" }]}
        tableColumns={[{ field: "name", header: "Prestador" }]}
      />
    </Box>
  );
}