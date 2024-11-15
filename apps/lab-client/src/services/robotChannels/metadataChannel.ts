import { RobotDataChannel } from "./robotChannel";
import * as MT from "./messageTypes";


export class MetadataChannelMaster extends RobotDataChannel {
    constructor(peer: RTCPeerConnection) {
        super('metadata', peer);
    }

    async sendRobotsAvailable(robotIds: string[]): Promise<void> {
        const message: MT.RobotsAvailableMessage = { messageType: MT.MType.RobotsAvailable, robotIds };
        this.send(JSON.stringify(message));
    }

    protected _onReceiveMessage(message: string): void {
        console.debug('MetadataChannelMaster.onReceiveMessage', message);
    }
}


export class MetadataChannelViewer extends RobotDataChannel {
    private _robotsAvailable: string[] = [];

    constructor(peer: RTCPeerConnection) {
        super('metadata', peer);
    }

    get robotsAvailable(): string[] {
        return this._robotsAvailable;
    }

    protected _onReceiveMessage(message: string): void {
        console.debug('MetadataChannelViewer.onReceiveMessage', message);
        const baseMessage = MT.BaseDataChannelMessageSchema.parse(JSON.parse(message));
        switch (baseMessage.messageType) {
            case MT.MType.RobotsAvailable: {
                const parsedMessage = MT.robotsAvailableMessageSchema.safeParse(JSON.parse(message));
                if (parsedMessage.success) {
                    this._robotsAvailable = parsedMessage.data.robotIds;
                }
            }
        }
    }
}
