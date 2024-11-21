/**
 * Wrapper class for RTCPeerConnection. Signaling client agnostic. 
 * Exposes a simplified interface to RTCPeerConnection.
 */

import { EventEmitter } from 'events';

import type { RTCSignalingBase } from './rtcSignalingBase';
import { PeerMetadataChannel } from './metadataChannel';


/**
 * RTCPeerWrapper is a wrapper class for RTCPeerConnection. 
 * It is signaling client agnostic and provides a simplified interface to RTCPeerConnection.
 * 
 * It is created by the signaling client (RTCSignalingMaster or RTCSignalingViewer) and handles
 * all callbacks etc for the RTCPeerConnection instance once it's created.
 * 
 * In this class, we operate at the level of streams, not tracks alone.
 * 
 * Events:  
 * - metadataChannelOpened: Emitted when the metadata channel is opened. Primarily for internal use.
 * - remoteStreamAdded: Emitted when a stream is added by the remote peer.
 * - localStreamAdded: Emitted when a stream is added by us (useful when one component adds the stream and another needs to know about it).
 * - remoteDataChannelOpened: Emitted when a data channel is opened by the remote peer.
 * - localDataChannelOpened: Emitted when a data channel is opened by us (useful when one component opens the data channel and another needs to know about it).
 */
export class RTCPeerWrapper extends EventEmitter {
    private _peer: RTCPeerConnection;
    private _signalingClient: RTCSignalingBase;
    private _remoteClientId: string | undefined;

    private _metadataChannel: PeerMetadataChannel | undefined;
    private _dataChannels: Map<string, RTCDataChannel> = new Map();
    private _streams: Map<string, MediaStream> = new Map();

    /**
     * 
     * @param peer - The RTCPeerConnection instance to wrap.
     * @param signalingClient - The signaling client that created this peer wrapper.
     * @param remoteClientId - The ID of the remote client this peer will connected to.
     * @param sendInitialOffer - Whether to send the initial offer to the remote client. This is managed
     * by this class because it needs to set up the metadata channel first.
     */
    constructor(peer: RTCPeerConnection, signalingClient: RTCSignalingBase, remoteClientId: string | undefined, sendInitialOffer = false) {
        super();
        this._peer = peer;
        this._signalingClient = signalingClient;
        remoteClientId = remoteClientId ?? 'master'; // default to master if no id is provided
        this._remoteClientId = remoteClientId;

        if (sendInitialOffer) {
            // if we're sending an initial offer, we need to create the metadata channel ourselves
            // if not, we'll expect one to come in via the datachannel event
            const metadata = this._peer.createDataChannel('metadata');
            metadata.onopen = () => {
                this._metadataChannel = new PeerMetadataChannel(metadata, { 
                    onSdpOffer: this._onNegotiationRequested.bind(this), 
                    onSdpAnswer: this._onNegotiationAnswer.bind(this) 
                });
                this.emit('metadataChannelOpened');
            };
            this._sendInitialOfferViaSignalingClient();
        }

        // set up some key callbacks for the peer connection
        peer.onicecandidate = ({ candidate }) => {
            // console.debug(`ICE candidate generated for peer "${remoteClientId}"...`, candidate);
            if (candidate) {
                signalingClient?.sendIceCandidate(candidate);
            } else {
                console.debug(`No more ICE candidates will be generated for peer "${remoteClientId}"...`);
            }
        };

        peer.onconnectionstatechange = () => {
            console.debug(`[PEER] Peer connection state changed for peer "${remoteClientId}":`, peer.connectionState);
        };

        peer.onsignalingstatechange = () => {
            console.debug(`[PEER] Peer signaling state changed for peer "${remoteClientId}":`, peer.signalingState);
        };

        peer.ontrack = (event: RTCTrackEvent) => {
            console.debug('[PEER] Track event:', event);
            if (event.streams.length > 0) {
                event.streams.forEach(stream => {
                    // todo: get a label for the stream from the other peer
                    // can do this from the metadata channel.
                    // this will help us to label the video element on the UI with helpful 
                    // names like "front facing camera" or "microphone" etc.
                    if (this._streams.has(stream.id)) {
                        // if the stream already exists, just add the track to it
                        // tbd if we need an event for this--for now, let's try and stick to streams as our fundamental unit
                        // to expose to the outside world.
                        this._streams.get(stream.id)?.addTrack(event.track);
                    } else {
                        this._streams.set(stream.id, stream);
                        this.emit('remoteStreamAdded', stream);
                    }
                });
            } else {
                console.debug('[PEER] Track event received with no streams; creating a new stream:', event);
                const stream = new MediaStream();
                stream.addTrack(event.track);
                this._streams.set(stream.id, stream);
                this.emit('remoteStreamAdded', stream);
            }
        };

        peer.ondatachannel = (event: RTCDataChannelEvent) => {
            console.debug('[PEER] datachannel event:', event);
            if (event.channel.label === 'metadata') {
                this._metadataChannel = new PeerMetadataChannel(
                    event.channel, 
                    { 
                        onSdpOffer: this._onNegotiationRequested.bind(this), 
                        onSdpAnswer: this._onNegotiationAnswer.bind(this) 
                    }
                );
                this.emit('metadataChannelOpened');
            } else {
                this._dataChannels.set(event.channel.label, event.channel);
                this.emit('remoteDataChannelOpened', event.channel);
            }
        };

        peer.onnegotiationneeded = () => {
            this._onNegotiationNeeded();
        };
        console.log(`[PEER] Peer "${remoteClientId}" connected!`);
    }

    /**
     * Send an initial offer to the lab client via the signaling client.
     * Should only be called once, when the peer is first created.
     */
    private async _sendInitialOfferViaSignalingClient(): Promise<void> {
        const offer = await this._peer.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
        });
        await this._peer.setLocalDescription(offer);
        if (this._peer.localDescription) {
            console.debug('[PEER] Sending initial SDP offer with local description via signaling client:', this._peer.localDescription);
            this._signalingClient.sendSdpOffer(this._peer.localDescription);
        }
        else {
            // unsure why this would happen, but typing indicates it's possible
            throw new Error("No local description to send to lab client.");
        }
        console.debug('[PEER] Sent initial SDP offer to lab client via signaling client.');
    }

    /**
     * Whether the peer is ready to negotiate.
     * 
     * @returns True if the peer is capable of renegotiating the connection to 
     * include different streams & tracks.
     */
    public isReadyToNegotiate(): boolean {
        return !!this._metadataChannel;
    }

    /**
     * Await the peer to be ready to be used for renegotiation.
     * 
     * @returns A promise that resolves when the peer is ready to be used for renegotiation.
     */
    public async awaitReadyToNegotiate(): Promise<void> {
        return new Promise((resolve) => {
            if (this.isReadyToNegotiate()) {
                resolve();
            }
            else {
                this.once('metadataChannelOpened', () => {
                    this._metadataChannel?.once('ready', () => {    
                        resolve();
                    });
                });
            }
        });
    }

    private async _onNegotiationNeeded() {
        console.debug(`[PEER] Negotiation needed for peer "${this._remoteClientId}"...`);
        if (!this._metadataChannel) {
            console.debug("skipping initial negotiation--waiting for metadata channel.");
            return;
        }
        const offer = await this._peer.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
        });

        await this._peer.setLocalDescription(offer);
        if (this._peer.localDescription) {
            this._metadataChannel.sendSDPOffer(this._peer.localDescription);
        }
        else {
            console.error("No local description to send to peer.");
        }
    }

    private async _onNegotiationRequested(offer: RTCSessionDescription) {
        console.debug(`[PEER] Connection renegotiation requested by peer "${this._remoteClientId}"...`, offer);
        console.debug('[PEER] Creating SDP answer for', this._peer);
        this._peer.setRemoteDescription(offer);
        const answer = await this._peer.createAnswer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
        });
        await this._peer.setLocalDescription(answer);

        console.debug(`[PEER] Sending SDP answer to ${this._remoteClientId}: `, this._peer.localDescription);
        if (this._metadataChannel && this._peer.localDescription) {
            this._metadataChannel.sendSDPAnswer(this._peer.localDescription);
        }
    }

    private async _onNegotiationAnswer(answer: RTCSessionDescription) {
        console.debug(`[PEER] Connection renegotiation answer received from peer "${this._remoteClientId}"...`, answer);
        await this._peer.setRemoteDescription(answer);
    }

    get peerId(): string | undefined {
        return this._remoteClientId;
    }

    public async addIceCandidate(candidate: RTCIceCandidate) {
        await this._peer.addIceCandidate(candidate);
    }

    public async setRemoteDescription(description: RTCSessionDescription) {
        await this._peer.setRemoteDescription(description);
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
        if (this._streams.has(label)) {
            console.warn(`[PEER] Stream ${label} already exists; overwriting.`);
        }
        this._streams.set(label, stream);

        // todo figure out how to get the label to the other peer
        // will need a metadata channel of some kind.
        for (const track of stream.getTracks()) {
            this._peer.addTrack(track, stream);
        }

        this.emit('localStreamAdded', stream);
    }

    /**
     * Add a data channel to the peer connection.
     * 
     * @param label - The label of the data channel.
     * @returns The data channel.
     */
    public createDataChannel(label: string): RTCDataChannel {
        const dataChannel = this._peer.createDataChannel(label);
        this._dataChannels.set(label, dataChannel);
        this.emit('localDataChannelOpened', dataChannel);
        return dataChannel;
    }

    public close() {
        if (this._peer.connectionState === 'closed') {
            console.debug(`[PEER] Connection with peer "${this._remoteClientId}" already closed.`);
            return;
        }
        console.debug(`[PEER] Closing connection with peer "${this._remoteClientId}"...`);
        this._dataChannels.forEach(channel => channel.close());
        this._streams.forEach(stream => stream.getTracks().forEach(track => track.stop()));
        this._metadataChannel?.close();
        this._peer.close();
    }
}