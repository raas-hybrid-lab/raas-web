import "./init";
import { ThemeProvider, createTheme, CssBaseline, Container, Typography, Button } from '@mui/material';
// import RobotView from './components/RobotView';
import './App.css';
import { useRTCSignalingViewer } from '@raas-web/raas-react';
import RobotView from "./components/RobotView";
import { RobotController } from "./services/robotController";
import { useState } from "react";

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function App() {
  const [robotController, setRobotController] = useState<RobotController | undefined>(undefined);

  const { signaling, loading, error } = useRTCSignalingViewer({
    onMasterConnected(peerConnection) {
      const robotController = new RobotController(peerConnection, {});
      setRobotController(robotController);
    },
  });

  const handleStartWebRTCViewer = async () => {
    console.log('Starting WebRTC Viewer...');
    if (signaling) {
      signaling.start();
    } else {
      console.error('RTCBridgeViewer not initialized');
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg">
        <Typography variant="h3" component="h1" gutterBottom sx={{ mt: 4, mb: 2 }}>
          Robot Control Panel
        </Typography>
        <Button 
          variant="contained" 
          color="primary"
          onClick={handleStartWebRTCViewer}
          sx={{ 
            mb: 2,
            opacity: loading || error || !signaling?.isRunning() ? 0.5 : 1
          }}
          disabled={signaling?.isRunning() ?? false}
        >
          Start WebRTC Viewer
        </Button>
        {robotController && <RobotView robotController={robotController} />}
      </Container>
    </ThemeProvider>
  );
}

export default App;
