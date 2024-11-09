import React, { useState } from 'react';
import { Box, Stack } from '@mui/material';
import CommandBox from './CommandBox';
import VideoView from './VideoView';
import TelemetryBox from './TelemetryBox';

const RobotView: React.FC = () => {
  const [telemetryHistory, setTelemetryHistory] = useState<string[]>([]);

  const handleCommandSubmit = (command: string) => {
    // just for easy testing, display the last-entered command in telemetry
    // TODO: actually send the command to the robot here
    setTelemetryHistory([...telemetryHistory, command]);
  };

  return (
    <Box sx={{ flexGrow: 1, p: 2 }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <VideoView title="Front Camera" source="webcam" />
          <VideoView title="Room Monitor" source="webcam" />
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
