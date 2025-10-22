// NOTE: Manus OAuth temporarily disabled - ManusClient package not available
// import { ManusClient } from "manus-client";
import * as db from "../db";
import { COOKIE_NAME } from "@shared/const";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";

class SDK {
  private sessionSecret: string;

  constructor() {
    this.sessionSecret = process.env.SESSION_SECRET || "default-secret-change-in-production";
    console.log("[SDK] Initialized without OAuth (ManusClient not available)");
  }

  getSessionSecret(): Uint8Array {
    return new TextEncoder().encode(this.sessionSecret);
  }

  // OAuth methods disabled until ManusClient is available
  async exchangeCodeForToken(code: string, state: string) {
    throw new Error("OAuth not configured - ManusClient not available");
  }

  async getUserInfo(accessToken: string) {
    throw new Error("OAuth not configured - ManusClient not available");
  }

  async createSessionToken(
    openId: string,
    options: { name: string; expiresInMs: number }
  ): Promise<string> {
    const secretKey = this.getSessionSecret();
    const expirationSeconds = Math.floor(options.expiresInMs / 1000);

    return new SignJWT({
      openId,
      name: options.name,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<{ openId: string; name: string } | null> {
    if (!cookieValue) {
      return null;
    }

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { openId, name } = payload as Record<string, unknown>;

      if (typeof openId !== "string") {
        console.warn("[Auth] Invalid session payload structure");
        return null;
      }

      return {
        openId,
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
