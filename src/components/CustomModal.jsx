// =======================================================
// CustomModal.jsx
// =======================================================
// Modal genérico avanzado
// Proyecto: LubriPlanner Avanzado
// =======================================================

// ==============================
// React
// ==============================
import React from "react";

// ==============================
// MUI
// ==============================
import {
  Dialog,
  Box,
  Typography,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
} from "@mui/material";

import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";

// =======================================================
// SIZE MAP
// =======================================================

/**
 * Define anchos explícitos por tamaño.
 * Se usan solo en desktop.
 */
const SIZE_MAP = {
  M: "45vw",
  L: "75vw",
};

// =======================================================
// VARIANT STYLES
// =======================================================

/**
 * Estilos visuales por variante.
 * Solo afectan presentación, NO lógica.
 */
const VARIANT_STYLES = {
  success: {
    headerBg: "#02542D40",
    accent: "#02542D",
    titleColor: "#02542D",
  },
  error: {
    headerBg: "#7F000040",
    accent: "#822525",
    titleColor: "#822525",
  },
  warning: {
    headerBg: "#52250440",
    accent: "#7D5C43",
    titleColor: "#7D5C43",
  },
  default: {
    headerBg: "#3A4D9C40",
    accent: "#3A4D9C",
    titleColor: "#3A4D9C",
  },
};

// =======================================================
// COMPONENT
// =======================================================

export default function CustomModal({
  open,
  onClose,

  // Header
  title,

  // Layout
  size = "M",
  variant = "default",

  // Content
  content,
  message,
  successMessage,
  errorMessage,
  code,

  // Actions
  actions = [],

  // State
  loading = false,

  // Behavior
  disableBackdropClick = true,
  disableEscapeKeyDown = true,
}) {
  // =====================================================
  // RESPONSIVE
  // =====================================================

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const width = isMobile ? "90vw" : SIZE_MAP[size] || SIZE_MAP.M;
  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.default;
  const isSpecialVariant = variant !== "default";

  // =====================================================
  // HANDLERS
  // =====================================================

  /**
   * Control centralizado de cierre.
   * Evita cierres accidentales.
   */
  const handleClose = (_, reason) => {
    if (disableBackdropClick && reason === "backdropClick") return;
    if (disableEscapeKeyDown && reason === "escapeKeyDown") return;
    onClose?.();
  };

  /**
   * Resuelve el variant de un botón de acción.
   * Extraído del JSX para claridad.
   */
  const resolveActionVariant = (action, index) => {
    if (action.variant) return action.variant;
    if (isSpecialVariant) return index === 0 ? "outlined" : "text";
    return "contained";
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth={false}
      PaperProps={{
        sx: {
          width,
          maxHeight: "90vh",
          outline: "none",
          "&:focus-visible": { outline: "none" },
        },
      }}
      BackdropProps={{
        sx: {
          backgroundColor: styles.headerBg,
          backdropFilter: "blur(2.5px)",
        },
      }}
    >
      {/* ===========================
          HEADER
      ============================ */}
      <Box
        sx={{
          backgroundColor: styles.headerBg,
          p: 1,
          display: "flex",
          alignItems: "center",
          borderRadius: "8px 8px 0 0",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            flex: 1,
            textAlign: "center",
            color: styles.titleColor,
          }}
        >
          {title}
        </Typography>

        <IconButton onClick={onClose} disabled={loading}>
          <CloseOutlinedIcon sx={{ fontSize: ".85em", color: styles.accent }} />
        </IconButton>
      </Box>

      {/* ===========================
          CONTENT
      ============================ */}
      <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
        {message && (
          <Typography textAlign="center" color="text.secondary">
            {message}
          </Typography>
        )}

        {successMessage && <Alert severity="success">{successMessage}</Alert>}
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

        {code && isSpecialVariant && (
          <Box textAlign="center" mt={2}>
            <Typography variant="h4" color={styles.accent}>
              {code}
            </Typography>
          </Box>
        )}

        {content}
      </Box>

      {/* ===========================
          ACTIONS
      ============================ */}
      {actions.length > 0 && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 2,
            p: 2,
          }}
        >
          {actions.map((action, index) => (
            <Button
              key={index}
              type={action.type}
              form={action.form}
              onClick={action.onClick}
              disabled={action.disabled || loading}
              variant={resolveActionVariant(action, index)}
            >
              {loading && action.type === "submit" ? (
                <>
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  Enviando...
                </>
              ) : (
                action.label
              )}
            </Button>
          ))}
        </Box>
      )}
    </Dialog>
  );
}
