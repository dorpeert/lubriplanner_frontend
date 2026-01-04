import * as Yup from "yup";

export const tipoLubricanteValidationSchema = () =>
  Yup.object({
    name: Yup.string()
      .trim()
      .required("El tipo de lubricante es requerido"),
  });
