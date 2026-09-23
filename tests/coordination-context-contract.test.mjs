import assert from "node:assert/strict";
import test from "node:test";

import {
  COORDINATION_UNIT_HEADER,
  activeCoordinationContextMatches,
  coordinationUnitHeaders,
} from "../src/lib/coordination-context-contract.ts";

test("YF-6: valid active unit selection produces the canonical backend header", () => {
  assert.deepEqual(coordinationUnitHeaders(42), { [COORDINATION_UNIT_HEADER]: "42" });
  assert.deepEqual(coordinationUnitHeaders(null), {});
  assert.deepEqual(coordinationUnitHeaders(0), {});
});

test("YF-6: frontend rejects a manifest resolved for a different active unit", () => {
  assert.equal(activeCoordinationContextMatches(7, 7), true);
  assert.equal(activeCoordinationContextMatches(7, 8), false);
  assert.equal(activeCoordinationContextMatches(null, 8), true);
});
