/**
 * Non-robot driver for testing & demo.
 * 
 * Provides a simple video chat interface between the user and the lab.
 */

import { RobotDriver } from "../robotDriverBase";

export class VideoChatDriver extends RobotDriver {
    static get robotName(): string {
        return "Video Chat";
    }

    protected _connectRobot(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    protected _connectUser(peerConnection: RTCPeerConnection): Promise<void> {
        throw new Error("Method not implemented.");
    }
}