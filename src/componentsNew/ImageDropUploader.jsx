// src/components/ImageDropUploader.jsx
import React, { useMemo, useRef, useState, useCallback } from "react";
import {
  Paper,
  Stack,
  Typography,
  CircularProgress,
  Alert,
  Box,
  Avatar,
  IconButton,
  Tooltip,
} from "@mui/material";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import ClearIcon from "@mui/icons-material/Clear";

/**
 * Uploader reutilizable (click + drag&drop + preview + upload async + clear)
 */
export default function ImageDropUploader({
  // Data
  value = null, // URL actual (preview)
  disabled = false,

  // Upload
  onUpload, // async (file) => ({ url, fid, ... })
  onUploaded, // (result, file) => void
  onError, // (message, error) => void

  // Clear
  onClear,
  showClear = true,

  // UI
  height = 192,
  borderColor = "#3A4D9C",
  emptyBg = "#ffffff10",
  filledBg = "#ffffff00",
  accept = "image/*",
  maxSizeMB = 3,
  title = "Arrastra y suelta la imagen",
  subtitle = "o haz clic para seleccionar",
  caption = "JPG, PNG, GIF, SVG (Máx. 3MB)",

  // Preview rendering
  previewVariant = "img", // "img" | "avatar" | "file"
  objectFit = "contain", // "contain" | "cover"
  maxPreviewHeight = 96,

  // File
  fileName = "",

  // Styles
  sx = {},
}) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const bgColor = useMemo(() => {
    if (dragActive || value) return filledBg;
    return emptyBg;
  }, [dragActive, value, filledBg, emptyBg]);

  const pickFile = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const validateFile = (file) => {
    if (!file) return "No se recibió archivo";
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) return `La imagen supera ${maxSizeMB}MB`;
    return null;
  };

  const doUpload = useCallback(
    async (file) => {
      const validationError = validateFile(file);
      if (validationError) {
        setErrorMsg(validationError);
        onError?.(validationError, null);
        return;
      }

      if (typeof onUpload !== "function") {
        const msg = "Falta la prop onUpload(file)";
        setErrorMsg(msg);
        onError?.(msg, null);
        return;
      }

      setUploading(true);
      setErrorMsg(null);

      try {
        const result = await onUpload(file);
        onUploaded?.(result, file);
      } catch (err) {
        const msg = err?.message || "Error subiendo imagen";
        setErrorMsg(msg);
        onError?.(msg, err);
      } finally {
        setUploading(false);
      }
    },
    [maxSizeMB, onUpload, onUploaded, onError]
  );

  const handleInputChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    void doUpload(file);
    // permite re-seleccionar el mismo archivo
    e.target.value = "";
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    if (e.type === "dragover" || e.type === "dragenter") setDragActive(true);
    if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void doUpload(file);
  };

  return (
    <>
      <Paper
        variant="outlined"
        onClick={pickFile}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        sx={{
          width: "100%",
          p: 0.5,
          textAlign: "center",
          height,
          border: `2px dashed ${borderColor}`,
          bgcolor: bgColor,
          transition: "all 0.3s ease",
          cursor: disabled ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          ...sx,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          hidden
          onChange={handleInputChange}
        />

        {uploading ? (
          <Stack spacing={2} sx={{ alignItems: "center" }}>
            <CircularProgress size={48} thickness={4} />
            <Typography variant="body1">Subiendo imagen...</Typography>
          </Stack>
        ) : value ? (
          <Box
            sx={{
              position: "relative",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              alignContent: "center",
              justifyContent: "center",
            }}
          >
            {previewVariant === "file" ? (
              <Stack spacing={1} sx={{ alignItems: "center" }}>
                <AddPhotoAlternateIcon
                  sx={{ fontSize: 40, color: borderColor }}
                />
                <Typography variant="body2" sx={{ textAlign: "center" }}>
                  {fileName || "Archivo cargado"}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ textAlign: "center" }}
                >
                  Haz clic para reemplazar el archivo
                </Typography>
              </Stack>
            ) : previewVariant === "avatar" ? (
              <Avatar
                src={value}
                variant="rounded"
                sx={{ width: "100%", height: "100%", objectFit }}
              />
            ) : (
              <Box
                component="img"
                src={value}
                alt="Imagen"
                sx={{
                  width: "100%",
                  height: "auto",
                  maxHeight: maxPreviewHeight,
                  objectFit,
                  mt: 1,
                }}
              />
            )}

            {!disabled && showClear && typeof onClear === "function" && (
              <Tooltip arrow placement="left" title="Eliminar imagen">
                <IconButton
                  size="small"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                  }}
                  sx={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    bgcolor: "#ffffff80",
                    borderRadius: "0px 8px",
                  }}
                >
                  <ClearIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        ) : (
          <Stack spacing={1} sx={{ alignItems: "center" }}>
            <AddPhotoAlternateIcon sx={{ fontSize: 40, color: borderColor }} />
            <Typography
              variant="subtitle1"
              color="text.secondary"
              sx={{ lineHeight: 1.2 }}
            >
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {caption}
            </Typography>
          </Stack>
        )}
      </Paper>

      {errorMsg && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {errorMsg}
        </Alert>
      )}
    </>
  );
}
