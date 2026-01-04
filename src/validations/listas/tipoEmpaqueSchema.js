import * as Yup from "yup";

export const tipoEmpaqueValidationSchema = () =>
  Yup.object({
    name: Yup.string()
      .trim()
      .required("El tipo de empaque es requerido"),
  });
