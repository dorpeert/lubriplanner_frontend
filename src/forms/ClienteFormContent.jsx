// ClienteFormContent.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
} from "@mui/material";

import { useNavigate, useLocation } from "react-router-dom";

import { useForm, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";

import GenericSelect from "../componentsNew/GenericSelect";
import InlineEdit from "../componentsNew/InlineEdit";
import ImageDropUploader from "../componentsNew/ImageDropUploader";
import AssociatedComponentsButton from "../componentsNew/AssociatedComponentsButton";

import apiClient from "../api/apiClient";
import { clienteValidationSchema } from "../validations/clienteSchema";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";

const BASE_URL = "https://lightcoral-emu-437776.hostingersite.com/web";

/**
 * ✅ Componente hijo por activo.
 * Importante: aquí SÍ podemos usar useFieldArray para equipos sin violar reglas de hooks.
 */
function ActivoAccordion({
  control,
  watch,
  setValue,
  isViewMode,
  index,
  activoField,
  eliminarActivo,
  navigate,
  location,
}) {
  const activoNombre = watch(`field_activos.${index}.activo`) ?? "";
  const clienteId = watch("cliente_id");
  const activoId = watch(`field_activos.${index}.activo_id`);

  const imagenUrl = watch(`field_activos.${index}.imagen_url`) ?? null;
  const imagenFid = watch(`field_activos.${index}.imagen_fid`) ?? null;

  const equiposPath = `field_activos.${index}.equipos`;
  const {
    fields: equipos,
    append,
    remove,
  } = useFieldArray({
    control,
    name: equiposPath,
  });

  return (
    <Accordion
      elevation={0}
      disableGutters
      sx={{ width: "100%", backgroundColor: "white" }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <InlineEdit
            value={activoNombre}
            placeholder="Nombre del activo"
            displayValue="Nombre del activo"
            disabled={isViewMode}
            onChange={(val) =>
              setValue(`field_activos.${index}.activo`, val, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            sx={{ fontWeight: 600, flex: 1 }}
          />
        </Box>
      </AccordionSummary>

      <AccordionDetails>
        <Box fullWidth sx={{ display: "flex", gap: 2, flexDirection: "row" }}>
          <Box sx={{ width: "25%" }}>
            <Typography
              variant="subtitle2"
              sx={{
                backgroundColor: "#3A4D9C40",
                padding: "2px 8px",
                width: "max-content",
                borderRadius: "8px 8px 0px 0px",
                left: "8px",
                position: "relative",
                color: "#3a4d9c",
                fontSize: "0.8rem",
              }}
            >
              Imagen del activo
            </Typography>

            <ImageDropUploader
              value={imagenUrl}
              disabled={isViewMode}
              height={225}
              maxPreviewHeight={160}
              previewVariant="avatar"
              objectFit="cover"
              title="Arrastra y suelta la imagen"
              subtitle="o haz clic para seleccionar"
              caption="JPG, PNG, GIF, SVG (Máx. 3MB)"
              onUpload={async (file) => {
                const form = new FormData();
                form.append("file", file);

                // ✅ usa tu endpoint de activos (ver sección backend)
                const res = await apiClient.post(
                  `${BASE_URL}/api/clientes/upload-activo-image`,
                  form,
                  { headers: { "Content-Type": "multipart/form-data" } }
                );

                const fid = res?.data?.data?.fid ?? null;
                const url = res?.data?.data?.url ?? null;

                return { fid, url };
              }}
              onUploaded={(result) => {
                // ✅ guarda fid para que el backend asigne la imagen
                if (result?.fid) {
                  setValue(
                    `field_activos.${index}.imagen_fid`,
                    String(result.fid),
                    {
                      shouldDirty: true,
                      shouldValidate: true,
                    }
                  );
                }

                // ✅ guarda url para preview
                if (result?.url) {
                  setValue(`field_activos.${index}.imagen_url`, result.url, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }
              }}
              onClear={() => {
                setValue(`field_activos.${index}.imagen_url`, null, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                setValue(`field_activos.${index}.imagen_fid`, null, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
              onError={(msg) =>
                console.error("❌ Error subiendo imagen de activo:", msg)
              }
            />
          </Box>

          <Box className="equipos-section" sx={{ width: "75%" }}>
            <Typography variant="subtitle1">Equipos</Typography>
            <Divider
              textAlign="right"
              sx={{
                marginBottom: "1em",
                ...(!isViewMode && {
                  position: "relative",
                  top: "-20px",
                  marginBottom: 0,
                }),
              }}
            >
              {!isViewMode && (
                <Button
                  size="small"
                  variant="text"
                  endIcon={<AddIcon />}
                  onClick={() =>
                    append({
                      id: null,
                      equipo: "",
                      modelo: "",
                      fabricante: "",
                    })
                  }
                  disabled={isViewMode}
                >
                  Agregar equipo
                </Button>
              )}
            </Divider>

            <Stack
              sx={{
                gap: 2,
                flexDirection: "row",
                flexWrap: "wrap",
              }}
              spacing={1}
            >
              {equipos.map((eqField, eqIndex) => {
                const equipoId = watch(
                  `field_activos.${index}.equipos.${eqIndex}.id`
                );

                return (
                  <Paper
                    className="equipo-box"
                    key={eqField.id}
                    variant="outlined"
                    sx={{
                      marginTop: "0 !important",
                      width: "30%",
                      height: 204,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <Box
                      className="field-inlineEdit equipo-head-field field-nombre-equipo"
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 1,
                        borderRadius: "8px 8px 0 0",
                        p: "2px 16px",
                        backgroundColor: "#3A4D9C40",
                        color: "#3A4D9C",
                        fontSize: ".8rem",
                      }}
                    >
                      <InlineEdit
                        value={
                          watch(
                            `field_activos.${index}.equipos.${eqIndex}.equipo`
                          ) ?? ""
                        }
                        placeholder="Nombre del equipo"
                        displayValue="Nombre del equipo"
                        disabled={isViewMode}
                        onChange={(val) =>
                          setValue(
                            `field_activos.${index}.equipos.${eqIndex}.equipo`,
                            val,
                            { shouldDirty: true, shouldValidate: true }
                          )
                        }
                        sx={{ fontWeight: 600 }}
                      />
                    </Box>

                    <Box
                      className="equipo-body"
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.5,
                        p: 1.5,
                        flex: 1,
                        overflowY: "auto",
                      }}
                    >
                      <Box
                        className="field-inlineEdit equipo-body-field field-modelo"
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.5,
                          alignItems: "baseline",
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ fontSize: ".8rem", opacity: 0.6 }}
                        >
                          Modelo:
                        </Typography>
                        <InlineEdit
                          sx={{ fontSize: ".8rem" }}
                          value={
                            watch(
                              `field_activos.${index}.equipos.${eqIndex}.modelo`
                            ) ?? ""
                          }
                          placeholder="Indique modelo"
                          displayValue="Indique modelo"
                          disabled={isViewMode}
                          onChange={(val) =>
                            setValue(
                              `field_activos.${index}.equipos.${eqIndex}.modelo`,
                              val,
                              { shouldDirty: true, shouldValidate: true }
                            )
                          }
                        />
                      </Box>

                      <Box
                        className="field-inlineEdit equipo-body-field field-fabricante"
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.5,
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ fontSize: ".8rem", opacity: 0.6 }}
                        >
                          Fabricante:
                        </Typography>
                        <InlineEdit
                          sx={{ fontSize: ".8rem" }}
                          value={
                            watch(
                              `field_activos.${index}.equipos.${eqIndex}.fabricante`
                            ) ?? ""
                          }
                          placeholder="Indique fabricante"
                          displayValue="Indique fabricante"
                          disabled={isViewMode}
                          onChange={(val) =>
                            setValue(
                              `field_activos.${index}.equipos.${eqIndex}.fabricante`,
                              val,
                              { shouldDirty: true, shouldValidate: true }
                            )
                          }
                        />
                      </Box>
                    </Box>

                    <Box
                      className="equipo-footer"
                      sx={{
                        display: "flex",
                        gap: 1,
                        alignItems: "center",
                        justifyContent: "flex-end",
                        p: 1,
                        borderTop: "1px solid #eee",
                        flexShrink: 0,
                      }}
                    >
                      {isViewMode && (
                        <AssociatedComponentsButton
                          label="Componentes"
                          params={{
                            cliente: clienteId,
                            activo: activoId,
                            equipo: equipoId,
                          }}
                        />
                      )}
                      {!isViewMode && (
                        <Tooltip
                          arrow
                          placement="top"
                          title={`Eliminar ${
                            watch(
                              `field_activos.${index}.equipos.${eqIndex}.equipo`
                            ) ?? ""
                          }`}
                        >
                          <IconButton
                            color="error"
                            onClick={() => remove(eqIndex)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Paper>
                );
              })}
            </Stack>

            {!isViewMode && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: ".5em",
                }}
              >
                <Tooltip
                  arrow
                  placement="left"
                  title={`Eliminar ${activoNombre}`}
                >
                  <IconButton
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      eliminarActivo(index);
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </Box>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}

const ClienteFormContent = ({
  formId = "cliente-form",
  formData: initialData = {},
  isViewMode = false,
  loading = false,
  onValidationChange,
  editingItem = null,
  onSubmit,
  backendErrors = null,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // ======================
  // Validation
  // ======================
  const currentId = editingItem?.id ?? initialData?.id ?? null;
  const validationSchema = useMemo(
    () => clienteValidationSchema(currentId),
    [currentId]
  );
  const resolver = useMemo(
    () => yupResolver(validationSchema),
    [validationSchema]
  );

  // ======================
  // Form
  // ======================
  const {
    handleSubmit,
    reset,
    setValue,
    control,
    watch,
    setError,
    formState: { errors, isValid, isDirty },
  } = useForm({
    resolver: isViewMode ? undefined : resolver,
    mode: isViewMode ? "onSubmit" : "onChange",
    shouldUnregister: false, // ✅ CLAVE
    defaultValues: {
      cliente: "",
      cliente_id: null,
      field_prestador_de_servicio: "",
      field_enviar_notificaciones: false,
      field_numero_de_contacto: "",
      field_email_de_contacto: "",
      field_logo_del_cliente: null,
      field_activos: [],
    },
  });

  const [imagePreview, setImagePreview] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);

  // ✅ Activos fieldArray
  const {
    fields: activos,
    append: appendActivo,
    remove: removeActivo,
  } = useFieldArray({
    control,
    name: "field_activos",
  });

  // ======================
  // Sync initial data (edit / view)
  // ======================
  const mapFromApi = (data) => {
    const apiActivos = data?.activos || [];
    return apiActivos.map((a) => ({
      activo_id: a?.id ? String(a.id) : null,
      activo: a?.activo ?? "",
      imagen_url: a?.imagen_del_activo ?? null,
      imagen_fid: a?.imagen_fid ? String(a.imagen_fid) : null,
      descripcion: a?.descripcion ?? null,
      equipos: (a?.eq || []).map((e) => ({
        id: e?.id ? String(e.id) : null,
        equipo: e?.equipo ?? "",
        modelo: e?.modelo ?? "",
        fabricante: e?.fabricante ?? "",
      })),
    }));
  };

  useEffect(() => {
    reset({
      cliente: initialData?.cliente ?? "",
      cliente_id: initialData?.id ?? null,

      field_prestador_de_servicio:
        initialData?.field_prestador_de_servicio ??
        initialData?.prestador_de_servicio ??
        "",
      field_enviar_notificaciones:
        !!initialData?.field_enviar_notificaciones ??
        !!initialData?.enviar_notificaciones ??
        false,
      field_numero_de_contacto:
        initialData?.field_numero_de_contacto ??
        initialData?.numero_de_contacto ??
        "",
      field_email_de_contacto:
        initialData?.field_email_de_contacto ??
        initialData?.email ??
        initialData?.email_de_contacto ??
        "",
      field_logo_del_cliente: initialData?.field_logo_del_cliente ?? null,
      field_activos: mapFromApi(initialData),
    });

    const logoUrl = initialData?.field_logo_del_cliente_url;
    if (typeof logoUrl === "string" && logoUrl.length > 5)
      setImagePreview(logoUrl);
    else setImagePreview(null);
  }, [initialData, reset]);

  // ======================
  // Inform parent (valid/dirty)
  // ======================
  useEffect(() => {
    onValidationChange?.(isValid, isDirty);
  }, [isValid, isDirty, onValidationChange]);

  // ======================
  // Backend errors -> fields
  // ======================
  useEffect(() => {
    if (!backendErrors) return;
    Object.entries(backendErrors).forEach(([field, messages]) => {
      setError(field, {
        type: "server",
        message: Array.isArray(messages) ? messages[0] : String(messages),
      });
    });
  }, [backendErrors, setError]);

  const formData = watch();

  // helper setValue consistente
  const setField = (name, value) => {
    setValue(name, value, { shouldDirty: true, shouldValidate: true });
  };

  const handleTextChange = (e) => {
    const { name, value } = e.target;
    setField(name, value);
  };

  const addActivo = () => {
    appendActivo({
      activo_id: null,
      activo: "",
      imagen_url: null,
      imagen_fid: null,
      descripcion: null,
      equipos: [],
    });
  };

  const eliminarActivo = (index) => removeActivo(index);

  // ======================
  // Submit
  // ======================
  const submitForm = (data) => {
    onSubmit?.(data);
  };

  return (
    <div className="edit-form sections">
      <div style={{ flex: 1 }}>
        <form id={formId} onSubmit={handleSubmit(submitForm)}>
          {/* =========================
              DATOS DE CONTACTO
              ========================== */}
          <Paper elevation={0} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1">Datos de contacto</Typography>
            <Divider sx={{ mb: 2 }} />

            <div style={{ display: "flex", flexDirection: "row", gap: "16px" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  width: "calc(100% / 3)",
                }}
              >
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Cliente"
                    variant="filled"
                    required
                    name="cliente"
                    value={formData?.cliente ?? ""}
                    onChange={handleTextChange}
                    disabled={isViewMode || loading}
                    error={!!errors?.cliente}
                    helperText={errors?.cliente?.message}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <GenericSelect
                    label="Prestador de servicio"
                    variant="filled"
                    required
                    endpoint="/api/listas/prestadores_de_servicios"
                    name="field_prestador_de_servicio"
                    value={formData?.field_prestador_de_servicio ?? ""}
                    onChange={(e) =>
                      setField("field_prestador_de_servicio", e.target.value)
                    }
                    disabled={isViewMode || loading}
                    size="small"
                    labelField="name"
                    valueField="name"
                    hasError={!!errors?.field_prestador_de_servicio}
                    helperText={errors?.field_prestador_de_servicio?.message}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      height: "100%",
                      px: 1,
                    }}
                  >
                    <Switch
                      checked={!!formData?.field_enviar_notificaciones}
                      onChange={(e) =>
                        setField(
                          "field_enviar_notificaciones",
                          e.target.checked
                        )
                      }
                      disabled={isViewMode || loading}
                    />
                    <Typography>Enviar notificaciones</Typography>
                  </Box>
                </Grid>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  width: "calc(100% / 3)",
                }}
              >
                <Grid item xs={12} md={6}>
                  <ImageDropUploader
                    value={imagePreview}
                    disabled={isViewMode || loading}
                    height={160}
                    maxPreviewHeight={120}
                    previewVariant="img"
                    objectFit="contain"
                    title="Arrastra y suelta el logo"
                    subtitle="o haz clic para seleccionar"
                    caption="JPG, PNG, GIF, SVG (Máx. 3MB)"
                    onUpload={async (file) => {
                      setImagePreview(URL.createObjectURL(file));
                      setImageUploading(true);

                      try {
                        const form = new FormData();
                        form.append("file", file);

                        const res = await apiClient.post(
                          `${BASE_URL}/api/clientes/upload-image`,
                          form,
                          { headers: { "Content-Type": "multipart/form-data" } }
                        );

                        const fid =
                          res?.data?.data?.fid ?? res?.data?.fid ?? null;
                        const url =
                          res?.data?.data?.url ??
                          res?.data?.data?.relative_url ??
                          res?.data?.url ??
                          null;

                        return { fid, url };
                      } finally {
                        setImageUploading(false);
                      }
                    }}
                    onUploaded={(result) => {
                      if (result?.fid)
                        setField("field_logo_del_cliente", String(result.fid));
                      if (result?.url) setImagePreview(result.url);
                    }}
                    onClear={() => {
                      setField("field_logo_del_cliente", null);
                      setImagePreview(null);
                    }}
                    onError={(msg) =>
                      console.error("❌ Error subiendo logo:", msg)
                    }
                  />
                </Grid>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  width: "calc(100% / 3)",
                }}
              >
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Número de contacto"
                    name="field_numero_de_contacto"
                    variant="filled"
                    required
                    value={formData?.field_numero_de_contacto ?? ""}
                    onChange={handleTextChange}
                    disabled={isViewMode || loading}
                    error={!!errors?.field_numero_de_contacto}
                    helperText={errors?.field_numero_de_contacto?.message}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email de contacto"
                    name="field_email_de_contacto"
                    variant="filled"
                    required
                    value={formData?.field_email_de_contacto ?? ""}
                    onChange={handleTextChange}
                    disabled={isViewMode || loading}
                    error={!!errors?.field_email_de_contacto}
                    helperText={errors?.field_email_de_contacto?.message}
                  />
                </Grid>
              </div>
            </div>
          </Paper>

          {/* =========================
              ACTIVOS
              ========================== */}
          <Paper elevation={0} sx={{ p: 2 }}>
            <Typography variant="subtitle1">Activos</Typography>
            <Divider
              textAlign="right"
              sx={{
                marginBottom: "1em",
                ...(!isViewMode && {
                  position: "relative",
                  top: "-20px",
                  marginBottom: 0,
                }),
              }}
            >
              {!isViewMode && (
                <Button
                  size="small"
                  variant="text"
                  endIcon={<AddIcon />}
                  onClick={addActivo}
                  disabled={isViewMode}
                >
                  Inscribir Activo
                </Button>
              )}
            </Divider>

            <Stack spacing={1}>
              {activos.map((activoField, index) => (
                <ActivoAccordion
                  key={activoField.id}
                  control={control}
                  watch={watch}
                  setValue={setValue}
                  isViewMode={isViewMode}
                  index={index}
                  activoField={activoField}
                  eliminarActivo={eliminarActivo}
                  navigate={navigate}
                  location={location}
                />
              ))}
            </Stack>
          </Paper>
        </form>
      </div>
    </div>
  );
};

export default React.memo(ClienteFormContent);
