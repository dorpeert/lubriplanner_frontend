// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";
import { loginUser, fetchCurrentUser } from "../api/drupalAuth";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // -----------------------------------------------------
  // 🔹 Inicializar autenticación (si ya hay tokens guardados)
  // -----------------------------------------------------
  useEffect(() => {
    const storedAccess = localStorage.getItem("access_token");

    const init = async () => {
      if (storedAccess) {
        try {
          const userData = await fetchCurrentUser(storedAccess);

          if (userData && userData.id) {
            setUser(userData);
            setAccessToken(storedAccess);
          } else {
            console.warn("⚠️ Token inválido o usuario no encontrado.");
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
          }
        } catch (err) {
          console.error("❌ Error inicializando Auth:", err);
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        }
      }

      setLoading(false);
    };

    init();
  }, []);

  // -----------------------------------------------------
  // 🔹 Login
  // -----------------------------------------------------
  const login = async (username, password) => {
    try {
      const tokenData = await loginUser(username, password);

      if (!tokenData || !tokenData.access_token) {
        const err = new Error("INVALID_CREDENTIALS");
        err.code = "INVALID_CREDENTIALS";
        throw err;
      }

      // Guardar tokens
      localStorage.setItem("access_token", tokenData.access_token);
      localStorage.setItem("refresh_token", tokenData.refresh_token);

      setAccessToken(tokenData.access_token);

      // Obtener datos del usuario
      const userData = await fetchCurrentUser(tokenData.access_token);

      if (!userData) {
        const err = new Error("USER_NOT_FOUND");
        err.code = "USER_NOT_FOUND";
        throw err;
      }

      setUser(userData);
      return userData;
    } catch (error) {
      console.error("❌ Error en login:", error);

      // Si el error trae código, lo reenviamos
      if (error.code) throw error;

      // Si NO trae código, enviamos INVALID_CREDENTIALS
      const err = new Error("INVALID_CREDENTIALS");
      err.code = "INVALID_CREDENTIALS";
      throw err;
    }
  };

  // -----------------------------------------------------
  // 🔹 Logout
  // -----------------------------------------------------
const logout = () => {
  setUser(null);
  setAccessToken(null);

  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");

  // 🔔 señal GLOBAL (timestamp para forzar storage event)
  localStorage.setItem("SESSION_EXPIRED", Date.now().toString());

  window.location.href = "/login";
};

  // -----------------------------------------------------
  // 🔹 Valor exportado al contexto
  // -----------------------------------------------------
  const isAuthenticated = Boolean(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
