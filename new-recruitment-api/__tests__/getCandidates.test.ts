import {describe, expect, it } from '@jest/globals';
import request from 'supertest';
import app from "../src/app";

const LEGACY_API_KEY = process.env.LEGACY_API_KEY || 'default-key';

describe('GET /candidates', () => {
    it('should return 200 and list of candidates', async () => {
        // idk if it works, just getting error zsh: segmentation fault npm run test, when changing legacy_api_key to any other it works
        const response = await request(app)
            .get('/candidates')
            .set('x-api-key', LEGACY_API_KEY);

        expect(response.status).toStrictEqual(200)
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        
        response.body.forEach((candidate: any) => {
            expect(candidate).toHaveProperty('id');
            expect(candidate).toHaveProperty('firstName');
            expect(candidate).toHaveProperty('lastName'); 
            expect(candidate).toHaveProperty('email');
            expect(candidate).toHaveProperty('status');
        });
    });
});