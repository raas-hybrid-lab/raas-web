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
import { RTCBridgeBase } from './rtcBridgeBase';


export type RTCBridgeViewerCallbacks = {
    onMasterConnected?: (peerConnection: RTCPeerConnection) => void,
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

export class RTCBridgeViewer extends RTCBridgeBase {
    /**
     * Singleton class for managing the RTC connection with the lab client.
     */

    private static singleton: RTCBridgeViewer | undefined;
    private _callbacks: RTCBridgeViewerCallbacks
    private peerConnection: RTCPeerConnection | undefined;

    private constructor(
        callbacks: RTCBridgeViewerCallbacks,
    ) {
        const channelName = import.meta.env['VITE_KINESIS_CHANNEL_NAME'];
        // hardcoded for now--not sure if we need to make this dynamic
        const clientId = "raas-viewer";

        super(
            channelName,
            KVSWebRTC.Role.VIEWER,
            "[VIEWER]",
            clientId
        );
        this._callbacks = callbacks;
        this.peerConnection = undefined;
    }

    public static async getInstance(callbacks: RTCBridgeViewerCallbacks): Promise<RTCBridgeViewer> {
        if (!this.singleton) {
            this.singleton = new RTCBridgeViewer(callbacks);
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
        RTCBridgeViewer.singleton = undefined;
    }

    protected override async _registerSignalingClientCallbacks(
        signalingClient: KVSWebRTC.SignalingClient,
        rtcConfig: RTCConfiguration,
    ): Promise<void> {

        signalingClient.on('open', async () => {
            console.debug("Signaling client opened. We're connected to AWS. Making offer to lab client...");

            // create a peer connection and send an offer to the lab client.
            this.peerConnection = new RTCPeerConnection(rtcConfig);
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            });
            await this.peerConnection.setLocalDescription(offer);
            if (this.peerConnection.localDescription) {
                console.debug('[VIEWER] Sending SDP offer with local description:', this.peerConnection.localDescription);
                signalingClient.sendSdpOffer(this.peerConnection.localDescription);
            }
            else {
                // unsure why this would happen, but typing indicates it's possible
                throw new Error("No local description to send to lab client.");
            }
            console.debug('[VIEWER] Sent SDP offer to lab client. Generating ICE candidates...');

            // set up some key callbacks for the peer connection, purely those having to do with ICE & signaling.
            // callbacks having to do with tracks & media are handled elsewhere, i.e. by the robot manager.
            this.peerConnection.addEventListener('icecandidate', ({ candidate }) => {
                console.debug(`ICE candidate generated. Sending to lab client...`, candidate);
                if (candidate) {
                    signalingClient.sendIceCandidate(candidate);
                } else {
                    console.debug(`No more ICE candidates will be generated.`);
                }
            });

            this.peerConnection.addEventListener('connectionstatechange', () => {
                console.debug('[VIEWER] Peer connection state changed:', this.peerConnection?.connectionState);
            });

        });

        signalingClient.on('sdpOffer', async (offer: RTCSessionDescription) => {
            console.error("SDP Offer received...we shouldn't be getting this in the user client.", offer);
            this._callbacks.onSignalingError?.(offer);
        });

        signalingClient.on('sdpAnswer', async (answer: RTCSessionDescription) => {
            // we've got an answer from the lab client!
            console.log('[VIEWER] Received SDP answer');
            console.debug('SDP answer:', answer);

            // let our user handle the rest.
            if (this.peerConnection) {
                await this.peerConnection.setRemoteDescription(answer);
                this._callbacks.onMasterConnected?.(this.peerConnection);
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

}

export default RTCBridgeViewer;