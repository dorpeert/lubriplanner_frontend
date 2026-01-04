// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();

  // Mientras se verifica el token o el usuario, muestra un loader
  if (loading) {
    return <div>Cargando...</div>;
  }

  // Si no hay usuario autenticado, redirige al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si hay restricción de rol, validamos
  if (role && user?.roles && !user.roles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
