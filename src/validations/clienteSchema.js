import * as Yup from "yup";
import apiListasClient from "../api/apiListasClient";

export const clienteValidationSchema = (currentId = null) =>
  Yup.object({
    title: Yup.string()
      .required("El nombre del cliente es obligatorio")
      .min(3, "Mínimo 3 caracteres")
      .max(100, "Máximo 100 caracteres")
      .trim()
      .test(
        "unique-title",
        "Ya existe un cliente con el mismo nombre",
        async (value) => {
          if (!value) return true;
          
          try {
            const res = await apiListasClient.get(
              "/api/clientes/validar-unico",
              {
                params: {
                  field: "title",
                  value: value.trim(),
                  exclude: currentId,
                },
              }
            );

            return res.data?.isUnique === true;
          } catch {
            return false;
          }
        }
      ),

    field_prestador_de_servicio: Yup.string()
      .required("El prestador de servicio es obligatorio"),

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
  });
