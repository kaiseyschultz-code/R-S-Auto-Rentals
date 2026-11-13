// Creates a CRM staff login. Use it once to create the first owner (after
// that, the owner adds people from /admin/team).
//
//   node --env-file=.env.local scripts/create-staff-user.mjs <email> "<Full Name>" [owner|manager|staff]
//
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in the env file.
// Prints a generated temporary password once; it is not stored anywhere.
// Set TENANT_ID to target a tenant other than the seeded R&S one.

import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const [email, fullName, role = "owner"] = process.argv.slice(2);
if (!email || !fullName || !["owner", "manager", "staff"].includes(role)) {
  console.error('Usage: node --env-file=.env.local scripts/create-staff-user.mjs <email> "<Full Name>" [owner|manager|staff]');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY first (see .env.example).");
  process.exit(1);
}

const tenantId = process.env.TENANT_ID ?? "a1b2c3d4-0000-0000-0000-000000000001";
const password = process.env.STAFF_PASSWORD ?? randomBytes(12).toString("base64url");

const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  app_metadata: { tenant_id: tenantId, role, full_name: fullName },
  user_metadata: { full_name: fullName },
});
if (error) {
  console.error("Failed:", error.message);
  process.exit(1);
}

const { data: profile } = await admin.from("users").select("role").eq("id", data.user.id).maybeSingle();
if (!profile) {
  console.error("Login created, but no staff profile appeared. Check the tenant ID and the handle_new_auth_user trigger.");
  process.exit(1);
}

console.log(`Created ${role} login for ${email}.`);
if (!process.env.STAFF_PASSWORD) console.log(`Temporary password (shown once): ${password}`);
