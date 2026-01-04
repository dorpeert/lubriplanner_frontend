// src/routes/privateRoutes.jsx
import HomeLayout from "../layouts/HomeLayout";
import Home from "../pages/Home";

import Configuracion from "../pages/modules/configuracion/Configuracion";
import Usuarios from "../pages/modules/configuracion/Usuarios";
import PermisosPerfiles from "../pages/modules/configuracion/PermisosPerfiles";

import Listas from "../pages/modules/configuracion/Listas";
import Clientes from "../pages/modules/clientes/Clientes";
//import RegistrarCliente from "../pages/RegistrarCliente";

import Lubricantes from "../pages/modules/lubricantes/Lubricantes";

import ClasificacionesDeLubricantes from "../pages/modules/configuracion/listas/ClasificacionesDeLubricantes";
import Empaques from "../pages/modules/configuracion/listas/Empaques";
import FabricantesDeLubricantes from "../pages/modules/configuracion/listas/FabricantesDeLubricantes";
import Lobs from "../pages/modules/configuracion/listas/Lobs";
import PrestadoresDeServicios from "../pages/modules/configuracion/listas/PrestadoresDeServicios"
import TiposDeLubricantes from "../pages/modules/configuracion/listas/TiposDeLubricantes"; 

import Componentes from "../pages/modules/componentes/Componentes"
import VerComponente from "../pages/modules/componentes/VerComponente";

import Reportes from "../pages/modules/reportes/Reportes";



import ProtectedRoute from "../components/ProtectedRoute";

const privateRoutes = [
  {
    element: (
      <ProtectedRoute>
        <HomeLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "/home", element: <Home /> },

      { path: "/configuracion", element: <Configuracion /> },
      { path: "/configuracion/usuarios", element: <Usuarios /> },
      { path: "/configuracion/permisosyperfiles", element: <PermisosPerfiles /> },
      { path: "/configuracion/listas", element: <Listas /> },
      
      { path: "/clientes", element: <Clientes /> },
      { path: "/lubricantes", element: <Lubricantes /> },
      
      { path: "/configuracion/listas/clasificacion_lubricantes", element: <ClasificacionesDeLubricantes /> },
      { path: "/configuracion/listas/empaques", element: <Empaques /> },
      { path: "/configuracion/listas/fabricantes_lubricantes", element: <FabricantesDeLubricantes /> },
      { path: "/configuracion/listas/lobs", element: <Lobs /> },
      { path: "/configuracion/listas/tipos_lubricantes", element: <TiposDeLubricantes /> },
      { path: "/configuracion/listas/prestadores_servicios", element: <PrestadoresDeServicios /> },

      { path: "/componentes", element: <Componentes /> },
      //{ path: "/componentes/filtered", element: <Componentes /> },
      { path: "/componentes/:slug", element: <VerComponente /> },
      
      { path: "/reportes", element: <Reportes /> },
    ],
  },
];

export default privateRoutes;
