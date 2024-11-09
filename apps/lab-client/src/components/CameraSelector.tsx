import React, { useState, useEffect } from 'react';
import { Button, List, ListItemText, Popover, ListItemButton } from '@mui/material';

interface CameraSelectorProps {
  onSelect: (deviceId: string) => void;
}

const CameraSelector: React.FC<CameraSelectorProps> = ({ onSelect }) => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  useEffect(() => {
    async function getDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setDevices(videoDevices);
      } catch (error) {
        console.error('Error getting video devices:', error);
      }
    }

    getDevices();
  }, []);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (deviceId: string) => {
    onSelect(deviceId);
    handleClose();
  };

  const open = Boolean(anchorEl);
  const id = open ? 'camera-popover' : undefined;

  return (
    <>
      <Button onClick={handleClick} variant="contained">
        Select Room Monitor Camera
      </Button>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <List>
          {devices.map((device) => (
            <ListItemButton 
              key={device.deviceId} 
              onClick={() => handleSelect(device.deviceId)}
            >
              <ListItemText primary={device.label || `Camera ${device.deviceId}`} />
            </ListItemButton>
          ))}
        </List>
      </Popover>
    </>
  );
};

export default CameraSelector;
