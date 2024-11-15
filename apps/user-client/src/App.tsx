import "./init";
import { ThemeProvider, createTheme, CssBaseline, Container, Typography, Button } from '@mui/material';
// import RobotView from './components/RobotView';
import './App.css';
import { useRTCBridgeViewer } from '@raas-web/raas-react';

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function App() {

  const { bridge, loading, error } = useRTCBridgeViewer({});

  const handleStartWebRTCViewer = async () => {
    console.log('Starting WebRTC Viewer...');
    if (bridge) {
      bridge.start();
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
            opacity: loading || error || !bridge?.isRunning() ? 0.5 : 1
          }}
          // disabled={loading || error || !bridge?.isRunning() }
        >
          Start WebRTC Viewer
        </Button>
        {/* <RobotView /> */}
      </Container>
    </ThemeProvider>
  );
}

export default App;
