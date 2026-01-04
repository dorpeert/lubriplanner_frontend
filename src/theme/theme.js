import { createTheme } from '@mui/material/styles';

// 🎨 Tema global MUI para tu proyecto de lubricantes
const theme = createTheme({
  palette: {
    mode: 'light', // Cambia a 'dark' si prefieres modo oscuro
    primary: {
      main: '#3A4D9C', // azul petróleo (puede representar lubricantes industriales)
    },
    secondary: {
      main: '#ff9800', // naranja vibrante (energía, maquinaria)
    },
    background: {
      default: '#ffffff', // fondo claro general
      paper: '#f5f5f5',   // fondo de tarjetas y contenedores
    },
    text: {
      primary: '#212121',
      secondary: '#595959',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2.5rem', fontWeight: 700 },
    h2: { fontSize: '2rem', fontWeight: 600 },
    h3: { fontSize: '1.5rem', fontWeight: 500 },
    body1: { fontSize: '1rem', lineHeight: 1.6 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 8, // bordes suaves
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          padding: '8px 16px',
        },
      },
    },
  },
});

export default theme;
