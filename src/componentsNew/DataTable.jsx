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
  TablePagination,
  Tooltip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";


export default function DataTable({
  rows = [],
  columns = [],
  loading = false,

  page = 0,
  rowsPerPage = 10,
  total = 0,
  onPageChange,
  onRowsPerPageChange,

  onEdit,
  onView,
  onDelete,
}) {
  const showActions = Boolean(onEdit || onView || onDelete);

  return (
    <>
      <TablePagination
        component="div"
        count={total}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
        rowsPerPageOptions={[5, 10, 25, 50]}
        labelRowsPerPage="Filas por página"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} de ${count}`
        }
      />

      <Paper sx={{ padding: "1px", backgroundColor: "#f5f5f5" }}>
        <TableContainer sx={{ height: "100%", borderRadius: 1 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {columns.map((col) => (
                  <TableCell
                    key={col.field}
                    sx={{
                      backgroundColor: "#f5f5f5",
                      padding: "4px 16px 8px 16px",
                    }}
                  >
                    {col.header}
                  </TableCell>
                ))}

                {showActions && (
                  <TableCell
                    sx={{
                      backgroundColor: "#f5f5f5",
                      width: "12em",
                      textAlign: "center",
                    }}
                  >
                    Acciones
                  </TableCell>
                )}
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (showActions ? 1 : 0)}
                    align="center"
                  >
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (showActions ? 1 : 0)}
                    align="center"
                  >
                    No hay datos
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id || row.tid}>
                    {columns.map((col) => (
                      <TableCell key={col.field} sx={{ padding: "8px 16px" }}>
                        {col.render ? col.render(row) : row[col.field]}
                      </TableCell>
                    ))}

                    {showActions && (
                      <TableCell sx={{padding: ".5rem"}} align="center">
                        {onView && (
                          <Tooltip arrow placement="top" title="Ver">
                            <IconButton
                              onClick={() => onView(row)}
                              sx={{ mr: 0.5 }}
                            >
                              <VisibilityIcon color="success" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {onEdit && (
                          <Tooltip arrow placement="top" title="Editar">
                            <IconButton
                              onClick={() => onEdit(row)}
                              sx={{ mr: 0.5 }}
                            >
                              <EditIcon color="primary" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {onDelete && (
                          <Tooltip arrow placement="top" title="Eliminar">
                            <IconButton
                              onClick={() => onDelete(row)}
                              sx={{ mr: 0.5 }}
                            >
                              <DeleteIcon color="error" />
                            </IconButton>
                          </Tooltip>
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
