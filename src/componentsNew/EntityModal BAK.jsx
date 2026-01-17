import { Dialog, Button, Box, IconButton, Typography } from "@mui/material";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";

export default function EntityModal({
  open,
  onClose,
  title,
  children,
  formId,
  isViewMode = false,
  submitDisabled = false,
}) {
  return (
    <Dialog
      open={open}
      onClose={(event, reason) => {
        if (reason === "backdropClick") return;
        onClose();
      }}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          maxHeight: "90vh",
          outline: "none",
          "&:focus-visible": { outline: "none" },
        },
      }}
      BackdropProps={{
        sx: {
          backgroundColor: "#3A4D9C40",
          backdropFilter: "blur(2.5px)",
        },
      }}
    >
      {/* ======== HEADER ========= */}
      <Box
        sx={{
          backgroundColor: "#3A4D9C40",
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
            color: "#3A4D9C",
          }}
        >
          {title}
        </Typography>

        <IconButton onClick={onClose}>
          <CloseOutlinedIcon sx={{ fontSize: ".85em" }} />
        </IconButton>
      </Box>

      {/* ======== CONTENIDO ========= */}
      <Box
        sx={{ padding: 2, display: "flex", flexDirection: "column", gap: 2 }}
      >
        {/* ======== CONTENT ========= */}
        <Box sx={{ flex: 1, overflowY: "auto" }}>{children}</Box>

        {/* ======== ACTIONS ========= */}

        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 2,
          }}
        >
          <Button
            variant={isViewMode ? "contained" : "text"}
            onClick={onClose}
            color="primary"
          >
            {isViewMode ? "Cerrar" : "Cancelar"}
          </Button>

          {!isViewMode && (
            <Button
              type="submit"
              form={formId}
              variant="contained"
              disabled={submitDisabled}
            >
              Guardar
            </Button>
          )}
        </Box>
      </Box>
    </Dialog>
  );
}
