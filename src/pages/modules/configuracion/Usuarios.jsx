import { Box } from "@mui/material";
// import GenericCrudTable from "../../../components/GenericCrudTable.jsx";
//import CrudDataTable from "../../../components/CrudDataTable.jsx";
import useDrupalRoles from "../../../hooks/useDrupalRoles.js";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useState } from "react";
//import { generateUsersPdf } from "./pdfs/usersPdf";

import { Chip, CircularProgress, Alert } from "@mui/material";

export default function Usuarios() {
  const { roles, loading: rolesLoading, error: rolesError } = useDrupalRoles();
  const [selectedRoleId, setSelectedRoleId] = useState("");

  if (rolesLoading) return <CircularProgress />;
  if (rolesError) return <Alert severity="error">{rolesError}</Alert>;

  const handleExportPdf = () => {
    // Tu lógica para PDF
    console.log("Exportar PDF");
  };

  return (
    <div>
      <GenericCrudTable
        title="Usuarios"
        endpoint="/user/user"
        entityType="user--user"
        roles={roles}
        searchFields={[
          { name: "name", label: "Nombre de Usuario", type: "text" },
          { name: "mail", label: "E-mail de Contacto", type: "text" },
          {
            name: "roles",
            label: "Perfil",
            type: "select",
            options: roles.map((r) => r.label),
            onFilter: (value) => {
              const role = roles.find((r) => r.label === value);
              return role ? role.id : null;
            },
          },
          { name: "status", label: "Activo", type: "switch" },
        ]}
        tableColumns={[
          { field: "name", header: "Nombre" },
          {
            field: "roles",
            header: "Perfil",
            // render se maneja en GenericCrudTable
          },
          { field: "field_phone", header: "Número de contacto" },
          { field: "mail", header: "E-Mail" },
          {
            field: "status",
            header: "Estado",
            render: (v) =>
              v ? (
                <Chip label="Activo" color="success" size="small" />
              ) : (
                <Chip label="Inactivo" color="default" size="small" />
              ),
          },
        ]}
        actions={[
          {
            icon: <EditIcon />,
            label: "Editar",
            onClick: (item) => openEdit(item),
          },
          {
            icon: <DeleteIcon />,
            label: "Eliminar",
            onClick: (item) => handleDelete(item.id),
            color: "error",
          },
        ]}
        createFormFields={[
          { name: "name", label: "Nombre", type: "text", required: true },
          { name: "mail", label: "E-mail", type: "email", required: true },
          {
            name: "roles",
            label: "Perfil",
            type: "select",
            options: roles.map((r) => r.label),
            required: true,
            // Mapea label → id
            onChange: (label) => {
              const role = roles.find((r) => r.label === label);
              return role ? role.id : null;
            },
          },
          { name: "field_phone", label: "Número de contacto", type: "text" },
          { name: "status", label: "Activo", type: "switch" },
        ]}
        onExportPdf={() => console.log("Exportar PDF")}
      />

      <CrudDataTable
        title="Usuarios"
        endpoint="/api/usuarios"
        tableColumns={columns}
        searchFields={searchFields}
      >Dayro</CrudDataTable>
    </div>
  );
}
