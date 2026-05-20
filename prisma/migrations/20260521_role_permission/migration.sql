-- Phase P5: interactive role-route permissions.
CREATE TABLE "RolePermission" (
  "id"        TEXT PRIMARY KEY,
  "role"      TEXT NOT NULL,
  "path"      TEXT NOT NULL,
  "allowed"   BOOLEAN NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedBy" TEXT
);
CREATE UNIQUE INDEX "RolePermission_role_path_key" ON "RolePermission"("role", "path");
CREATE INDEX "RolePermission_role_idx" ON "RolePermission"("role");
