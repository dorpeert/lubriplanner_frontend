// src/pages/PermissionsPage.jsx
import { useState, useEffect } from "react";
import apiListasClient from "../../../api/apiListasClient";
import { Switch, Typography, Box, Button, Paper } from "@mui/material";

export default function PermisosPerfiles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  const permissions = [
    { key: "register_users", label: "Registrar usuarios" },
    { key: "view_users", label: "Ver usuarios" },
    { key: "edit_users", label: "Editar usuarios" },
    { key: "delete_users", label: "Eliminar usuarios" },

    { key: "create_profiles", label: "Crear perfiles" },
    { key: "view_profiles", label: "Ver perfiles" },
    { key: "edit_profiles", label: "Editar perfiles" },
    { key: "delete_profiles", label: "Eliminar perfiles" },
  ];

  useEffect(() => {
    apiListasClient.get("/api/permissions").then(res => {
      setRoles(res.data);
      setLoading(false);
    });
  }, []);

  const handleToggle = (roleId, permKey) => {
    setRoles(prev => prev.map(role =>
      role.id === roleId
        ? { ...role, permissions: { ...role.permissions, [permKey]: !role.permissions[permKey] } }
        : role
    ));
  };

const handleSave = () => {
  apiListasClient.patch("/api/permissions", roles)
    .then(() => alert("¡Permisos guardados correctamente!"))
    .catch(() => alert("Error al guardar"));
};



  if (loading) return <Typography>Cargando...</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Configuración de Permisos</Typography>

      <Paper sx={{ p: 2 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>

          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "8px" }}></th>
              {roles.map(role => (
                <th key={role.id} style={{ textAlign: "center", padding: "8px" }}>
                  {role.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {permissions.map(perm => (
              <tr key={perm.key}>
                <td style={{ padding: "8px" }}>{perm.label}</td>
                {roles.map(role => (
                  <td key={role.id} style={{ textAlign: "center" }}>
                    <Switch
                      checked={role.permissions[perm.key] || false}
                      onChange={() => handleToggle(role.id, perm.key)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>

        </table>
      </Paper>

      <Box sx={{ mt: 2, textAlign: "right" }}>
        <Button variant="contained" onClick={handleSave}>Guardar</Button>
      </Box>
      
    </Box>
  );
}