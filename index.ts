import axios, {AxiosError, AxiosResponse} from 'axios';
import * as crypto from 'crypto';

/** Triumph Node Client */
class Client {
    private readonly baseUrl: string;
    private readonly organization: string;
    private readonly apiKey: string;
    // @ts-ignore
    private readonly env: "production" | "sandbox";
    private readonly headers: { [hdrName: string]: string };
    private readonly reqTimeout = 10000; /** 10 seconds */

    constructor(config: Configuration) {
        this.baseUrl = config.env === "sandbox" ? "https://debug-api.triumpharcade.com" : "https://api.triumpharcade.com"
        this.organization = config.organization;
        this.apiKey = config.apiKey;
        this.env = config.env;
        this.headers = {
            'triumph-organization': this.organization,
        }
    }

    /** encrypt payload */
    private encryptMessage(message: string) {
        const algorithm = 'aes-256-gcm';
        const key = Buffer.from(this.apiKey, 'hex');
        const iv = crypto.randomBytes(16);

        const cipher = crypto.createCipheriv(algorithm, key, iv);
        const encrypted = Buffer.concat([cipher.update(message, 'utf8'), cipher.final()]);
        const tag = cipher.getAuthTag();

        return Buffer.concat([iv, encrypted, tag]).toString('hex');
    }

    /** verifies integrity and authenticity of received message */
    private decryptMessage(encryptedData: string): string {
        const algorithm = 'aes-256-gcm';
        const key = Buffer.from(this.apiKey, 'hex');
        const rawData = Buffer.from(encryptedData, 'hex');

        const iv = rawData.subarray(0, 16);
        const encrypted = rawData.subarray(16, rawData.length - 16);
        const tag = rawData.subarray(rawData.length - 16);

        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        decipher.setAuthTag(tag);

        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        return decrypted.toString('utf8');
    }

    private decryptResponse(response: AxiosResponse): AxiosResponse {
        const decryptedData = this.decryptMessage(response.data);
        try {
            const result = JSON.parse(decryptedData);
            return {...response, data: result};
        } catch (error) {
            throw new Error(`Unknown response error: ${error.message}`);
        }
    }

    async get(path: string): Promise<AxiosResponse> {
        const url = `${this.baseUrl}/${path}`;
        try {
            return await axios.get(url, {
                headers: this.headers,
                timeout: this.reqTimeout,
            });
        } catch (error) {
            this.handleRequestError(error);
        }
    }

    async post(path: string, data: any): Promise<AxiosResponse> {
        const url = `${this.baseUrl}/${path}`;
        const encryptedData = this.encryptMessage(JSON.stringify(data));
        try {
            const response = await axios.post(url, encryptedData, {
                headers: this.headers,
                timeout: this.reqTimeout,
            });
            return this.decryptResponse(response);
        } catch (error) {
            this.handleRequestError(error);
        }
    }

    private handleRequestError(error: AxiosError): never {
        if (error.response) {
            // The request was made and the server responded with a status code that falls out of the range of 2xx
            throw new Error(`Request failed with status ${error.response.status}: ${error.response.statusText}`);
        } else if (error.request) {
            // The request was made but no response was received
            throw new Error(`Request failed: No response received`);
        } else {
            // Something happened in setting up the request that triggered an Error
            throw new Error(`Request setup failed: ${error.message}`);
        }
    }

}

export interface ConfigurationParameters {
    organization: string;
    apiKey: string;
    env: "production" | "sandbox";
}

class Configuration {
    readonly organization: string;
    readonly apiKey: string;
    readonly env: "production" | "sandbox";

    constructor(params: ConfigurationParameters) {
        this.organization = params.organization;
        this.apiKey = params.apiKey;
        this.env = params.env;
    }
}

export default {Client, Configuration};
