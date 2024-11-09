import RTCBridgeMaster from './rtcBridgeMaster';

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

    private rtc: RTCBridgeMaster | undefined;

    private constructor() {
        this.rtc = undefined;
    }

    public static async getInstance(): Promise<RobotsManager> {
        if (!RobotsManager.singleton) {
            RobotsManager.singleton = new RobotsManager();
            await RobotsManager.singleton.setup();
        }
        return RobotsManager.singleton;
    }

    private async setup() {
        // todo add real callbacks
        // for now we're just testing the bridge master
        // in the future we'll use incoming connections to create new robot drivers
        this.rtc = await RTCBridgeMaster.getInstance({});
    }

    public async startRTCMaster(): Promise<void> {
        if (!this.rtc) {
            // this should never happen
            throw new Error("RTC bridge master not initialized.");
        }
        await this.rtc!.startMaster();
    }

}

export default RobotsManager;