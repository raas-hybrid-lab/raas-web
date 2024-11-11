/**
 * Taken from the KVS WebRTC SDK example code in examples/answerer.js
 * https://github.com/awslabs/amazon-kinesis-video-streams-webrtc-sdk-js
 */


/**
 * Generates a correlation ID for use SDP answers
 */
function randomString() {
    return Date.now().toString();
}

export class Answerer {
    /**
     * Represents a peer connection in the "answerer" or "callee" role.
     * @constructor
     * @param {RTCConfiguration} rtcPeerConnectionConfiguration - The configuration for the RTCPeerConnection.
     * @param {MediaStream} localMediaStream - The local media stream to send to the remote client.
     * @param {RTCSessionDescriptionInit} offer - The offer for the peer connection received from the remote client.
     * @param {string} remoteClientId - The signaling ClientID of the remote client.
     * @param {SignalingClient} signalingClient - Kinesis Video Streams WebRTC Signaling client.
     * @param {boolean} trickleICE - Whether to use trickle ICE.
     * @param {boolean} createDataChannel - Whether to create a data channel.
     * @param {string} [loggingPrefix=''] - Prefix log messages will have.
     * @param {function(RTCIceCandidate): boolean} [outboundIceCandidateFilterFn=candidate => true]
     *     Callback function invoked when an ICE candidate is generated by this peer.
     *     Return true if this candidate should be sent to the remote peer.
     *     If no function is provided, no candidates will be filtered and all generated candidates will be sent.
     * @param {function(string): boolean} [inboundIceCandidateFilterFn=candidate => true]
     *     Callback function invoked when an ICE candidate is received through signaling
     *     from the remote peer. Return true if this candidate should be added to this peer connection.
     *     If no function is provided, no candidates will be filtered and all candidates received from remote will
     *     be added to this peer connection.
     * @param {function(MediaStream[]): void} [mediaStreamsUpdated=mediaStreams => {}]
     *     Invoked when the remote peer adds a track to the peer connection.
     *     Nothing happens if no function is provided.
     * @param {function(string): void} [dataChannelMessageReceived=dataChannelMessage => {}]
     *     Invoked when the remote peer sends a message over the data channel.
     *     Only will get invoked if createDataChannel is true.
     *     Nothing happens if no function is provided.
     */
    constructor(
        rtcPeerConnectionConfiguration,
        localMediaStream,
        offer,
        remoteClientId,
        signalingClient,
        trickleICE,
        createDataChannel,
        loggingPrefix = '',
        outboundIceCandidateFilterFn = candidate => true,
        inboundIceCandidateFilterFn = candidate => true,
        mediaStreamsUpdated = mediaStreams => null,
        dataChannelMessageReceived = (dataChannelMessage) => null,
    ) {
        this._configuration = rtcPeerConnectionConfiguration;
        this._mediaStream = localMediaStream;
        this._remoteClientId = remoteClientId;
        this._offer = offer;
        this._signalingClient = signalingClient;
        this._trickleICE = trickleICE;
        this._createDataChannel = createDataChannel;
        this._loggingPrefix = loggingPrefix;
        this._outboundIceCandidateFilterFn = outboundIceCandidateFilterFn;
        this._inboundIceCandidateFilterFn = inboundIceCandidateFilterFn;
        this._onMediaStreamsUpdated = mediaStreamsUpdated;
        this._dataChannelMessageReceived = dataChannelMessageReceived;

        this._dataChannel = null;
        this._peerConnection = null;
    }

    // Must be called first.
    // Create the PeerConnection and binds it to the Signaling client.
    // It will send back an answer given the provided offer and media to send back.
    // Optionally, if configured, the data channel will be opened.
    init = async () => {
        this._peerConnection = new RTCPeerConnection(this._configuration);

        if (this._createDataChannel) {
            this._peerConnection.ondatachannel = event => {
                this._dataChannel = event.channel;
                event.channel.onmessage = this._dataChannelMessageReceived;
            };
        }

        this._addIceCandidate = async (candidate, remoteClientId) => {
            if (remoteClientId !== this._remoteClientId) {
                // All ICE candidates received over signaling will be received via this callback.
                // Ignore ICE candidates not directed for this PeerConnection (when multiple
                // viewer participants are connecting to the same signaling channel).
                return;
            }

            console.log(this._loggingPrefix, `Received ICE candidate from ${remoteClientId || 'remote'}`);
            console.debug(this._loggingPrefix, 'ICE candidate:', candidate);

            if (this._inboundIceCandidateFilterFn(candidate)) {
                // Add the ICE candidate received from the client to the peer connection
                this._peerConnection.addIceCandidate(candidate);
            } else {
                console.log(this._loggingPrefix, `Candidate rejected through filter. Not adding candidate from ${remoteClientId || 'remote'}.`);
            }
        };

        this._signalingClient.on('iceCandidate', this._addIceCandidate);

        this._peerConnection.addEventListener('icecandidate', ({ candidate }) => {
            // `candidate` will be the empty string if the event indicates that there are no further candidates
            // to come in this generation, or null if all ICE gathering on all transports is complete.
            // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/icecandidate_event
            if (candidate) {
                console.log(this._loggingPrefix, 'Generated ICE candidate for', this._remoteClientId || 'remote');
                console.debug(this._loggingPrefix, 'ICE candidate:', candidate);

                // When trickle ICE is enabled, send the ICE candidates as they are generated.
                if (this._trickleICE) {
                    if (this._outboundIceCandidateFilterFn(candidate)) {
                        console.log(this._loggingPrefix, 'Sending ICE candidate to', this._remoteClientId || 'remote');
                        this._signalingClient.sendIceCandidate(candidate, this._remoteClientId);
                    } else {
                        console.log(this._loggingPrefix, 'Not sending ICE candidate to', this._remoteClientId || 'remote');
                    }
                }
            } else {
                console.log(this._loggingPrefix, 'All ICE candidates have been generated for', this._remoteClientId || 'remote');

                // When trickle ICE is disabled, send the answer now that all the ICE candidates have been generated.
                // NOTE: gathering all the ICE candidates can take a long time. It is recommended to use trickle ICE.
                if (!this._trickleICE) {
                    console.log(this._loggingPrefix, 'Sending SDP answer to', this._remoteClientId || 'remote');
                    const correlationId = randomString();
                    console.debug('SDP answer:', this._peerConnection.localDescription, 'correlationId:', correlationId);
                    this._signalingClient.sendSdpAnswer(this._peerConnection.localDescription, this._remoteClientId, correlationId);
                }
            }
        });

        // We receive this event when the remote peer adds a new track to the PeerConnection
        // https://webrtc.org/getting-started/remote-streams#adding_remote_tracks
        this._peerConnection.addEventListener('track', event => {
            console.log(this._loggingPrefix, 'Received track from', this._remoteClientId || 'remote', 'with track id:', event?.streams[0]?.id ?? '[Error retrieving track ID]');
            this._onMediaStreamsUpdated(event.streams);
        });

        // If there's no video/audio, this._mediaStream will be null. So, we should skip adding the tracks from it.
        if (this._mediaStream) {
            this._mediaStream.getTracks().forEach(track => this._peerConnection.addTrack(track, this._mediaStream));
        }

        await this._peerConnection.setRemoteDescription(this._offer);

        // Create an SDP answer to send back to the client
        console.log(this._loggingPrefix, 'Creating SDP answer for', this._remoteClientId || 'remote');
        await this._peerConnection.setLocalDescription(
            await this._peerConnection.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            }),
        );

        // When trickle ICE is enabled, send the answer now and then send ICE candidates as they are generated. Otherwise wait on the ICE candidates.
        if (this._trickleICE) {
            console.log(this._loggingPrefix, 'Sending SDP answer to', this._remoteClientId || 'remote');
            const correlationId = randomString();
            console.debug(this._loggingPrefix, 'SDP answer:', this._peerConnection.localDescription, 'correlationId:', correlationId);
            this._signalingClient.sendSdpAnswer(this._peerConnection.localDescription, this._remoteClientId, correlationId);
        }
        console.log(this._loggingPrefix, 'Generating ICE candidates for', this._remoteClientId || 'remote');
    };

    // Returns true if the data channel was created and is currently open.
    // Only available after init()
    isDataChannelOpen = () => {
        if (!this._peerConnection) {
            throw 'Init must be called first!';
        }
        return this._createDataChannel && this._dataChannel.readyState === 'open';
    };

    // Sends a message over the data channel
    // It will throw an error if the data channel is not currently open
    // Only available after init()
    sendDataChannelMessage = message => {
        if (!this._peerConnection) {
            throw 'Init must be called first!';
        }
        if (!this.isDataChannelOpen) {
            throw 'The data channel is not open!';
        }
        this._dataChannel.send(message);
    };

    // Adds an ice candidate to the PeerConnection
    // Only available after init()
    addIceCandidate = candidate => {
        if (!this._peerConnection) {
            throw 'Init must be called first!';
        }
        this._peerConnection.addIceCandidate(candidate);
    };

    // Close the resources opened by this answerer.
    // This will close the peer connection, unbind from the signaling client,
    // and close the data channel (if any). This will not close the signaling
    // client.
    // Only available after init()
    close = () => {
        if (!this._peerConnection) {
            throw 'Init must be called first!';
        }
        this._peerConnection.close();

        this._signalingClient.removeListener('iceCandidate', this._addIceCandidate);

        if (this._dataChannel) {
            this._dataChannel.close();
        }
    };

    // Return the peer connection this answerer is using
    // Only available after init()
    getPeerConnection = () => {
        if (!this._peerConnection) {
            throw 'Init must be called first!';
        }
        return this._peerConnection;
    };
}
