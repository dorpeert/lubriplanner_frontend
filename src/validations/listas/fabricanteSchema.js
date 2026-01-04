import * as Yup from "yup";

export const fabricanteValidationSchema = () =>
  Yup.object({
    name: Yup
      .string()
      .trim()
      .required("El nombre del Fabricante es requerido")
  });