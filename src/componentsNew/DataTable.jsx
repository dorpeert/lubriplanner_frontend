import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  CircularProgress,
  Box,
  TablePagination,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";

export default function DataTable({
  rows = [],
  columns = [],
  loading = false,
  onEdit,
  onView,
  onDelete,
}) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // vuelve a la primera página
  };

  const paginatedRows = rows.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <>
      <TablePagination
        component="div"
        count={rows.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25, 50]}
        labelRowsPerPage="Filas por página"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} de ${count}`
        }
      />

      <Paper
        sx={{
          padding: "1px",
          backgroundColor: "#f5f5f5",
          //height: "64vh",
        }}
      >
        <TableContainer
          sx={{
            height: "100%",
            borderRadius: 1,
          }}
        >
          <Table
            sx={{
              paddingTop: 1,
            }}
            stickyHeader
          >
            <TableHead>
              <TableRow>
                {columns.map((col) => (
                  <TableCell
                    sx={{
                      backgroundColor: "#f5f5f5",
                      padding: "4px 16px 8px 16px",
                    }}
                    key={col.field}
                  >
                    {col.header}
                  </TableCell>
                ))}

                {(onEdit || onView || onDelete) && (
                  <TableCell
                    sx={{
                      backgroundColor: "#f5f5f5",
                    }}
                    className="acciones-column"
                  >
                    Acciones
                  </TableCell>
                )}
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} align="center">
                    No hay datos
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((row) => (
                  <TableRow
                    key={row.id || row.tid}
                    sx={{
                      "&:nth-of-type(odd)": { backgroundColor: "#fafafa90" },
                    }}
                  >
                    {columns.map((col) => (
                      <TableCell
                        sx={{
                          padding: "8px 16px 8px 16px",
                        }}
                        key={col.field}
                      >
                        {col.render ? col.render(row) : row[col.field]}
                      </TableCell>
                    ))}

                    {(onEdit || onView || onDelete) && (
                      <TableCell align="right">
                        {onView && (
                          <IconButton
                            onClick={() => onView(row)}
                            title="Ver detalles"
                            sx={{ mr: 0.5 }}
                          >
                            <VisibilityIcon color="success" />
                          </IconButton>
                        )}

                        {onEdit && (
                          <IconButton
                            onClick={() => onEdit(row)}
                            title="Editar"
                            sx={{ mr: 0.5 }}
                          >
                            <EditIcon color="primary" />
                          </IconButton>
                        )}

                        {onDelete && (
                          <IconButton
                            onClick={() => onDelete(row)}
                            title="Eliminar"
                            sx={{ mr: 0.5 }}
                          >
                            <DeleteIcon color="error" />
                          </IconButton>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </>
  );
}
