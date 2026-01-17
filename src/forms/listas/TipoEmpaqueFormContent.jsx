// src/forms/TipoFormContent.jsx
import React, { useMemo, useEffect } from "react";
import { TextField } from "@mui/material";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { tipoEmpaqueValidationSchema } from "../../validations/listas/tipoEmpaqueSchema";

const TipoFormContent = ({
  formId = "empaque-form",
  formData: initialData = {},
  isViewMode = false,
  loading = false,
  onValidationChange,
  onSubmit,
  backendErrors = null,
}) => {
  // ===== Validation =====
  const validationSchema = useMemo(() => tipoEmpaqueValidationSchema(), []);

  // ✅ resolver memorizado
  const resolver = useMemo(
    () => yupResolver(validationSchema),
    [validationSchema]
  );

  // ===== Form =====
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isValid, isDirty },
  } = useForm({
    resolver: isViewMode ? undefined : resolver,
    mode: isViewMode ? "onSubmit" : "onChange",
    defaultValues: {
      name: initialData?.name || "",
    },
  });

  // ===== Sync initial data (edit / view) =====
  useEffect(() => {
    reset({ name: initialData?.name || "" });
  }, [initialData?.name, reset]);

  // 🔄 informar estado al padre
  useEffect(() => {
    onValidationChange?.(isValid, isDirty);
  }, [isValid, isDirty, onValidationChange]);

  useEffect(() => {
    if (!backendErrors) return;

    Object.entries(backendErrors).forEach(([field, messages]) => {
      setError(field, {
        type: "server",
        message: messages[0],
      });
    });
  }, [backendErrors, setError]);

  // ===== Submit =====
  const submitForm = (data) => {
    console.log("SUBMIT EMPAQUE FORM:", data);
    onSubmit?.(data);
  };

  return (
    <form id={formId} onSubmit={handleSubmit(submitForm)}>
      <TextField
        required
        fullWidth
        label="Tipo de empaque"
        variant="filled"
        disabled={isViewMode || loading}
        {...register("name")}
        error={!!errors.name}
        helperText={errors.name?.message}
      />
    </form>
  );
};

export default React.memo(TipoFormContent);
