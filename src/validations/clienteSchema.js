import * as Yup from "yup";
import apiListasClient from "../api/apiListasClient";

export const clienteValidationSchema = (currentId = null) =>
  Yup.object({
    cliente: Yup.string()
      .required("El nombre del cliente es requerido")
      .min(3, "Mínimo 3 caracteres")
      .max(100, "Máximo 100 caracteres")
      .trim()
      .test(
        "unique-title",
        "Ya existe un cliente con el mismo nombre",

        async function (value) {
          if (!value) return true;
          const title = value.trim();
          if (!title) return true;

          try {
            const res = await apiListasClient.get(
              "/api/clientes/validar-unico",
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

    field_prestador_de_servicio: Yup.string().required(
      "El prestador de servicio es obligatorio"
    ),

    field_enviar_notificaciones: Yup.boolean(),

    field_logo_file: Yup.mixed()
      .nullable()
      .test(
        "fileSize",
        "El archivo supera los 3MB",
        (file) => !file || file.size <= 3 * 1024 * 1024
      )
      .test(
        "fileType",
        "Formato no válido",
        (file) =>
          !file ||
          ["image/jpeg", "image/png", "image/gif", "image/svg+xml"].includes(
            file.type
          )
      ),

    field_logo_del_cliente: Yup.mixed().nullable(),

    field_numero_de_contacto: Yup.string()
      .trim()
      .required("El número de contacto es requerido")
      .matches(/^[0-9+]+$/, "El número de contacto solo puede contener números")
      .min(7, "El número de contacto debe tener al menos 7 dígitos"),

    field_email_de_contacto: Yup.string()
      .trim()
      .email("Ingresa un email válido")
      .required("El email de contacto es requerido"),

    // ✅ NUEVO: ACTIVOS + EQUIPOS
    field_activos: Yup.array()
      .of(
        Yup.object({
          activo: Yup.string()
            .trim()
            .required("El nombre del activo es requerido"),

          equipos: Yup.array()
            .of(
              Yup.object({
                equipo: Yup.string()
                  .trim()
                  .required("Nombre del equipo es requerido"),
                modelo: Yup.string().trim().required("Modelo es requerido"),
                fabricante: Yup.string()
                  .trim()
                  .required("Fabricante es requerido"),
              })
            )
            // Si quieres permitir activos sin equipos, quita el .min(1)
            .min(1, "Debes agregar al menos un equipo al activo"),
        })
      )
      // Si quieres permitir clientes sin activos, quita el .min(1)
      .min(1, "Debes agregar al menos un activo"),
  });
