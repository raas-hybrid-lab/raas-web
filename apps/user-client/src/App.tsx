import "./init";
// import React from 'react';
import { ThemeProvider, createTheme, CssBaseline, Container, Typography } from '@mui/material';
import RobotView from './components/RobotView';
import './App.css';
import RTCBridgeViewer from './services/rtcBridgeViewer';

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function App() {

  const rtcBridgeViewer = RTCBridgeViewer.getInstance({});
  rtcBridgeViewer.then(viewer => viewer.startViewer());

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg">
        <Typography variant="h3" component="h1" gutterBottom sx={{ mt: 4, mb: 2 }}>
          Robot Control Panel
        </Typography>
        <RobotView />
      </Container>
    </ThemeProvider>
  );
}

export default App;
