// Hooks for using RTCBridge classes

import { useEffect, useState } from "react";
import { RTCBridgeMaster, RTCBridgeMasterCallbacks, RTCBridgeViewer, RTCBridgeViewerCallbacks } from "@raas-web/webrtc-bridge"


export const useRTCBridgeViewer = (callbacks: RTCBridgeViewerCallbacks) => {
    const [bridge, setBridge] = useState<RTCBridgeViewer | undefined>(undefined);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const setupBridge = async () => {
            try {
                setLoading(true);
                const bridgeInstance = await RTCBridgeViewer.getInstance(callbacks); // Assuming RTCBridgeMaster is the class to instantiate
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

export const useRTCBridgeMaster = (callbacks: RTCBridgeMasterCallbacks) => {
    const [bridge, setBridge] = useState<RTCBridgeMaster | undefined>(undefined);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const setupBridge = async () => {
            try {
                setLoading(true);
                const bridgeInstance = await RTCBridgeMaster.getInstance(callbacks); 
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
