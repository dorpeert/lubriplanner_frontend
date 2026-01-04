// src/forms/ClienteFormContent.jsx
import React, { useMemo, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import InlineEdit from "../components/InlineEdit";
import { useEffect } from "react";
import GenericSelect from "../components/GenericSelect";
import { useNavigate } from "react-router-dom";
import { clienteValidationSchema } from "../validations/clienteSchema";
import {
  Box,
  TextField,
  Switch,
  FormControlLabel,
  Paper,
  Stack,
  Typography,
  CircularProgress,
  Alert,
  Avatar,
  IconButton,
  Button,
  Grid,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  AddPhotoAlternate as AddPhotoAlternateIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMore,
} from "@mui/icons-material";

const ClienteFormContent = ({
  formId,
  formData: initialData = {},
  isViewMode = false,
  loading = false,
  onValidationChange,
  editingItem = null,
  onSubmit,
}) => {
  const validationSchema = useMemo(
    () => clienteValidationSchema(editingItem?.id),
    [editingItem]
  );

  const resolver = useMemo(
    () => yupResolver(validationSchema),
    [validationSchema]
  );

  const {
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty, isValid },
  } = useForm({
    resolver,
    mode: "onChange",
    defaultValues: initialData,
  });

  useEffect(() => {
    reset(initialData);
  }, [initialData, reset]);

  useEffect(() => {
    onValidationChange?.(isValid, isDirty);
  }, [isValid, isDirty, onValidationChange]);

  const [dragActive, setDragActive] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const handleChange = (e) => {
    if (typeof setFormData !== "function") return;

    const { name, value, checked, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Upload de logo
  const uploadToDrupal = useCallback(
    async (file) => {
      setUploading(true);
      setUploadError(null);

      const formDataUpload = new FormData();
      formDataUpload.append("file", file);

      try {
        const response = await fetch(
          "https://lightcoral-emu-437776.hostingersite.com/web/api/clientes/upload-image",
          {
            method: "POST",
            body: formDataUpload,
            credentials: "include",
          }
        );

        const result = await response.json();

        if (result.status === true) {
          const fid = result.data.fid;
          const url = result.data.url;

          setFormData((prev) => ({
            ...prev,
            field_logo_del_cliente: fid, // Guardamos FID (Drupal lo necesita)
          }));

          setImagePreview(url);
          return fid;
        } else {
          throw new Error(result.message || "Error al subir imagen");
        }
      } catch (error) {
        console.error("Error subiendo logo:", error);
        setUploadError(error.message);
      } finally {
        setUploading(false);
      }
    },
    [setValue]
  );

  const uploadActivoImage = async (file, activoIndex) => {
    const formDataUpload = new FormData();
    formDataUpload.append("file", file);

    try {
      const res = await fetch(
        "https://lightcoral-emu-437776.hostingersite.com/web/api/clientes/upload-activo-image",
        {
          method: "POST",
          body: formDataUpload,
          credentials: "include",
        }
      );
      const json = await res.json();
      if (json.status) {
        setFormData((prev) => {
          const nuevos = [...prev.field_activos];
          nuevos[activoIndex].imagen_url = json.data.url;
          nuevos[activoIndex].imagen_fid = json.data.fid;
          return { ...prev, field_activos: nuevos };
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // === AGREGAR ACTIVO ===
  const agregarActivo = () => {
    setFormData((prev) => ({
      ...prev,
      field_activos: [
        {
          activo: "",
          imagen_url: null,
          imagen_fid: null,
          equipos: [],
        },
        ...(prev.field_activos || []),
      ],
    }));
    setActivoIndexEditing((prev.field_activos || []).length);
  };

  // === AGREGAR EQUIPO ===
  const agregarEquipo = (activoIndex) => {
    setFormData((prev) => {
      const nuevos = [...prev.field_activos];
      const oldEquipos = nuevos[activoIndex].equipos || [];

      nuevos[activoIndex] = {
        ...nuevos[activoIndex],
        equipos: [
          {
            equipo: "",
            modelo: "",
            fabricante: "",
          },
          ...oldEquipos,
        ],
      };

      return { ...prev, field_activos: nuevos };
    });
  };

  // === ELIMINAR ===
  const eliminarActivo = (index) => {
    setFormData((prev) => ({
      ...prev,
      field_activos: prev.field_activos.filter((_, i) => i !== index),
    }));
    if (activoIndexEditing === index) setActivoIndexEditing(null);
  };

  const eliminarEquipo = (activoIndex, eqIndex) => {
    setFormData((prev) => {
      const nuevos = [...prev.field_activos];

      nuevos[activoIndex] = {
        ...nuevos[activoIndex],
        equipos: nuevos[activoIndex].equipos.filter((_, i) => i !== eqIndex),
      };

      return { ...prev, field_activos: nuevos };
    });
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setUploadError("Máximo 3MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);

    await uploadToDrupal(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragover" || e.type === "dragenter") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files?.[0]) {
      await handleImageChange({ target: { files: e.dataTransfer.files } });
    }
  };

  const removeImage = (e) => {
    e.stopPropagation();
    setImagePreview(null);
    setUploadError(null);
    setFormData((prev) => ({ ...prev, field_logo_del_cliente: "" }));
  };

  // Mostrar logo existente o preview
  const currentLogo =
    imagePreview ||
    (typeof formData.field_logo_del_cliente === "string"
      ? formData.field_logo_del_cliente
      : null);

  useEffect(() => {
    const el = document.querySelector(".MuiModal-root");
    if (!el) return;

    el.classList.add("clientesForm-page");

    return () => {
      el.classList.remove("clientesForm-page");
    };
  }, []);

  const navigate = useNavigate();

  const submitForm = () => {
    console.log("SUBMIT CLIENTE:", formData);
    onSubmit(formData);
  };

  return (
    <div
      style={{ display: "flex", gap: "24px" }}
      className="edit-form sections"
    >
      <div style={{ flex: 1 }}>
        <Paper
          sx={{
            p: ".5em 1em 1em 1em",
            mb: 2,
            borderRadius: 1,
          }}
        >
          <Typography variant="subtitle1" gutterBottom color="#212121">
            Datos de contacto
          </Typography>

          <Divider sx={{ mb: 1 }} />
          <form id={formId} onSubmit={handleSubmit(submitForm)}>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  width: "calc(100% / 3)",
                }}
              >
                <TextField
                  fullWidth
                  label="Nombre de Cliente"
                  name="title"
                  value={formData.title || ""}
                  onChange={handleChange}
                  required
                  disabled={isViewMode || loading}
                  variant="filled"
                  sx={{ mb: 3 }}
                />

                <GenericSelect
                  name="field_prestador_de_servicio"
                  label="Prestador del Servicio"
                  value={formData.field_prestador_de_servicio || ""}
                  onChange={(e) => {
                    if (!isViewMode && typeof setFormData === "function") {
                      handleChange(e);
                    }
                  }}
                  endpoint="/api/listas/prestadores_de_servicios"
                  labelField="name"
                  valueField="id"
                  fullWidth
                  disabled={isViewMode || loading}
                  returnLabel={true}
                  sx={{
                    ...(isViewMode && {
                      backgroundColor: "#f8f9fa !important",
                      "& .MuiSelect-select": {
                        color: "#666 !important",
                        WebkitTextFillColor: "#666",
                      },
                      "& .MuiSvgIcon-root": {
                        color: "#999 !important",
                      },
                    }),
                  }}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={!!formData.field_enviar_notificaciones}
                      onChange={handleChange}
                      name="field_enviar_notificaciones"
                      disabled={isViewMode || loading}
                      color="primary"
                    />
                  }
                  label="Enviar Notificaciones"
                  sx={{ mb: 3 }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  width: "calc(100% / 3)",
                }}
              >
                <Paper
                  variant="outlined"
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() =>
                    !isViewMode && document.getElementById("logoInput").click()
                  }
                  sx={{
                    p: 3,
                    textAlign: "center",
                    height: "192px",
                    border: "2px dashed #3A4D9C",
                    bgcolor:
                      dragActive || currentLogo ? "#ffffff00" : "#ffffff10",
                    transition: "all 0.3s ease",
                    cursor: isViewMode ? "default" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <input
                    id="logoInput"
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleImageChange}
                  />

                  {uploading ? (
                    <Stack spacing={2} sx={{ alignItems: "center" }}>
                      <CircularProgress size={48} thickness={4} />
                      <Typography variant="body1">Subiendo logo...</Typography>
                    </Stack>
                  ) : currentLogo ? (
                    <Box sx={{ position: "relative", width: "100%", p: 2 }}>
                      <Box
                        component="img"
                        src={currentLogo}
                        alt="Logo del cliente"
                        sx={{
                          width: "100%",
                          height: "auto",
                          maxHeight: "96px",
                          objectFit: "contain",
                        }}
                        onError={(e) => {
                          console.error("Logo falló:", currentLogo);
                          e.target.src =
                            "https://via.placeholder.com/400x300.png?text=Logo+No+Encontrado";
                        }}
                      />
                    </Box>
                  ) : (
                    <Stack spacing={1} sx={{ alignItems: "center" }}>
                      <AddPhotoAlternateIcon
                        sx={{ fontSize: 40, color: "#3A4D9C" }}
                      />

                      <Typography
                        variant="subtitle1"
                        color="text.secondary"
                        sx={{ lineHeight: 1.2 }}
                      >
                        Arrastra y suelta la imagen
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        o haz clic para seleccionar
                      </Typography>

                      <Typography variant="caption" color="text.secondary">
                        JPG, PNG, GIF, SVG <br /> (Máx. 3MB)
                      </Typography>
                    </Stack>
                  )}
                </Paper>

                {uploadError && (
                  <Alert severity="error" sx={{ mt: 2 }} variant="outlined">
                    {uploadError}
                  </Alert>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  width: "calc(100% / 3)",
                }}
              >
                <TextField
                  fullWidth
                  label="Número de Contacto"
                  name="field_numero_de_contacto"
                  value={formData.field_numero_de_contacto || ""}
                  onChange={handleChange}
                  disabled={isViewMode || loading}
                  variant="filled"
                />

                <TextField
                  fullWidth
                  label="E-mail de Contacto"
                  name="field_email_de_contacto"
                  type="email"
                  value={formData.field_email_de_contacto || ""}
                  onChange={handleChange}
                  disabled={isViewMode || loading}
                  variant="filled"
                />
              </div>
            </div>
          </form>
        </Paper>

        <Paper
          sx={{
            p: ".5em 1em 1em 1em",
            mb: 2,
            borderRadius: 1,
          }}
        >
          <Typography variant="subtitle1" gutterBottom color="#212121">
            Activos
          </Typography>
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
                onClick={agregarActivo}
                disabled={isViewMode}
              >
                Inscribir Activo
              </Button>
            )}
          </Divider>

          {/* === LISTA DE ACTIVOS === */}

          <div style={{ display: "flex", gap: "1em", flexDirection: "column" }}>
            {(formData.field_activos || []).map((activo, index) => (
              <Accordion
                key={activo.id ?? `activo-${index}`}
                sx={{
                  width: "100%",
                  backgroundColor: "#fff",
                  borderRadius: 1,
                  boxShadow: "1px 1px 10px -2px #cdcdcd !important",
                  "&::before": { display: "none" },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMore />}
                  sx={{
                    "&.Mui-focusVisible": {
                      backgroundColor: "transparent !important",
                    },
                  }}
                >
                  <InlineEdit
                    value={activo.activo}
                    placeholder="Nombre del activo"
                    displayValue="Nombre del activo"
                    onChange={(val) => {
                      const nuevos = [...formData.field_activos];
                      nuevos[index].activo = val;
                      setFormData((prev) => ({
                        ...prev,
                        field_activos: nuevos,
                      }));
                    }}
                    disabled={isViewMode}
                    sx={{ fontWeight: 600 }}
                  />
                </AccordionSummary>

                <AccordionDetails>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      gap: "1em",
                    }}
                  >
                    <div style={{ width: "25%" }}>
                      {/* Upload imagen activo */}
                      {/* === UPLOADER DE IMAGEN DEL ACTIVO === */}
                      <Paper
                        variant="outlined"
                        onDragEnter={(e) => e.preventDefault()}
                        onDragLeave={(e) => e.preventDefault()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (e.dataTransfer.files?.[0]) {
                            uploadActivoImage(e.dataTransfer.files[0], index);
                          }
                        }}
                        onClick={() =>
                          !isViewMode &&
                          document
                            .getElementById(`activoImgInput-${index}`)
                            .click()
                        }
                        sx={{
                          textAlign: "center",
                          height: "256px",
                          border: "2px dashed #3A4D9C",
                          backgroundColor: activo.imagen_url
                            ? "#3a4e9c15"
                            : "#3a4e9c08",
                          transition: "all 0.3s ease",
                          cursor: isViewMode ? "default" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          position: "relative",
                        }}
                      >
                        {/* INPUT OCULTO */}
                        <input
                          id={`activoImgInput-${index}`}
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) => {
                            if (e.target.files[0]) {
                              uploadActivoImage(e.target.files[0], index);
                            }
                          }}
                        />

                        {/* === SI YA HAY UNA IMAGEN === */}
                        {uploading ? (
                          <Stack
                            style={{
                              display: "flex",
                              alignContent: "center",
                              alignItems: "center",
                            }}
                            spacing={2}
                            sx={{ py: 4 }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "1em",
                              }}
                            >
                              <CircularProgress size={40} />
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Subiendo imagen...
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Por favor espera
                              </Typography>
                            </div>
                          </Stack>
                        ) : activo.imagen_url ? (
                          <Box
                            sx={{
                              width: "100%",
                              height: "100%",
                              position: "relative",
                            }}
                          >
                            <Avatar
                              src={activo.imagen_url}
                              variant="rounded"
                              sx={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />

                            {!isViewMode && (
                              <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const nuevos = [...formData.field_activos];
                                  nuevos[index].imagen_url = null;
                                  nuevos[index].imagen_fid = null;
                                  setFormData((prev) => ({
                                    ...prev,
                                    field_activos: nuevos,
                                  }));
                                }}
                                sx={{
                                  position: "absolute",
                                  top: -8,
                                  right: -8,
                                  bgcolor: "white",
                                }}
                              >
                                <ClearIcon />
                              </IconButton>
                            )}
                          </Box>
                        ) : (
                          /* === SI NO HAY IMAGEN === */
                          <Stack spacing={1} sx={{ alignItems: "center" }}>
                            <AddPhotoAlternateIcon
                              sx={{ fontSize: 40, color: "#3A4D9C" }}
                            />

                            <Typography
                              variant="subtitle1"
                              color="text.secondary"
                              sx={{ lineHeight: 1.2 }}
                            >
                              Arrastra y suelta la imagen
                            </Typography>

                            <Typography variant="body2" color="text.secondary">
                              o haz clic para seleccionar
                            </Typography>

                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              JPG, PNG, GIF, SVG <br /> (Máx. 3MB)
                            </Typography>
                          </Stack>
                        )}
                      </Paper>
                    </div>

                    <div style={{ width: "75%" }}>
                      <Paper
                        sx={{
                          p: ".5em 1em 1em 1em",
                          mb: 2,
                          borderRadius: 1,
                        }}
                      >
                        <Typography
                          variant="subtitle1"
                          gutterBottom
                          color="#212121"
                        >
                          Equipos
                        </Typography>

                        <Divider
                          sx={{ position: "relative", top: "-20px" }}
                          textAlign="right"
                        >
                          {!isViewMode && (
                            <Button
                              size="small"
                              variant="text"
                              endIcon={<AddIcon />}
                              onClick={() => agregarEquipo(index)}
                              disabled={isViewMode}
                            >
                              Agregar Equipo
                            </Button>
                          )}
                        </Divider>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "row",
                            flexWrap: "wrap",
                            gap: "1em",
                          }}
                        >
                          {activo.equipos.map((eq, eqIndex) => (
                            <Grid
                              container
                              spacing={0.5}
                              key={eqIndex}
                              sx={{
                                width: "calc(96.6726% / 4)",
                                borderRadius: 1,
                                p: 2,
                                backgroundColor: "#e9e9e9",
                                display: "flex",
                                flexDirection: "column",
                              }}
                            >
                              <Grid>
                                <InlineEdit
                                  value={eq.equipo}
                                  placeholder="Nombre del equipo"
                                  displayValue="Nombre del equipo"
                                  onChange={(val) => {
                                    const nuevos = [...formData.field_activos];
                                    nuevos[index].equipos[eqIndex].equipo = val;
                                    setFormData({
                                      ...formData,
                                      field_activos: nuevos,
                                    });
                                  }}
                                  sx={{
                                    fontWeight: "500",
                                    fontSize: "1.2rem",
                                  }}
                                  disabled={isViewMode}
                                />
                              </Grid>

                              <Grid>
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    gap: ".5em",
                                  }}
                                >
                                  <span style={{ color: "#00000085" }}>
                                    Modelo:
                                  </span>
                                  <InlineEdit
                                    value={eq.modelo}
                                    placeholder="Indique modelo"
                                    displayValue="Indique modelo"
                                    onChange={(val) => {
                                      const nuevos = [
                                        ...formData.field_activos,
                                      ];
                                      nuevos[index].equipos[eqIndex].modelo =
                                        val;
                                      setFormData({
                                        ...formData,
                                        field_modelo: nuevos,
                                      });
                                    }}
                                    disabled={isViewMode}
                                  />
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    gap: ".5em",
                                  }}
                                >
                                  <span style={{ color: "#00000085" }}>
                                    Fabricante:
                                  </span>

                                  <InlineEdit
                                    value={eq.fabricante}
                                    placeholder="Indique fabricante"
                                    displayValue="Indique fabricante"
                                    onChange={(val) => {
                                      const nuevos = [
                                        ...formData.field_activos,
                                      ];

                                      nuevos[index].equipos[
                                        eqIndex
                                      ].fabricante = val;
                                      setFormData({
                                        ...formData,
                                        field_fabricante: nuevos,
                                      });
                                    }}
                                    disabled={isViewMode}
                                  />
                                </div>
                              </Grid>

                              <Grid>
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                  }}
                                >
                                  <Button
                                    size="small"
                                    variant="text"
                                    color="success"
                                    onClick={() => {
                                      if (!formData.cliente_id) {
                                        console.warn("Cliente sin ID aún");
                                        return;
                                      }

                                      const params = new URLSearchParams({
                                        cliente: formData.cliente_id,
                                        activo: activo.activo_id,
                                        equipo: eq.id,
                                      });

                                      navigate(
                                        `/componentes?${params.toString()}`
                                      );
                                    }}
                                  >
                                    Componentes
                                  </Button>

                                  {!isViewMode && (
                                    <Tooltip arrow title="Eliminar Equipo">
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() =>
                                          eliminarEquipo(index, eqIndex)
                                        }
                                      >
                                        <DeleteIcon />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </div>
                              </Grid>
                            </Grid>
                          ))}
                        </div>
                      </Paper>
                      <div style={{ textAlign: "right" }}>
                        {!isViewMode && (
                          <Tooltip arrow title="Eliminar Activo">
                            <IconButton
                              color="error"
                              onClick={() => eliminarActivo(index)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </div>
                </AccordionDetails>
              </Accordion>
            ))}
          </div>
        </Paper>
      </div>
    </div>
  );
};

export default React.memo(ClienteFormContent);
