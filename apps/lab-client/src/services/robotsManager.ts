import { RTCBridgeMaster } from '@raas-web/webrtc-bridge';
import { RobotDriver } from './robotDriverBase';
import { VideoChatDriver } from './drivers/videoChatDriver';
import { v4 as uuid } from 'uuid';


const _driverClasses = [
    VideoChatDriver
];

export type DriverClass = typeof _driverClasses[number];


export type RobotsManagerCallbacks = {
    // when a robot connects to us
    onRobotConnected?: (driver: RobotDriver) => void;
    onRobotDisconnected?: (driver: RobotDriver) => void;
    onRobotError?: (driver: RobotDriver, error: Error) => void;

    // when a user connects to us
    onUserClientConnected?: (clientId: string) => void;
    onUserClientDisconnected?: (clientId: string) => void;

    // when a user is paired with a robot 
    onRobotInUse?: (driver: RobotDriver) => void;
    onRobotNotInUse?: (driver: RobotDriver) => void;
}

// RobotsManager class
class RobotsManager {
    /*
        Singleton class for managing all robots. 
        It is responsible for creating robot drivers, then routing incoming RTC connections to those drivers
        so that each robot can be controlled by a user client.

        It contains general methods agnostic to specific robot platforms--its responsibility is to manage the robots
        as a group.
     */
    private static singleton: RobotsManager | undefined;

    private rtc: RTCBridgeMaster;
    private driversById: Map<string, RobotDriver>;
    private callbacks: RobotsManagerCallbacks;
    /*
        Constructor for RobotsManager.
        @param rtcMaster - The RTCBridgeMaster instance to use for managing connections. Must be initialized.
     */
    constructor(rtcMaster: RTCBridgeMaster, callbacks: RobotsManagerCallbacks) {
        this.rtc = rtcMaster;
        this.driversById = new Map();
        this.callbacks = callbacks;
    }

    public static async getInstance(callbacks: RobotsManagerCallbacks): Promise<RobotsManager> {
        if (!RobotsManager.singleton) {
            // todo add real callbacks
            // for now we're just testing the bridge master
            // in the future we'll use incoming connections to create new robot drivers
            RobotsManager.singleton = new RobotsManager(await RTCBridgeMaster.getInstance({}), callbacks);
            await RobotsManager.singleton.setup();
        }
        return RobotsManager.singleton;
    }

    private async setup() {
        // start looking for robots or something idk we'll see if we end up needing anything here
        console.log('Setting up robots manager...');
    }

    get rtcMaster(): RTCBridgeMaster {
        return this.rtc;
    }

    static get possibleDrivers(): typeof _driverClasses {
        return _driverClasses;
    }

    async connectRobot(driverClass: DriverClass ): Promise<void> {
        const robotId = this.generateRobotId(driverClass);

        const driver = new driverClass(robotId);
        await driver.connectRobot();
        this.driversById.set(driver.robotId, driver);
        // we use a callback here in case we want to handle the case where the robot connects to us
        // without the UI asking for it--so this is more general than just returning the driver
        this.callbacks.onRobotConnected?.(driver);
    }

    private generateRobotId(driverClass: DriverClass): string {
        // for now, just stick a uuid after the driver name
        return driverClass.robotName.toLowerCase().replace(' ', '-') + '-' + uuid();
    }
}

export default RobotsManager;