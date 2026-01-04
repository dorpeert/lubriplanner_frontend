// src/hooks/useCascadaClienteActivoEquipo.js
import { useState, useEffect } from "react";

export const useCascadaClienteActivoEquipo = (initialClienteId = "", initialActivo = "", initialEquipo = "") => {
  const [clientes, setClientes] = useState([]);
  const [activos, setActivos] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedCliente, setSelectedCliente] = useState(initialClienteId);
  const [selectedActivo, setSelectedActivo] = useState(initialActivo);
  const [selectedEquipo, setSelectedEquipo] = useState(initialEquipo);

  useEffect(() => {
    fetch("https://lightcoral-emu-437776.hostingersite.com/web/api/clientes", {
      credentials: "include",
    })
      .then(r => r.json())
      .then(data => {
        setClientes(data);
        setLoading(false);

        // Si hay cliente inicial (edición)
        if (initialClienteId) {
          const cliente = data.find(c => c.id === parseInt(initialClienteId));
          if (cliente?.activos) {
            const acts = cliente.activos.map(a => ({ id: a.id, nombre: a.activo }));
            setActivos(acts);

            if (initialActivo) {
              const activo = cliente.activos.find(a => a.activo === initialActivo);
              if (activo?.equipos) {
                setEquipos(activo.equipos.map(e => e.equipo));
              }
            }
          }
        }
      });
  }, []);

  const handleClienteChange = (clienteId) => {
    setSelectedCliente(clienteId);
    setSelectedActivo("");
    setSelectedEquipo("");
    setEquipos([]);

    const cliente = clientes.find(c => c.id === parseInt(clienteId));
    if (cliente?.activos) {
      setActivos(cliente.activos.map(a => ({ id: a.id, nombre: a.activo })));
    } else {
      setActivos([]);
    }
  };

  const handleActivoChange = (activoNombre) => {
    setSelectedActivo(activoNombre);
    setSelectedEquipo("");

    const cliente = clientes.find(c => c.id === parseInt(selectedCliente));
    const activo = cliente?.activos?.find(a => a.activo === activoNombre);
    setEquipos(activo?.equipos?.map(e => e.equipo) || []);
  };

  const handleEquipoChange = (equipo) => {
    setSelectedEquipo(equipo);
  };

  return {
    clientes,
    activos,
    equipos,
    loading,
    selectedCliente,
    selectedActivo,
    selectedEquipo,
    handleClienteChange,
    handleActivoChange,
    handleEquipoChange,
  };
};