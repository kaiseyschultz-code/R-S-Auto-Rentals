"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/crm/session";
import { logActivity } from "@/lib/crm/activity";
import { errorMessage, FormError, oneOf, requiredText, type ActionState } from "@/lib/crm/form";

const ROLES = ["owner", "manager", "staff"] as const;

/**
 * Owner adds a staff login. The tenant and role go in app_metadata (only the
 * server can set it); the handle_new_auth_user trigger turns that into a
 * row in public.users.
 */
export async function addStaff(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const owner = await requireOwner();

  try {
    const email = requiredText(fd, "email", "Email").toLowerCase();
    const fullName = requiredText(fd, "full_name", "Name");
    const role = oneOf(fd, "role", ROLES, "staff");
    const password = requiredText(fd, "password", "Temporary password");
    if (password.length < 10) throw new FormError("Use a temporary password of at least 10 characters.");

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { tenant_id: owner.tenant_id, role, full_name: fullName },
      user_metadata: { full_name: fullName },
    });
    if (error) {
      if (/already.*registered|exists/i.test(error.message)) throw new FormError("That email already has a login.");
      throw new FormError(`Couldn't create the login: ${error.message}`);
    }
    const supabase = await createClient();
    await logActivity(supabase, "user", data.user.id, "created", { role });
  } catch (e) {
    return { error: errorMessage(e) };
  }

  revalidatePath("/admin/team");
  redirect("/admin/team?saved=1");
}

/** Change a teammate's role or switch their access off/on. Owners can't demote or disable themselves. */
export async function updateStaff(userId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const owner = await requireOwner();

  try {
    const role = oneOf(fd, "role", ROLES);
    const isActive = fd.get("is_active") === "on";
    if (userId === owner.id && (role !== "owner" || !isActive)) {
      throw new FormError("You can't remove your own owner access. Make someone else owner first.");
    }
    const supabase = await createClient();
    const { error } = await supabase
      .from("users")
      .update({ role, is_active: isActive })
      .eq("id", userId);
    if (error) throw error;
    await logActivity(supabase, "user", userId, "updated", { role, is_active: isActive });
  } catch (e) {
    return { error: errorMessage(e) };
  }

  revalidatePath("/admin/team");
  redirect("/admin/team?saved=1");
}
