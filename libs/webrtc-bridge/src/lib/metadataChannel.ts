import { EventEmitter } from "events";


type MetadataChannelCallbacks = {
    onSdpOffer: (offer: RTCSessionDescription) => void;
    onSdpAnswer: (answer: RTCSessionDescription) => void;
};

/**
 * A channel for sending and receiving metadata between peers.
 * 
 * Currently has one job: to set up renegotiation of the peer connection when new streams are added.
 * (this is a workaroun for the fact that AWS Kinesis Signaling doesn't support renegotiation)
 * 
 * Events:
 * - ready: emitted when the metadata channel is set up on both ends and ready to be used
 */
export class PeerMetadataChannel extends EventEmitter {
    private _channel: RTCDataChannel;
    private _callbacks: MetadataChannelCallbacks;

    constructor(channel: RTCDataChannel, callbacks: MetadataChannelCallbacks) {
        super();
        this._channel = channel;
        this._callbacks = callbacks;

        console.debug('[METADATA] Metadata channel opened.');

        this._channel.onmessage = (event) => {
            console.debug('[METADATA] Message received:', event.data);
            const message = JSON.parse(event.data);
            switch (message.type) {
                case 'sdpOffer':
                    this._callbacks.onSdpOffer(message.sdpOffer);
                    break;
                case 'sdpAnswer':
                    this._callbacks.onSdpAnswer(message.sdpAnswer);
                    break;
                case 'test':
                    // could change to ping pong if i want to test latency be more robust etc
                    // but for now this is easier and good enough.
                    console.debug('[METADATA] Received test message:', message.message);
                    this.emit('ready');
                    break;
                default:
                    console.error('[METADATA] Received unknown message type:', message.type);
            }
        };

        this._sendTestMessage();
    }

    private _send(message: string) {
        this._channel.send(message);
    }

    public sendSDPOffer(offer: RTCSessionDescription) {
        this._send(JSON.stringify({
            type: 'sdpOffer',
            sdpOffer: offer,
        }));
    }

    public sendSDPAnswer(answer: RTCSessionDescription) {
        this._send(JSON.stringify({
            type: 'sdpAnswer',
            sdpAnswer: answer,
        }));
    }

    private _sendTestMessage() {
        this._send(JSON.stringify({
            type: 'test',
            message: "helloworld",
        }));
    }

    public close() {
        this._channel.close();
    }
}
