# webrtc-bridge

Contains logic for setting up the RTC connection between the user & lab clients, resulting in an
RTCPeerConnection object.

Currently only supports using AWS Kinesis Video Streams for the signaling channel, 
but we may want to support other signaling channel providers in the future.

This library was generated with [Nx](https://nx.dev).

## Building

Run `nx build webrtc-bridge` to build the library.

## Running unit tests

Run `nx test webrtc-bridge` to execute the unit tests via [Jest](https://jestjs.io).
