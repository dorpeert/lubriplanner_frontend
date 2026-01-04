// Lubricantes.jsx
import { Box } from "@mui/material";
import GenericTaxonomyTable from "../../../components/GenericTaxonomyTable";
import LubricanteFormContent from "../../../forms/LubricanteFormContent";
import { useNavigate, useLocation } from "react-router-dom";

const mapLubricante = (item) => ({
  id: item.id,
  attributes: {
    // Para mostrar en tabla
    title: item.title,
    codigo: item.codigo || "-",
    descripcion: item.descripcion || "-",
    familia: item.familia || "-",

    origen: item.origen || "-",
    clasificacion: item.clasificacion || "-",
    tipo: item.tipo_lubricante || "-",
    fabricante: item.fabricante || "",
    lob: item.lob || "",

    galones_empaque: item.galones_empaque || "",
    empaque: item.empaque || "",
    especificaciones: item.especificaciones || "",

    // ✅ CLAVE: Mapea el campo CORRECTO y convierte URL relativa a absoluta
    field_imagen_del_lubricante: item.imagen_del_lubricante
      ? `https://lightcoral-emu-437776.hostingersite.com${item.imagen_del_lubricante}`
      : null,
  },
});

export default function Lubricantes() {

    const navigate = useNavigate();
  const location = useLocation();

  const handleNavigateToComponents = (params) => {
    const search = new URLSearchParams(params).toString();

    navigate(`/componentes?${search}`, {
      state: {
        from: location.pathname,
        reopenModal: {
          entity: "lubricantes",
          id: params.lubricantes,
          mode: "view",
        },
      },
    });
  };

  return (
    <Box>
      <GenericTaxonomyTable
        modalSize="L"
        title="Lubricantes"
        addButtonText="Lubricante"
        endpoint="/api/lubricantes"
        dataMapper={mapLubricante}
        customFormContent={LubricanteFormContent}
        showExport={true}
        componentesAsociadosConfig={{
          param: "lubricante",
          idField: "id",
        }}
        formExtraProps={{
          onNavigateToComponents: handleNavigateToComponents,
        }}
        tableColumns={[
          { field: "codigo", header: "Código" },
          { field: "title", header: "Nombre" },
          { field: "descripcion", header: "Descripción" },
          { field: "familia", header: "Familia" },
          { field: "origen", header: "Origen" },
          { field: "clasificacion", header: "Clasificación" },
          { field: "tipo", header: "Tipo" },
        ]}
        showFilters={true}
        searchFields={[
          {
            name: "codigo",
            label: "Código",
            field: "codigo",
          },

          {
            name: "descripcion",
            label: "Descripción",
            field: "descripcion",
          },

          {
            name: "clasificacion",
            label: "Clasificación",
            type: "selectMultiple",
            field: "clasificacion",
            endpoint: "/api/listas/clasificaciones",
            labelField: "name",
            valueField: "id",
            multiple: true,
          },

          {
            name: "tipo_de_lubricante",
            label: "Tipo",
            type: "selectMultiple",
            field: "tipo",
            endpoint: "/api/listas/tipos_de_lubricante",
            labelField: "name",
            valueField: "id",
            multiple: true,
          },

          {
            name: "fabricante",
            label: "Fabricante",
            type: "selectMultiple",
            field: "fabricante",
            endpoint: "/api/listas/fabricantes_de_lubricantes",
            labelField: "name",
            valueField: "id",
            multiple: true,
          },
        ]}
      />{" "}
    </Box>
  );
}
