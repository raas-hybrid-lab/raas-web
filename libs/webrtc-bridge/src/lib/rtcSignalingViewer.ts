/**
 * The RTCBridgeMaster is responsible for creating and managing the media streams for the RTC connection with the
 * user client.
 * 
 * These streams are roughly analogous to the WebRTC DataChannel and MediaStream, but they are specifically tailored
 * for the needs of this application.
 * 
 * Currently this class is built around AWS Kinesis Video Streams, but it could be adapted to other services in the future.
 */

import * as KVSWebRTC from 'amazon-kinesis-video-streams-webrtc';
import { RTCSignalingBase } from './rtcSignalingBase';
import { v4 as uuid } from 'uuid';
import { RTCPeerWrapper } from './rtcPeerWrapper';


export type RTCSignalingViewerCallbacks = {
    onMasterConnected?: (peerConnection: RTCPeerWrapper) => void,
    onSignalingDisconnect?: () => void,
    onSignalingError?: (error: Error | object) => void,
}

// the sdk doesn't define this response type, so we need to define it ourselves.
// Define the type for the status response
type StatusResponseInner = {
    correlationId: string;
    errorType: string;
    statusCode: string;
    description: string;
};

// Define the main type
type SignalingClientStatusResponse = {
    senderClientId: string;
    messageType: string;
    messagePayload: string;
    statusResponse: StatusResponseInner;
};

export class RTCSignalingViewer extends RTCSignalingBase {
    /**
     * Singleton class for managing the RTC connection with the lab client.
     */

    private static singleton: RTCSignalingViewer | undefined;
    private _callbacks: RTCSignalingViewerCallbacks
    private _peerConnection: RTCPeerWrapper | undefined;

    private constructor(
        callbacks: RTCSignalingViewerCallbacks,
    ) {
        const channelName = import.meta.env['VITE_KINESIS_CHANNEL_NAME'];
        const clientId = RTCSignalingViewer.generateClientId();

        super(
            channelName,
            KVSWebRTC.Role.VIEWER,
            "[VIEWER]",
            clientId
        );
        this._callbacks = callbacks;
        this._peerConnection = undefined;
    }

    public static async getInstance(callbacks: RTCSignalingViewerCallbacks): Promise<RTCSignalingViewer> {
        if (!this.singleton) {
            this.singleton = new RTCSignalingViewer(callbacks);
        }
        else {
            console.warn("RTCBridgeViewer singleton already exists. Returning existing instance & setting new callbacks.");
            this.singleton._callbacks = callbacks;
        }
        return this.singleton;
    }

    override cleanup(): void {
        super.cleanup();
        this._callbacks.onSignalingDisconnect?.();
        RTCSignalingViewer.singleton = undefined;
    }

    get peerConnection(): RTCPeerWrapper | undefined {
        return this._peerConnection;
    }

    protected override async _registerSignalingClientCallbacks(
        signalingClient: KVSWebRTC.SignalingClient,
        rtcConfig: RTCConfiguration,
    ): Promise<void> {

        signalingClient.on('open', async () => {
            console.debug("Signaling client opened. We're connected to AWS. Making offer to lab client...");

            // create a peer connection and send an offer to the lab client.
            this._peerConnection = new RTCPeerWrapper(new RTCPeerConnection(rtcConfig), this, undefined, true);
        });

        const addIceCandidate = async (candidate: RTCIceCandidate) => {
            await this._peerConnection?.addIceCandidate(candidate);
        };

        signalingClient.on('iceCandidate', addIceCandidate);

        signalingClient.on('sdpOffer', async (offer: RTCSessionDescription) => {
            console.log("SDP Offer received--due to negotiation needed:", offer);
            
        });

        signalingClient.on('sdpAnswer', async (answer: RTCSessionDescription) => {
            // we've got an answer from the lab client!
            console.debug('[VIEWER] Received SDP answer');
            console.debug('SDP answer:', answer);

            // let our user handle the rest.
            if (this._peerConnection) {
                await this._peerConnection.setRemoteDescription(answer);
                await this._peerConnection.awaitReadyToNegotiate();
                console.log('[VIEWER] Connected to lab client!');
                this._callbacks.onMasterConnected?.(this._peerConnection);
            }
            else {
                console.error("No peer connection to send to user upon SDP Answer...this shouldn't happen.");
            }
        });

        signalingClient.on('close', () => {
            // the signaling client has closed.
            // this means that we're disconnected from AWS and can't receive new peer connections. 
            // TODO handle this by awaiting a new client connection
            // for now we'll just let the user handle it.
            console.error("Signaling client closed. We're disconnected from AWS.");
            this._callbacks.onSignalingDisconnect?.();
        });

        signalingClient.on('error', (error: Error) => {
            // Handle client errors
            console.error("Signaling client error...", error);
            this._callbacks.onSignalingError?.(error);
        });

        signalingClient.on('statusResponse', (status: SignalingClientStatusResponse) => {
            // according to the docs, this only happens on errors. They don't specify more.
            // we'll see if it ever shows up.
            console.debug("Signaling client status response...", status);
            this._callbacks.onSignalingError?.(status);
        })

    }

    static generateClientId(): string {
        // eventually will use user-associated clientId once we have user auth
        return "raas-viewer-" + uuid();
    }

}

export default RTCSignalingViewer;