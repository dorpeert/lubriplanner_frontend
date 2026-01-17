// src/forms/LubricanteFormContent.jsx
import React, { useMemo, useEffect, useState, useCallback } from "react";
import {
  Box,
  Paper,
  Avatar,
  Stack,
  Typography,
  CircularProgress,
  Alert,
  TextField,
} from "@mui/material";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { lubricanteValidationSchema } from "../validations/lubricanteSchema";
import GenericSelect from "../componentsNew/GenericSelect";
import ImageDropUploader from "../componentsNew/ImageDropUploader";
import AssociatedComponentsButton from "../componentsNew/AssociatedComponentsButton";

const LubricanteFormContent = ({
  formId = "lubricante-form",
  formData: initialData = {},
  isViewMode = false,
  loading = false,
  onValidationChange,
  editingItem = null,
  onSubmit,
  backendErrors = null,
}) => {
  // ======================
  // Validation
  // ======================
  const currentId = editingItem?.id ?? initialData?.id ?? null;
  const validationSchema = useMemo(
    () => lubricanteValidationSchema(currentId),
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
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    setError,
    formState: { errors, isValid, isDirty },
  } = useForm({
    resolver: isViewMode ? undefined : resolver,
    mode: isViewMode ? "onSubmit" : "onChange",
    defaultValues: {
      codigo: "",
      title: "",
      origen: "",
      familia: "",
      clasificacion: "",
      descripcion: "",
      fabricante: "",
      tipo: "",
      lob: "",
      empaque: "",
      galones_empaque: "",
      especificaciones: "",
      field_imagen_del_lubricante: "",
    },
  });

  // ======================
  // Sync initial data (edit / view)
  // ======================
  useEffect(() => {
    reset({
      codigo: initialData?.codigo || initialData?.field_codigo || "",
      title: initialData?.title || "",
      origen: initialData?.origen || initialData?.field_origen || "",
      familia: initialData?.familia || initialData?.field_familia || "",
      clasificacion:
        initialData?.clasificacion || initialData?.field_clasificacion || "",
      descripcion:
        initialData?.descripcion || initialData?.field_descripcion || "",
      fabricante:
        initialData?.fabricante || initialData?.field_fabricante || "",
      tipo:
        initialData?.tipo ||
        initialData?.field_tipo_de_lubricante ||
        initialData?.tipo_lubricante ||
        "",
      lob: initialData?.lob || initialData?.field_lob || "",
      empaque: initialData?.empaque || initialData?.field_empaque || "",
      galones_empaque:
        initialData?.galones_empaque ||
        initialData?.field_galones_empaque ||
        "",
      especificaciones:
        initialData?.especificaciones ||
        initialData?.field_especificaciones ||
        "",
      field_imagen_del_lubricante:
        initialData?.field_imagen_del_lubricante ||
        initialData?.imagen_del_lubricante ||
        "",
    });

    const imageUrl = initialData?.imagen_del_lubricante || null;

    if (typeof imageUrl === "string" && imageUrl.startsWith("http")) {
      setImagePreview(imageUrl);
    } else if (!imageUrl) {
      setImagePreview(null);
    }
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

  // ======================
  // Image state
  // ======================

  const [imagePreview, setImagePreview] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);

  // ======================
  // Submit (map -> Drupal fields)
  // ======================
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

    onSubmit?.(mappedData);
  };

  useEffect(() => {
    if (!editingItem?.id) return;
    console.log("🔍 EDITING ITEM ID:", editingItem.id);
  }, [editingItem]);

  return (
    <>
      <form id={formId} onSubmit={handleSubmit(submitForm)}>
        <div
          style={{ display: "flex", gap: "16px" }}
          className="edit-form sections"
        >
          {/* COLUMNA IZQUIERDA */}
          <div
            style={{
              width: "70%",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
            className="section"
          >
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
                fullWidth
                disabled={isViewMode || loading}
                returnLabel
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
                fullWidth
                disabled={isViewMode || loading}
                returnLabel
                sx={{
                  ...(isViewMode && {
                    "& .MuiSelect-select": {
                      color: "#666 !important",
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
                  fullWidth
                  disabled={isViewMode || loading}
                  returnLabel
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
                  fullWidth
                  disabled={isViewMode || loading}
                  returnLabel
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
                  fullWidth
                  disabled={isViewMode || loading}
                  returnLabel
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
                fullWidth
                disabled={isViewMode || loading}
                returnLabel
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
              Imagen del lubricante
            </Typography>

            <ImageDropUploader
              value={imagePreview}
              disabled={isViewMode || loading}
              height={392}
              maxPreviewHeight={380}
              previewVariant="img"
              objectFit="contain"
              title="Arrastra y suelta la imagen"
              subtitle="o haz clic para seleccionar"
              caption="JPG, PNG, GIF, SVG (Máx. 3MB)"
              onUpload={async (file) => {
                setImageUploading(true);
                try {
                  const formDataToUpload = new FormData();
                  formDataToUpload.append("file", file);

                  const URL =
                    "https://lightcoral-emu-437776.hostingersite.com/web/api/lubricantes/upload-image";

                  const response = await fetch(URL, {
                    method: "POST",
                    body: formDataToUpload,
                    credentials: "include",
                  });

                  const result = await response.json();

                  if (result?.status === true) {
                    return {
                      fid: result?.data?.fid ?? null,
                      url:
                        result?.data?.url ?? result?.data?.relative_url ?? null,
                    };
                  }

                  throw new Error(result?.message || "Error desconocido");
                } finally {
                  setImageUploading(false);
                }
              }}
              onUploaded={(result) => {
                // ✅ guardar FID en el campo que ya usas para enviar al backend
                if (result?.fid) {
                  setValue("field_imagen_del_lubricante", String(result.fid), {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                }

                // ✅ preview
                if (result?.url) setImagePreview(result.url);
              }}
              onClear={() => {
                setImagePreview(null);
                setValue("field_imagen_del_lubricante", "", {
                  shouldValidate: true,
                  shouldDirty: true,
                });
              }}
              onError={(msg) => {
                console.error("❌ Error subiendo imagen:", msg);
              }}
            />

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
      <AssociatedComponentsButton
        label="Ver componentes"
        params={{ lubricante: currentId }}
      />
    </>
  );
};

export default React.memo(LubricanteFormContent);
