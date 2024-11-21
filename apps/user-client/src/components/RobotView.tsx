import React, { useState, useEffect } from 'react';
import { Box, Stack } from '@mui/material';
import CommandBox from './CommandBox';
import VideoView from './VideoView';
import TelemetryBox from './TelemetryBox';
import { RobotController } from '../services/robotController';

const RobotView: React.FC<{ robotController: RobotController }> = ({ robotController }) => {
  const [telemetryHistory, setTelemetryHistory] = useState<string[]>([]);
  const [stream, setStream] = useState(robotController.roomMonitorStream);

  useEffect(() => {
    const updateStream = () => {
      setStream(robotController.roomMonitorStream);
    };

    robotController.setCallbacks({
      onChannelsChanged: updateStream
    });

    return () => {
      // no-op
    };
  }, [robotController]);

  const handleCommandSubmit = (command: string) => {
    // just for easy testing, display the last-entered command in telemetry
    // TODO: actually send the command to the robot here
    setTelemetryHistory([...telemetryHistory, command]);
  };

  return (
    <Box sx={{ flexGrow: 1, p: 2 }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <VideoView title="Room Monitor" stream={stream} />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Box sx={{ flex: 1 }}>
            <CommandBox onCommandSubmit={handleCommandSubmit} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <TelemetryBox telemetryHistory={telemetryHistory} />
          </Box>
        </Stack>
      </Stack>
    </Box>
  );
};

export default RobotView;
