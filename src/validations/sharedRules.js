import * as Yup from "yup";

export const requiredString = (label) =>
  Yup.string()
    .trim()
    .required(`${label} es requerido`);

export const nameField = (label = "Nombre") =>
  requiredString(label)
    .min(2, "Mínimo 2 caracteres")
    .max(100, "Máximo 100 caracteres")
    .matches(
      /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-_&.,()]+$/u,
      "Solo letras, números y caracteres comunes"
    );