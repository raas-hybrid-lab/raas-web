import { Paper, Typography } from '@mui/material';
import TerminalScreen from './TerminalScreen';

interface TelemetryDisplayProps {
  telemetryHistory: string[];
}

const TelemetryBox: React.FC<TelemetryDisplayProps> = ({ telemetryHistory }) => {
  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Typography variant="h6">Telemetry:</Typography>
      <TerminalScreen commandHistory={telemetryHistory} />
    </Paper>
  );
};

export default TelemetryBox;
