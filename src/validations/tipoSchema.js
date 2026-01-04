// src/validations/tipoSchema.js

import * as Yup from "yup";
import { nameField } from "./sharedRules";

export const tipoValidationSchema = () =>
  Yup.object({
    name: Yup.string().trim().required("El nombre es requerido"),
  });
