import assert from "node:assert/strict";
import test from "node:test";

import {
  programEntryPermissionForMode,
  resolveProgramWorkMode,
} from "../src/lib/program-work-mode.ts";

const checker = (permissions) => (permission) => permissions.includes(permission);

test("project program capabilities resolve to the core work mode", () => {
  const mode = resolveProgramWorkMode(checker([
    "programs.view",
    "programs.create",
    "programs.attendance.manage",
  ]));

  assert.equal(mode, "core");
  assert.equal(programEntryPermissionForMode(mode), "programs.view");
});

test("media view stays separate from core program management", () => {
  const mode = resolveProgramWorkMode(checker([
    "programs.view",
    "programs.media.upload",
  ]));

  assert.equal(mode, "media");
  assert.equal(programEntryPermissionForMode(mode), "programs.view");
});

test("community and logistics use their own entry permissions", () => {
  const communityMode = resolveProgramWorkMode(checker([
    "programs.community_event.view",
    "programs.community_event.update",
  ]));
  const logisticsMode = resolveProgramWorkMode(checker([
    "programs.logistics.view",
    "programs.logistics.update",
  ]));

  assert.equal(communityMode, "community_event");
  assert.equal(programEntryPermissionForMode(communityMode), "programs.community_event.view");
  assert.equal(logisticsMode, "logistics");
  assert.equal(programEntryPermissionForMode(logisticsMode), "programs.logistics.view");
});
