import * as Yup from "yup";

export const prestadorValidationSchema = () =>
  Yup.object({
    name: Yup
      .string()
      .trim()
      .required("El nombre del prestador es requerido"),
  });