import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Divider,
} from "@mui/material";

import TablePagination from "@mui/material/TablePagination";
import GenericSelect from "./GenericSelect";
import GenericMultiSelect from "./GenericMultiSelect";
import { useNavigate, useLocation } from "react-router-dom";

import {
  Visibility as VisibilityIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";

import Grid from "@mui/material/Grid";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/ClearOutlined";

import apiListasClient from "../api/apiListasClient";
import CustomModal from "./CustomModal";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";

const BASE_URL = "https://lightcoral-emu-437776.hostingersite.com/web";

const FormContent = ({ formFields, formData, setFormData }) => (
  <>
    {formFields.map((field) => (
      <TextField
        autoFocus={field.name === "name"}
        variant="filled"
        key={field.name}
        name={field.name}
        label={field.label ?? field.name ?? "Campo"}
        value={formData[field.name] || ""}
        onChange={(e) =>
          setFormData((prev) => ({
            ...prev,
            [field.name]: e.target.value,
          }))
        }
        fullWidth
        sx={{ mb: 2 }}
      />
    ))}
  </>
);

const FormContentMemo = React.memo(FormContent);
const optionsCache = {};
const GenericTaxonomyTable = ({
  title,
  addButtonText,
  endpoint,

  createFormFields = [],
  editFormFields = null,
  tableColumns = [],
  showFilters = false,
  showExport = false,
  showAddButton = true,
  showBackButton = false,
  botonCompAsociados = true,
  searchFields = [],
  onSearch,
  filterFunction,
  dataMapper,
  customFormContent,
  onViewItem,
  initialFilters = {},
  componentesAsociadosConfig = null,
  validationSchema,
  modalSize = "M",
}) => {
  const [isInitialized, setIsInitialized] = useState(false);

  const [data, setData] = useState([]);
  const [initialData, setInitialData] = useState({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [formData, setFormData] = useState({});

  const [isViewMode, setIsViewMode] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);
  const formFields = editFormFields || createFormFields;

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [filters, setFilters] = useState(initialFilters);

  const location = useLocation();
  const cameFromModal = Boolean(location.state?.modal);
  const navigate = useNavigate();

  const [formIsValid, setFormIsValid] = useState(true);
  const [formIsDirty, setFormIsDirty] = useState(false);

  const [clientesData, setClientesData] = useState([]);

  //----------------------------------------------------------------------------------------------------//

  // Carga clientes para cascada
  useEffect(() => {
    const loadClientes = async () => {
      try {
        const res = await apiListasClient.get(`${BASE_URL}/api/clientes`);
        setClientesData(
          Array.isArray(res.data) ? res.data : res.data?.data || []
        );
      } catch (err) {
        console.error("Error cargando clientes para filtros:", err);
      }
    };
    loadClientes();
  }, []);

  // Funciones auxiliares para cascada
  const getActivosFromClientes = (clienteNombre) => {
    if (!clienteNombre) return [];
    const cliente = clientesData.find((c) => c.cliente === clienteNombre);
    const activos = cliente?.activos || [];
    return activos.map((a) => ({ value: a.activo, label: a.activo }));
  };

  const getEquiposFromActivos = (clienteNombre, activoNombre) => {
    if (!clienteNombre || !activoNombre) return [];
    const cliente = clientesData.find((c) => c.cliente === clienteNombre);
    const activo = cliente?.activos?.find((a) => a.activo === activoNombre);
    const equipos = activo?.equipos || [];
    return equipos.map((eq) => ({ value: eq.equipo, label: eq.equipo }));
  };

  // Limpieza de filtros inferiores
  useEffect(() => {
    if (!filters.cliente) {
      setFilters((prev) => ({ ...prev, activo: "", equipo: "" }));
    } else {
      const activos = getActivosFromClientes(filters.cliente);
      if (filters.activo && !activos.some((o) => o.value === filters.activo)) {
        setFilters((prev) => ({ ...prev, activo: "", equipo: "" }));
      } else {
        const equipos = getEquiposFromActivos(filters.cliente, filters.activo);
        if (
          filters.equipo &&
          !equipos.some((o) => o.value === filters.equipo)
        ) {
          setFilters((prev) => ({ ...prev, equipo: "" }));
        }
      }
    }
  }, [filters.cliente, filters.activo, clientesData]);

  // FETCH LISTA
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiListasClient.get(`${BASE_URL}${endpoint}`);

      let rawData = response.data;

      // NORMALIZACIÓN SUPER ROBUSTA
      if (Array.isArray(rawData)) {
      } else if (
        rawData &&
        typeof rawData === "object" &&
        rawData.data &&
        Array.isArray(rawData.data)
      ) {
        rawData = rawData.data;
      } else if (typeof rawData === "string") {
        try {
          rawData = JSON.parse(rawData);
          if (Array.isArray(rawData)) {
          } else {
            rawData = [];
          }
        } catch (parseErr) {
          rawData = [];
        }
      } else {
        console.warn("❌ Formato inesperado:", typeof rawData, rawData);
        rawData = [];
      }

      let mapped = rawData;

      if (dataMapper && typeof dataMapper === "function") {
        mapped = mapped.map(dataMapper);
      } else {
        mapped = mapped.map((item) => ({
          id: item.tid || item.id || item.nid,
          attributes: {
            name: item.name || item.title || "Sin nombre",
            ...(item.weight !== undefined && { weight: item.weight }),
          },
        }));
      }

      setData(mapped);
    } catch (e) {
      console.error("💥 Error completo:", e);
      setError(
        "Error cargando datos: " +
          (e.response?.data?.message || e.message || "Desconocido")
      );
    } finally {
      setLoading(false);
    }
  }, [endpoint, refreshKey]);

  useEffect(() => {
    if (!initialFilters || Object.keys(initialFilters).length === 0) return;

    setFilters(initialFilters);
  }, [initialFilters]);

  //----------------------------------------------------------------------------------------------------//

  // Función de renderizado de filtros
  const renderFilterField = (field, value, onChange) => {
    const commonProps = {
      name: field.name,
      value: value || "",
      onChange: (e) => {
        const val = e.target.value;
        setFilters((prev) => ({ ...prev, [field.name]: val })); // Actualiza filters directamente
      },
      fullWidth: true,
      size: "small",
      sx: {
        minWidth: 140,
        maxWidth: 200,
      },
    };

    if (field.custom) {
      if (field.name === "activo") {
        const opciones = getActivosFromClientes(filters.cliente);
        return (
          <GenericSelect
            {...commonProps}
            label={field.label}
            optionsOverride={opciones}
            disabled={!filters.cliente || opciones.length === 0}
            placeholder={filters.cliente ? "" : "Seleccione cliente primero"}
            searchEnabled={true}
            debounceDelay={300}
          />
        );
      }
      if (field.name === "equipo") {
        const opciones = getEquiposFromActivos(filters.cliente, filters.activo);
        return (
          <GenericSelect
            {...commonProps}
            label={field.label}
            optionsOverride={opciones}
            disabled={!filters.activo || opciones.length === 0}
            placeholder={filters.activo ? "" : "Seleccione activo primero"}
            searchEnabled={true}
            debounceDelay={300}
          />
        );
      }
    }

    switch (field.type) {
      case "select":
        return (
          <GenericSelect
            {...commonProps}
            label={field.label}
            endpoint={field.endpoint}
            labelField={field.labelField || "name"}
            valueField={field.valueField || "id"}
            placeholder=""
            debounceDelay={300}
          />
        );
      case "selectMultiple":
        return (
          <GenericMultiSelect
            {...commonProps}
            label={field.label}
            endpoint={field.endpoint}
            value={
              Array.isArray(filters[field.name]) ? filters[field.name] : []
            }
            onOptionsLoaded={(opts) => {
              optionsCache[field.name] = opts;
            }}
          />
        );
      default:
        return (
          <TextField {...commonProps} label={field.label} variant="filled" />
        );
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  // Filtro automático cuando cambien los datos o los filtros
// Effect separado para inicializar solo una vez (cuando cambian los datos por primera vez)
useEffect(() => {
  if (data.length > 0 && !isInitialized) {
    setIsInitialized(true);
  }
}, [data, isInitialized]);  // Solo se ejecuta si data cambia y no está inicializado

// Cálculo sincrónico de filteredData con useMemo (evita loops)
const filteredData = useMemo(() => {
  if (!data.length) {
    return [];
  }

  let filtered = data.filter((row) => {
    const attrs = row.attributes || {};

    return searchFields.every((field) => {
      const filterValue = filters[field.name];

      // Filtro vacío → no filtra
      if (
        filterValue === undefined ||
        filterValue === null ||
        filterValue === "" ||
        (Array.isArray(filterValue) && filterValue.length === 0)
      ) {
        return true;
      }

      const attrValue = attrs[field.field || field.name];

      // MULTISELECT
      if (Array.isArray(filterValue)) {
        if (!attrValue || attrValue === "-" || attrValue === "") {
          return true;
        }

        const options = optionsCache[field.name] || [];

        return filterValue.some((selectedValue) => {
          const opt = options.find(
            (o) => String(o.value) === String(selectedValue)
          );

          if (!opt) return false;

          return (
            String(attrValue).toLowerCase().trim() ===
            String(opt.label).toLowerCase().trim()
          );
        });
      }

      // TEXTO / SEARCH
      if (typeof filterValue === "string") {
        const attrStr = String(attrValue || "").toLowerCase();
        const filterStr = filterValue.toLowerCase();
        if (field.type === "text" || field.type === "search") {
          return attrStr.includes(filterStr);
        } else {
          return attrStr === filterStr;
        }
      }

      return true;  // Por si hay otros tipos
    });
  });

  // Aplicar filterFunction si existe
  return filterFunction ? filterFunction(filtered, filters) : filtered;
}, [data, filters, searchFields, filterFunction, optionsCache]);  // Dependencias estables

  useEffect(() => {
    setIsInitialized(false);
  }, [location.search]);

  // Funciones de limpiar y buscar
  const handleClearFilters = () => {
    setFilters({});
  };

  // ===========================
  // CREAR / EDITAR
  // ===========================
  const handleSave = async (data) => {
    console.log("Datos a guardar:", data); // ← Para que veas en consola que llega bien

    setLoading(true);
    try {
      let payload = { ...data };

      // Compatibilidad con tu backend (taxonomías Drupal?)
      if (payload.name && !payload.title) {
        payload.title = payload.name;
      }

      let response;

      if (!editingItem) {
        // CREAR NUEVO
        response = await apiListasClient.post(
          `${BASE_URL}${endpoint}`,
          payload,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      } else {
        // EDITAR EXISTENTE
        response = await apiListasClient.post(
          `${BASE_URL}${endpoint}/${editingItem.id}`,
          payload,
          {
            headers: {
              "X-HTTP-Method-Override": "PATCH",
              "Content-Type": "application/json",
            },
          }
        );
      }

      if (response.status === 200 || response.status === 201) {
        setOpenDialog(false);
        setEditingItem(null);
        reset(); // limpia el formulario
        setRefreshKey((prev) => prev + 1); // recarga la tabla
        fetchData(); // opcional, por si acaso

        // Tu modal de éxito (si lo tienes)
        showModal({
          type: "success",
          variant: "success",
          title: editingItem ? "Actualizado" : "Creado",
          message: editingItem
            ? "El registro se actualizó correctamente."
            : "El registro se creó con éxito.",
          actions: [{ label: "Aceptar", onClick: closeModal }],
        });
      }
    } catch (error) {
      console.error("Error guardando:", error);
      showModal({
        variant: "error",
        type: "error",
        title: "Error",
        message:
          error.response?.data?.message ||
          "No se pudo guardar. Intenta nuevamente.",
        actions: [{ label: "Aceptar", onClick: closeModal }],
      });
    } finally {
      setLoading(false);
    }
  };

  // ===========================
  // ELIMINAR
  // ===========================
  const handleDelete = async (tid) => {
    try {
      await apiListasClient.post(`${BASE_URL}${endpoint}/${tid}`, null, {
        headers: {
          "X-HTTP-Method-Override": "DELETE",
        },
      });

      fetchData();
    } catch (error) {
      console.error("Error eliminando:", error);
      setError("Error al eliminar.");
    }
  };

  // ===========================
  // ABRIR EDICIÓN
  // ===========================
  const openEdit = (item) => {
    const clean = {
      name: item.attributes.name,
      title: item.attributes.name,
      ...item.attributes,
    };

    setEditingItem(item);
    setInitialData(clean);
    setFormData(clean);
    setIsViewMode(false);
    setOpenDialog(true);
  };

  // ===========================
  // VER DETALLES
  // ===========================
  const openView = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.attributes.name,
      title: item.attributes.name,
      ...item.attributes,
    });
    setIsViewMode(true); // ← MODO LECTURA
    setOpenDialog(true);
  };

  const [modalConfig, setModalConfig] = useState({
    open: false,
    type: "info",
    variant: "default",
    title: "",
    message: "",
    code: null,
    actions: [],
  });

  const showModal = (config) => {
    setModalConfig({
      open: true,
      variant: config.variant || "default",
      type: config.type || "info",
      title: config.title || "",
      message: config.message || "",
      code: config.code || null,
      actions: config.actions || [],
    });
  };

  const closeModal = () => {
    setModalConfig((prev) => ({ ...prev, open: false }));
  };

  const handleConfirmDelete = (item) => {
    showModal({
      type: "confirm",
      variant: "warning",
      title: "Eliminar registro",
      message: `¿Está seguro de que desea eliminar '${item.attributes.name}'?`,
      actions: [
        {
          label: "Sí, eliminar",
          onClick: () => performDelete(item.id),
        },
        { label: "Cancelar", onClick: closeModal },
      ],
    });
  };

  const performDelete = async (id) => {
    closeModal();
    try {
      await apiListasClient.post(`${BASE_URL}${endpoint}/${id}`, null, {
        headers: { "X-HTTP-Method-Override": "DELETE" },
      });

      fetchData();

      showModal({
        type: "success",
        variant: "success",
        title: "Registro eliminado",
        code: 200,
        message: "El registro fue eliminado correctamente.",
        actions: [{ label: "Aceptar", onClick: closeModal }],
      });
    } catch (error) {
      showModal({
        variant: "error",
        type: "error",
        title: "Error",
        code: error.response?.status || 500,
        message: "No se pudo eliminar el registro. Intente nuevamente.",
        actions: [{ label: "Aceptar", onClick: closeModal }],
      });
    }
  };

  // React Hook Form - solo se crea cuando hay modal abierto
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid, isDirty },
  } = useForm({
    resolver: validationSchema ? yupResolver(validationSchema) : undefined,
    mode: "onChange",
    defaultValues: editingItem
      ? {
          name: editingItem.attributes.name,
          ...editingItem.attributes,
        }
      : { name: "" },
  });

  // Resetear cuando cambia el item o se abre modal nuevo
  useEffect(() => {
    if (openDialog) {
      reset(
        editingItem
          ? {
              name: editingItem.attributes.name,
              title: editingItem.attributes.name,
              ...editingItem.attributes,
            }
          : { name: "" }
      );
    }
  }, [editingItem, openDialog, reset]);

  const currentIsValid = customFormContent ? formIsValid : isValid;
  const currentIsDirty = customFormContent ? formIsDirty : isDirty;

  const formId = React.useMemo(
    () => `generic-form-${title.replace(/\s+/g, "-").toLowerCase()}`,
    [title]
  );

  useEffect(() => {
    const reopen = location.state?.reopenModal;
    if (!reopen || !data.length) return;

    const item = data.find((d) => String(d.id) === String(reopen.id));
    if (item) {
      openView(item);
    }
  }, [location.state, data]);

  return (
    <Box>
      {/* Título */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Box
          sx={{
            width: showBackButton ? "100%" : "auto",
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="h5" color="primary">
            {title}
          </Typography>
          {showBackButton && (
            <Button
              startIcon={<ArrowBackIcon />}
              variant="outlined"
              onClick={() => {
                const state = location.state;

                if (state?.from && (state?.modal || state?.reopenModal)) {
                  navigate(state.from, {
                    state: {
                      reopenModal: state.reopenModal ?? state.modal,
                    },
                  });
                } else {
                  navigate(-1);
                }
              }}
            >
              Volver
            </Button>
          )}
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 1,
          }}
        >
          {showFilters && (
            <Button
              variant="text"
              startIcon={<FilterIcon />}
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              {filtersOpen ? "Ocultar filtros" : "Mostrar filtros"}
            </Button>
          )}
          {showAddButton && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingItem(null);
                setFormData({ name: "" });
                setOpenDialog(true);
              }}
            >
              Registrar {addButtonText}
            </Button>
          )}
        </Box>
      </Box>

      {filtersOpen && showFilters && searchFields.length > 0 && (
        <Paper
          sx={{
            p: ".5em 1em 1em 1em",
            mb: 2,
            borderRadius: 1,
          }}
        >
          <Typography variant="subtitle1" gutterBottom color="#212121">
            Parámetros de búsqueda
          </Typography>

          <Divider sx={{ mb: 1 }} />

          <Grid
            className="filters-container"
            sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}
          >
            {searchFields.map((field, idx) => (
              <Grid
                key={field.name || `f-${idx}`}
                className="filter-item"
                sx={{ width: "calc(97% / 4)" }}
              >
                {renderFilterField(field, filters[field.name], (e) =>
                  setFilters((prev) => ({
                    ...prev,
                    [field.name]: e.target.value,
                  }))
                )}
              </Grid>
            ))}
          </Grid>

          <Grid mt={2}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 1,
              }}
            >
              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={handleClearFilters}
                size="small"
              >
                Limpiar campos
              </Button>
            </Box>
          </Grid>
        </Paper>
      )}

      {/* PAGINACIÓN */}
      <TablePagination
        component="div"
        count={filteredData.length}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        labelRowsPerPage="Registros por página"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} de ${count}`
        }
      />

      {/* Tabla */}
      <Paper
        sx={{
          padding: "1px",
          backgroundColor: "#f5f5f5",
          //height: "64vh",
        }}
      >
        {error && <Alert severity="error">{error}</Alert>}

        <TableContainer
          sx={{
            height: "100%",
          }}
        >
          <Table
            sx={{
              paddingTop: 1,
            }}
            stickyHeader
          >
            <TableHead>
              <TableRow>
                {tableColumns.map((c) => (
                  <TableCell
                    sx={{
                      backgroundColor: "#f5f5f5",
                      padding: "4px 16px 8px 16px",
                    }}
                    key={c.field}
                  >
                    {c.header}
                  </TableCell>
                ))}
                <TableCell
                  sx={{
                    backgroundColor: "#f5f5f5",
                  }}
                  className="acciones-column"
                >
                  Acciones
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {!isInitialized || loading ? (
                <TableRow>
                  <TableCell colSpan="100%" align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan="100%" align="center">
                    No hay datos
                  </TableCell>
                </TableRow>
              ) : (
                filteredData
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((item, i) => (
                    <TableRow
                      key={item.id}
                      sx={{
                        "&:nth-of-type(odd)": { backgroundColor: "#fafafa90" },
                      }}
                    >
                      {tableColumns.map((col) => (
                        <TableCell
                          sx={{
                            padding: "8px 16px 8px 16px",
                          }}
                          key={col.field}
                        >
                          {item.attributes[col.field]}
                        </TableCell>
                      ))}

                      <TableCell
                        sx={{
                          padding: "8px 16px 8px 16px",
                          textAlign: "center",
                        }}
                      >
                        <IconButton
                          onClick={() => {
                            if (onViewItem) {
                              onViewItem(item);
                            } else {
                              openView(item);
                            }
                          }}
                          title="Ver detalles"
                          sx={{ mr: 0.5 }}
                        >
                          <VisibilityIcon color="success" />
                        </IconButton>

                        <IconButton
                          onClick={() => openEdit(item)}
                          title="Editar"
                          sx={{ mr: 0.5 }}
                        >
                          <EditIcon color="primary" />
                        </IconButton>

                        <IconButton
                          onClick={() => handleConfirmDelete(item)}
                          color="error"
                          title="Eliminar"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      {showExport && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", paddingY: 2 }}>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => console.log("Exportar documento")}
          >
            Exportar
          </Button>
        </Box>
      )}

      {/* FORMULARIO CREAR/VER/EDITAR  */}
      <CustomModal
        size={modalSize}
        open={openDialog}
        onClose={() => {
          if (!loading) {
            setOpenDialog(false);
            if (editingItem) {
              setFormData(initialData);
            } else {
              setFormData({ name: "" });
            }
            setIsViewMode(false);
            setEditingItem(null);
          }
        }}
        title={
          isViewMode
            ? `Ver ${addButtonText}`
            : editingItem
            ? `Editar ${addButtonText}`
            : `Registrar ${addButtonText}`
        }
        content={React.createElement(customFormContent, {
          formId,
          formData: formData.attributes || formData,
          isViewMode,
          loading,
          onSubmit: handleSave,
          onValidationChange: (valid, dirty) => {
            setFormIsValid(valid);
            setFormIsDirty(dirty);
          },
          editingItem: editingItem,
        })}
        loading={loading}
        actions={[
          // ✅ BOTÓN GUARDAR (SOLO MODO EDICIÓN)
          !isViewMode && {
            label: loading ? "Guardando..." : "Guardar",
            type: "submit",
            form: formId,
            //  onClick: handleSave,
            disabled:
              loading ||
              isViewMode ||
              !currentIsDirty ||
              !currentIsValid /* || !formIsValid || !formIsDirty */,
          },

          // ✅ BOTÓN CERRAR/CANCELAR
          {
            label: isViewMode ? "Cerrar" : "Cancelar",
            onClick: () => {
              setOpenDialog(false);
              reset();
              setEditingItem(null);
              setIsViewMode(false);
            },
             variant: isViewMode ? "contained" : "outlined",
            disabled: loading,
          },

          // BOTÓN "COMPONENTES ASOCIADOS" (SOLO MODO VISTA)
          ...(isViewMode && editingItem && botonCompAsociados
            ? [
                {
                  label: "Componentes asociados",
                  variant: "outlined",
                  onClick: () => {
                    if (componentesAsociadosConfig && editingItem) {
                      const { param, idField } = componentesAsociadosConfig;

                      const id =
                        idField === "id"
                          ? editingItem.id
                          : editingItem.attributes?.[idField];

                      if (!id) {
                        console.warn(
                          "No se pudo obtener el ID para componentes asociados"
                        );
                        return;
                      }

                      const params = new URLSearchParams({
                        [param]: id,
                      });

                      navigate(`/componentes?${params.toString()}`, {
                        state: {
                          from: location.pathname,
                          modal: {
                            type: "lubricante",
                            id: editingItem.id,
                          },
                        },
                      });
                    }
                  },
                  disabled: loading,
                  sx: {
                    mr: 1, // ✅ Espaciado
                    color: "#1976d2",
                    borderColor: "#1976d2",
                  },
                },
              ]
            : []),
        ].filter(Boolean)}
      />

{/* MODAL MENSAJES ELIMINAR EXITO */}
      <CustomModal
        open={modalConfig.open}
        onClose={closeModal}
        type={modalConfig.type}
        variant={modalConfig.variant}
        title={modalConfig.title}
        message={modalConfig.message}
        code={modalConfig.code}
        actions={modalConfig.actions}
      />
    </Box>
  );
};

export default GenericTaxonomyTable;
