"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import {
  enableFederation,
  disableFederation,
  aggregate,
} from "@/lib/brain/federation.live";
import { seedFederation } from "@/lib/brain/seedFederation";

export async function optInFederation(): Promise<void> {
  const me = await requireUser();
  await enableFederation("default", me.id);
  // Run one aggregation immediately so the user sees something.
  await aggregate({ scope: "default" });
  revalidatePath("/brain/benchmarks");
}

export async function optOutFederation(): Promise<void> {
  await requireUser();
  await disableFederation("default");
  revalidatePath("/brain/benchmarks");
}

export async function refreshFederation(): Promise<void> {
  await requireUser();
  await aggregate({ scope: "default" });
  revalidatePath("/brain/benchmarks");
}

export async function seedFederationPeers(): Promise<void> {
  await requireUser();
  await seedFederation();
  // Re-aggregate against the fresh peer set.
  await aggregate({ scope: "default" });
  revalidatePath("/brain/benchmarks");
}

export async function clearFederation(): Promise<void> {
  await requireUser();
  await prisma.federationPattern.deleteMany({});
  await prisma.federationPeer.deleteMany({});
  revalidatePath("/brain/benchmarks");
}
