import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Typography, CircularProgress} from "@mui/material";


import ComponenteFormContent from "../../../forms/ComponenteFormContent";
import apiListasClient from "../../../api/apiListasClient";

const BASE_URL = "https://lightcoral-emu-437776.hostingersite.com/web";

const mapComponenteDetalle = (item) => ({
  id: item.id,
  title: item.title,
  cliente: item.cliente,
  cliente_id: item.cliente_id,
  activo: item.activo,
  activo_id: item.activo_id,
  equipo: item.equipo,
  lubricante: item.lubricante,
  lubricante_id: item.lubricante_id,
  frecuencia_cambio: item.frecuencia_cambio,
  frecuencia_muestreo: item.frecuencia_muestreo,
  volumen_requerido: item.volumen_requerido,
  observaciones: item.observaciones,
});

export default function VerComponente() {
  const { slug } = useParams();
  const id = slug.split("-")[0];

  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiListasClient
      .get(`${BASE_URL}/api/componentes/${id}`)
      .then((res) => {
        const data = res.data?.data || res.data;
        setFormData(mapComponenteDetalle(data));
      })
      .catch(() => {
        setError("No se pudo cargar el componente.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" sx={{ mt: 4 }}>
        {error}
      </Typography>
    );
  }

  return (
      <ComponenteFormContent
        formData={formData}
        setFormData={setFormData}
        isViewMode={true}
      />
  );
}
