// integrations/runtime.ts — connect / disconnect / log / send.
//
// Real OAuth flows would run per-provider (each provider's auth URL,
// callback handler, token exchange). Here we mock the handshake by
// generating a fake tokenBlob and persisting status=CONNECTED. The
// surface API is the same — when production lands, we swap the mock
// connect for the real OAuth handshake without touching callers.
//
// Phase 13 of docs/PHASES-INTELLIGENCE.md.

import { prisma } from "@/lib/db/db";
import { randomBytes } from "node:crypto";
import { getProvider } from "./catalog";

export type IntegrationStatus = "NOT_CONNECTED" | "CONNECTED" | "ERROR" | "EXPIRED";

export async function connectProvider(
  providerKey: string,
  scope: string = "default",
  account?: string
) {
  const provider = getProvider(providerKey);
  if (!provider) throw new Error(`unknown provider: ${providerKey}`);

  const fakeAccount = account || `${provider.name} workspace`;
  const tokenBlob = `tok_${randomBytes(16).toString("hex")}`;
  const settings: Record<string, any> = {};
  for (const f of provider.settingFields ?? []) {
    settings[f.key] = f.default ?? "";
  }

  const integration = await prisma.integration.upsert({
    where: { scope_providerKey: { scope, providerKey } },
    create: {
      scope,
      providerKey,
      status: "CONNECTED",
      account: fakeAccount,
      scopesJson: JSON.stringify(provider.scopes),
      settingsJson: JSON.stringify(settings),
      connectedAt: new Date(),
      lastUsedAt: new Date(),
      credential: {
        create: {
          tokenBlob,
          expiresAt: new Date(Date.now() + 60 * 24 * 3600 * 1000),
        },
      },
    },
    update: {
      status: "CONNECTED",
      account: fakeAccount,
      scopesJson: JSON.stringify(provider.scopes),
      connectedAt: new Date(),
      lastUsedAt: new Date(),
      credential: {
        upsert: {
          create: {
            tokenBlob,
            expiresAt: new Date(Date.now() + 60 * 24 * 3600 * 1000),
          },
          update: {
            tokenBlob,
            rotatedAt: new Date(),
            expiresAt: new Date(Date.now() + 60 * 24 * 3600 * 1000),
          },
        },
      },
    },
  });

  await prisma.integrationLog.create({
    data: {
      integrationId: integration.id,
      kind: "connect",
      message: `OAuth handshake complete — account ${fakeAccount}, ${provider.scopes.length} scopes granted`,
      ms: 380 + Math.floor(Math.random() * 300),
    },
  });

  return integration;
}

export async function disconnectProvider(providerKey: string, scope: string = "default") {
  const integration = await prisma.integration.findUnique({
    where: { scope_providerKey: { scope, providerKey } },
  });
  if (!integration) return;
  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      status: "NOT_CONNECTED",
      account: null,
      connectedAt: null,
      credential: { delete: true },
    },
  });
  await prisma.integrationLog.create({
    data: {
      integrationId: integration.id,
      kind: "disconnect",
      message: "Tokens revoked",
      ms: 0,
    },
  });
}

export async function updateSettings(
  providerKey: string,
  settings: Record<string, any>,
  scope: string = "default"
) {
  await prisma.integration.update({
    where: { scope_providerKey: { scope, providerKey } },
    data: { settingsJson: JSON.stringify(settings) },
  });
}

/** Simulated send — used by Phase 12 actions when integration is connected. */
export async function sendThrough(
  providerKey: string,
  payload: { summary: string; payloadDigest?: string },
  scope: string = "default"
): Promise<{ ok: boolean; message: string }> {
  const integration = await prisma.integration.findUnique({
    where: { scope_providerKey: { scope, providerKey } },
  });
  if (!integration || integration.status !== "CONNECTED") {
    return { ok: false, message: `${providerKey} not connected` };
  }
  await prisma.integration.update({
    where: { id: integration.id },
    data: { lastUsedAt: new Date() },
  });
  await prisma.integrationLog.create({
    data: {
      integrationId: integration.id,
      kind: "send",
      message: payload.summary,
      payloadDigest: payload.payloadDigest ?? null,
      ms: 80 + Math.floor(Math.random() * 200),
    },
  });
  return { ok: true, message: `delivered via ${providerKey}` };
}

/** Best-effort error logger — used by callers that catch a provider failure. */
export async function logError(
  providerKey: string,
  message: string,
  scope: string = "default"
) {
  const integration = await prisma.integration.findUnique({
    where: { scope_providerKey: { scope, providerKey } },
  });
  if (!integration) return;
  await prisma.integration.update({
    where: { id: integration.id },
    data: { errorCount: { increment: 1 } },
  });
  await prisma.integrationLog.create({
    data: {
      integrationId: integration.id,
      kind: "error",
      message: message.slice(0, 320),
    },
  });
}
