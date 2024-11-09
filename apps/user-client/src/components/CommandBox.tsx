// author: Conor Hayes
import SendIcon from '@mui/icons-material/Send';
import { Button, Paper, Stack, TextField, Typography } from '@mui/material';
import React, { useState } from 'react';

import TerminalScreen from './TerminalScreen';


interface CommandBoxProps {
  onCommandSubmit: (command: string) => void;
}

const CommandBox: React.FC<CommandBoxProps> = ({ onCommandSubmit }) => {
  const [inputText, setInputText] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inputText.trim()) {
      onCommandSubmit(inputText);
      setCommandHistory(prevHistory => [...prevHistory, inputText]);
      setInputText('');
    }
  };

  return (
    <Stack spacing={2}>
      <Paper elevation={3} sx={{ p: 2 }}>
        <Typography variant="h6">Command:</Typography>
        <TerminalScreen commandHistory={commandHistory} />
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              variant="outlined"
              value={inputText}
              onChange={handleInputChange}
              placeholder="Enter command here"
            />
            <Button
              type="submit"
              variant="contained"
              endIcon={<SendIcon />}
            >
              Send Command
            </Button>
          </Stack>
        </form>
      </Paper>
    </Stack>
  );
};

export default CommandBox;
