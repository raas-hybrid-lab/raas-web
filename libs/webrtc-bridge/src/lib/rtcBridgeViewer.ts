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
import ChannelHelper from './channelHelper';
import { AWSClientArgs, loadAWSClientArgs } from './awsConfig';


type RTCBridgeViewerCallbacks = {
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

export class RTCBridgeViewer {
    /**
     * Singleton class for managing the RTC connection with the lab client.
     */

    private static singleton: RTCBridgeViewer | undefined;

    private _channelHelper: ChannelHelper;
    private readonly _callbacks: RTCBridgeViewerCallbacks
    private readonly _clientConfig: AWSClientArgs;

    // peerConnection to the lab client
    private peerConnection: RTCPeerConnection | undefined;

    private constructor(
        callbacks: RTCBridgeViewerCallbacks,
    ) {
        this._callbacks = callbacks;
        this._clientConfig = loadAWSClientArgs();

        const channelName = import.meta.env['VITE_KINESIS_CHANNEL_NAME'];
        const clientId = import.meta.env['VITE_KINESIS_CLIENT_ID'];
        this._channelHelper = new ChannelHelper(
            channelName, 
            this._clientConfig, 
            null, 
            KVSWebRTC.Role.VIEWER, 
            ChannelHelper.IngestionMode.OFF, 
            "[VIEWER]", 
            clientId
        );
        this.peerConnection = undefined;
    }

    public static async getInstance(callbacks: RTCBridgeViewerCallbacks): Promise<RTCBridgeViewer> {
        if (!this.singleton) {
            this.singleton = new RTCBridgeViewer(callbacks);
        }
        return this.singleton;
    }

    cleanup(): void {
        this._channelHelper.getSignalingClient()?.close();
        this._callbacks.onSignalingDisconnect?.();
    }


    async startViewer(): Promise<void> {
        await this._channelHelper?.init();
        const iceServers: RTCIceServer[] = [];
        // add STUN and TURN servers
        iceServers.push({urls: `stun:stun.kinesisvideo.${this._clientConfig.region}.amazonaws.com:443`});
        iceServers.push(...(await this._channelHelper.fetchTurnServers()));
        console.log(`[VIEWER]`, 'ICE servers:', iceServers);

        const configuration: RTCConfiguration = {
            iceServers,
            iceTransportPolicy: 'all',
        };

        const signalingClient = this._channelHelper.getSignalingClient();
        await this._registerSignalingClientCallbacks(signalingClient, configuration);

        console.debug("Opening signaling client...");
        signalingClient.open();
    }


    private async _registerSignalingClientCallbacks(
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
                signalingClient.sendSdpOffer(this.peerConnection.localDescription);
            }
            else {
                // unsure why this would happen, but typing indicates it's possible
                throw new Error("No local description to send to lab client.");
            }

            // set up some key callbacks for the peer connection, purely those having to do with ICE & signaling.
            // callbacks having to do with tracks & media are handled elsewhere, i.e. by the robot manager.
            this.peerConnection?.addEventListener('icecandidate', ({ candidate }) => {
                console.debug(`ICE candidate generated...`, candidate);
                if (candidate) {
                    signalingClient.sendIceCandidate(candidate);
                } else {
                    console.debug(`No more ICE candidates will be generated.`);
                }
            });

        });

        signalingClient.on('sdpOffer', async (offer: RTCSessionDescription) => {
            console.error("SDP Offer received...we shouldn't be getting this in the user client.", offer);
            this._callbacks.onSignalingError?.(offer);
        });

        signalingClient.on('sdpAnswer', async (answer: RTCSessionDescription) => {
            // we've got an answer from the lab client!
            console.debug(`SDP Answer received...`, answer);

            // let our user handle the rest.
            if (this.peerConnection) {
                this._callbacks.onMasterConnected?.(this.peerConnection);
            }
            else {
                console.error("No peer connection to send to user upon SDP Answer...this shouldn't happen.");
            }
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

        signalingClient.on('close', () => {
            // the signaling client has closed.
            // this means that we're disconnected from AWS and can't receive new peer connections. 
            // TODO handle this by awaiting a new client connection
            // for now we'll just let the user handle it.
            console.error("Signaling client closed. We're disconnected from AWS.");
            this._callbacks.onSignalingDisconnect?.();
        });
    }

}

export default RTCBridgeViewer;