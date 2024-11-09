import React, { useRef, useEffect } from 'react';
import { Box, List, ListItem, ListItemText, Typography } from '@mui/material';
import { styled } from '@mui/system';
import styles from './CommandBox.module.css';

const TerminalText = styled(Typography)({
  fontFamily: 'Consolas,Monaco,Lucida Console,Liberation Mono,DejaVu Sans Mono,Bitstream Vera Sans Mono,Courier New',
  fontSize: '14px',
  fontWeight: 700,
  fontStyle: 'italic'
});

interface TerminalScreenProps {
  commandHistory: string[];
}

const TerminalScreen: React.FC<TerminalScreenProps> = ({ commandHistory }) => {
  const historyBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (historyBoxRef.current) {
      historyBoxRef.current.scrollTop = 0; // Scroll to top, which is now the most recent command
    }
  }, [commandHistory]);

  return (
    <Box 
      className={styles.terminalBackground} 
      ref={historyBoxRef} 
      sx={{ 
        height: '200px', 
        overflowY: 'auto', 
        display: 'flex', 
        flexDirection: 'column-reverse' 
      }}
    >
      <List disablePadding>
        {commandHistory.map((cmd, index) => (
          <ListItem key={index} sx={{ py: 0.1 }}>
            <ListItemText primary={<TerminalText>{cmd}</TerminalText>} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default TerminalScreen;
export type { TerminalScreenProps };
export { TerminalText };
