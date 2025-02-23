import {describe, expect, jest, test} from '@jest/globals';

import request from "supertest";

import app from "../src/app";

describe("Test app.ts", () => {
  test("Catch-all route", async () => {
    const res = await request(app).get("/");
    expect(res.text).toEqual('New Recruitment API');
  });
});
    