import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Grid,
  TextField,
  Typography,
  Alert,
  IconButton,
  InputAdornment,
} from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import logo from "../assets/DistricandelariaLogo.svg";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const uid = searchParams.get("uid");
  const timestamp = searchParams.get("timestamp");
  const hash = searchParams.get("hash");

  useEffect(() => {
    if (!uid || !timestamp || !hash) {
      setError("Enlace inválido o incompleto.");
    }
  }, [uid, timestamp, hash]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `https://lightcoral-emu-437776.hostingersite.com/web/api/password-reset-confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid, timestamp, hash, password }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error al cambiar contraseña");

      setMessage("¡Contraseña cambiada! Redirigiendo...");

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!uid || !timestamp || !hash) {
    return (
      <Grid container sx={{ height: "100vh", backgroundColor: "#ffff" }}>
        <Grid size={{ md: 8, xs: 12 }} sx={{ backgroundColor: "#3A4D9C", height: { md: "100vh", xs: "30vh" }, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Box component="img" src={logo} alt="DistriCandelaria" sx={{ width: 270 }} />
        </Grid>
        <Grid size={{ md: 4, xs: 12 }} sx={{ height: { md: "100vh", xs: "70vh" }, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Box sx={{ width: "80%", maxWidth: 360, textAlign: "center" }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              Enlace inválido o expirado.
            </Alert>
            <Button variant="outlined" onClick={() => navigate("/login")}>
              Volver al login
            </Button>
          </Box>
        </Grid>
      </Grid>
    );
  }

  return (
    <Grid
      container
      sx={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        backgroundColor: "#ffff",
      }}
    >
      {/* LOGO */}
      <Grid
        size={{ md: 8, xs: 12 }}
        sx={{
          backgroundColor: "#3A4D9C",
          height: { md: "100vh", xs: "30vh" },
          alignContent: "center",
          textAlign: "center",
        }}
      >
        <Box component="img" src={logo} alt="DistriCandelaria" sx={{ width: 270 }} />
      </Grid>

      {/* FORMULARIO */}
      <Grid
        size={{ md: 4, xs: 12 }}
        sx={{
          height: { md: "100vh", xs: "70vh" },
          alignContent: "center",
          justifyItems: "center",
        }}
      >
        <Box sx={{ width: "80%", maxWidth: 360 }}>
          <Typography variant="h5" mb={4} textAlign="center" color="primary">
            Restablecer contraseña
          </Typography>

          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5em" }}>
              <TextField
                variant="filled"
                label="Nueva contraseña"
                type={showPass ? "text" : "password"}
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPass(!showPass)} disabled={loading}>
                        {showPass ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                variant="filled"
                label="Confirmar contraseña"
                type={showConfirm ? "text" : "password"}
                fullWidth
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowConfirm(!showConfirm)} disabled={loading}>
                        {showConfirm ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </div>

            {error && (
              <Typography color="error" variant="body2" mt={1} textAlign="center">
                {error}
              </Typography>
            )}

            {message && (
              <Alert severity="success" sx={{ mt: 2, textAlign: "center" }}>
                {message}
              </Alert>
            )}

            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={loading || !password || password !== confirmPassword}
              sx={{ mt: 3, py: 1.2, textTransform: "uppercase" }}
            >
              {loading ? "Guardando..." : "Cambiar contraseña"}
            </Button>

            <Box mt={2} textAlign="center">
              <Button
                variant="text"
                onClick={() => navigate("/login")}
                disabled={loading}
                sx={{ textTransform: "none" }}
              >
                Volver al inicio de sesión
              </Button>
            </Box>
          </form>
        </Box>
      </Grid>
    </Grid>
  );
}