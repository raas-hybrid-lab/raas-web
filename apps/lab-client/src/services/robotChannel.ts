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
export class RobotDataChannel extends RobotChannel {
    channel: RTCDataChannel;

    constructor(name: string, channel: RTCDataChannel) {
        super(name);
        this.channel = channel;
    }
}

// todo: define some data channel types. start with a simple one for sending/receiving text messages.
// use zod to define the schema for the data channel's messages

export class RobotChannelManager {
    peer: RTCPeerConnection;

    constructor(peer: RTCPeerConnection) {
        this.peer = peer;
    }

    async setup(): Promise<void> {
        console.log('Setting up channel manager...');

        // TODO: set up metadata channel so we can send/receive metadata about AV streams & anything else we may need.
    }

    addChannel(channel: RobotChannel): void {
        // Implementation for adding a channel goes here
        console.log('Adding channel...');

        // if it's an AV stream channel, send metadata about it
        if (channel instanceof RobotAVStreamChannel) {
            this.sendMetadata(channel.stream);
        }

        // if it's a data channel, not much to do.
    }

    private async sendMetadata(stream: MediaStream): Promise<void> {
        console.debug(`Sending metadata for stream: ${stream}`);
        // TODO: implement
    }
}