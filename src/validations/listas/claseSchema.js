import * as Yup from "yup";

export const claseValidationSchema = () =>
  Yup.object({
    name: Yup
      .string()
      .trim()
      .required("El nombre de la clase es requerido"),
  });