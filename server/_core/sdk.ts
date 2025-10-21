import { ManusClient } from "manus-client";
import * as db from "../db";
import { COOKIE_NAME } from "@shared/const";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";

class SDK {
  private client: ManusClient;
  private sessionSecret: string;

  constructor() {
    const baseUrl = process.env.OAUTH_SERVER_URL;
    const appId = process.env.APP_ID;

    if (!baseUrl) {
      console.error("[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable.");
    }

    if (!appId) {
      console.error("[OAuth] ERROR: APP_ID is not configured! Set APP_ID environment variable.");
    }

    this.client = new ManusClient({ baseUrl: baseUrl || "", appId: appId || "" });
    this.sessionSecret = process.env.SESSION_SECRET || "default-secret-change-in-production";
    
    if (baseUrl) {
      console.log("[OAuth] Initialized with baseURL:", baseUrl);
    }
  }

  getSessionSecret(): Uint8Array {
    return new TextEncoder().encode(this.sessionSecret);
  }

  async exchangeCodeForToken(code: string, state: string) {
    return this.client.exchangeCodeForToken({ code, state });
  }

  async getUserInfo(accessToken: string) {
    return this.client.getUserInfo(accessToken);
  }

  async createSessionToken(
    openId: string,
    options: { name: string; expiresInMs: number }
  ): Promise<string> {
    const secretKey = this.getSessionSecret();
    const expirationSeconds = Math.floor(options.expiresInMs / 1000);

    return new SignJWT({
      openId,
      appId: this.client.appId,
      name: options.name,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<{ openId: string; appId: string; name: string } | null> {
    if (!cookieValue) {
      // Session cookie missing - this is normal for public routes
      // No need to log as it happens frequently
      return null;
    }

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { openId, appId, name } = payload as Record<string, unknown>;

      if (typeof openId !== "string" || typeof appId !== "string") {
        console.warn("[Auth] Invalid session payload structure");
        return null;
      }

      return {
        openId,
        appId,
        name: typeof name === "string" ? name : "",
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed:", error instanceof Error ? error.message : "Unknown error");
      return null;
    }
  }

  async authenticateRequest(req: Request) {
    const cookieValue = req.cookies?.[COOKIE_NAME];
    const session = await this.verifySession(cookieValue);

    if (!session) {
      return null;
    }

    const user = await db.getUser(session.openId);
    return user;
  }
}

export const sdk = new SDK();
