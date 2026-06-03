import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  const counts = {
    brainNode: await p.brainNode.count(),
    brainEdge: await p.brainEdge.count(),
    brainPattern: await p.brainPattern.count(),
    brainFeedback: await p.brainFeedback.count(),
    federationPeer: await p.federationPeer.count(),
    federationPattern: await p.federationPattern.count(),
    memory: await p.memory.count(),
    brainInsight: await p.brainInsight.count(),
    councilSession: await p.councilSession.count(),
    plan: await p.plan.count(),
    narrative: await p.narrative.count(),
  };
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(20)} ${v}`);
  await p.$disconnect();
})();
