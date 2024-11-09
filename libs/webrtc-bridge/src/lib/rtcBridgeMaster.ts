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


interface AWSClientConfigType {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
    region: string;
}

interface RTCBridgeMasterCallbacks {
    onPeerConnected?: (peerConnection: RTCPeerConnection, clientId: string) => void,
    onSignalingDisconnect?: () => void,
    onSignalingError?: (error: Error) => void,
}

export class RTCBridgeMaster {
    /**
     * Singleton class for managing RTC connections with user clients.
     */

    private static singleton: RTCBridgeMaster | undefined;

    private _channelHelper: ChannelHelper;
    private readonly _callbacks: RTCBridgeMasterCallbacks
    private readonly _clientConfig: AWSClientConfigType;

    // Map of clientId to peerConnection
    private _peerConnections: Map<string, RTCPeerConnection>;

    private constructor(
        callbacks: RTCBridgeMasterCallbacks,
    ) {
        this._callbacks = callbacks;
        this._clientConfig = {
            accessKeyId: import.meta.env['VITE_AWS_ACCESS_KEY_ID'],
            secretAccessKey: import.meta.env['VITE_AWS_SECRET_ACCESS_KEY'],
            sessionToken: import.meta.env['VITE_AWS_SESSION_TOKEN'],
            region: import.meta.env['VITE_KINESIS_REGION'],
        }
        // console.log(`[MASTER]`, 'Client config:', this._clientConfig);

        this._peerConnections = new Map<string, RTCPeerConnection>();

        const channelName = import.meta.env['VITE_KINESIS_CHANNEL_NAME'];
        this._channelHelper = new ChannelHelper(channelName, this._clientConfig, null, KVSWebRTC.Role.MASTER, ChannelHelper.IngestionMode.OFF, "[MASTER]", undefined);
    }

    public static async getInstance(callbacks: RTCBridgeMasterCallbacks): Promise<RTCBridgeMaster> {
        if (!this.singleton) {
            this.singleton = new RTCBridgeMaster(callbacks);
        }
        return this.singleton;
    }

    cleanup(): void {
        this._channelHelper?.getSignalingClient()?.close();
        this._peerConnections.forEach(peerConnection => peerConnection.close());
        this._peerConnections.clear();
        this._callbacks.onSignalingDisconnect?.();
        RTCBridgeMaster.singleton = undefined;
    }

    async startMaster(): Promise<void> {
        await this._channelHelper?.init();
        const iceServers: RTCIceServer[] = [];
        // add STUN and TURN servers
        iceServers.push({urls: `stun:stun.kinesisvideo.${this._clientConfig.region}.amazonaws.com:443`});
        iceServers.push(...(await this._channelHelper.fetchTurnServers()));
        console.log(`[MASTER]`, 'ICE servers:', iceServers);

        const configuration: RTCConfiguration = {
            iceServers,
            iceTransportPolicy: 'all',
        };

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const signalingClient = this._channelHelper.getSignalingClient()!;
        await this._registerSignalingClientCallbacks(signalingClient, configuration);

        console.debug("Opening signaling client...");
        signalingClient.open();
    }

    private async _registerSignalingClientCallbacks(
        signalingClient: KVSWebRTC.SignalingClient,
        rtcConfig: RTCConfiguration,
    ): Promise<void> {

        console.debug("Setting up signaling callbacks...");
        signalingClient.on('open', () => {
            console.debug("Signaling client opened. We're connected to AWS.");
            // nothing more to do here--we just have to wait for user clients to send offers to connect.
        });

        signalingClient.on('sdpOffer', async offer => {
            // we've got an offer from a new client!
            // add them to the list and let our user know.
            const peerConnection = new RTCPeerConnection(rtcConfig);
            this._peerConnections.set(offer.clientId, peerConnection);

            console.debug(`SDP Offer received from peer "${offer.ClientId}"...`, offer);

            // set up some key callbacks for the peer connection, purely those having to do with ICE & signaling.
            // callbacks having to do with tracks & media are handled elsewhere, i.e. by the robot manager.
            peerConnection.addEventListener('icecandidate', ({ candidate }) => {
                console.debug(`ICE candidate generated for peer "${offer.ClientId}"...`, candidate);
                if (candidate) {
                    signalingClient?.sendIceCandidate(candidate);
                } else {
                    console.debug(`No more ICE candidates will be generated for peer "${offer.ClientId}"...`);
                }
            });

            // let our user handle the rest.
            this._callbacks.onPeerConnected?.(peerConnection, offer.clientId);
        });

        signalingClient.on('sdpAnswer', async answer => {
            console.error("SDP Answer received...we shouldn't be getting this here.", answer);
            this._callbacks.onSignalingError?.(answer);
        });

        signalingClient.on('error', error => {
            // Handle client errors
            this._callbacks.onSignalingError?.(error);
        });

        signalingClient.on('statusResponse', (status) => {
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
        console.debug("Signaling callbacks set up.");
    }
}

export default RTCBridgeMaster;