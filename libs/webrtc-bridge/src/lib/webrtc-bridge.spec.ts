import { webrtcBridge } from './webrtc-bridge';

describe('webrtcBridge', () => {
  it('should work', () => {
    expect(webrtcBridge()).toEqual('webrtc-bridge');
  });
});
