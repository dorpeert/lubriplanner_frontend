import FabricanteFormContent from "../../../../forms/Listas/FabricanteFormContent";
import RegisterEntityButton from "../../../../componentsNew/RegisterEntityButton.jsx";
import EntityModal from "../../../../componentsNew/EntityModal.jsx";
import AppSnackbar from "../../../../componentsNew/AppSnackbar.jsx";
import useEntityForm from "../../../../hooks/useEntityForm";
import FiltersPanel from "../../../../componentsNew/FiltersPanel.jsx";
import DataTable from "../../../../componentsNew/DataTable.jsx";
import { useState, useEffect } from "react";
import { Box, Typography, Collapse, Tooltip, IconButton } from "@mui/material";
import { useEntityList } from "../../../../hooks/useEntityList.js";
import FilterListIcon from "@mui/icons-material/FilterList";
import FilterListOffIcon from "@mui/icons-material/FilterListOff";
import apiClient from "../../../../api/apiClient.js";

export default function FabricantesDeLubricantes() {
  const {
    title = "Fabricantes",
    open,
    mode,

    openCreate,
    openEdit,
    openView,

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
    onSuccess: () => {
    refetch();
  },
  });

  // ✅ 1) Estados PRIMERO (antes del hook)
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [showFilters, setShowFilters] = useState(false);

  const endpoint = "/api/listas/fabricantes_de_lubricantes";

  // ✅ 2) Hook DESPUÉS
  const { rows, total, loading, error, refetch } = useEntityList({
    endpoint,
    page,
    limit: rowsPerPage,
    filters,
    queryMode: "drupalFilter",
  });

  const filtersConfig = [
    {
      name: "name",
      label: "Buscar fabricante",
      type: "text",
    },
    // Úsalo cuando sea necesario - No eliminar //
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
    // { field: "tid", header: "id" },
    { field: "name", header: "Fabricante" },
  ];

  const handleChangePage = (event, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (event) => {
    const newLimit = parseInt(event.target.value, 10);
    setRowsPerPage(newLimit);
    setPage(0);
  };

  // (opcional) ver errores
  useEffect(() => {
    if (error) console.error("useEntityList error:", error);
  }, [error]);

  const getRowId = (row) => row?.tid ?? row?.id;

// VER
const handleView = (row) => {
  const id = getRowId(row);
  if (!id) return console.warn("No hay id/tid en la fila:", row);
  openView(row); // ✅ PASA EL OBJETO COMPLETO
};

// EDITAR
const handleEdit = (row) => {
  const id = getRowId(row);
  if (!id) return console.warn("No hay id/tid en la fila:", row);
  openEdit(row); // ✅ PASA EL OBJETO COMPLETO
};

  // ELIMINAR
  const handleDelete = async (row) => {
    const id = getRowId(row);
    if (!id) return console.warn("No hay id/tid en la fila:", row);

    const ok = window.confirm("¿Seguro que deseas eliminar este fabricante?");
    if (!ok) return;

    try {
      await apiClient.delete(`${endpoint}/${id}`);
      await refetch(); // recarga la tabla
    } catch (e) {
      console.error("Error eliminando fabricante:", e);
      alert("No se pudo eliminar. Revisa permisos o el endpoint.");
    }
  };

  useEffect(() => {
  if (rows?.length) console.log("ROW SAMPLE:", rows[0]);
}, [rows]);

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
          <Tooltip
            arrow
            placement="left"
            title={showFilters ? "Ocultar filtros" : "Mostrar filtros"}
          >
            <IconButton
              size="small"
              color="primary"
              onClick={() => setShowFilters((s) => !s)}
            >
              {showFilters ? <FilterListOffIcon /> : <FilterListIcon />}
            </IconButton>
          </Tooltip>

          <RegisterEntityButton entityName="Fabricante" onClick={openCreate} />
        </Box>
      </Box>

      <Collapse in={showFilters} timeout="auto" unmountOnExit>
        <FiltersPanel
          fields={filtersConfig}
          value={filters}
          onChange={(next) => {
            setPage(0);
            setFilters(next);
          }}
        />
      </Collapse>

      <DataTable
        rows={rows}
        columns={columns}
        loading={loading}
        page={page}
        rowsPerPage={rowsPerPage}
        total={total}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        onEdit={handleEdit}
        onView={handleView}
        onDelete={handleDelete}
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
