import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Tooltip,
  Collapse,
} from "@mui/material";

import FilterListIcon from "@mui/icons-material/FilterList";
import FilterAltOffIcon from "@mui/icons-material/FilterAltOff";

import RegisterEntityButton from "./RegisterEntityButton.jsx";
import FiltersPanel from "./FiltersPanel.jsx";
import DataTable from "./DataTable.jsx";
import EntityModal from "./EntityModal.jsx";
import AppSnackbar from "./AppSnackbar.jsx";

import apiClient from "../api/apiClient.js";
import useEntityForm from "../hooks/useEntityForm";
import { useEntityList } from "../hooks/useEntityList.js";

/**
 * Página CRUD genérica:
 * - Listado paginado + filtros
 * - Modal: create/edit/view
 * - Acciones: ver, editar, eliminar
 */
export default function EntityCrudPage({
  title,
  entityName,
  endpoint,

  initialFilters = {},
  filtersConfig = [],
  columns = [],

  FormContent,
  formId = "entity-form",

  queryMode = "drupalFilter",

  messages = {
    createSuccess: "Registro creado correctamente",
    editSuccess: "Registro actualizado correctamente",
    deleteSuccess: "Registro eliminado correctamente",
  },

  // opcional: cómo obtener el id del row
  getRowId = (row) => row?.tid ?? row?.id,
  modalProps = {},

  viewMode = "modal",
  onViewRoute = null,
}) {
  // filtros/listado
  const [filters, setFilters] = useState(initialFilters || {});

  const [showFilters, setShowFilters] = useState(false);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);

  // 1) listado
  const {
    rows,
    total,
    loading: listLoading,
    error: listError,
    refetch,
  } = useEntityList({
    endpoint,
    page,
    limit: rowsPerPage,
    filters,
    queryMode,
  });

  // reset page cuando cambian filtros
  useEffect(() => {
    setPage(0);
  }, [filters]);

  // 2) formulario (modal)
  const form = useEntityForm({
    endpoint,
    messages: {
      createSuccess: messages.createSuccess,
      editSuccess: messages.editSuccess,
    },
    // clave: al guardar, refrescar tabla
    onSuccess: () => {
      refetch();
    },
  });

  const isModalLoading = listLoading; // o crea un state separado si quieres

  // acciones tabla
  const handleView = useCallback(
    async (row) => {

      // ✅ si el "ver" es por ruta, delegamos y NO abrimos modal
      if (viewMode === "route") {
        if (typeof onViewRoute === "function") {
          onViewRoute(row);
        } else {
          console.warn(
            "EntityCrudPage: viewMode='route' pero no se pasó onViewRoute(row)."
          );
        }
        return;
      }


      const id = getRowId(row);
      if (!id) return;

      try {
        // Cargar el registro (para tener datos frescos)
        const res = await apiClient.get(`${endpoint}/${id}`);
        form.openView(res.data);
      } catch (e) {
        console.error("Error cargando item para ver:", e);
        form.openView(row); // fallback
      }
    },
    [viewMode, onViewRoute, endpoint, form, getRowId]
  );

  const handleEdit = useCallback(
    async (row) => {
      const id = getRowId(row);
      if (!id) return;

      try {
        const res = await apiClient.get(`${endpoint}/${id}`);
        form.openEdit(res.data);
      } catch (e) {
        console.error("Error cargando item para editar:", e);
        form.openEdit(row); // fallback
      }
    },
    [endpoint, form, getRowId]
  );

  const handleDeleteClick = useCallback((row) => {
    setRowToDelete(row);
    setDeleteOpen(true);
  }, []);

  const closeDelete = useCallback(() => {
    setDeleteOpen(false);
    setRowToDelete(null);
  }, []);

  const doDelete = useCallback(async () => {
    const id = getRowId(rowToDelete);
    if (!id) return;

    try {
      /**
       * IMPORTANTE:
       * Para evitar preflight/CORS con DELETE/PATCH, usamos override por POST,
       * igual que ya haces con PATCH.
       */
      await apiClient.post(
        `${endpoint}/${id}`,
        {},
        {
          headers: { "X-HTTP-Method-Override": "DELETE" },
        }
      );

      form.setSnackbar?.({
        open: true,
        message: messages.deleteSuccess,
        severity: "success",
      });

      closeDelete();
      refetch();
    } catch (e) {
      console.error("Error eliminando:", e);

      // si backend devuelve mensaje (ej: “no se puede eliminar porque está en uso”)
      const msg =
        e?.response?.data?.message ||
        "No se pudo eliminar (puede estar en uso).";

      form.setSnackbar?.({
        open: true,
        message: msg,
        severity: "error",
      });
    }
  }, [endpoint, rowToDelete, getRowId, closeDelete, refetch, form, messages]);

  const handleChangePage = (event, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (event) => {
    const newLimit = parseInt(event.target.value, 10);
    setRowsPerPage(newLimit);
    setPage(0);
  };

  // icono toggle filtros (solo icono, cambia a “filtro tachado”)
  const FiltersToggleButton = useMemo(() => {
    return (
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
          {showFilters ? <FilterAltOffIcon /> : <FilterListIcon />}
        </IconButton>
      </Tooltip>
    );
  }, [showFilters]);

  useEffect(() => {
    if (listError) console.error("Error listado:", listError);
  }, [listError]);

  useEffect(() => {
  setFilters(initialFilters || {});
}, [JSON.stringify(initialFilters)]);


  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h5" color="primary">
          {title}
        </Typography>

        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          {FiltersToggleButton}
          <RegisterEntityButton
            entityName={entityName}
            onClick={form.openCreate}
          />
        </Box>
      </Box>

      {/* Filters */}
      <Collapse in={showFilters} timeout="auto" unmountOnExit>
        <FiltersPanel
          fields={filtersConfig}
          value={filters}
          onChange={setFilters}
        />
      </Collapse>

      {/* Table */}
      <DataTable
        rows={rows}
        columns={columns}
        loading={listLoading}
        page={page}
        rowsPerPage={rowsPerPage}
        total={total}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        onEdit={handleEdit}
        onView={handleView}
        onDelete={handleDeleteClick}
      />

      {/* Modal */}
      <EntityModal
        {...modalProps}
        open={form.open}
        onClose={form.close}
        title={
          form.mode === "create"
            ? `Registrar ${entityName}`
            : form.mode === "edit"
            ? `Editar ${entityName}`
            : `Ver ${entityName}`
        }
        submitDisabled={!form.isValid || !form.isDirty || isModalLoading}
        formId={formId}
        isViewMode={form.mode === "view"}
      >
        <FormContent
          formId={formId}
          formData={form.formData}
          isViewMode={form.mode === "view"}
          loading={isModalLoading}
          onSubmit={form.submit}
          onValidationChange={form.onValidationChange}
          backendErrors={form.backendErrors}
        />
      </EntityModal>

      {/* Snackbar */}
      <AppSnackbar
        open={form.snackbar.open}
        message={form.snackbar.message}
        severity={form.snackbar.severity}
        onClose={form.closeSnackbar}
      />

      {/* Confirm delete dialog */}
      <Dialog open={deleteOpen} onClose={closeDelete}>
        <DialogTitle>Eliminar {entityName}</DialogTitle>
        <DialogContent>
          ¿Seguro que deseas eliminar{" "}
          <b>{rowToDelete?.name ?? rowToDelete?.title ?? "este registro"}</b>?
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDelete}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={doDelete}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
