/**
 * Non-robot driver for testing & demo.
 * 
 * Provides a simple video chat interface between the user and the lab.
 */

import { RobotAVStreamChannel } from "../robotChannel";
import { RobotDriver } from "../robotDriverBase";

export class VideoChatDriver extends RobotDriver {
    webcamStream: MediaStream | undefined;

    static get robotName(): string {
        return "Video Chat";
    }

    protected async _connectRobot(): Promise<void> {
        // for "connecting to the robot", we just add a stream from the webcam
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        this.webcamStream = stream;
    }

    protected async _connectUser(peerConnection: RTCPeerConnection): Promise<void> {
        if (this.webcamStream) {
            this.channelManager?.addChannel(new RobotAVStreamChannel('webcam', this.webcamStream.getTracks()));
        }
        else {
            throw new Error('No webcam stream found (this should never happen)');
        }
    }
}