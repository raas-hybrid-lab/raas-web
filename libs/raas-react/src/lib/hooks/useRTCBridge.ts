// Hooks for using RTCBridge classes

import { useEffect, useState } from "react";
import { RTCSignalingMaster, RTCSignalingMasterCallbacks, RTCSignalingViewer, RTCSignalingViewerCallbacks } from "@raas-web/webrtc-bridge"


export const useRTCBridgeViewer = (callbacks: RTCSignalingViewerCallbacks) => {
    const [bridge, setBridge] = useState<RTCSignalingViewer | undefined>(undefined);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const setupBridge = async () => {
            try {
                setLoading(true);
                const bridgeInstance = await RTCSignalingViewer.getInstance(callbacks); // Assuming RTCBridgeMaster is the class to instantiate
                setBridge(bridgeInstance);
            } catch (err) {
                setError('Failed to set up RTCBridge with error: ' + err);
            } finally {
                setLoading(false);
            }
        };

        setupBridge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); 

    return { bridge, loading, error };
}

export const useRTCBridgeMaster = (callbacks: RTCSignalingMasterCallbacks) => {
    const [bridge, setBridge] = useState<RTCSignalingMaster | undefined>(undefined);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const setupBridge = async () => {
            try {
                setLoading(true);
                const bridgeInstance = await RTCSignalingMaster.getInstance(callbacks); 
                setBridge(bridgeInstance);
            } catch (err) {
                setError('Failed to set up RTCBridge with error: ' + err);
            } finally {
                setLoading(false);
            }
        };

        setupBridge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); 

    return { bridge, loading, error };
}
