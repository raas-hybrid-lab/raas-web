// Container for AWS configuration
// and tools to load it for dev environments

export type AWSClientArgs = {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
}


/**
 * Loads AWS client args from .env file using Vite.
 * 
 * @returns AWSClientArgs
 */
export function loadAWSClientArgs(): AWSClientArgs {
    const envType = import.meta.env['VITE_ENV'];
    if (envType !== 'development') {
        throw new Error('AWS client args can only be loaded in local development environment.');
    }

    const args: AWSClientArgs = {
        accessKeyId: import.meta.env['VITE_AWS_ACCESS_KEY_ID'],
        secretAccessKey: import.meta.env['VITE_AWS_SECRET_ACCESS_KEY'],
        region: import.meta.env['VITE_KINESIS_REGION'],
    }

    const sessionToken = import.meta.env['VITE_AWS_SESSION_TOKEN'];
    if (sessionToken) {
        args.sessionToken = sessionToken;
    }

    console.debug('Loaded AWS client args:', args);

    return args;
}