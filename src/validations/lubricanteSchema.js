// lubriplanner/src/validations/lubricanteSchema.js
import * as Yup from "yup";
import apiListasClient from "../api/apiListasClient";

export const lubricanteValidationSchema = (currentId = null) =>
  Yup.object({
    codigo: Yup.string()
      .matches(/^\d+$/, "Código inválido. Solo números.")
      .required("El código es requerido")
      .min(3, "Mínimo 3 caracteres")
      .max(7, "Máximo 7 caracteres")
      .trim()
      .test("unique-codigo", "El código ya existe", async function (value) {
        if (!value) return true;
        const codigo = value.trim();
        if (!codigo) return true;

        try {
          const res = await apiListasClient.get(
            "/api/lubricantes/validar-codigo",
            {
              params: {
                codigo,
                exact: true,
                exclude: currentId || null,
              },
            }
          );
          return res.data?.isUnique === true;
        } catch (error) {
          // Si falla la llamada, asumimos que es único (el backend lo validará al guardar)
          console.warn(
            "Validación de código única falló (red o servidor), se permite temporalmente",
            error
          );
          return true;
        }
      }),

    title: Yup.string()
      .required("El nombre comercial es requerido")
      .min(3, "Mínimo 3 caracteres")
      .max(256, "Máximo 256 caracteres")
      .trim()
      .test(
        "unique-title",
        "Este nombre comercial ya existe",
        async function (value) {
          if (!value) return true;
          const title = value.trim();
          if (!title) return true;

          try {
            const res = await apiListasClient.get(
              "/api/lubricantes/validar-unico",
              {
                params: {
                  field: "title",
                  value: title,
                  exclude: currentId || null,
                },
              }
            );
            return res.data?.isUnique === true;
          } catch (error) {
            console.warn(
              "Validación de título único falló, se permite temporalmente",
              error
            );
            return true;
          }
        }
      ),

    origen: Yup.string()
      .required("Seleccione el origen")
      .oneOf(["Nacional", "Importado"], "Origen inválido"),

    familia: Yup.string().nullable().max(128, "Máximo 128 caracteres").trim(),

    clasificacion: Yup.string()
      .required("La clasificación es requerida")
      .min(1, "Selecciona una clasificación"),

    descripcion: Yup.string().max(512, "Máximo 512 caracteres").nullable(),

    fabricante: Yup.string()
      .required("El fabricante es requerido")
      .min(1, "Selecciona un fabricante"),

    tipo: Yup.string()
      .required("El tipo de lubricante es requerido")
      .min(1, "Selecciona un tipo de lubricante"),

    lob: Yup.string()
      .required("El LOB es requerido")
      .min(1, "Selecciona un LOB"),

    empaque: Yup.string()
      .required("El empaque es requerido")
      .min(1, "Selecciona un empaque válido"),

    galones_empaque: Yup.number()
      .required("Este valor es requerido")
      .positive("Indique un número mayor a cero")
      .integer("Indique un valor entero"),

    especificaciones: Yup.string().max(500, "Máximo 500 caracteres").nullable(),

    field_imagen_del_lubricante: Yup.string().nullable(),
  });
