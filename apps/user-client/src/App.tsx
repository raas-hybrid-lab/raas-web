import "./init";
import { ThemeProvider, createTheme, CssBaseline, Container, Typography, Button } from '@mui/material';
import RobotView from './components/RobotView';
import './App.css';
import { RTCBridgeViewer } from '@raas-web/webrtc-bridge';

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function App() {
  const handleStartWebRTCViewer = async () => {
    console.log('Starting WebRTC Viewer...');
    const rtcBridgeViewer = await RTCBridgeViewer.getInstance({});
    rtcBridgeViewer.start();
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
          sx={{ mb: 2 }}
        >
          Start WebRTC Viewer
        </Button>
        {/* <RobotView /> */}
      </Container>
    </ThemeProvider>
  );
}

export default App;
