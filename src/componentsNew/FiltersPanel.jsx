import {
  Box,
  TextField,
  MenuItem,
  Button,
  Grid,
  Typography,
  Divider,
  Paper,
} from "@mui/material";
import ClearIcon from "@mui/icons-material/ClearOutlined";

export default function FiltersPanel({ fields = [], value = {}, onChange }) {
  const handleFieldChange = (name, fieldValue) => {
    onChange({
      ...value,
      [name]: fieldValue || undefined,
    });
  };

  const handleReset = () => {
    onChange({});
  };

  return (
    <Paper
      sx={{
        p: ".5em 1em 1em 1em",
        mb: 2,
        borderRadius: 1,
      }}
    >
      <Typography variant="subtitle1" gutterBottom color="#212121">
        Parámetros de búsqueda
      </Typography>

      <Divider sx={{ mb: 1 }} />
      <Grid>
        <Grid
          className="filters-container"
          sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}
        >
          {fields.map((field) => {
            if (field.render) {
              return (
                <Grid
                  key={field.name}
                  className="filter-item"
                  sx={{ width: "calc(97% / 4)" }}
                >
                  {field.render({
                    value: value[field.name],
                    filters: value,
                    onChange: (val) => handleFieldChange(field.name, val),
                  })}
                </Grid>
              );
            }

            switch (field.type) {
              case "text":
                return (
                  <Grid
                    key={field.name}
                    className="filter-item"
                    sx={{ width: "calc(97% / 4)" }}
                  >
                    {" "}
                    <TextField
                      variant="filled"
                      key={field.name}
                      label={field.label}
                      size="small"
                      value={value[field.name] || ""}
                      onChange={(e) =>
                        handleFieldChange(field.name, e.target.value)
                      }
                    />
                  </Grid>
                );

              case "select":
                return (
                  <Grid
                    key={field.name}
                    className="filter-item"
                    sx={{ width: "calc(97% / 4)" }}
                  >
                    <TextField
                      variant="filled"
                      key={field.name}
                      select
                      label={field.label}
                      size="small"
                      value={value[field.name] ?? ""}
                      onChange={(e) =>
                        handleFieldChange(field.name, e.target.value)
                      }
                      sx={{ minWidth: 160 }}
                    >
                      <MenuItem value="">Todos</MenuItem>

                      {field.options?.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                );

              default:
                return null;
            }
          })}
        </Grid>
        <Grid mt={2}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 1,
            }}
          >
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={handleReset}
              size="small"
            >
              Limpiar campos
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
}
