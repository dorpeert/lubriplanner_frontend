// src/forms/LubricanteFormContent.jsx
import React, { useMemo, useEffect } from "react";
import { TextField } from "@mui/material";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { lubricanteValidationSchema } from "../validations/lubricanteSchema";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import GenericSelect from "../components/GenericSelect";
import { useState, useCallback } from "react";

import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Avatar,
  Stack,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";

const LubricanteFormContent = ({
  formId,
  formData: initialData = {},
  isViewMode = false,
  loading = false,
  onValidationChange,
  existingCodes = [],
  editingItem = null,
  onSubmit,
}) => {
  const validationSchema = useMemo(
    () => lubricanteValidationSchema(editingItem?.id),
    [editingItem]
  );

  const resolver = useMemo(
    () => yupResolver(validationSchema),
    [validationSchema]
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    trigger,
    formState: { errors, isDirty, isValid },
  } = useForm({
    resolver,
    mode: "onChange",
    defaultValues: initialData,
  });

  useEffect(() => {
    reset(initialData);
    const imageUrl =
      initialData.field_imagen_del_lubricante ||
      initialData.imagen_del_lubricante;
    if (imageUrl && imageUrl.startsWith("http")) {
      setImagePreview(imageUrl);
    } else if (imageUrl) {
    }
  }, [initialData, reset, trigger]);

  useEffect(() => {
    onValidationChange?.(isValid, isDirty);
  }, [isValid, isDirty, onValidationChange]);

  // === ESTADO PARA IMAGEN ===
  const [dragActive, setDragActive] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Actualiza preview cuando cambia el campo de imagen (FID o URL)
  const watchedImage = watch("field_imagen_del_lubricante");
  useEffect(() => {
    // Si tienes una URL directa desde Drupal, úsala. Si solo FID, puedes tener una función para generar URL.
    // Por ahora asumimos que result.data.url se guarda o se genera.
    // Si solo tienes FID, puedes dejar imagePreview como null hasta tener lógica para mostrarlo.
  }, [watchedImage]);

  // === UPLOAD A DRUPAL ===
  const uploadToDrupal = useCallback(
    async (file) => {
      setUploading(true);
      setUploadError(null);

      const formDataToUpload = new FormData();
      formDataToUpload.append("file", file);

      try {
        const URL =
          "https://lightcoral-emu-437776.hostingersite.com/web/api/lubricantes/upload-image";

        const response = await fetch(URL, {
          method: "POST",
          body: formDataToUpload,
          credentials: "include",
        });

        const result = await response.json();

        if (result.status === true) {
          const fid = result.data.fid;
          setValue("field_imagen_del_lubricante", fid, {
            shouldValidate: true,
            shouldDirty: true,
          });
          setImagePreview(result.data.url || result.data.relative_url);
          return fid;
        } else {
          throw new Error(result.message || "Error desconocido");
        }
      } catch (error) {
        console.error("❌ Error subiendo imagen:", error);
        setUploadError(error.message || "Error al subir la imagen");
        return null;
      } finally {
        setUploading(false);
      }
    },
    [setValue]
  );

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setUploadError("La imagen no puede exceder 3MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setUploadError("Solo se permiten imágenes (JPG, PNG, GIF, SVG)");
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
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleImageChange({ target: { files: e.dataTransfer.files } });
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setValue("field_imagen_del_lubricante", "", {
      shouldValidate: true,
      shouldDirty: true,
    });
    setUploadError(null);
  };

  // Imagen a mostrar (preview local o desde Drupal)
  const imageToShow =
    imagePreview ||
    initialData.field_imagen_del_lubricante ||
    initialData.imagen_del_lubricante;
  const submitForm = (data) => {
    const mappedData = {
      title: data.title,
      field_codigo: data.codigo,
      field_origen: data.origen,
      field_familia: data.familia || null,
      field_clasificacion: data.clasificacion,
      field_descripcion: data.descripcion || null,
      field_fabricante: data.fabricante,
      field_tipo_de_lubricante: data.tipo,
      field_lob: data.lob,
      field_empaque: data.empaque,
      field_galones_empaque: data.galones_empaque,
      field_especificaciones: data.especificaciones || null,
      field_imagen_del_lubricante: data.field_imagen_del_lubricante || null,
    };
    onSubmit(mappedData);
  };

  useEffect(() => {
    console.log("🔍 EDITING ITEM ID:", editingItem?.id);
    console.log("🔍 CURRENT ID pasado al schema:", editingItem?.id);
  }, [editingItem]);

  return (
    <form id={formId} onSubmit={handleSubmit(submitForm)}>
      <div
        style={{ display: "flex", gap: "16px" }}
        className="edit-form sections"
      >
        {/* COLUMNA IZQUIERDA */}
        <div style={{ width: "70%", display: "flex", flexDirection: "column", gap: "16px" }} className="section">
          <div style={{ display: "flex", gap: "16px" }}>
            <TextField
              required
              fullWidth
              label="Código"
              disabled={isViewMode || loading}
              variant="filled"
              {...register("codigo")}
              error={!!errors.codigo}
              helperText={errors.codigo?.message}
              sx={{
                ...(isViewMode && {
                  backgroundColor: "#f5f5f5",
                  "& .MuiInputBase-input": {
                    color: "#666",
                    WebkitTextFillColor: "#666",
                  },
                }),
              }}
            />

            <TextField
              required
              fullWidth
              label="Nombre Comercial"
              disabled={isViewMode || loading}
              variant="filled"
              {...register("title")}
              error={!!errors.title}
              helperText={errors.title?.message}
              sx={{
                mb: 2,
                ...(isViewMode && {
                  backgroundColor: "#f5f5f5",
                  "& .MuiInputBase-input": { color: "#666" },
                }),
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "16px" }}>
            <GenericSelect
              required
              name="origen"
              label="Origen"
              value={getValues("origen") || ""}
              onChange={(e) =>
                setValue("origen", e.target.value, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              optionsOverride={[
                { value: "Nacional", label: "Nacional" },
                { value: "Importado", label: "Importado" },
              ]}
              labelField="name"
              valueField="id"
              fullWidth
              disabled={isViewMode || loading}
              returnLabel={true} // Si quieres que guarde el nombre y no el id
              sx={{
                ...(isViewMode && {
                  "& .MuiSelect-select": { color: "#666 !important" },
                  "& .MuiSvgIcon-root": { color: "#999 !important" },
                }),
              }}
            />

            <TextField
              fullWidth
              label="Familia"
              disabled={isViewMode || loading}
              variant="filled"
              {...register("familia")}
              error={!!errors.familia}
              helperText={errors.familia?.message}
              sx={{
                ...(isViewMode && {
                  backgroundColor: "#f5f5f5",
                  "& .MuiInputBase-input": {
                    color: "#666",
                    WebkitTextFillColor: "#666",
                  },
                }),
              }}
            />

            <GenericSelect
              required
              name="clasificacion"
              label="Clasificación"
              value={getValues("clasificacion") || ""}
              onChange={(e) =>
                setValue("clasificacion", e.target.value, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              endpoint="/api/listas/clasificaciones"
              labelField="name"
              valueField="id"
              fullWidth
              disabled={isViewMode || loading}
              returnLabel={true}
              sx={{
                ...(isViewMode && {
                  "& .MuiSelect-select": {
                    color: "#666 !important",
                    WebkitTextFillColor: "#666",
                  },
                  "& .MuiSvgIcon-root": { color: "#999 !important" },
                }),
              }}
            />
          </div>

          <TextField
            fullWidth
            label="Descripción"
            multiline
            disabled={isViewMode || loading}
            variant="filled"
            {...register("descripcion")}
            error={!!errors.descripcion}
            helperText={errors.descripcion?.message}
            sx={{
              mb: 2,
              ...(isViewMode && {
                backgroundColor: "#f5f5f5",
                "& .MuiInputBase-input": {
                  color: "#666",
                  WebkitTextFillColor: "#666",
                },
              }),
            }}
          />

          <div style={{ display: "flex", gap: "16px" }}>
            <div style={{ width: "calc(100% / 3)" }}>
              <GenericSelect
                required
                name="fabricante"
                label="Fabricante"
                value={getValues("fabricante") || ""}
                onChange={(e) =>
                  setValue("fabricante", e.target.value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                endpoint="/api/listas/fabricantes_de_lubricantes"
                labelField="name"
                valueField="id"
                fullWidth
                disabled={isViewMode || loading}
                returnLabel={true}
                sx={{
                  ...(isViewMode && {
                    "& .MuiSelect-select": { color: "#666 !important" },
                    "& .MuiSvgIcon-root": { color: "#999 !important" },
                  }),
                }}
              />
            </div>

            <div style={{ width: "calc(100% / 3)" }}>
              <GenericSelect
                required
                name="tipo"
                label="Tipo de Lubricante"
                value={getValues("tipo") || ""}
                onChange={(e) =>
                  setValue("tipo", e.target.value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                endpoint="/api/listas/tipos_de_lubricante"
                labelField="name"
                valueField="id"
                fullWidth
                disabled={isViewMode || loading}
                returnLabel={true}
                sx={{
                  ...(isViewMode && {
                    "& .MuiSelect-select": { color: "#666 !important" },
                    "& .MuiSvgIcon-root": { color: "#999 !important" },
                  }),
                }}
              />
            </div>

            <div style={{ width: "calc(100% / 3)" }}>
              <GenericSelect
                required
                name="lob"
                label="LOB"
                value={getValues("lob") || ""}
                onChange={(e) =>
                  setValue("lob", e.target.value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                endpoint="/api/listas/lob"
                labelField="name"
                valueField="id"
                fullWidth
                disabled={isViewMode || loading}
                returnLabel={true}
                sx={{
                  ...(isViewMode && {
                    "& .MuiSelect-select": { color: "#666 !important" },
                    "& .MuiSvgIcon-root": { color: "#999 !important" },
                  }),
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "16px" }}>
            <GenericSelect
              required
              name="empaque"
              label="Empaque"
              value={getValues("empaque") || ""}
              onChange={(e) =>
                setValue("empaque", e.target.value, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              endpoint="/api/listas/empaques"
              labelField="name"
              valueField="id"
              fullWidth
              disabled={isViewMode || loading}
              returnLabel={true}
              sx={{
                ...(isViewMode && {
                  "& .MuiSelect-select": { color: "#666 !important" },
                  "& .MuiSvgIcon-root": { color: "#999 !important" },
                }),
              }}
            />

            <TextField
              required
              fullWidth
              label="Galones / Empaque"
              type="number"
              disabled={isViewMode || loading}
              variant="filled"
              {...register("galones_empaque")}
              error={!!errors.galones_empaque}
              helperText={errors.galones_empaque?.message}
              sx={{
                ...(isViewMode && {
                  backgroundColor: "#f5f5f5",
                  "& .MuiInputBase-input": {
                    color: "#666",
                    WebkitTextFillColor: "#666",
                  },
                }),
              }}
            />
          </div>

          <TextField
            fullWidth
            label="Especificaciones Técnicas"
            multiline
            disabled={isViewMode || loading}
            variant="filled"
            {...register("especificaciones")}
            error={!!errors.especificaciones}
            helperText={errors.especificaciones?.message}
            sx={{
              ...(isViewMode && {
                backgroundColor: "#f5f5f5",
                "& .MuiInputBase-input": {
                  color: "#666",
                  WebkitTextFillColor: "#666",
                },
              }),
            }}
          />
        </div>

        {/* COLUMNA DERECHA: IMAGEN */}
        <div style={{ width: "30%" }} className="section">
          <Paper
            variant="outlined"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() =>
              !isViewMode && document.getElementById("imageFileInput").click()
            }
            sx={{
              textAlign: "center",
              height: "100%",
              border: dragActive ? "2px dashed #3A4D9C" : "2px dashed #3A4D9C",
              backgroundColor: dragActive
                ? "#3a4e9c3b"
                : imageToShow
                ? "none"
                : "#3a4e9c15",
              transition: "all 0.3s ease",
              cursor: isViewMode ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <input
              id="imageFileInput"
              type="file"
              accept="image/*"
              hidden
              onChange={handleImageChange}
              disabled={isViewMode || loading}
            />

            {uploading ? (
              <Stack spacing={2} sx={{ py: 4 }}>
                <CircularProgress size={40} />
                <Typography variant="body2" color="text.secondary">
                  Subiendo imagen...
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Por favor espera
                </Typography>
              </Stack>
            ) : imageToShow ? (
              <Box>
                <Avatar
                  src={imageToShow}
                  variant="rounded"
                  sx={{ height: "auto", width: "100%", objectFit: "contain" }}
                />
                {uploadError && (
                  <Alert severity="error" sx={{ mt: 2 }} variant="outlined">
                    {uploadError}
                  </Alert>
                )}
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

          {errors.field_imagen_del_lubricante && (
            <Typography
              color="error"
              variant="caption"
              sx={{ mt: 1, display: "block" }}
            >
              {errors.field_imagen_del_lubricante.message}
            </Typography>
          )}
        </div>
      </div>
    </form>
  );
};

export default React.memo(LubricanteFormContent);
