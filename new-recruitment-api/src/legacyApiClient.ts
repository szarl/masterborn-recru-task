
const LEGACY_API_KEY = "0194ec39-4437-7c7f-b720-7cd7b2c8d7f4";

export const legacyApiClient = new class LegacyApiClient {
    async createCandidate(body: any) {
        return fetch('localhost:4040/candidates', { body: JSON.stringify(body), headers: { 'x-api-key': LEGACY_API_KEY } })
    }
}()