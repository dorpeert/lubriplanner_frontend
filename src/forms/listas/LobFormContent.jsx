// src/forms/LobFormContent.jsx
import React, { useMemo, useEffect } from "react";
import { TextField } from "@mui/material";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { lobValidationSchema } from "../../validations/listas/lobSchema";

const LobFormContent = ({
  formId,
  formData: initialData = {},
  isViewMode = false,
  loading = false,
  onValidationChange,
  onSubmit,
}) => {
  // ✅ schema con referencia estable
  const validationSchema = useMemo(() => lobValidationSchema(), []);

  // ✅ resolver memorizado
  const resolver = useMemo(
    () => yupResolver(validationSchema),
    [validationSchema]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid, isDirty },
  } = useForm({
    resolver,
    mode: "onChange",
    defaultValues: { name: initialData.name || "" },
  });

  // 🔄 reset al cambiar item
  useEffect(() => {
    reset({ name: initialData.name || "" });
  }, [initialData, reset]);

  // 🔄 informar estado al padre
  useEffect(() => {
    onValidationChange?.(isValid, isDirty);
  }, [isValid, isDirty, onValidationChange]);

  const submitForm = (data) => {
    console.log("SUBMIT LOB FORM:", data);
    onSubmit(data);
  };

  return (
    <form id={formId} onSubmit={handleSubmit(submitForm)}>
      <TextField
        required
        fullWidth
        label="Nombre del LOB"
        variant="filled"
        disabled={isViewMode || loading}
        {...register("name")}
        error={!!errors.name}
        helperText={errors.name?.message}
      />
    </form>
  );
};

export default React.memo(LobFormContent);
