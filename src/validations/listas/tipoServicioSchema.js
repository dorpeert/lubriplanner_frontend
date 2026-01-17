import * as Yup from "yup";

export const tipoServicioValidationSchema = () =>
  Yup.object({
    name: Yup
      .string()
      .trim()
      .required("El nombre del tipo de servicio es requerido"),
  });