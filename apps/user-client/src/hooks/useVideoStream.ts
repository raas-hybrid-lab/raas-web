import { useState, useEffect } from 'react';

type VideoSource = 'webcam' | 'webrtc';

interface UseVideoStreamOptions {
  source: VideoSource;
  webrtcConfig?: RTCConfiguration; // Add any WebRTC specific options here
}

export function useVideoStream({ source, webrtcConfig }: UseVideoStreamOptions) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function setupStream() {
      try {
        let newStream: MediaStream;

        switch (source) {
          case 'webcam':
            newStream = await navigator.mediaDevices.getUserMedia({ video: true });
            break;
          case 'webrtc':
            // Implement WebRTC connection logic here
            // This is a placeholder and needs to be replaced with actual WebRTC setup
            newStream = new MediaStream();
            console.warn('WebRTC stream not implemented');
            break;
          default:
            throw new Error(`Unsupported video source: ${source}`);
        }

        if (isMounted) {
          setStream(newStream);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('An unknown error occurred'));
        }
      }
    }

    setupStream();

    return () => {
      isMounted = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [source, webrtcConfig]);

  return { stream, error };
}
