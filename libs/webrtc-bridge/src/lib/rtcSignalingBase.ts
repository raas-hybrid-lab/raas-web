import * as KVSWebRTC from 'amazon-kinesis-video-streams-webrtc';
import ChannelHelper from './channelHelper';
import { AWSClientArgs, loadAWSClientArgs } from './awsConfig';


/**
 * Base class for RTCSignalingMaster and RTCSignalingViewer.
 */
export abstract class RTCSignalingBase {
    protected _channelHelper: ChannelHelper;
    protected readonly _clientConfig: AWSClientArgs;
    protected readonly _loggingPrefix: string;
    protected _isRunning: boolean;

    protected constructor(channelName: string, role: KVSWebRTC.Role, loggingPrefix: string, clientId: string | undefined) {
        this._clientConfig = loadAWSClientArgs();
        this._loggingPrefix = loggingPrefix;
        this._isRunning = false;

        this._channelHelper = new ChannelHelper(channelName, this._clientConfig, null, role, ChannelHelper.IngestionMode.OFF, loggingPrefix, clientId);
    }

    cleanup(): void {
        this._channelHelper.getSignalingClient()?.close();
    }

    /**
     * Connects to the signaling channel and begins generating/accepting new RTCPeerConnections through the callbacks.
     */
    async start(): Promise<void> {
        await this._channelHelper?.init();
        const iceServers: RTCIceServer[] = [];
        iceServers.push({ urls: `stun:stun.kinesisvideo.${this._clientConfig.region}.amazonaws.com:443` });
        iceServers.push(...(await this._channelHelper.fetchTurnServers()));
        console.log(this._loggingPrefix, 'ICE servers:', iceServers);

        const configuration: RTCConfiguration = {
            iceServers,
            iceTransportPolicy: 'all',
        };

        const signalingClient = this._channelHelper.getSignalingClient();
        await this._registerSignalingClientCallbacks(signalingClient, configuration);

        console.debug(this._loggingPrefix, "Opening signaling client...");
        signalingClient.open();
        this._isRunning = true;
    }

    public isRunning(): boolean {
        return this._isRunning;
    }

    /**
     * Generates a correlation ID for use SDP answers
     */
    protected generateCorrelationId(): string {
        return Date.now().toString();
    }

    public sendIceCandidate(candidate: RTCIceCandidate): void {
        this._channelHelper.getSignalingClient()?.sendIceCandidate(candidate);
    }

    public sendSdpOffer(offer: RTCSessionDescription): void {
        const client = this._channelHelper.getSignalingClient();
        if (client) {
            client.sendSdpOffer(offer);
        }
        else {
            console.error("Signaling client not connected. Can't send SDP offer.");
        }
    }

    /**
     * Registers callbacks for the signaling client, allowing us to handle the resulting connections ourselves.
     */
    protected abstract _registerSignalingClientCallbacks(signalingClient: KVSWebRTC.SignalingClient, rtcConfig: RTCConfiguration): Promise<void>;
}
