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

export type RTCBridgeMasterCallbacks = {
    onPeerConnected?: (peerConnection: RTCPeerConnection, clientId: string) => void,
    onSignalingDisconnect?: () => void,
    onSignalingError?: (error: Error) => void,
}

export class RTCBridgeMaster extends RTCBridgeBase {
    /**
     * Singleton class for managing RTC connections with user clients.
     */

    private static singleton: RTCBridgeMaster | undefined;
    private _callbacks: RTCBridgeMasterCallbacks

    // Map of clientId to peerConnection
    private _peerConnections: Map<string, RTCPeerConnection>;

    private constructor(
        callbacks: RTCBridgeMasterCallbacks,
    ) {
        const channelName = import.meta.env['VITE_KINESIS_CHANNEL_NAME'];
        super(
            channelName,
            KVSWebRTC.Role.MASTER,
            "[MASTER]",
            undefined
        );
        this._callbacks = callbacks;
        this._peerConnections = new Map<string, RTCPeerConnection>();
    }

    public static async getInstance(callbacks: RTCBridgeMasterCallbacks): Promise<RTCBridgeMaster> {
        if (!this.singleton) {
            this.singleton = new RTCBridgeMaster(callbacks);
        }
        else {
            console.warn("RTCBridgeMaster singleton already exists. Returning existing instance & setting new callbacks.");
            this.singleton._callbacks = callbacks;
        }
        return this.singleton;
    }

    override cleanup(): void {
        super.cleanup();
        this._peerConnections.forEach(peerConnection => peerConnection.close());
        this._peerConnections.clear();
        this._callbacks.onSignalingDisconnect?.();
        RTCBridgeMaster.singleton = undefined;
    }

    protected override async _registerSignalingClientCallbacks(
        signalingClient: KVSWebRTC.SignalingClient,
        rtcConfig: RTCConfiguration,
    ): Promise<void> {

        console.debug("Setting up signaling callbacks...");
        signalingClient.on('open', () => {
            console.debug("Signaling client opened. We're connected to AWS.");
            // nothing more to do here--we just have to wait for user clients to send offers to connect.
        });

        signalingClient.on('sdpOffer', async (offer: RTCSessionDescription, remoteClientId: string | undefined) => {
            // we've got an offer from a new client!
            // add them to the list and let our user know.
            remoteClientId = remoteClientId ?? 'remote';
            console.debug(`SDP Offer received from peer "${remoteClientId}"...`, offer);


            // Close any previous peer connection, in case a peer with the same clientId sends another connection
            const oldPeerConnection = this._peerConnections.get(remoteClientId);
            if (oldPeerConnection && oldPeerConnection.connectionState !== 'closed') {
                oldPeerConnection.close();
            }

            // create & set the new peer connection in our list
            const peerConnection = new RTCPeerConnection(rtcConfig);
            this._peerConnections.set(remoteClientId, peerConnection);

            // set up some key callbacks for the peer connection, purely those having to do with ICE & signaling.
            // callbacks having to do with tracks & media are handled elsewhere, i.e. by the robot manager.
            peerConnection.addEventListener('icecandidate', ({ candidate }) => {
                console.debug(`ICE candidate generated for peer "${remoteClientId}"...`, candidate);
                if (candidate) {
                    signalingClient?.sendIceCandidate(candidate);
                } else {
                    console.debug(`No more ICE candidates will be generated for peer "${remoteClientId}"...`);
                }
            });

            peerConnection.addEventListener('connectionstatechange', () => {
                console.debug('[VIEWER] Peer connection state changed:', peerConnection.connectionState);
            });

            // send an answer to the peer
            console.log(this._loggingPrefix, 'Creating SDP answer for', remoteClientId);
            await peerConnection.setLocalDescription(
                await peerConnection.createAnswer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: true,
                }),
            );
            const sessionDescription = peerConnection.localDescription;
            if (!sessionDescription) {
                throw new Error("No local description to send to lab client...this should never happen.");
            }

            console.log(this._loggingPrefix, 'Sending SDP answer to', remoteClientId);
            const correlationId = this.generateCorrelationId();
            console.debug(this._loggingPrefix, 'SDP answer:', sessionDescription, 'correlationId:', correlationId);
            signalingClient.sendSdpAnswer(sessionDescription, remoteClientId, correlationId);

            console.log(`[MASTER] Peer ${remoteClientId} connected!`);

            // let our user handle the rest.
            this._callbacks.onPeerConnected?.(peerConnection, remoteClientId);
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