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
import { RTCSignalingBase } from './rtcBridgeBase';
import { v4 as uuid } from 'uuid';


export type RTCSignalingViewerCallbacks = {
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

export class RTCSignalingViewer extends RTCSignalingBase {
    /**
     * Singleton class for managing the RTC connection with the lab client.
     */

    private static singleton: RTCSignalingViewer | undefined;
    private _callbacks: RTCSignalingViewerCallbacks
    private _peerConnection: RTCPeerConnection | undefined;

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

    get peerConnection(): RTCPeerConnection | undefined {
        return this._peerConnection;
    }

    protected override async _registerSignalingClientCallbacks(
        signalingClient: KVSWebRTC.SignalingClient,
        rtcConfig: RTCConfiguration,
    ): Promise<void> {

        signalingClient.on('open', async () => {
            console.debug("Signaling client opened. We're connected to AWS. Making offer to lab client...");

            // create a peer connection and send an offer to the lab client.
            this._peerConnection = new RTCPeerConnection(rtcConfig);
            const offer = await this._peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            });
            await this._peerConnection.setLocalDescription(offer);
            if (this._peerConnection.localDescription) {
                console.debug('[VIEWER] Sending SDP offer with local description:', this._peerConnection.localDescription);
                signalingClient.sendSdpOffer(this._peerConnection.localDescription);
            }
            else {
                // unsure why this would happen, but typing indicates it's possible
                throw new Error("No local description to send to lab client.");
            }
            console.debug('[VIEWER] Sent SDP offer to lab client. Generating ICE candidates...');

            // set up some key callbacks for the peer connection, purely those having to do with ICE & signaling.
            // callbacks having to do with tracks & media are handled elsewhere, i.e. by the robot manager.
            this._peerConnection.addEventListener('icecandidate', ({ candidate }) => {
                console.debug(`ICE candidate generated. Sending to lab client...`, candidate);
                if (candidate) {
                    signalingClient.sendIceCandidate(candidate);
                } else {
                    console.debug(`No more ICE candidates will be generated.`);
                }
            });

            this._peerConnection.addEventListener('connectionstatechange', () => {
                console.debug('[VIEWER] Peer connection state changed:', this._peerConnection?.connectionState);
            });

        });

        signalingClient.on('sdpOffer', async (offer: RTCSessionDescription) => {
            console.log("SDP Offer received--due to negotiation needed:", offer);
            
        });

        signalingClient.on('sdpAnswer', async (answer: RTCSessionDescription) => {
            // we've got an answer from the lab client!
            console.debug('[VIEWER] Received SDP answer');
            console.debug('SDP answer:', answer);

            // let our user handle the rest.
            if (this._peerConnection) {
                console.log('[VIEWER] Connected to lab client!');
                await this._peerConnection.setRemoteDescription(answer);
                this._callbacks.onMasterConnected?.(this._peerConnection);
            }
            else {
                console.error("No peer connection to send to user upon SDP Answer...this shouldn't happen.");
            }

            this._peerConnection?.addEventListener('negotiationneeded', () => {
                console.log('[VIEWER] Negotiation needed...sending offer...');
                this._peerConnection?.createOffer().then(answer => this._peerConnection?.setLocalDescription(answer));
                if (this._peerConnection?.localDescription) {
                    console.log('[VIEWER] Sending SDP answer with local description:', this._peerConnection.localDescription);
                    signalingClient.sendSdpAnswer(this._peerConnection.localDescription);
                }
                else {
                    console.error('[VIEWER] No local description to send to lab client upon SDP Answer...this shouldn\'t happen.');
                }
            });
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