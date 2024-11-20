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
        console.log('Adding channel...', channel);

        // if it's an AV stream channel, add tracks & send metadata about them
        if (channel instanceof RobotAVStreamChannel) {
            for (const track of channel.stream.getTracks()) {
                console.debug(`Adding track to peer:`, track);
                this.peer.addTrack(track, channel.stream);
            }
            this._sendMetadata(channel.stream);
        }
        // if it's a data channel, not much to do (yet)
    }

    private _sendMetadata(stream: MediaStream): void {
        console.debug(`Sending metadata for stream: ${stream}`);
        // TODO: implement
    }
}