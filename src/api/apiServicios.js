// src/api/apiServicios.js
import apiListasClient from "../api/apiListasClient";

export async function fetchServicios() {
  const res = await apiListasClient.get("/api/servicios");
  return res.data;
}

export async function fetchServicio() {
  const res = await apiListasClient.get("/api/servicios/${id}");
  return res.data;
}

export async function agendarServicio(id, fecha) {
  return apiListasClient.patch(`/api/servicios/${id}`, {
    fecha_agendado: fecha,
    estado: "agendado",
  });
}

export async function completarServicio(id, payload) {
  return apiListasClient.post(`/api/servicios/${id}/complete`, payload);
}

export async function crearServicioPorComponente(componenteData) {
  const payload = {
    title: String(componenteData.next_consecutivo ?? ""), // el consecutivo lo agregamos luego
    field_componente: Number(componenteData.id),
    field_cliente_serv: Number(componenteData.cliente_id),
    field_activo_serv: componenteData.activo ?? "",
    field_equipo_serv: componenteData.equipo ?? "",
    field_estado: "pendiente",
    field_fecha_proximo_servicio: componenteData.fecha_proximo_servicio ?? null,
  };

  return apiListasClient.post("/api/servicios", payload);
}

export async function fetchServiciosPorComponente(componenteId) {
  return apiListasClient.get(`/api/servicios/componente/${componenteId}`);
}
