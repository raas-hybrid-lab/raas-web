import { useState } from 'react'
import { Button } from '@mui/material'
import CameraSelector from './components/CameraSelector'
import RobotList from './components/RobotList'
import './App.css'
import useRobotsManager from './hooks/useRobotsManager'

function App() {

  const { manager, loading, error } = useRobotsManager();

  const [selectedRobot, setSelectedRobot] = useState<string | null>(null)

  const handleCameraSelect = (deviceId: string) => {
    console.log(`Selected camera with deviceId: ${deviceId}`)
  }

  const handleRobotSelect = (robotId: string) => {
    setSelectedRobot(robotId)
  }

  const handleStartWebRTC = () => {
    console.log('Starting WebRTC Master...')
    if (manager) {
      manager.startRTCMaster()
    }
    else {
      console.error('Robots manager not initialized')
    }
  }

  return (
    <div className="app-container">
      <h1>RaaS Lab Client</h1>
      <div className="content-container">
        <div className="left-column">
          <h2>Room Monitor</h2>
          <CameraSelector onSelect={handleCameraSelect} />
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleStartWebRTC}
            sx={{ 
              mt: 2,
              opacity: loading || error ? 0.5 : 1
            }}
            // disabled={error || loading} 
          >
            Start WebRTC Master
          </Button>
        </div>
        <div className="right-column">
          <h2>Active Robots</h2>
          <RobotList onSelect={handleRobotSelect} selectedRobot={selectedRobot} />
        </div>
      </div>
    </div>
  )
}

export default App
