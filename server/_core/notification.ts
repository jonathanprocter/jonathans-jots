/**
 * Notification functionality disabled - this was specific to Manus platform
 */
import { TRPCError } from "@trpc/server";

export type NotificationPayload = {
  title: string;
  content: string;
};

/**
 * Notification service disabled - was specific to Manus platform
 * Implement your own notification system (email, Slack, etc.) if needed
 */
export async function notifyOwner(
  payload: NotificationPayload
): Promise<boolean> {
  console.log("[Notification] Service disabled - was Manus-specific");
  console.log("[Notification] Title:", payload.title);
  console.log("[Notification] Content:", payload.content);
  return false;
}
