/*
    RobotChannel is a wrapper around WebRTC data, video, and audio channels used to stream data to & from the robot.
    It provides a unified interface for adding tracks to the peer connection.

    For video & audio channels, it standardizes how to send metadata about the stream (i.e. the name of the video being sent)
    by setting up a data channel for sending metadata.

    For data channels, it provides the ability to define & use different "RobotDataChannel"s, which define different forms of data
    robots may want to send (e.g. particular kinds of sensor data, control commands, etc.), such that behavior & format can be reused across
    different robot drivers.
*/

/*
    RobotChannel base class. really only exists to provide a name.
*/
export abstract class RobotChannel {
    name: string;

    constructor(name: string) {
        this.name = name;
    }
}

/*
    RobotVideoChannel is a wrapper around an audio/video stream (a collection of audio & video tracks meant to be synchronized).
*/
export class RobotAVStreamChannel extends RobotChannel {
    stream: MediaStream;

    constructor(name: string, tracks: MediaStreamTrack[]) {
        super(name);
        this.stream = new MediaStream(tracks);
    }
}

/*
    RobotDataChannel is a wrapper around a data channel.
*/
export abstract class RobotDataChannel extends RobotChannel {
    private _channel: RTCDataChannel;

    constructor(name: string, peer: RTCPeerConnection) {
        super(name);
        this._channel = peer.createDataChannel(name);
        this._channel.onmessage = (event) => this.onReceiveMessage(event.data);
    }

    private onReceiveMessage(message: string): void {
        console.debug(`RobotDataChannel.onReceiveMessage: ${message}`);
        this._onReceiveMessage(message);
    }

    protected abstract _onReceiveMessage(message: string): void;

    // encapsulating for easy mocking
    protected send(message: string): void {
        this._channel.send(message);
    }
}
