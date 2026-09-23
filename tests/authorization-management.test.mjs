import assert from "node:assert/strict";
import test from "node:test";

import {
  businessPermissionSourceLabel,
  hasGlobalUnitBusinessAllow,
  unitBusinessPermissionIsReadOnly,
} from "../src/lib/authorization-management.ts";

function metadata(overrides = {}) {
  return {
    mode: "enforce",
    coordinator_staff_business_source: "coordination_units",
    role_matrix_business_read_only: true,
    unit_business_roles: ["coordinator", "staff"],
    protected_roles: ["coordinator", "staff"],
    unit_business_groups: ["Financials", "Programs"],
    unit_business_permissions: ["financial.view", "programs.view"],
    coordination_units_path: "/panel/coordination-units",
    user_override_scope: "membership_for_business_permissions",
    business_allow_requires_acknowledgement: false,
    ...overrides,
  };
}

test("YF-1: enforce modunda coordinator/staff birim isi matriste salt okunurdur", () => {
  const management = metadata();

  assert.equal(unitBusinessPermissionIsReadOnly(management, "coordinator", "financial.view"), true);
  assert.equal(unitBusinessPermissionIsReadOnly(management, "staff", "programs.view"), true);
  assert.equal(unitBusinessPermissionIsReadOnly(management, "coordinator", "permissions.matrix.update"), false);
  assert.equal(unitBusinessPermissionIsReadOnly(management, "super_admin", "financial.view"), false);
});

test("YF-1: legacy/pilot global matris kilidi metadata ile kapatilabilir", () => {
  const management = metadata({
    mode: "pilot",
    coordinator_staff_business_source: "mixed",
    role_matrix_business_read_only: false,
    protected_roles: [],
  });

  assert.equal(unitBusinessPermissionIsReadOnly(management, "coordinator", "financial.view"), false);
  assert.match(businessPermissionSourceLabel(management), /Pilot/);
});

test("YF-6: birim isi allow override artik global onay degil uyelik secimi kullanir", () => {
  const management = metadata();

  assert.equal(
    hasGlobalUnitBusinessAllow(management, "staff", [
      { permission_name: "programs.view", effect: "allow" },
    ]),
    false
  );
  assert.equal(management.user_override_scope, "membership_for_business_permissions");
});

test("YF-1 legacy adapter: eski global allow metadata onayi halen okunabilir", () => {
  const management = metadata({
    user_override_scope: "global_across_unit_memberships",
    business_allow_requires_acknowledgement: true,
  });

  assert.equal(
    hasGlobalUnitBusinessAllow(management, "staff", [
      { permission_name: "programs.view", effect: "allow" },
    ]),
    true
  );
  assert.equal(
    hasGlobalUnitBusinessAllow(management, "staff", [
      { permission_name: "programs.view", effect: "deny" },
    ]),
    false
  );
  assert.equal(
    hasGlobalUnitBusinessAllow(management, "staff", [
      { permission_name: "permissions.matrix.update", effect: "allow" },
    ]),
    false
  );
});
