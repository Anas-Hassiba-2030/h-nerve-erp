import { describe, it, expect } from "vitest";
import { graphNodeId } from "./Brain";

// graphNodeId must match seedGraph.ts `nid()` exactly:
//   `bn_${kind.toLowerCase()}_${refId}`
// otherwise the orchestrator's graph lookups silently miss.
describe("graphNodeId", () => {
  it("builds the seeder's node id from {entity, id}", () => {
    expect(graphNodeId("Hotel", "arena-1")).toBe("bn_hotel_arena-1");
    expect(graphNodeId("DairyBatch", "abc")).toBe("bn_dairybatch_abc");
    expect(graphNodeId("Crop", "c_42")).toBe("bn_crop_c_42");
  });

  it("lowercases only the entity kind, never the refId", () => {
    expect(graphNodeId("Booking", "REF-XYZ")).toBe("bn_booking_REF-XYZ");
  });

  it("passes through an already-resolved bn_ node id unchanged", () => {
    expect(graphNodeId("Hotel", "bn_hotel_arena-1")).toBe("bn_hotel_arena-1");
    expect(graphNodeId("Whatever", "bn_dairybatch_abc")).toBe("bn_dairybatch_abc");
  });
});
