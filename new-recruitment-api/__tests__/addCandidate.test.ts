import {describe, expect, jest, it } from '@jest/globals';

import request from "supertest";

import app from "../src/app";
import { legacyApiClient } from '../src/legacyApiClient';

const LEGACY_API_KEY = process.env.LEGACY_API_KEY || 'default-key';

describe("/POST candidates", () => {
  it("Should create candidate", async () => {
    jest.spyOn(legacyApiClient, 'createCandidate').mockImplementation(async () => new Response())
    const candidate = {
        firstName: "John",
        lastName: "Doe",
        phone: "+48123456789",
        email: `${new Date().getTime()}@test.pl`,
        yearsOfExperience: 5,
        consentDate: new Date().toISOString(),
        currentStatusId: 1,
        jobOfferIds: [1]
    }

    const res = await request(app).post("/candidates").send(candidate).set('x-api-key', LEGACY_API_KEY);
    expect(res.status).toStrictEqual(201)
    expect(res.body).toStrictEqual({
      message: "Candidate added successfully",
      candidate: {
        id: expect.any(String),
        firstName: "John",
        lastName: "Doe",
        email: expect.any(String),
        phone: "+48123456789",
        yearsOfExperience: 5,
        jobOfferIds: [1],
        consentDate: expect.any(String),
        status: "new",
        notes: [],
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      }
    });
  });

  it("Should throw an error when legacy api key is missing", async () => {
        const candidate = {
            firstName: "John",
            lastName: "Doe",
            phone: "+48123456789",
            email: `${new Date().getTime()}@test.pl`,
            yearsOfExperience: 5,
            consentDate: new Date().toISOString(),
            currentStatusId: 1,
            jobOfferIds: [1]
        }

        const res = await request(app).post("/candidates").send(candidate);
        expect(res.status).toStrictEqual(403);
        expect(res.body).toStrictEqual({
            message: "Forbidden: Invalid API Key"
        });
    });
});
    