import { RTCPeerWrapper } from "@raas-web/webrtc-bridge";

export type RobotControllerCallbacks = {
    onChannelsChanged?: () => void;
    onTelemetryMessage?: (message: string) => void;
}

export class RobotController {
    /*
        Class for managing a single robot remotely.

        Currently is basically just for a quick demo of the video streaming.
     */
    private _callbacks: RobotControllerCallbacks;
    private _peer: RTCPeerWrapper;
    private _roomMonitorStream: MediaStream | undefined;
    private _telemetryEcho: RTCDataChannel | undefined;

    /*
        Constructor for RobotsManager.
        @param rtcMaster - The RTCBridgeMaster instance to use for managing connections. Must be initialized.
     */
    constructor(peer: RTCPeerWrapper, callbacks: RobotControllerCallbacks) {
        this._peer = peer;
        this._callbacks = callbacks;

        this._peer.on('remoteStreamAdded', this.onRemoteStreamAdded.bind(this));
        this._peer.on('remoteDataChannelOpened', (channel: RTCDataChannel) => {
            if (channel.label === 'telemetryEcho') {
                this._telemetryEcho = channel;
                this._telemetryEcho.onmessage = (event) => {
                    this._callbacks.onTelemetryMessage?.(event.data.toString());
                };
            }
            else {
                console.warn('Unknown data channel opened:', channel);
            }
        });
    }

    private onRemoteStreamAdded(stream: MediaStream) {
        console.log('Remote stream added:', stream);
        this._roomMonitorStream = stream;
        this._callbacks.onChannelsChanged?.();
    }

    public setCallbacks(callbacks: RobotControllerCallbacks) {
        this._callbacks = callbacks;
    }

    // temporary easy way to expose this stream.
    get roomMonitorStream(): MediaStream | undefined {
        return this._roomMonitorStream;
    }

    sendTelemetryEcho(message: string) {
        if (this._telemetryEcho) {
            this._telemetryEcho.send(message);
        }
        else {
            console.error('No telemetry echo channel found');
        }
    }
}