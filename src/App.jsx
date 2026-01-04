import { BrowserRouter as Router } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

// MUI
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "./theme/theme.js";

// Rutas
import AppRoutes from "./routes";

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <AppRoutes />
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}
