import { useState } from "react";
import apiClient from "../api/apiClient";
import normalizeApiError from "../utils/normalizeApiError";

export default function useEntityForm({
  endpoint,
  messages = {
    createSuccess: "Creado correctamente",
    editSuccess: "Actualizado correctamente",
  },
  onSuccess,
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create"); // create | edit | view
  const [loading, setLoading] = useState(false);
  const [backendErrors, setBackendErrors] = useState(null);
  const [formData, setFormData] = useState(null);
  const [entityId, setEntityId] = useState(null);

  const [isValid, setIsValid] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // =========================
  // MODAL CONTROL
  // =========================
  const openCreate = () => {
    setMode("create");
    setFormData(null);
    setEntityId(null);
    setBackendErrors(null);
    setOpen(true);
  };

  const openEdit = (data) => {
    const id = data?.tid ?? data?.id ?? null;
    setMode("edit");
    setEntityId(id);
    setFormData({ ...data, tid: id, id }); // dejamos ambos por compatibilidad
    setBackendErrors(null);
    setOpen(true);
  };

  const openView = (data) => {
    const id = data?.tid ?? data?.id ?? null;
    setMode("view");
    setEntityId(id);
    setFormData({ ...data, tid: id, id });
    setBackendErrors(null);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setFormData(null);
    setEntityId(null);
  };

  // =========================
  // FORM VALIDATION
  // =========================
  const onValidationChange = (valid, dirty) => {
    setIsValid(valid);
    setIsDirty(dirty);
  };

  // =========================
  // SNACKBAR
  // =========================
  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const closeSnackbar = () => setSnackbar((prev) => ({ ...prev, open: false }));

  // =========================
  // SUBMIT
  // =========================
  const submit = async (data) => {
    if (mode === "view") return;

    setLoading(true);

    try {
      if (mode === "create") {
        await apiClient.post(endpoint, data);
        showSnackbar(messages.createSuccess, "success");
      } else {
        await apiClient.post(`${endpoint}/${entityId}`, data, {
          headers: {
            "X-HTTP-Method-Override": "PATCH",
          },
        });
        showSnackbar(messages.editSuccess, "success");
      }

      setOpen(false);
      onSuccess?.();
    } catch (error) {
      const normalized = normalizeApiError(error);

      if (normalized.status === 422 && normalized.fieldErrors) {
        setBackendErrors(normalized.fieldErrors);
        return;
      }

      showSnackbar(normalized.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return {
    // state
    open,
    mode,
    loading,
    backendErrors,
    formData,

    // modal
    openCreate,
    openEdit,
    openView,
    close,

    // form
    submit,
    isValid,
    isDirty,
    onValidationChange,

    // snackbar
    snackbar,
    closeSnackbar,
  };
}
