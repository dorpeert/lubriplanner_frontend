export default function normalizeApiError(error) {
  // Axios error
  if (error.response) {
    const { status, data } = error.response;

    return {
      status,
      message:
        data?.message ||
        (status === 422
          ? "Error de validación"
          : "Error inesperado del servidor"),
      fieldErrors: data?.errors || null,
      details: data,
    };
  }

  // Network / timeout
  if (error.request) {
    return {
      status: null,
      message: "No se pudo conectar con el servidor",
      fieldErrors: null,
      details: null,
    };
  }

  // Unknown
  return {
    status: null,
    message: "Error inesperado",
    fieldErrors: null,
    details: error,
  };
}
