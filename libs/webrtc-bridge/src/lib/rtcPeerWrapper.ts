/**
 * Wrapper class for RTCPeerConnection. Signaling client agnostic. 
 * Exposes a simplified interface to RTCPeerConnection.
 */

import type { RTCSignalingBase } from './rtcSignalingBase';
import { PeerMetadataChannel } from './metadataChannel';


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

    private _metadataChannel: PeerMetadataChannel | undefined;
    private _dataChannels: Map<string, RTCDataChannel> = new Map();
    private _streams: Map<string, MediaStream> = new Map();

    constructor(peer: RTCPeerConnection, signalingClient: RTCSignalingBase, remoteClientId: string | undefined, createMetadataChannel = false) {
        this._peer = peer;
        this._signalingClient = signalingClient;
        remoteClientId = remoteClientId ?? 'master'; // default to master if no id is provided
        this._remoteClientId = remoteClientId;

        if (createMetadataChannel) {
            // if not, we'll expect one to come in via the datachannel event
            const metadata = this._peer.createDataChannel('metadata');
            metadata.onopen = () => {
                this._metadataChannel = new PeerMetadataChannel(metadata, { 
                    onSdpOffer: this._onNegotiationRequested, 
                    onSdpAnswer: this._onNegotiationAnswer 
                });
            };
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
                this._metadataChannel = new PeerMetadataChannel(
                    event.channel, 
                    { 
                        onSdpOffer: this._onNegotiationRequested, 
                        onSdpAnswer: this._onNegotiationAnswer 
                    }
                );
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
        if (!this._metadataChannel) {
            console.log("skipping initial negotiation--waiting for metadata channel.");
            return;
        }
        const offer = await this._internalPeerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
        });

        await this._internalPeerConnection.setLocalDescription(offer);
        if (this._internalPeerConnection.localDescription) {
            this._metadataChannel.sendSDPOffer(this._internalPeerConnection.localDescription);
        }
        else {
            console.error("No local description to send to peer.");
        }
    }

    private async _onNegotiationRequested(offer: RTCSessionDescription) {
        console.debug(`[PEER] Connection renegotiation requested by peer "${this._remoteClientId}"...`, offer);
        console.debug('[PEER] Creating SDP answer for', this._remoteClientId);
        const answer = await this._internalPeerConnection.createAnswer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
        });
        await this._internalPeerConnection.setLocalDescription(answer);

        console.debug(`[PEER] Sending SDP answer to ${this._remoteClientId}: `, this._internalPeerConnection.localDescription);
        if (this._metadataChannel && this._internalPeerConnection.localDescription) {
            this._metadataChannel.sendSDPAnswer(this._internalPeerConnection.localDescription);
        }
    }

    private async _onNegotiationAnswer(answer: RTCSessionDescription) {
        console.debug(`[PEER] Connection renegotiation answer received from peer "${this._remoteClientId}"...`, answer);
        await this._internalPeerConnection.setRemoteDescription(answer);
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
    public addDataChannel(label: string): RTCDataChannel {
        const dataChannel = this._peer.createDataChannel(label);
        this._dataChannels.set(label, dataChannel);
        return dataChannel;
    }
}