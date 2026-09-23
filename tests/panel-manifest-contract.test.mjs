import assert from "node:assert/strict";
import test from "node:test";

import {
  entryPermissionsForModule,
  panelPathAllowedByManifest,
} from "../src/lib/panel-module-contract.ts";
import {
  optionalPanelRequest,
  panelLoadErrorMessage,
} from "../src/lib/panel-load-state.ts";

const manifestModule = (overrides = {}) => ({
  id: "programs",
  panel_type: "authority",
  href: "/panel/programs",
  entry_permissions: ["programs.view"],
  enabled_actions: ["programs.view"],
  ...overrides,
});

test("YF-5: entry_permissions is canonical while the legacy alias remains readable", () => {
  assert.deepEqual(entryPermissionsForModule(manifestModule()), ["programs.view"]);
  assert.deepEqual(entryPermissionsForModule(manifestModule({ entry_permissions: undefined, view_permissions: ["legacy.view"] })), ["legacy.view"]);
});

test("YF-5: manifest root and dynamic action routes share one decision", () => {
  const readOnly = manifestModule();
  const qr = manifestModule({ enabled_actions: ["programs.view", "programs.qr.manage"] });

  assert.equal(panelPathAllowedByManifest("/panel/programs", [readOnly]), true);
  assert.equal(panelPathAllowedByManifest("/panel/programs/9", [readOnly]), true);
  assert.equal(panelPathAllowedByManifest("/panel/programs/9/qr", [readOnly]), false);
  assert.equal(panelPathAllowedByManifest("/panel/programs/9/qr", [qr]), true);
  assert.equal(panelPathAllowedByManifest("/panel/financials", [readOnly]), false);
});

test("YF-5: an optional dropdown failure preserves the primary response", async () => {
  const fallback = { data: { projects: [] } };
  const result = await optionalPanelRequest(Promise.reject(new Error("dropdown failed")), fallback, "Test dropdown");
  assert.equal(result, fallback);
});

test("YF-5: forbidden, missing and transport failures have distinct messages", () => {
  const forbidden = { isAxiosError: true, response: { status: 403 } };
  const missing = { isAxiosError: true, response: { status: 404 } };

  assert.match(panelLoadErrorMessage(forbidden, "Program"), /yetkiniz bulunmuyor/);
  assert.match(panelLoadErrorMessage(missing, "Program"), /bulunamadı/);
  assert.match(panelLoadErrorMessage(new Error("offline"), "Program"), /Bağlantıyı/);
});
