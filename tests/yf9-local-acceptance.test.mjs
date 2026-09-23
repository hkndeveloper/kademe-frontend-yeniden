import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  panelNavigationModules,
  panelModulesForActiveUnit,
  panelPathIsAvailableInActiveUnit,
} from "../src/lib/organization-context.ts";
import { panelPathAllowedByManifest } from "../src/lib/panel-module-contract.ts";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(testDirectory, "..");

const authorityRootPaths = [
  "/panel/alumni-opportunities",
  "/panel/announcements",
  "/panel/applications",
  "/panel/assignments",
  "/panel/calendar",
  "/panel/certificates",
  "/panel/content",
  "/panel/dashboard",
  "/panel/digital-bohca",
  "/panel/diplomasi360",
  "/panel/eurodesk",
  "/panel/financials",
  "/panel/inbox",
  "/panel/kademe-plus",
  "/panel/kpd",
  "/panel/members",
  "/panel/motivation",
  "/panel/my-project",
  "/panel/participants",
  "/panel/pergel",
  "/panel/periods",
  "/panel/profile",
  "/panel/programs",
  "/panel/projects",
  "/panel/requests",
  "/panel/support",
  "/panel/volunteer",
  "/panel/zirve-kademe",
];

function manifestModule(id, href, entryPermission) {
  return {
    id,
    panel_type: "authority",
    label: id,
    section: "acceptance",
    href,
    entry_permissions: [entryPermission],
    actions: [entryPermission],
    enabled_actions: [entryPermission],
  };
}

test("YF-9: every authority sidebar root used by the 18-account matrix has an App Router page", () => {
  for (const href of authorityRootPaths) {
    const id = href.slice("/panel/".length);
    const manifestItem = manifestModule(id, href, `${id}.view`);

    assert.equal(existsSync(join(frontendRoot, "src", "app", ...href.split("/").filter(Boolean), "page.tsx")), true, `Missing App Router page for ${href}`);
    assert.equal(panelPathAllowedByManifest(href, [manifestItem]), true, `Manifest rejected its own root ${href}`);
  }

  assert.equal(panelPathAllowedByManifest("/panel/not-in-the-manifest", []), false);
});

test("YF-9: service-to-service context switch replaces media buttons with purchase buttons", () => {
  const modules = [
    manifestModule("content", "/panel/content", "content.view"),
    manifestModule("financials", "/panel/financials", "financial.view"),
  ];
  const user = {
    effective_permissions: ["content.view"],
    permission_scopes: {},
    organization_context: {
      authoritative: true,
      active_unit_id: 10,
      unit_memberships: [
        {
          membership_id: 100,
          unit_id: 10,
          unit_code: "service_media",
          unit_name: "Medya",
          unit_kind: "service",
          position: "coordinator",
          is_primary: true,
          project_id: null,
          permissions: ["content.view"],
          project_ids_by_permission: { "content.view": [1, 2, 3, 4, 5, 6] },
          manageable_project_ids: [1, 2, 3, 4, 5, 6],
        },
        {
          membership_id: 101,
          unit_id: 11,
          unit_code: "service_purchase_organization",
          unit_name: "Satın Alma ve Organizasyon",
          unit_kind: "service",
          position: "staff",
          is_primary: false,
          project_id: null,
          permissions: ["financial.view"],
          project_ids_by_permission: { "financial.view": [1, 2, 3, 4, 5, 6] },
          manageable_project_ids: [1, 2, 3, 4, 5, 6],
        },
      ],
    },
  };

  assert.deepEqual(panelModulesForActiveUnit(modules, user, 10).map((module) => module.id), ["content"]);
  assert.deepEqual(panelModulesForActiveUnit(modules, user, 11).map((module) => module.id), ["financials"]);
  assert.equal(panelPathIsAvailableInActiveUnit("/panel/content", modules, user, 10), true);
  assert.equal(panelPathIsAvailableInActiveUnit("/panel/financials", modules, user, 10), false);
  assert.equal(panelPathIsAvailableInActiveUnit("/panel/financials", modules, user, 11), true);
  assert.equal(panelPathIsAvailableInActiveUnit("/panel/content", modules, user, 11), false);
});

test("YF-9: project-to-service context switch does not merge project and community roots", () => {
  const modules = [
    manifestModule("my_project", "/panel/my-project", "projects.view"),
    manifestModule("volunteer", "/panel/volunteer", "volunteer.view"),
  ];
  const user = {
    effective_permissions: ["projects.view"],
    permission_scopes: {},
    organization_context: {
      authoritative: true,
      active_unit_id: 1,
      unit_memberships: [
        {
          membership_id: 200,
          unit_id: 1,
          unit_code: "project_1",
          unit_name: "Proje 1",
          unit_kind: "project",
          position: "staff",
          is_primary: true,
          project_id: 1,
          permissions: ["projects.view"],
          project_ids_by_permission: { "projects.view": [1] },
          manageable_project_ids: [1],
        },
        {
          membership_id: 201,
          unit_id: 12,
          unit_code: "service_community_culture",
          unit_name: "Topluluk ve Kültür",
          unit_kind: "service",
          position: "staff",
          is_primary: false,
          project_id: null,
          permissions: ["volunteer.view"],
          project_ids_by_permission: { "volunteer.view": [1, 2, 3, 4, 5, 6] },
          manageable_project_ids: [1, 2, 3, 4, 5, 6],
        },
      ],
    },
  };

  assert.deepEqual(panelModulesForActiveUnit(modules, user, 1).map((module) => module.id), ["my_project"]);
  assert.deepEqual(panelModulesForActiveUnit(modules, user, 12).map((module) => module.id), ["volunteer"]);
});

test("YF-10: authoritative context switch never falls back to the previous unit menu", () => {
  const modules = [
    manifestModule("content", "/panel/content", "content.view"),
    manifestModule("financials", "/panel/financials", "financial.view"),
  ];
  const user = {
    effective_permissions: ["content.view"],
    permission_scopes: {},
    organization_context: {
      authoritative: true,
      active_unit_id: 10,
      unit_memberships: [
        {
          membership_id: 100,
          unit_id: 10,
          unit_code: "service_media",
          unit_name: "Medya",
          unit_kind: "service",
          position: "coordinator",
          is_primary: true,
          project_id: null,
          permissions: ["content.view"],
          project_ids_by_permission: { "content.view": [1] },
          manageable_project_ids: [1],
        },
        {
          membership_id: 101,
          unit_id: 11,
          unit_code: "service_purchase_organization",
          unit_name: "Satın Alma",
          unit_kind: "service",
          position: "staff",
          is_primary: false,
          project_id: null,
          permissions: ["financial.view"],
          project_ids_by_permission: { "financial.view": [1] },
          manageable_project_ids: [1],
        },
      ],
    },
  };

  assert.deepEqual(panelNavigationModules([], user, 11, false, false), []);
  assert.deepEqual(
    panelNavigationModules(modules, user, 11, true, false).map((item) => item.id),
    ["financials"],
  );
});
