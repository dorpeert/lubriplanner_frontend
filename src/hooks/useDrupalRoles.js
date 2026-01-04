// src/hooks/useDrupalRoles.js
import { useState, useEffect } from "react";
import apiClient from "../api/apiClient";

export default function useDrupalRoles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await apiClient.get(
          "user/user", { withCredentials: true }
        );
        const data = response.data.data || [];
        
        // Filtra roles internos (opcional)
        const filtered = data.filter(role => 
          !role.id.startsWith("anonymous") && 
          !role.id.startsWith("authenticated")
        );

        const roleOptions = filtered.map(role => ({
          id: role.id,
          label: role.attributes.label,
        }));

       
      } catch (err) {
        setError("Error al cargar usuarios");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, []);

  return { roles, loading, error };
}