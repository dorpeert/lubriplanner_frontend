import FabricanteFormContent from "../../../../forms/Listas/FabricanteFormContent";
import RegisterEntityButton from "../../../../componentsNew/RegisterEntityButton.jsx";
import EntityModal from "../../../../componentsNew/EntityModal.jsx";
import AppSnackbar from "../../../../componentsNew/AppSnackbar.jsx";
import useEntityForm from "../../../../hooks/useEntityForm";
import FiltersPanel from "../../../../componentsNew/FiltersPanel.jsx";
import GenericSelect from "../../../../components/GenericSelect.jsx";
import DataTable from "../../../../componentsNew/DataTable.jsx";
import { useState, useEffect } from "react";
import { Box, Paper, Typography, Divider, Grid } from "@mui/material";
import apiClient from "../../../../api/apiClient.js";

export default function FabricantesDeLubricantes() {
  const {
    title = "Fabricantes",
    open,
    mode,
    openCreate,
    openEdit, // ← aún no se usa, pero ya existe
    close,
    submit,
    backendErrors,
    formData,
    isValid,
    isDirty,
    onValidationChange,
    snackbar,
    closeSnackbar,
  } = useEntityForm({
    endpoint: "/api/listas/fabricantes_de_lubricantes",
    messages: {
      createSuccess: "Fabricante creado correctamente",
      editSuccess: "Fabricante actualizado correctamente",
    },
  });

  const [filters, setFilters] = useState({});
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const filtersConfig = [
    {
      name: "nombre",
      label: "Buscar fabricante",
      type: "text",
    },

    {
      name: "active",
      label: "Estado",
      type: "select",
      options: [
        { value: 1, label: "Activo" },
        { value: 0, label: "Inactivo" },
      ],
    },

    // Úsalo cuando sea necesario
    // {
    //   name: "fabricante",
    //   render: ({ value, onChange }) => (
    //     <GenericSelect
    //       label="Fabricante"
    //       endpoint="/api/listas/fabricantes_de_lubricantes"
    //       value={value}
    //       onChange={onChange}
    //       size="small"
    //     />
    //   ),
    // },
  ];

  const columns = [
    {
      field: "tid",
      header: "id",
    },
    {
      field: "name",
      header: "Fabricante",
    },
  ];

  useEffect(() => {
    const fetchFabricantes = async () => {
      setLoading(true);

      try {
        const response = await apiClient.get(
          "/api/listas/fabricantes_de_lubricantes"
        );

        // 🔴 AJUSTA según lo que realmente devuelva tu backend
        const data = response.data?.data ?? response.data ?? [];

        setRows(data);
      } catch (error) {
        console.error("Error cargando fabricantes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFabricantes();
  }, []);

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Box
          sx={{
            //  width: showBackButton ? "100%" : "auto",
            width: "100%",
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="h5" color="primary">
            {title}
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 1,
          }}
        >
          <RegisterEntityButton entityName="Fabricante" onClick={openCreate} />
        </Box>
      </Box>

      <FiltersPanel
        fields={filtersConfig}
        value={filters}
        onChange={setFilters}
      />

      <DataTable
        rows={rows}
        columns={columns}
        loading={loading}
        onEdit={(row) => console.log("edit", row)}
        onView={(row) => console.log("view", row)}
        onDelete={(row) => console.log("delete", row)}
      />

      <EntityModal
        open={open}
        onClose={close}
        title={
          mode === "create"
            ? "Registrar Fabricante"
            : mode === "edit"
            ? "Editar Fabricante"
            : "Ver Fabricante"
        }
        submitDisabled={!isValid || !isDirty || loading}
        formId="fabricante-form"
        isViewMode={mode === "view"}
      >
        <FabricanteFormContent
          formId="fabricante-form"
          formData={formData}
          isViewMode={mode === "view"}
          loading={loading}
          onSubmit={submit}
          onValidationChange={onValidationChange}
          backendErrors={backendErrors}
        />
      </EntityModal>

      <AppSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={closeSnackbar}
      />
    </Box>
  );
}
