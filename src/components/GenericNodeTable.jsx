import React, { useState, useEffect } from "react";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Typography,
  IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import axios from "axios";

export default function GenericNodeTable({
  title,
  addButtonText = "Agregar",
  endpoint,
  idField = "tid",
  nameField = "name",
  tableColumns = [],
  createFormFields = [],
  messages = {},
}) {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});

  const loadData = async () => {
    try {
      const res = await axios.get(endpoint);
      setRows(res.data);
    } catch (err) {
      alert("Error cargando datos");
    }
  };

  useEffect(() => {
    loadData();
  }, [endpoint]);

  const handleSubmit = async () => {
    const url = editingId
      ? `${endpoint}/${rows.find((r) => r[idField] === editingId)[idField]}`
      : endpoint;
    const method = editingId ? "PATCH" : "POST";
    const payload = { ...formData };
    if (nameField === "title")
      payload.title = payload.title || formData[nameField];

    try {
      await axios({
        method,
        url,
        data: payload,
        headers: editingId ? { "X-HTTP-Method-Override": "PATCH" } : {},
      });
      alert(
        messages[editingId ? "updateSuccess" : "createSuccess"] || "Guardado!"
      );
      setOpen(false);
      setEditingId(null);
      loadData();
    } catch (err) {
      alert("Error: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar?")) return;
    try {
      await axios({
        method: "DELETE",
        url: `${endpoint}/${id}`,
        headers: { "X-HTTP-Method-Override": "DELETE" },
      });
      alert(messages.deleteSuccess || "Eliminado");
      loadData();
    } catch (err) {
      alert("Error al eliminar");
    }
  };

  const openEdit = (row) => {
    setEditingId(row[idField]);
    setFormData(row);
    setOpen(true);
  };

  const columns = [
    ...tableColumns,
    {
      field: "actions",
      headerName: "Acciones",
      width: 150,
      renderCell: (params) => (
        <>
          <IconButton onClick={() => openEdit(params.row)} color="primary">
            <EditIcon />
          </IconButton>
          <IconButton
            onClick={() => handleDelete(params.row[idField])}
            color="error"
          >
            <DeleteIcon />
          </IconButton>
        </>
      ),
    },
  ];

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h5">{title}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingId(null);
            setFormData({});
            setOpen(true);
          }}
        >
          {addButtonText}
        </Button>
      </Box>

      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(row) => row[idField]}
        slots={{ toolbar: GridToolbar }}
        autoHeight
      />

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingId ? "Editar" : "Crear"} {title}
        </DialogTitle>
        <DialogContent>
          {createFormFields.map((field) => (
            <TextField
              key={field.name}
              margin="dense"
              name={field.name}
              label={field.label}
              fullWidth
              required={field.required}
              multiline={field.multiline}
              rows={field.rows}
              type={field.type || "text"}
              value={formData[field.name] || ""}
              onChange={(e) =>
                setFormData({ ...formData, [field.name]: e.target.value })
              }
            />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
