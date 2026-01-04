import { useState } from "react";
import { Box, TextField, Alert } from "@mui/material";
import { requestPasswordReset } from "../api/drupalAuth";

export default function ForgotPasswordForm({
  formId,
  loading,
  setLoading,
  onMessage,
  onError,
}) {
  const [identifier, setIdentifier] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await requestPasswordReset(identifier);
      onMessage?.(
        response.message || "Si la cuenta existe, recibirás un correo."
      );
      setIdentifier("");
    } catch (err) {
      onError?.(err.message || "No fue posible procesar la solicitud.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      id={formId}
    >
        <TextField
          label="Correo o usuario"
          variant="filled"
          fullWidth
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          disabled={loading}
          autoFocus
          sx={{ my: 2 }}
        />
    </Box>
  );
}
