/**
 * Wrapper class for RTCPeerConnection. Signaling client agnostic. 
 * Exposes a simplified interface to RTCPeerConnection.
 */

import type { RTCSignalingBase } from './rtcSignalingBase';


/**
 * RTCPeerWrapper is a wrapper class for RTCPeerConnection. 
 * It is signaling client agnostic and provides a simplified interface to RTCPeerConnection.
 * 
 * It is created by the signaling client (RTCBridgeMaster or RTCBridgeViewer) and handles
 * all callbacks etc for the RTCPeerConnection instance once it's created.
 */
export class RTCPeerWrapper {
    private _peer: RTCPeerConnection;
    private _signalingClient: RTCSignalingBase;
    private _remoteClientId: string | undefined;

    private _dataChannels: Map<string, RTCDataChannel> = new Map();
    private _streams: Map<string, MediaStream> = new Map();

    constructor(peer: RTCPeerConnection, signalingClient: RTCSignalingBase, remoteClientId: string | undefined) {
        this._peer = peer;
        this._signalingClient = signalingClient;
        remoteClientId = remoteClientId ?? 'master'; // default to master if no id is provided
        this._remoteClientId = remoteClientId;

        // set up some key callbacks for the peer connection
        peer.addEventListener('icecandidate', ({ candidate }) => {
            console.debug(`ICE candidate generated for peer "${remoteClientId}"...`, candidate);
            if (candidate) {
                signalingClient?.sendIceCandidate(candidate);
            } else {
                console.debug(`No more ICE candidates will be generated for peer "${remoteClientId}"...`);
            }
        });

        peer.addEventListener('connectionstatechange', () => {
            console.log(`[PEER] Peer connection state changed for peer "${remoteClientId}":`, peer.connectionState);
        });

        peer.addEventListener('signalingstatechange', () => {
            console.log(`[PEER] Peer signaling state changed for peer "${remoteClientId}":`, peer.signalingState);
        });

        peer.addEventListener('track', (event) => {
            console.log('[PEER] Track event:', event);
        });

        peer.addEventListener('negotiationneeded', () => {
            console.debug(`[PEER] Negotiation needed for peer "${remoteClientId}"...`);
            peer.createOffer().then(answer => peer.setLocalDescription(answer))
                .then(() => {
                    if (peer.localDescription) {
                        signalingClient.sendSdpOffer(peer.localDescription);
                        console.info(`[PEER] Negotiation offer sent for peer "${remoteClientId}"...`);
                    }
                    else {
                        console.error(`[PEER] No local description to send for peer "${remoteClientId}"...`);
                    }
                })
                .catch(error => {
                    console.error(`[PEER] Error sending negotiation answer for peer "${remoteClientId}":`, error);
                });
        });
        console.log(`[PEER] Peer "${remoteClientId}" connected!`);
    }

    get peerId(): string | undefined {
        return this._remoteClientId;
    }

    /**
     * Internal peer connection instance. This should not be used outside of the signaling clients.
     */
    get _internalPeerConnection(): RTCPeerConnection {
        return this._peer;
    }

    /**
     * Add a video/audio stream to the peer connection.
     * 
     * This will trigger the negotiationneeded event on the peer connection
     * 
     * @param stream - The stream to add.
     */
    public addStream(stream: MediaStream, label: string) {
        console.debug(`[PEER] Adding stream ${label} to peer "${this._remoteClientId}"...`, stream);
        this._streams.set(label, stream);

        // todo figure out how to get the label to the other peer
        // will need a metadata channel of some kind.
        for (const track of stream.getTracks()) {
            this._peer.addTrack(track, stream);
        }
    }

    /**
     * Add a data channel to the peer connection.
     * 
     * @param label - The label of the data channel.
     * @returns The data channel.
     */
    public addDataChannel(label: string): void {
        const dataChannel = this._peer.createDataChannel(label);
        this._dataChannels.set(label, dataChannel);
    }
}