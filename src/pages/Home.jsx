// src/pages/Home.jsx
import React from "react";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user, logout } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Página de inicio</h1>
      <p className="mb-4">Hola, {user?.name}</p>
      <p className="mb-4">Bienvenido a LubriPlanner</p>

      <p>
        Esta es la página de inicio del panel. Aquí puedes ver información general del sistema.
      </p>
    </div>
  );
}
