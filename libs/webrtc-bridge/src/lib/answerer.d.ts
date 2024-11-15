import * as KVSWebRTC from 'amazon-kinesis-video-streams-webrtc';

declare module './answerer' {
    export class Answerer {
        constructor(
            rtcPeerConnectionConfiguration: RTCConfiguration,
            localMediaStream: MediaStream | null,
            offer: RTCSessionDescriptionInit,
            remoteClientId: string,
            signalingClient: KVSWebRTC.SignalingClient, // Replace with the actual type if available
            trickleICE: boolean,
            createDataChannel: boolean,
            loggingPrefix?: string,
            outboundIceCandidateFilterFn?: (candidate: RTCIceCandidate) => boolean,
            inboundIceCandidateFilterFn?: (candidate: RTCIceCandidate) => boolean,
            mediaStreamsUpdated?: (mediaStreams: MediaStream[]) => void,
            dataChannelMessageReceived?: (dataChannelMessage: string) => void,
        );

        init(): Promise<void>;
        isDataChannelOpen(): boolean;
        sendDataChannelMessage(message: string): void;
        addIceCandidate(candidate: RTCIceCandidate): void;
        close(): void;
        getPeerConnection(): RTCPeerConnection;
    }
}