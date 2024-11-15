import { RobotAVStreamChannel, RobotChannel } from "./robotChannel";
import { MetadataChannelMaster, MetadataChannelViewer } from "./metadataChannel";


export class RobotChannelManager {
    peer: RTCPeerConnection;
    peerType: "master" | "viewer";
    metadataChannel: MetadataChannelMaster | MetadataChannelViewer;

    constructor(peer: RTCPeerConnection, peerType: "master" | "viewer") {
        this.peer = peer;
        this.peerType = peerType;
        if (this.peerType === "master") {
            this.metadataChannel = new MetadataChannelMaster(this.peer);
        } else {
            this.metadataChannel = new MetadataChannelViewer(this.peer);
        }
    }

    addChannel(channel: RobotChannel): void {
        // Implementation for adding a channel goes here
        console.log('Adding channel...');

        // if it's an AV stream channel, send metadata about it
        if (channel instanceof RobotAVStreamChannel) {
            this._sendMetadata(channel.stream);
        }

        // if it's a data channel, not much to do.
    }

    private async _sendMetadata(stream: MediaStream): Promise<void> {
        console.debug(`Sending metadata for stream: ${stream}`);
        // TODO: implement
    }
}