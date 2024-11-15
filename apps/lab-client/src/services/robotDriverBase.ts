import { RobotChannelManager } from "./robotChannel";

/*
    RobotDriver is the base class for all robot drivers.
    It provides the basic functionality for streaming data to & from the robot.

    Subclasses should implement the _connectRobot() method to set up a connection to the robot,
    and the _connectUser() method to set the connection to the user after the robot is connected.
*/
export abstract class RobotDriver {
    // list of all subclasses of RobotDriver
    private _robotId: string;
    private _channelManager: RobotChannelManager | undefined;
    private _robotConnected = false;

    constructor(robotId: string) {
        this._robotId = robotId;
        this._channelManager = undefined;
    }

    get robotConnected(): boolean {
        return this._robotConnected;
    }

    get robotId(): string {
        return this._robotId;
    }

    // The non-unique name of type of robot this driver controls. Should be hardcoded by each subclass.
    static get robotName(): string {
        throw new Error('robotName must be implemented by each subclass');
    }

    async connectRobot(): Promise<void> {
        // Attempt to connect the driver to the robot
        console.log(`Connecting to robot with ID: ${this.robotId}`);
        await this._connectRobot();
        this._robotConnected = true;
    }

    protected abstract _connectRobot(): Promise<void>;

    async connectUser(peerConnection: RTCPeerConnection): Promise<void> {
        if (!this._robotConnected) {
            throw new Error('Robot is not connected--user must connect to something else instead');
        }

        // Connect the peer to the driver
        this._channelManager = new RobotChannelManager(peerConnection);
        console.log(`User connected to robot ${this.robotId} with peer connection: ${peerConnection}`);
        await this._connectUser(peerConnection);
    }

    protected abstract _connectUser(peerConnection: RTCPeerConnection): Promise<void>;

}