import { useMemo, useState } from 'react';
import { createTheme } from '@mui/material/styles';

export const useColorMode = () => {
  const [mode, setMode] = useState('light');

  const colorMode = {
    toggleColorMode: () => {
      setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
    },
  };

  // 🎨 Define los temas para claro y oscuro
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === 'light'
            ? {
                primary: { main: '#2C245D' },
                secondary: { main: '#ff9800' },
                background: { default: '#f5f5f5', paper: '#ffffff' },
                text: { primary: '#212121', secondary: '#757575' },
              }
            : {
                primary: { main: '#9692AE' },
                secondary: { main: '#ffb74d' },
                background: { default: '#121212', paper: '#1e1e1e' },
                text: { primary: '#ffffff', secondary: '#bdbdbd' },
              }),
        },
        typography: {
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        },
        shape: { borderRadius: 4 },
      }),
    [mode]
  );

  return [theme, colorMode];
};
