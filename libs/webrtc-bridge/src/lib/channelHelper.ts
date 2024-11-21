import * as KVSWebRTC from 'amazon-kinesis-video-streams-webrtc';
import { ChannelProtocol, DescribeMediaStorageConfigurationCommand, DescribeSignalingChannelCommand, GetSignalingChannelEndpointCommand, KinesisVideoClient } from '@aws-sdk/client-kinesis-video';
import { GetIceServerConfigCommand, KinesisVideoSignalingClient } from '@aws-sdk/client-kinesis-video-signaling';
import { KinesisVideoWebRTCStorageClient } from '@aws-sdk/client-kinesis-video-webrtc-storage';
import { AWSClientArgs } from './awsConfig';

type awsV3Config = {
    region: string;
    credentials: {
        accessKeyId: string;
        secretAccessKey: string;
        sessionToken?: string;
    };
}

class ChannelHelper {
    static IngestionMode = {
        OFF: 0,
        ON: 1,
        DETERMINE_THROUGH_DESCRIBE: 2,
    };

    private _channelName: string;
    private _v3ClientArgs: awsV3Config;
    private _role: KVSWebRTC.Role;
    private _endpoint: string | null;
    private _ingestionMode: number;
    private _loggingPrefix: string;
    private _clientId: string | undefined;
    private _channelArn?: string;
    private _endpoints?: Record<string, string>;
    private _kinesisVideoClient?: KinesisVideoClient;
    private _signalingChannelsClient?: KinesisVideoSignalingClient;
    private _signalingClient?: KVSWebRTC.SignalingClient;
    private _webrtcStorageClient?: KinesisVideoWebRTCStorageClient;
    private _streamArn?: string;
    private _signalingConnectionStarted?: Date;

    constructor(channelName: string, clientArgs: AWSClientArgs, endpoint: string | null, role: KVSWebRTC.Role, ingestionMode: number, loggingPrefix: string, clientId: string | undefined) {
        this._channelName = channelName;
        this._role = role;
        this._endpoint = endpoint;
        this._ingestionMode = ingestionMode;
        this._loggingPrefix = loggingPrefix;
        this._clientId = clientId;

        // Validate required client arguments 
        try {
            if (!clientArgs.region) {
                throw new Error('Region is required');
            }
            if (!clientArgs.accessKeyId) {
                throw new Error('Access key ID is required');
            }
            if (!clientArgs.secretAccessKey) {
                throw new Error('Secret access key is required');
            }
        } catch (error) {
            console.error('Error in channelHelper constructor:', error);
            throw error;
        }
        // Convert client args to aws sdk v3-style config
        this._v3ClientArgs = {
            region: clientArgs.region,
            credentials: {
                accessKeyId: clientArgs.accessKeyId,
                secretAccessKey: clientArgs.secretAccessKey,
            },
        }
        if (clientArgs.sessionToken) {
            this._v3ClientArgs.credentials.sessionToken = clientArgs.sessionToken;
        }
    }

    async init(): Promise<void> {
        await this._initializeClients();
    }

    async determineMediaIngestionPath(): Promise<void> {
        await this._checkWebRTCIngestionPath();
    }

    getChannelArn(): string {
        if (!this._channelArn) {
            throw new Error('Channel ARN is not initialized- did you forget to call init()?');
        }
        return this._channelArn;
    }

    getKinesisVideoClient(): KinesisVideoClient {
        if (!this._kinesisVideoClient) {
            throw new Error('Kinesis Video client is not initialized- did you forget to call init()?');
        }
        return this._kinesisVideoClient;
    }

    getSignalingClient(): KVSWebRTC.SignalingClient {
        if (!this._signalingClient) {
            throw new Error('Signaling client is not initialized- did you forget to call init()?');
        }
        return this._signalingClient;
    }

    isIngestionEnabled(): boolean {
        return this._ingestionMode === ChannelHelper.IngestionMode.ON;
    }

    getWebRTCStorageClient(): KinesisVideoWebRTCStorageClient {
        if (!this._webrtcStorageClient) {
            throw new Error('WebRTC storage client is not initialized- did you forget to call init()?');
        }
        return this._webrtcStorageClient;
    }

    getStreamArn(): string {
        if (!this._streamArn) {
            throw new Error('Stream ARN is not initialized- did you forget to call init()?');
        }
        return this._streamArn;
    }

    async fetchTurnServers(): Promise<RTCIceServer[]> {
        if (!this._channelArn) {
            throw new Error('Channel ARN is required to fetch TURN servers.');
        }
        const command = new GetIceServerConfigCommand({
            ChannelARN: this._channelArn,
            Service: "TURN",
        })
        const response = await this._signalingChannelsClient?.send(command);
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

        const protocols: ChannelProtocol[] = ['HTTPS', 'WSS'];
        if (this._ingestionMode === ChannelHelper.IngestionMode.ON) {
            protocols.push('WEBRTC');
        }

        this._endpoints = await this._getSignalingChannelEndpoints(this.getKinesisVideoClient(), this.getChannelArn(), this._role, protocols);

        this._signalingChannelsClient = new KinesisVideoSignalingClient({
            ...this._v3ClientArgs,
            endpoint: this._endpoints['HTTPS'],
        });

        this._signalingClient = new KVSWebRTC.SignalingClient({
            channelARN: this.getChannelArn(),
            channelEndpoint: this._endpoints['WSS'],
            role: this._role,
            region: this._v3ClientArgs.region,
            credentials: this._v3ClientArgs.credentials,
            clientId: this._clientId,
            requestSigner: {
                getSignedURL: async (signalingEndpoint: string, queryParams: KVSWebRTC.QueryParams, date: Date | undefined) => {
                    const signer = new KVSWebRTC.SigV4RequestSigner(this._v3ClientArgs.region, this._v3ClientArgs.credentials);

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
            systemClockOffset: this.getKinesisVideoClient().config.systemClockOffset,
        });

        if (this._ingestionMode === ChannelHelper.IngestionMode.ON) {
            this._webrtcStorageClient = new KinesisVideoWebRTCStorageClient({
                ...this._v3ClientArgs,
                endpoint: this._endpoints['WEBRTC'],
            });
        }
    }

    private async _checkWebRTCIngestionPath(): Promise<void> {
        if (!this._kinesisVideoClient) {
            console.log(this._loggingPrefix, 'Creating Kinesis Video client...');
            console.log(this._loggingPrefix, 'Client args:', this._v3ClientArgs);

            this._kinesisVideoClient = new KinesisVideoClient(this._v3ClientArgs);
        }

        if (!this._channelArn) {
            console.log(`[MASTER]`, 'Channel name:', this._channelName);
            const describeSignalingChannelResponse = await this._kinesisVideoClient
                .send(new DescribeSignalingChannelCommand({
                    ChannelName: this._channelName,
                }));

            this._channelArn = describeSignalingChannelResponse.ChannelInfo?.ChannelARN;
            console.log(this._loggingPrefix, 'Channel ARN:', this._channelArn);
        }

        if (this._ingestionMode === ChannelHelper.IngestionMode.DETERMINE_THROUGH_DESCRIBE) {
            const describeMediaStorageConfigurationResponse = await this._kinesisVideoClient
                .send(new DescribeMediaStorageConfigurationCommand({
                    ChannelARN: this.getChannelArn(),
                }));
            const mediaStorageConfiguration = describeMediaStorageConfigurationResponse.MediaStorageConfiguration;
            console.log(this._loggingPrefix, 'Media storage configuration:', mediaStorageConfiguration);
            if (mediaStorageConfiguration?.Status === 'ENABLED' && mediaStorageConfiguration?.StreamARN !== null) {
                this._ingestionMode = ChannelHelper.IngestionMode.ON;
                this._streamArn = mediaStorageConfiguration?.StreamARN;
            } else {
                this._ingestionMode = ChannelHelper.IngestionMode.OFF;
            }
        }
    }

    private async _getSignalingChannelEndpoints(kinesisVideoClient: KinesisVideoClient, arn: string, role: KVSWebRTC.Role, protocols: ChannelProtocol[]): Promise<Record<string, string>> {
        const command = new GetSignalingChannelEndpointCommand(
            {
                ChannelARN: arn,
                SingleMasterChannelEndpointConfiguration: {
                    Protocols: protocols,
                    Role: role,
                },
            }
        );
        const getSignalingChannelEndpointResponse = await kinesisVideoClient.send(command);
        if (!getSignalingChannelEndpointResponse.ResourceEndpointList) {
            throw new Error('No resource endpoint list found in get signaling channel endpoint response');
        }
        const endpointsByProtocol = getSignalingChannelEndpointResponse.ResourceEndpointList.reduce((endpoints, endpoint) => {
            if (!endpoint.Protocol || !endpoint.ResourceEndpoint) {
                return endpoints;
            }
            else {
                endpoints[endpoint.Protocol] = endpoint.ResourceEndpoint;
                return endpoints;
            }
        }, {} as Record<string, string>);
        console.log(this._loggingPrefix, 'Endpoints:', endpointsByProtocol);
        return endpointsByProtocol;
    }
}

export default ChannelHelper; 