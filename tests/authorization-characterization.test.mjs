import assert from "node:assert/strict";
import test from "node:test";

import {
  panelModulesForActiveUnit,
  panelPathIsAvailableInActiveUnit,
  permissionIsUsableInActiveUnit,
} from "../src/lib/organization-context.ts";
import { panelPathAllowedByManifest } from "../src/lib/panel-module-contract.ts";

function authorityUser({ permissions = [], effectivePermissions = [], overrides = [], scopes = {}, activeUnitId } = {}) {
  return {
    effective_permissions: effectivePermissions,
    permission_overrides: overrides,
    permission_scopes: scopes,
    organization_context: {
      authoritative: true,
      active_unit_id: activeUnitId,
      unit_memberships: [
        {
          membership_id: 10,
          unit_id: 1,
          unit_code: "project_1",
          unit_name: "Project 1",
          unit_kind: "project",
          position: "staff",
          is_primary: true,
          project_id: 1,
          permissions,
          project_ids_by_permission: {},
          manageable_project_ids: [1],
        },
      ],
    },
  };
}

function module({ id, viewPermissions = [], enabledActions = [], alwaysVisible = false }) {
  return {
    id,
    panel_type: "authority",
    label: id,
    section: "test",
    href: `/panel/${id}`,
    order: 1,
    view_permissions: viewPermissions,
    entry_permissions: viewPermissions,
    actions: enabledActions,
    enabled_actions: enabledActions,
    always_visible: alwaysVisible,
  };
}

test("YF-5: an always-visible self-service module survives the active-unit filter", () => {
  const user = authorityUser({ permissions: ["dashboard.staff.view"] });
  const modules = [
    module({ id: "dashboard", viewPermissions: ["dashboard.staff.view"], enabledActions: ["dashboard.staff.view"] }),
    module({ id: "profile", alwaysVisible: true }),
  ];

  const visible = panelModulesForActiveUnit(modules, user, 1).map((item) => item.id);

  assert.deepEqual(visible, ["dashboard", "profile"]);
  assert.equal(panelPathIsAvailableInActiveUnit("/panel/profile", modules, user, 1), true);
});

test("YF-5: an enabled action cannot keep a module whose entry permission is absent in the active unit", () => {
  const user = authorityUser({
    permissions: ["financial.create"],
    scopes: {
      "financial.view": { scope_type: "selected_projects", scope_payload: { project_ids: [1] } },
      "financial.create": { scope_type: "selected_projects", scope_payload: { project_ids: [1] } },
    },
  });
  const financials = module({
    id: "financials",
    viewPermissions: ["financial.view"],
    enabledActions: ["financial.create"],
  });

  assert.equal(permissionIsUsableInActiveUnit(user, 1, "financial.view"), false);
  assert.deepEqual(panelModulesForActiveUnit([financials], user, 1).map((item) => item.id), []);
});

test("YF-6: a legacy global allow override cannot bypass the active membership", () => {
  const user = authorityUser({
    permissions: [],
    overrides: [
      {
        permission_name: "content.view",
        effect: "allow",
        scope_type: "selected_projects",
        scope_payload: { project_ids: [1] },
      },
    ],
    scopes: {
      "content.view": { scope_type: "selected_projects", scope_payload: { project_ids: [1] } },
    },
  });
  const content = module({
    id: "content",
    viewPermissions: ["content.view"],
    enabledActions: ["content.view"],
  });

  assert.equal(permissionIsUsableInActiveUnit(user, 1, "content.view"), false);
  assert.deepEqual(panelModulesForActiveUnit([content], user, 1).map((item) => item.id), []);
});

test("YF-6: selected backend context uses its effective membership override result", () => {
  const user = authorityUser({
    permissions: [],
    effectivePermissions: ["financial.view"],
    activeUnitId: 1,
  });

  assert.equal(permissionIsUsableInActiveUnit(user, 1, "financial.view"), true);
  assert.equal(permissionIsUsableInActiveUnit(user, 1, "content.view"), false);
});

test("YF-5: manifest-hidden roots and unknown panel children are denied", () => {
  const programs = module({
    id: "programs",
    viewPermissions: ["programs.view"],
    enabledActions: ["programs.view"],
  });

  assert.equal(panelPathAllowedByManifest("/panel/programs", [programs]), true);
  assert.equal(panelPathAllowedByManifest("/panel/financials", [programs]), false);
  assert.equal(panelPathAllowedByManifest("/panel/programs/not-a-real-child", [programs]), false);
});

test("YF-5: a dynamic QR route needs both the visible module and its action capability", () => {
  const readOnly = module({
    id: "programs",
    viewPermissions: ["programs.view"],
    enabledActions: ["programs.view"],
  });
  const qrManager = module({
    id: "programs",
    viewPermissions: ["programs.view"],
    enabledActions: ["programs.view", "programs.qr.manage"],
  });

  assert.equal(panelPathAllowedByManifest("/panel/programs/42", [readOnly]), true);
  assert.equal(panelPathAllowedByManifest("/panel/programs/42/qr", [readOnly]), false);
  assert.equal(panelPathAllowedByManifest("/panel/programs/42/qr", [qrManager]), true);
});
