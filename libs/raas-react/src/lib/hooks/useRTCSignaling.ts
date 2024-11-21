// Hooks for using RTCBridge classes

import { useEffect, useState } from "react";
import { RTCSignalingMaster, RTCSignalingMasterCallbacks, RTCSignalingViewer, RTCSignalingViewerCallbacks } from "@raas-web/webrtc-bridge"


export const useRTCSignalingViewer = (callbacks: RTCSignalingViewerCallbacks) => {
    const [signaling, setSignaling] = useState<RTCSignalingViewer | undefined>(undefined);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const setupSignaling = async () => {
            try {
                setLoading(true);
                const bridgeInstance = await RTCSignalingViewer.getInstance(callbacks); // Assuming RTCBridgeMaster is the class to instantiate
                setSignaling(bridgeInstance);
            } catch (err) {
                setError('Failed to set up RTCBridge with error: ' + err);
            } finally {
                setLoading(false);
            }
        };

        setupSignaling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); 

    return { signaling, loading, error };
}

export const useRTCSignalingMaster = (callbacks: RTCSignalingMasterCallbacks) => {
    const [signaling, setSignaling] = useState<RTCSignalingMaster | undefined>(undefined);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const setupSignaling = async () => {
            try {
                setLoading(true);
                const bridgeInstance = await RTCSignalingMaster.getInstance(callbacks); 
                setSignaling(bridgeInstance);
            } catch (err) {
                setError('Failed to set up RTCBridge with error: ' + err);
            } finally {
                setLoading(false);
            }
        };

        setupSignaling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); 

    return { signaling, loading, error };
}
