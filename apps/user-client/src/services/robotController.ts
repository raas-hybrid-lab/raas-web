

export class RobotController {
    /*
        Class for managing a single robot remotely.

        Currently is basically just for a quick demo of the video streaming.
     */

    private peer: RTCPeerConnection;

    private _roomMonitorStream: MediaStream | undefined;
    /*
        Constructor for RobotsManager.
        @param rtcMaster - The RTCBridgeMaster instance to use for managing connections. Must be initialized.
     */
    constructor(peer: RTCPeerConnection) {
        this.peer = peer;

        this.peer.ontrack = this.onTrack;
    }

    private onTrack(event: RTCTrackEvent) {
        console.log('Track event:', event);

        if (event.streams.length > 0) {
            // we're only ever going to send one stream per track
            const stream = event.streams[0];
            this._roomMonitorStream = stream;
        }
    }

    get roomMonitorStream(): MediaStream | undefined {
        return this._roomMonitorStream;
    }

}
