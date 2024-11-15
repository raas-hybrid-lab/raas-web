import { MetadataChannelMaster, MetadataChannelViewer } from './metadataChannel';
import * as MT from './messageTypes';

// Mocking the send and onReceiveMessage methods of RTCDataChannel
class MockDataChannel {
    otherChannel: MockDataChannel | undefined;

    setOtherChannel(otherChannel: MockDataChannel) {
        this.otherChannel = otherChannel;
    }
    send = jest.fn((message) => {
        // Call the onmessage handler of the other channel with the message
        if (this.otherChannel?.onmessage) {
            this.otherChannel.onmessage({ data: message });
        }
    });
    onmessage = jest.fn();
}

function createMockDataChannelPair(): [MockDataChannel, MockDataChannel] {
    const masterChannel = new MockDataChannel();
    const viewerChannel = new MockDataChannel();
    masterChannel.setOtherChannel(viewerChannel);
    viewerChannel.setOtherChannel(masterChannel);
    return [masterChannel, viewerChannel];
}

describe('MetadataChannel Communication', () => {
    let master: MetadataChannelMaster;
    let viewer: MetadataChannelViewer;
    let masterChannel: MockDataChannel;
    let viewerChannel: MockDataChannel;

    beforeEach(() => {
        [masterChannel, viewerChannel] = createMockDataChannelPair();

        // Create instances of the master and viewer with the mocked channel
        master = new MetadataChannelMaster({ createDataChannel: () => masterChannel } as never);
        viewer = new MetadataChannelViewer({ createDataChannel: () => viewerChannel } as never);
    });

    test('should send and receive robots available message', async () => {
        const robotIds = ['robot1', 'robot2'];

        // Send the message from master
        await master.sendRobotsAvailable(robotIds);

        // Check if the send method was called with the correct message
        expect(masterChannel.send).toHaveBeenCalledWith(JSON.stringify({
            messageType: MT.MType.RobotsAvailable,
            robotIds
        }));

        // Check if viewer received the correct robot IDs
        expect(viewer.robotsAvailable).toEqual(robotIds);
    });
}); 