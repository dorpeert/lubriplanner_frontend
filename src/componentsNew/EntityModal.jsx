import React from "react";
import { Dialog, Button, Box, IconButton, Typography } from "@mui/material";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";

/**
 * EntityModal (refactor)
 *
 * Props principales:
 * - open: boolean
 * - onClose: () => void
 * - title: ReactNode
 * - children: ReactNode
 * - formId: string (para que el botón Guardar dispare submit del form externo)
 *
 * UX:
 * - Header fijo
 * - Footer fijo (acciones)
 * - Solo el contenido central hace scroll
 *
 * Size:
 * - Acepta: "xs" | "sm" | "md" | "lg" | "xl" | false
 * - También acepta estilo CustomModal: "M" | "L"
 */
const SIZE_MAP = {
  M: "md",
  L: "lg",
};

export default function EntityModal({
  open,
  onClose,
  title,
  children,
  formId,

  // comportamiento/form
  isViewMode = false,
  submitDisabled = false,

  // nuevo
  size = "md", // "xs" | "sm" | "md" | "lg" | "xl" | false | "M" | "L"
  hideActions = false,
  actions = null, // si lo pasas, reemplaza el footer por completo

  // labels (opcionales)
  cancelLabel = "Cancelar",
  closeLabel = "Cerrar",
  saveLabel = "Guardar",

  // estilo (por si quieres sobreescribir sin tocar el componente)
  paperSx = {},
  headerSx = {},
  contentSx = {},
  footerSx = {},

  // si quieres permitir cierre por backdrop en algún caso
  disableBackdropClose = true,

  // ✅ NUEVO (opcionales, no rompen nada)
  onPrimaryAction = null, // si existe, el botón primario llama esto en vez de submit del form
  primaryActionLoading = false, // deshabilita botón primario
}) {
  const resolvedMaxWidth =
    typeof size === "string" ? SIZE_MAP[size] ?? size : size;

  const handleClose = (event, reason) => {
    if (disableBackdropClose && reason === "backdropClick") return;
    onClose?.();
  };

  const primaryDisabled = submitDisabled || primaryActionLoading;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth={resolvedMaxWidth}
      PaperProps={{
        sx: {
          backgroundColor: "#fff",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          outline: "none",
          "&:focus-visible": { outline: "none" },
          ...paperSx,
        },
      }}
      BackdropProps={{
        sx: {
          backgroundColor: "#3a4d9cc7",
          backdropFilter: "blur(2.5px)",
        },
      }}
    >
      {/* ======== HEADER (FIJO) ========= */}
      <Box
        sx={{
          flexShrink: 0,
          backgroundColor: "#3A4D9C40",
          p: 1,
          display: "flex",
          alignItems: "center",
          borderRadius: "8px 8px 0 0",
          ...headerSx,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            flex: 1,
            textAlign: "center",
            color: "#3A4D9C",
          }}
        >
          {title}
        </Typography>

        <IconButton onClick={onClose}>
          <CloseOutlinedIcon sx={{ fontSize: ".85em" }} />
        </IconButton>
      </Box>

      {/* ======== CONTENT (SCROLL) ========= */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          p: 2,
          ...contentSx,
        }}
      >
        {children}
      </Box>

      {/* ======== FOOTER (FIJO) ========= */}
      {!hideActions && (
        <Box
          sx={{
            flexShrink: 0,
            p: 2,
            display: "flex",
            justifyContent: "flex-end",
            gap: 2,
            borderTop: "1px solid",
            borderColor: "divider",
            backgroundColor: "#f5f5f5",
            ...footerSx,
          }}
        >
          {actions ? (
            actions
          ) : (
            <>
              <Button
                variant={isViewMode ? "contained" : "text"}
                onClick={onClose}
                color="primary"
              >
                {isViewMode ? closeLabel : cancelLabel}
              </Button>

              {!isViewMode && (
                <>
                  {onPrimaryAction ? (
                    <Button
                      variant="contained"
                      disabled={primaryDisabled}
                      onClick={onPrimaryAction}
                    >
                      {primaryActionLoading ? "Procesando..." : saveLabel}
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      form={formId}
                      variant="contained"
                      disabled={primaryDisabled}
                    >
                      {primaryActionLoading ? "Procesando..." : saveLabel}
                    </Button>
                  )}
                </>
              )}
            </>
          )}
        </Box>
      )}
    </Dialog>
  );
}
