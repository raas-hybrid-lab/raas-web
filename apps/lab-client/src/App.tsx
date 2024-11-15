import { useState } from 'react'
import { Button } from '@mui/material'
import CameraSelector from './components/CameraSelector'
import RobotList from './components/RobotList'
import './App.css'
import useRobotsManager from './hooks/useRobotsManager'
import RobotsManager, { DriverClass } from './services/robotsManager'

function App() {

  const { manager, rtcMaster, loading: robotsLoading, error: robotsError } = useRobotsManager({});

  const [selectedRobot, setSelectedRobot] = useState<string | null>(null)

  const handleCameraSelect = (deviceId: string) => {
    console.log(`Selected camera with deviceId: ${deviceId}`)
  }

  const handleRobotSelect = (driver: DriverClass) => {
    setSelectedRobot(driver.robotName);
    manager?.connectRobot(driver);
  }

  const handleStartWebRTC = () => {
    console.log('Starting WebRTC Master...')
    if (rtcMaster) {
      rtcMaster.start()
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
              opacity: robotsLoading || robotsError ? 0.5 : 1
            }}
            disabled={rtcMaster?.isRunning() ?? false}
          >
            Start WebRTC Master
          </Button>
        </div>
        <div className="right-column">
          <h2>Available Robots</h2>
          <RobotList onSelect={handleRobotSelect} selectedRobot={selectedRobot} robots={RobotsManager.possibleDrivers ?? []} />
        </div>
      </div>
    </div>
  )
}

export default App
