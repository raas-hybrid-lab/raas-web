import * as KVSWebRTC from 'amazon-kinesis-video-streams-webrtc';
import { KinesisVideo, KinesisVideoSignalingChannels, KinesisVideoWebRTCStorage } from 'aws-sdk';

class ChannelHelper {
    static IngestionMode = {
        OFF: 0,
        ON: 1,
        DETERMINE_THROUGH_DESCRIBE: 2,
    };

    private _channelName: string;
    private _clientArgs: AWS.KinesisVideo.ClientConfiguration;
    private _role: KVSWebRTC.Role;
    private _endpoint: string | null;
    private _ingestionMode: number;
    private _loggingPrefix: string;
    private _clientId: string | undefined;
    private _channelArn?: string;
    private _endpoints?: Record<string, string>;
    private _kinesisVideoClient?: KinesisVideo;
    private _signalingChannelsClient?: KinesisVideoSignalingChannels;
    private _signalingClient?: KVSWebRTC.SignalingClient;
    private _webrtcStorageClient?: KinesisVideoWebRTCStorage;
    private _streamArn?: string;
    private _signalingConnectionStarted?: Date;

    constructor(channelName: string, clientArgs: AWS.KinesisVideo.ClientConfiguration, endpoint: string | null, role: KVSWebRTC.Role, ingestionMode: number, loggingPrefix: string, clientId: string | undefined) {
        this._channelName = channelName;
        this._clientArgs = clientArgs;
        this._role = role;
        this._endpoint = endpoint;
        this._ingestionMode = ingestionMode;
        this._loggingPrefix = loggingPrefix;
        this._clientId = clientId;

        // Validate required client arguments 
        if (!this._clientArgs.region) {
            throw new Error('Region is required');
        }
        if (!this._clientArgs.accessKeyId) {
            throw new Error('Access key ID is required');
        }
        if (!this._clientArgs.sessionToken) {
            throw new Error('Secret access key is required');
        }
        if (!this._clientArgs.secretAccessKey) {
            throw new Error('Secret access key is required');
        }
    }

    async init(): Promise<void> {
        await this._initializeClients();
    }

    async determineMediaIngestionPath(): Promise<void> {
        await this._checkWebRTCIngestionPath();
    }

    getChannelArn(): string | undefined {
        return this._channelArn;
    }

    getKinesisVideoClient(): KinesisVideo | undefined {
        return this._kinesisVideoClient;
    }

    getSignalingClient(): KVSWebRTC.SignalingClient | undefined {
        return this._signalingClient;
    }

    isIngestionEnabled(): boolean {
        return this._ingestionMode === ChannelHelper.IngestionMode.ON;
    }

    getWebRTCStorageClient(): KinesisVideoWebRTCStorage | undefined {
        return this._webrtcStorageClient;
    }

    getStreamArn(): string | undefined {
        return this._streamArn;
    }

    async fetchTurnServers(): Promise<RTCIceServer[]> {
        if (!this._channelArn) {
            throw new Error('Channel ARN is required to fetch TURN servers.');
        }
        const response = await this._signalingChannelsClient?.getIceServerConfig({ ChannelARN: this._channelArn }).promise();
        if (!response?.IceServerList) {
            return [];
        }
        else {
            return response.IceServerList.flatMap(iceServer => {
                if (!iceServer.Uris) {
                    // unsure why this would happen, but the typing indicates it might
                    throw new Error('No Uris found in ice server config.');
                }
                const ret: RTCIceServer = {
                    urls: iceServer.Uris,
                    username: iceServer.Username,
                    credential: iceServer.Password,
                };
                return [ret];
            });
        }
    }

    getSignalingConnectionLastStarted(): Date | undefined {
        return this._signalingConnectionStarted;
    }

    private async _initializeClients(): Promise<void> {
        if (!this._kinesisVideoClient) {
            await this._checkWebRTCIngestionPath();
        }

        const protocols: string[] = ['HTTPS', 'WSS'];
        if (this._ingestionMode === ChannelHelper.IngestionMode.ON) {
            protocols.push('WEBRTC');
        }

        this._endpoints = await this._getSignalingChannelEndpoints(this._kinesisVideoClient!, this._channelArn!, this._role, protocols);

        this._signalingChannelsClient = new KinesisVideoSignalingChannels({
            ...this._clientArgs,
            endpoint: this._endpoints['HTTPS'],
            correctClockSkew: true,
        });

        this._signalingClient = new KVSWebRTC.SignalingClient({
            channelARN: this._channelArn!,
            channelEndpoint: this._endpoints['WSS'],
            role: this._role,
            region: this._clientArgs.region!,
            credentials: {
                accessKeyId: this._clientArgs.accessKeyId!,
                secretAccessKey: this._clientArgs.secretAccessKey!,
                sessionToken: this._clientArgs.sessionToken!,
            },
            clientId: this._clientId,
            requestSigner: {
                getSignedURL: async (signalingEndpoint: string, queryParams: KVSWebRTC.QueryParams, date: Date | undefined) => {
                    const signer = new KVSWebRTC.SigV4RequestSigner(this._clientArgs.region!, {
                        accessKeyId: this._clientArgs.accessKeyId!,
                        secretAccessKey: this._clientArgs.secretAccessKey!,
                        sessionToken: this._clientArgs.sessionToken!,
                    });

                    const signingStart = new Date();
                    console.debug(this._loggingPrefix, 'Signing the url started at', signingStart);
                    const retVal = await signer.getSignedURL(signalingEndpoint, queryParams, date);
                    const signingEnd = new Date();
                    console.debug(this._loggingPrefix, 'Signing the url ended at', signingEnd);
                    console.debug(this._loggingPrefix, 'Signaling Secure WebSocket URL:', retVal);
                    console.log(this._loggingPrefix, 'Time to sign the request:', signingEnd.getTime() - signingStart.getTime(), 'ms');
                    this._signalingConnectionStarted = new Date();
                    console.log(this._loggingPrefix, 'Connecting to KVS Signaling...');
                    console.debug(
                        this._loggingPrefix,
                        `ConnectAs${this._role.charAt(0).toUpperCase()}${this._role.slice(1).toLowerCase()} started at ${this._signalingConnectionStarted}`,
                    );
                    return retVal;
                },
            },
            systemClockOffset: this._kinesisVideoClient!.config.systemClockOffset,
        });

        if (this._ingestionMode === ChannelHelper.IngestionMode.ON) {
            this._webrtcStorageClient = new KinesisVideoWebRTCStorage({
                ...this._clientArgs,
                endpoint: this._endpoints['WEBRTC'],
            });
        }
    }

    private async _checkWebRTCIngestionPath(): Promise<void> {
        if (!this._kinesisVideoClient) {

            this._kinesisVideoClient = new KinesisVideo({
                ...this._clientArgs,
                // @ts-expect-error this can actually be null (as in the example code in the sdk repo), it's just not documented
                endpoint: this._endpoint,
                correctClockSkew: true,
            });
        }

        if (!this._channelArn) {
            console.log(`[MASTER]`, 'Channel name:', this._channelName);
            const describeSignalingChannelResponse = await this._kinesisVideoClient
                .describeSignalingChannel({
                    ChannelName: this._channelName,
                })
                .promise();

            this._channelArn = describeSignalingChannelResponse.ChannelInfo!.ChannelARN;
            console.log(this._loggingPrefix, 'Channel ARN:', this._channelArn);
        }

        if (this._ingestionMode === ChannelHelper.IngestionMode.DETERMINE_THROUGH_DESCRIBE) {
            const describeMediaStorageConfigurationResponse = await this._kinesisVideoClient
                .describeMediaStorageConfiguration({
                    ChannelARN: this._channelArn!,
                })
                .promise();
            const mediaStorageConfiguration = describeMediaStorageConfigurationResponse.MediaStorageConfiguration;
            console.log(this._loggingPrefix, 'Media storage configuration:', mediaStorageConfiguration);
            if (mediaStorageConfiguration!.Status === 'ENABLED' && mediaStorageConfiguration!.StreamARN !== null) {
                this._ingestionMode = ChannelHelper.IngestionMode.ON;
                this._streamArn = mediaStorageConfiguration!.StreamARN;
            } else {
                this._ingestionMode = ChannelHelper.IngestionMode.OFF;
            }
        }
    }

    private async _getSignalingChannelEndpoints(kinesisVideoClient: KinesisVideo, arn: string, role: string, protocols: string[]): Promise<Record<string, string>> {
        const getSignalingChannelEndpointResponse = await kinesisVideoClient
            .getSignalingChannelEndpoint({
                ChannelARN: arn,
                SingleMasterChannelEndpointConfiguration: {
                    Protocols: protocols,
                    Role: role,
                },
            })
            .promise();
        const endpointsByProtocol = getSignalingChannelEndpointResponse.ResourceEndpointList!.reduce((endpoints, endpoint) => {
            endpoints[endpoint.Protocol!] = endpoint.ResourceEndpoint!;
            return endpoints;
        }, {} as Record<string, string>);
        console.log(this._loggingPrefix, 'Endpoints:', endpointsByProtocol);
        return endpointsByProtocol;
    }
}

export default ChannelHelper; 