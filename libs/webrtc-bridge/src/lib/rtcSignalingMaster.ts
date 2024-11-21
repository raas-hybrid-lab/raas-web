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

import { RTCPeerWrapper } from './rtcPeerWrapper';

export type RTCSignalingMasterCallbacks = {
    onPeerConnected?: (peerConnection: RTCPeerWrapper) => void,
    onSignalingDisconnect?: () => void,
    onSignalingError?: (error: Error) => void,
}

/**
 * Singleton class for managing RTC connections with user clients.
 */
export class RTCSignalingMaster extends RTCSignalingBase {
    private static singleton: RTCSignalingMaster | undefined;
    private _callbacks: RTCSignalingMasterCallbacks

    // Map of clientId to peerConnection
    private _peerConnections: Map<string, RTCPeerWrapper>;

    private constructor(
        callbacks: RTCSignalingMasterCallbacks,
    ) {
        const channelName = import.meta.env['VITE_KINESIS_CHANNEL_NAME'];
        super(
            channelName,
            KVSWebRTC.Role.MASTER,
            "[MASTER]",
            undefined
        );
        this._callbacks = callbacks;
        this._peerConnections = new Map<string, RTCPeerWrapper>();
    }

    public static async getInstance(callbacks: RTCSignalingMasterCallbacks): Promise<RTCSignalingMaster> {
        if (!this.singleton) {
            this.singleton = new RTCSignalingMaster(callbacks);
        }
        else {
            console.warn("RTCBridgeMaster singleton already exists. Returning existing instance & setting new callbacks.");
            this.singleton._callbacks = callbacks;
        }
        return this.singleton;
    }

    override cleanup(): void {
        super.cleanup();
        this._peerConnections.forEach(peerConnection => peerConnection._internalPeerConnection.close());
        this._peerConnections.clear();
        this._callbacks.onSignalingDisconnect?.();
        RTCSignalingMaster.singleton = undefined;
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
            if (oldPeerConnection && oldPeerConnection._internalPeerConnection.connectionState !== 'closed') {
                oldPeerConnection._internalPeerConnection.close();
            }

            // create & set the new peer connection in our list
            const peerConnection = new RTCPeerConnection(rtcConfig);
            const peerWrapper = new RTCPeerWrapper(peerConnection, this, remoteClientId);
            this._peerConnections.set(remoteClientId, peerWrapper);

            const addIceCandidate = async (candidate: RTCIceCandidate, candidateClientId: string) => {
                if (remoteClientId !== candidateClientId) {
                    // Ignore ICE candidates not directed for this PeerConnection (when multiple
                    // viewer participants are connecting to the same signaling channel).
                    return;
                }

                // Add the ICE candidate received from the client to the peer connection
                peerConnection.addIceCandidate(candidate);
            };

            signalingClient.on('iceCandidate', addIceCandidate);

            await peerConnection.setRemoteDescription(offer);

            // Create an SDP answer to send back to the client
            console.debug(this._loggingPrefix, 'Creating SDP answer for', remoteClientId);
            await peerConnection.setLocalDescription(
                await peerConnection.createAnswer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: true,
                }),
            );

            console.debug(this._loggingPrefix, 'Sending SDP answer to', remoteClientId);
            const correlationId = this.generateCorrelationId();
            console.debug(this._loggingPrefix, 'SDP answer:', peerConnection.localDescription, 'correlationId:', correlationId);
            if (peerConnection.localDescription) {
                signalingClient.sendSdpAnswer(peerConnection.localDescription, remoteClientId, correlationId);
            }
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

export default RTCSignalingMaster;