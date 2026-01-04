import * as yup from "yup";

/**
 * Esquema de validación para el nodo "Componente" en Drupal.
 * @param {number|string|null} currentId - ID del componente que se está editando (para excluir en validaciones de unicidad)
 * @returns {yup.ObjectSchema} Esquema Yup válido para react-hook-form
 */
export const componenteValidationSchema = (currentId = null) => {
  return yup.object().shape({
    title: yup
      .string()
      .required("El nombre del componente es requerido")
      .min(3, "Mínimo 3 caracteres")
      .max(255, "Máximo 255 caracteres"),

    cliente_id: yup
      .string()
      .required("Debe seleccionar un cliente"),

    activo: yup
      .string()
      .required("Debe seleccionar un activo")
      .test(
        "activo-exists",
        "El activo seleccionado no es válido",
        function (value) {
          const { cliente_id } = this.parent;
          if (!cliente_id || !value) return true;
          return !!value;
        }
      ),

    equipo: yup
      .string()
      .required("Debe seleccionar un equipo")
      .test(
        "equipo-exists",
        "El equipo seleccionado no es válido",
        function (value) {
          const { activo } = this.parent;
          if (!activo || !value) return true;
          return !!value;
        }
      ),

    lubricante: yup
      .string()
      .required("Debe seleccionar un lubricante"),

    // Frecuencia de cambio (horas)
    frecuencia_cambio: yup
      .number()
      .typeError("Debe ser un número válido")
      .positive("La frecuencia debe ser mayor a 0")
      .integer("Debe ser un número entero")
      .required("La frecuencia de cambio es obligatoria")
      .min(1, "Mínimo 1 hora")
      .max(999999, "Valor demasiado alto"),

    // Frecuencia de muestreo (horas)
    frecuencia_muestreo: yup
      .number()
      .typeError("Debe ser un número válido")
      .positive("La frecuencia debe ser mayor a 0")
      .integer("Debe ser un número entero")
      .required("La frecuencia de muestreo es obligatoria")
      .min(1, "Mínimo 1 hora")
      .max(999999, "Valor demasiado alto"),

    // Volumen requerido (litros)
    volumen_requerido: yup
      .number()
      .typeError("Debe ser un número válido")
      .positive("El volumen debe ser mayor a 0")
      .min(0.1, "Mínimo 0.1 litros")
      .max(99999, "Valor demasiado alto")
      .nullable() // Permitir vacío
      .transform((value, originalValue) =>
        originalValue === "" ? null : value
      ),

    // Observaciones (opcional)
    observaciones: yup
      .string()
      .nullable()
      .max(1000, "Las observaciones no pueden exceder los 1000 caracteres"),

    // Campos ocultos/técnicos (opcionales pero útiles)
    cliente: yup.string().nullable(),
    activo_id: yup.mixed().nullable(),
    equipo_id: yup.mixed().nullable(),
    modelo_equipo: yup.string().nullable(),
    fabricante_equipo: yup.string().nullable(),
    lubricante: yup.string().nullable(),
    lubricante_codigo: yup.string().nullable(),
  });
};