import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  Box,
  Typography,
  TextField,
  CircularProgress,
  Button,
  Divider,
  FormControlLabel,
  Switch,
} from "@mui/material";
import apiClient from "../api/apiClient";
import axios from "axios";
import GenericSelect from "../componentsNew/GenericSelect";
import ImageDropUploader from "../componentsNew/ImageDropUploader";

const TIPOS_SERVICIOS_ENDPOINT = "/api/listas/tipos_de_servicios";

function toTextValue(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);

  // Si GenericSelect devuelve objeto {value,label} o {label,...}
  if (typeof v === "object") {
    if (typeof v.label === "string") return v.label;
    if (typeof v.value === "string") return v.value;
    if (typeof v.name === "string") return v.name;
  }

  // Si devuelve array (multi select por error o config)
  if (Array.isArray(v)) {
    const first = v[0];
    return toTextValue(first);
  }

  return "";
}

export default function ServicioFormContent({
  mode = "create", // create | recalcular | completar | informe | view
  formData = {}, // servicio seleccionado (si aplica)
  isViewMode = false,

  // para create:
  componenteId = null,

  // salida del payload
  onPayloadChange,
  onValidationChange, // opcional si quieres deshabilitar Guardar desde afuera
}) {
  const payloadCbRef = useRef(onPayloadChange);
  const validationCbRef = useRef(onValidationChange);

  useEffect(() => {
    payloadCbRef.current = onPayloadChange;
  }, [onPayloadChange]);

  useEffect(() => {
    validationCbRef.current = onValidationChange;
  }, [onValidationChange]);

  const [loadingTipos, setLoadingTipos] = useState(false);
  const [tipos, setTipos] = useState([]);

  // draft local (solo campos del modo actual)
  const [draft, setDraft] = useState(() => initialDraft(mode, formData));

  // reset al cambiar modo/servicio
  useEffect(() => {
    setDraft(initialDraft(mode, formData));
  }, [mode, formData?.id]);

  // carga taxonomía solo cuando haga falta
  //const loadTipos = useCallback(async () => {
  //  setLoadingTipos(true);
  //  try {
  //    const res = await apiClient.get(TIPOS_SERVICIOS_ENDPOINT, {
  //      params: { "page[limit]": 200, sort: "name" },
  //    });
  //    const data = Array.isArray(res.data)
  //      ? res.data
  //      : Array.isArray(res.data?.data)
  //      ? res.data.data
  //      : [];
  //    setTipos(data);
  //  } catch (e) {
  //    console.error("❌ Error cargando tipos_de_servicios:", e);
  //    setTipos([]);
  //  } finally {
  //    setLoadingTipos(false);
  //  }
  //}, []);

  const loadTipos = useCallback(async () => {
    setLoadingTipos(true);
    try {
      // ✅ Nuevo requerimiento: solo 2 tipos fijos
      setTipos([
        { value: "lubricacion", label: "Lubricación" },
        { value: "muestreo", label: "Muestreo" },
      ]);
    } finally {
      setLoadingTipos(false);
    }
  }, []);

  useEffect(() => {
    if (mode === "create" && tipos.length === 0) {
      loadTipos();
    }
  }, [mode, tipos.length, loadTipos]);

  // cada vez que draft cambia, notificar arriba
  useEffect(() => {
    const payload = buildPayload(mode, draft, formData, componenteId);
    payloadCbRef.current?.(payload);

    const valid = validate(mode, draft, componenteId);
    validationCbRef.current?.(valid);
  }, [mode, draft, componenteId]);

  const setField = (key, value) => {
    setDraft((p) => ({ ...p, [key]: value }));
  };

  // =========================
  // UI por modo
  // =========================
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {mode === "create" && (
        <>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Nuevo servicio
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Selecciona el tipo de servicio. Se guardará como texto (nombre del
            término).
          </Typography>

          <GenericSelect
            required
            name="tipo_servicio"
            label="Tipo de servicio"
            endpoint="/api/listas/tipos_de_servicios"
            value={draft.tipo_servicio || ""}
            onChange={(e) => setField("tipo_servicio", e.target.value)}
            disabled={isViewMode}
            fullWidth
            returnLabel
          />
        </>
      )}

      {mode === "recalcular" && (
        <>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Recalcular servicio
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Ingresa el trabajo real (horas) para recalcular la fecha del próximo
            servicio.
          </Typography>

          <TextField
            label="Trabajo real (horas)"
            type="number"
            value={draft.trabajo_real ?? ""}
            onChange={(e) => setField("trabajo_real", e.target.value)}
            fullWidth
            disabled={isViewMode}
          />
        </>
      )}

      {mode === "notificar" && (
        <Box sx={{ py: 2 }}>
          <Typography variant="h6" gutterBottom>
            Confirmar notificación
          </Typography>

          <Typography variant="body1">
            ¿Seguro que desea enviar la notificación ahora?
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Esta acción enviará un correo electrónico al cliente y cambiará el
            estado del servicio a <strong>Notificado</strong>.
          </Typography>
        </Box>
      )}

      {mode === "completar" && (
        <>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Completar servicio
          </Typography>

          <TextField
            label="Responsable"
            value={draft.responsable || ""}
            onChange={(e) => setField("responsable", e.target.value)}
            fullWidth
            disabled={isViewMode}
          />

          <FormControlLabel
            control={
              <Switch
                checked={!!draft.notificar_al_cliente}
                onChange={(e) =>
                  setField("notificar_al_cliente", e.target.checked)
                }
                disabled={isViewMode}
              />
            }
            label="Notificar al cliente"
          />

          <TextField
            label="Observaciones"
            value={draft.observaciones || ""}
            onChange={(e) => setField("observaciones", e.target.value)}
            fullWidth
            multiline
            minRows={3}
            disabled={isViewMode}
          />

          <Divider />

          {/* Por ahora: FID manual. Luego lo conectamos a uploader real */}
          <Typography variant="body2" color="text.secondary">
            Adjuntos (por ahora usando FID)
          </Typography>

          <TextField
            label="firma_fid (opcional)"
            type="number"
            value={draft.firma_fid || ""}
            onChange={(e) => setField("firma_fid", e.target.value)}
            fullWidth
            disabled={isViewMode}
          />

          <TextField
            label="soporte_fid (opcional)"
            type="number"
            value={draft.soporte_fid || ""}
            onChange={(e) => setField("soporte_fid", e.target.value)}
            fullWidth
            disabled={isViewMode}
          />
        </>
      )}

      {mode === "informe" && (
        <ImageDropUploader
          value={draft.informe_url || null}
          fileName={draft.informe_name || ""}
          disabled={isViewMode}
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          maxSizeMB={12}
          title="Arrastra y suelta el informe"
          subtitle="o haz clic para seleccionar"
          caption="PDF o Word (Máx. 20MB)"
          previewVariant="file"
          onUpload={async (file) => {
            const form = new FormData();
            form.append("file", file);

            try {
              const token = localStorage.getItem("access_token");

              const res = await axios.post(
                "https://lightcoral-emu-437776.hostingersite.com/web/api/servicios/upload-informe",
                form,
                {
                  headers: {
                    Accept: "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    // ✅ NO pongas Content-Type aquí.
                    // Axios lo pone con boundary automáticamente.
                  },
                }
              );

              const fid = res?.data?.data?.fid;
              const filename = res?.data?.data?.filename || file.name;

              if (!fid) {
                console.log("UPLOAD RESPONSE:", res?.data);
                throw new Error(
                  res?.data?.message || "Respuesta inválida del servidor"
                );
              }

              return { fid, name: filename };
            } catch (e) {
              console.log("UPLOAD ERROR:", e?.response?.data);
              throw e;
            }
          }}
          onUploaded={(result) => {
            setField("informe_fid", result.fid);
            setField("informe_url", result.url); // solo para mostrar "archivo cargado"
            setField("informe_name", result.name); // para texto
          }}
          onClear={() => {
            setField("informe_fid", null);
            setField("informe_url", null);
            setField("informe_name", "");
          }}
        />
      )}

      {mode === "view" && (
        <>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Ver servicio
          </Typography>

          <TextField
            label="N° Servicio"
            value={formData?.numero_servicio || ""}
            fullWidth
            disabled
          />
          <TextField
            label="Tipo"
            value={formData?.tipo_servicio || ""}
            fullWidth
            disabled
          />
          <TextField
            label="Estado"
            value={formData?.estado || ""}
            fullWidth
            disabled
          />
          <TextField
            label="Fecha próximo servicio"
            value={formData?.fecha_proximo_servicio || ""}
            fullWidth
            disabled
          />
          <TextField
            label="Observaciones"
            value={formData?.observaciones || ""}
            fullWidth
            disabled
            multiline
            minRows={3}
          />
        </>
      )}
    </Box>
  );
}

function initialDraft(mode, formData) {
  switch (mode) {
    case "create":
      return { tipo_servicio: "" };
    case "recalcular":
      return { trabajo_real: "" };
    case "completar":
      return {
        responsable: formData?.responsable || "",
        notificar_al_cliente: !!formData?.notificar_al_cliente,
        observaciones: formData?.observaciones || "",
        firma_fid: "",
        soporte_fid: "",
      };
    case "informe":
      return { informe_fid: "" };
    default:
      return {};
  }
}

function buildPayload(mode, draft, formData, componenteId) {
  if (mode === "create") {
    return {
      componente: componenteId ? Number(componenteId) : null,
      tipo_servicio: toTextValue(draft.tipo_servicio).trim(),
    };
  }
  if (mode === "recalcular") {
    return {
      trabajo_real:
        draft.trabajo_real === "" ? null : Number(draft.trabajo_real),
    };
  }
  if (mode === "completar") {
    return {
      responsable: (draft.responsable || "").trim(),
      notificar_al_cliente: !!draft.notificar_al_cliente,
      observaciones: (draft.observaciones || "").trim(),
      firma_fid: draft.firma_fid === "" ? null : Number(draft.firma_fid),
      soporte_fid: draft.soporte_fid === "" ? null : Number(draft.soporte_fid),
    };
  }
  if (mode === "informe") {
    return {
      informe_fid: draft.informe_fid === "" ? null : Number(draft.informe_fid),
    };
  }
  return {};
}

function validate(mode, draft, componenteId) {
  if (mode === "create") {
    return !!componenteId && !!toTextValue(draft.tipo_servicio).trim();
  }
  if (mode === "recalcular") {
    const n = Number(draft.trabajo_real);
    return Number.isFinite(n);
  }
  if (mode === "completar") {
    return !!(draft.responsable || "").trim();
  }
  if (mode === "informe") {
    const n = Number(draft.informe_fid);
    return Number.isFinite(n) && n > 0;
  }
  return true;
}
