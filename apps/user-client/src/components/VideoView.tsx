import React, { useEffect, useRef } from 'react';
import { Box, Typography, Paper } from '@mui/material';

interface VideoViewProps {
  title: string;
  stream: MediaStream | undefined;
}

const VideoView: React.FC<VideoViewProps> = ({ title, stream }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) {
    return (
      <Paper elevation={3} sx={{ flex: 1 }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" color="error">No stream available</Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ flex: 1 }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Box
          component="video"
          ref={videoRef}
          autoPlay
          playsInline
          controls={false}
          width="100%"
          height="auto"
        />
      </Box>
    </Paper>
  );
};

export default VideoView;
