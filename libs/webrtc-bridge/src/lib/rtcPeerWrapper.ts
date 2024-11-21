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

    private _metadataChannel: RTCDataChannel | undefined;
    private _dataChannels: Map<string, RTCDataChannel> = new Map();
    private _streams: Map<string, MediaStream> = new Map();

    constructor(peer: RTCPeerConnection, signalingClient: RTCSignalingBase, remoteClientId: string | undefined, createMetadataChannel = false) {
        this._peer = peer;
        this._signalingClient = signalingClient;
        remoteClientId = remoteClientId ?? 'master'; // default to master if no id is provided
        this._remoteClientId = remoteClientId;

        if (createMetadataChannel) {
            // if not, we'll expect one to come in via the datachannel event
            this._metadataChannel = this._peer.createDataChannel('metadata');
            this._metadataChannel.onopen = () => {
                console.log('[PEER] Metadata channel opened.');

                this._metadataChannel?.send('hello');
            };
            console.log('[PEER] Created metadata channel.');
        }

        // set up some key callbacks for the peer connection
        peer.addEventListener('icecandidate', ({ candidate }) => {
            // console.debug(`ICE candidate generated for peer "${remoteClientId}"...`, candidate);
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

        peer.addEventListener('datachannel', (event: RTCDataChannelEvent) => {
            console.log('[PEER] datachannel event:', event);
            if (event.channel.label === 'metadata') {
                this._metadataChannel = event.channel;
            } else {
                this._dataChannels.set(event.channel.label, event.channel);
            }
        });

        peer.addEventListener('negotiationneeded', () => {
            this._onNegotiationNeeded();
        });
        console.log(`[PEER] Peer "${remoteClientId}" connected!`);
    }

    private async _onNegotiationNeeded() {
        console.debug(`[PEER] Negotiation needed for peer "${this._remoteClientId}"...`);
        console.warn(`[PEER] Renegotiation is not yet supported.`);
        // TODO send offer using the metadata channel--aws signaling channel doesn't support renegotiation
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