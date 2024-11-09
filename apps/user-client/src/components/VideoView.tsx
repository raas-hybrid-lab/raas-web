import React, { useEffect, useRef } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useVideoStream } from '../hooks/useVideoStream';

interface VideoViewProps {
  title: string;
  source: 'webcam' | 'webrtc';
  webrtcConfig?: RTCConfiguration;
}

const VideoView: React.FC<VideoViewProps> = ({ title, source, webrtcConfig }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { stream, error } = useVideoStream({ source, webrtcConfig });

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (error) {
    return (
      <Paper elevation={3} sx={{ flex: 1 }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" color="error">Error: {error.message}</Typography>
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
