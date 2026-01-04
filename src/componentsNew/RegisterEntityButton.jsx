import { Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

export default function RegisterEntityButton({ entityName, onClick }) {
  return (
    <Button
      sx={{ width: "max-content" }}
      variant="contained"
      startIcon={<AddIcon />}
      onClick={onClick}
    >
      Registrar {entityName}
    </Button>
  );
}
