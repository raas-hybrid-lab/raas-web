/**
 * Non-robot driver for testing & demo.
 * 
 * Provides a simple video chat interface between the user and the lab.
 */

import { RTCPeerWrapper } from "@raas-web/webrtc-bridge";
import { RobotDriver } from "../robotDriverBase";

export class VideoChatDriver extends RobotDriver {
    webcamStream: MediaStream | undefined;
    telemetryEcho: RTCDataChannel | undefined;

    static get robotName(): string {
        return "Video Chat";
    }

    protected async _connectRobot(): Promise<void> {
        // for "connecting to the robot", we just add a stream from the webcam
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        this.webcamStream = stream;
    }

    protected async _connectUser(peerConnection: RTCPeerWrapper): Promise<void> {
        if (this.webcamStream) {
            peerConnection.addStream(this.webcamStream, "webcam");
        }
        else {
            throw new Error('No webcam stream found (this should never happen)');
        }
        this.telemetryEcho = peerConnection.createDataChannel('telemetryEcho');
        this.telemetryEcho.onmessage = (event) => {
            console.log('Telemetry message:', event.data);
            // echo it back with this driver's id etc
            this.telemetryEcho?.send(`[Robot] ${event.data}`);
        };
    }
}