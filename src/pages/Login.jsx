import React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Grid,
  TextField,
  Typography,
  IconButton,
  InputAdornment,
  Link,
  Paper,
} from "@mui/material";

import CustomModal from "../components/CustomModal";
import ForgotPasswordForm from "../forms/ForgotPasswordForm";

import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/DistricandelariaLogo.svg";
import { useEffect } from "react";

export default function Login() {
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const [showBlockedModal, setBlockedModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(name, pass);
      localStorage.removeItem("SESSION_EXPIRED");
      sessionStorage.removeItem("SESSION_EXPIRED_CONSUMED");
      window.location.href = "/home";
    } catch (err) {
      console.error("🧩 Error detectado:", err.code);
      if (err.code === "USER_BLOCKED") {
        setBlockedModal(true);
      } else {
        setError("Usuario o contraseña incorrectos");
      }
    }
  };

  const [openModal, setOpenModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  /*useEffect(() => {
  if (openModal) {
    setLoading(true);
    setTimeout(() => setLoading(false), 4000);
  }
}, [openModal]);
*/
  const [showExpired, setShowExpired] = useState(false);

  useEffect(() => {
    const expired = localStorage.getItem("SESSION_EXPIRED");
    const consumed = sessionStorage.getItem("SESSION_EXPIRED_CONSUMED");

    if (expired && !consumed) {
      setShowExpired(true);

      // 🧷 marca SOLO esta pestaña
      sessionStorage.setItem("SESSION_EXPIRED_CONSUMED", "1");
    }
  }, []);

  const formId = "forgot-password-form";

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
      {/*LOGO DISTRICANDELARIA*/}
      <Grid
        className="login-logo-section"
        size={{ md: 8, xs: 12 }}
        sx={{
          backgroundColor: "#3A4D9C",
          height: { md: "100vh", xs: "30vh" },
          alignContent: "center",
          textAlign: "center",
        }}
      >
        <Box
          component="img"
          src={logo}
          alt="DistriCandelaria"
          sx={{ width: 270 }}
        />
      </Grid>

      {/*FORMULARIO DE INICIO DE SESIÓN*/}
      <Grid
        className="login-form-section"
        size={{ md: 4, xs: 12 }}
        sx={{
          height: { md: "100vh", xs: "70vh" },
          alignContent: "center",
          justifyItems: "center",
        }}
      >
        <Box sx={{ width: "80%", maxWidth: 360 }}>
          <Typography variant="h5" mb={4} textAlign="center" color="primary">
            Iniciar Sesión
          </Typography>

          <form onSubmit={handleSubmit}>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1.5em" }}
            >
              <TextField
                variant="filled"
                label="Usuario"
                fullWidth
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <TextField
                variant="filled"
                size="small"
                label="Contraseña"
                type={showPass ? "text" : "password"}
                fullWidth
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPass(!showPass)}>
                        {showPass ? (
                          <VisibilityOffOutlinedIcon />
                        ) : (
                          <VisibilityOutlinedIcon />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </div>

            {error && (
              <Typography color="error" variant="body2" mt={1}>
                {error}
              </Typography>
            )}

            <Box mt={1} mb={"1em"} textAlign="right">
              <Link
                component="button"
                type="button" // 👈 evita que se dispare al presionar Enter
                underline="hover"
                color="primary"
                variant="body2"
                onClick={() => setOpenModal(true)}
              >
                Recuperar contraseña
              </Link>
            </Box>

            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ py: 1.2, textTransform: "uppercase" }}
            >
              Iniciar sesión
            </Button>
          </form>
        </Box>
      </Grid>

      <CustomModal
        open={openModal}
        onClose={() => {
          setOpenModal(false);
          setSuccessMessage("");
          setErrorMessage("");
        }}
        title="Recuperar contraseña"
        size="M"
        content={
          <ForgotPasswordForm
            formId={formId}
            loading={loading}
            setLoading={setLoading}
            onMessage={setSuccessMessage}
            onError={setErrorMessage}
          />
        }
        message="Ingresa tu correo electrónico o nombre de usuario registrado."
        loading={loading}
        successMessage={successMessage}
        errorMessage={errorMessage}
        actions={[
          {
            label: "Cancelar",
            variant: "text",
            onClick: () => setOpenModal(false),
          },
          {
            label: "Enviar enlace",
            variant: "contained",
            type: "submit",
            form: formId, // ✅ apunta al ÚNICO form
          },
        ]}
      />

      <CustomModal
        open={showExpired}
        variant="success"
        title="Sesión caducada"
        message="Sesión finalizada. Por favor inicia sesión nuevamente."
        actions={[
          {
            label: "Aceptar",
            onClick: () => setShowExpired(false),
          },
        ]}
      />
    </Grid>
  );
}
