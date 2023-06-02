import axios, {AxiosResponse} from 'axios';
import * as crypto from 'crypto';

class Client {
    private readonly baseUrl: string;
    private readonly apiKey: string;

    constructor(organization: string, apiKey: string) {
        this.baseUrl = `https://api.example.com/${organization}`;
        this.apiKey = apiKey;
    }

    private encryptMessage(message: string): string {
        const hmac = crypto.createHmac('sha256', this.apiKey);
        return hmac.update(message).digest('hex');
    }

    protected async get(path: string): Promise<AxiosResponse> {
        const url = `${this.baseUrl}/${path}`;
        try {
            return await axios.get(url);
        } catch (error) {
            throw new Error(`GET request failed: ${error.message}`);
        }
    }

    protected async post(path: string, data: any): Promise<AxiosResponse> {
        const url = `${this.baseUrl}/${path}`;
        const encryptedData = this.encryptMessage(JSON.stringify(data));
        try {
            return await axios.post(url, encryptedData);
        } catch (error) {
            throw new Error(`POST request failed: ${error.message}`);
        }
    }
}

export default Client;
