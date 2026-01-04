// src/api/drupalAuth.js
import axios from "axios";

const BASE = "https://lightcoral-emu-437776.hostingersite.com/web";

const TOKEN_URL = `${BASE}/oauth/token`;
const USERINFO_URL = `${BASE}/api/userinfo`;

// Cliente OAuth para React (sin secret)
const CLIENT_ID = "react_Hffwn4qyP_client";

// ------------------------------------
// LOGIN (OAuth Password Grant)
// ------------------------------------
export async function loginUser(username, password) {
  const params = new URLSearchParams();
  params.append("grant_type", "password");
  params.append("client_id", CLIENT_ID);
  params.append("username", username);
  params.append("password", password);

  try {
    const resp = await axios.post(TOKEN_URL, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    return resp.data; // { access_token, refresh_token }
} catch (err) {
  console.warn("⚠️ Error en OAuth:", err?.response?.data);

  const desc = err?.response?.data?.error_description ?? "";

  // Usuario bloqueado
  if (desc.includes("blocked") || desc.includes("denied")) {
    const error = new Error("USER_BLOCKED");
    error.code = "USER_BLOCKED";
    throw error;
  }

  // Credenciales inválidas
  const invalid = new Error("INVALID_CREDENTIALS");
  invalid.code = "INVALID_CREDENTIALS";
  throw invalid;
}

}

// ------------------------------------
// REFRESH TOKEN
// ------------------------------------
export async function refreshToken(refreshToken) {
  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("client_id", CLIENT_ID);
  params.append("refresh_token", refreshToken);

  const resp = await axios.post(TOKEN_URL, params.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  return resp.data;
}

// ------------------------------------
// OBTENER INFORMACIÓN DEL USUARIO
// ------------------------------------
export async function fetchCurrentUser(accessToken) {
  try {
    const resp = await axios.get(USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const u = resp.data;

    return {
      id: u.uid,
      name: u.name,
      email: u.mail,
      roles: u.roles || [],
      picture: u.picture || null,
    };
  } catch (err) {
    console.error("❌ Error obteniendo usuario:", err);
    return null;
  }
}

// ------------------------------------
// SOLICITAR RECUPERACIÓN DE CONTRASEÑA
// ------------------------------------
export async function requestPasswordReset(identifier) {
  try {
    const resp = await axios.post(
      `${BASE}/api/password-reset`,
      { identifier },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    return resp.data;
  } catch (err) {
    console.error("Error en reset:", err.response?.data);
    throw new Error(
      err.response?.data?.error || "Error al solicitar recuperación"
    );
  }
}

export default {
  loginUser,
  refreshToken,
  fetchCurrentUser,
  requestPasswordReset,
};
