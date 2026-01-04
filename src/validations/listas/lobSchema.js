import * as Yup from "yup";

export const lobValidationSchema = () =>
  Yup.object({
    name: Yup
      .string()
      .trim()
      .required("El nombre del LOB es requerido"),
  });