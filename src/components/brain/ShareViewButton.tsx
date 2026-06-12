import { prisma } from "@/lib/db/db";
import { ShareMenu } from "./ShareMenu";

// Server wrapper around <ShareMenu>. Fetches the colleague list itself so any
// page can make its view shareable with ONE line — no per-page member query.
//
//   <ShareViewButton title="Hotels — Arena" body="3 hotels · 78% occ · …" ar={ar} tone="dark" />
//
// This is the "share button on every section" primitive: drop it into any
// header/card and that data point can be pushed to the Council or a colleague.
export async function ShareViewButton({
  title,
  body,
  refType,
  refId,
  ar,
  tone = "auto",
  label,
}: {
  title: string;
  body: string;
  refType?: string;
  refId?: string;
  ar: boolean;
  tone?: "light" | "dark" | "auto";
  label?: string;
}) {
  const members = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 100,
  });
  return (
    <ShareMenu
      title={title}
      body={body}
      refType={refType}
      refId={refId}
      members={members}
      ar={ar}
      tone={tone}
      label={label}
    />
  );
}
