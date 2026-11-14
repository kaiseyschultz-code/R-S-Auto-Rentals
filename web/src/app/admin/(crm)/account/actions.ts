"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/crm/session";
import { logActivity } from "@/lib/crm/activity";
import { errorMessage, FormError, text, type ActionState } from "@/lib/crm/form";

/** Signed-in staff member changes their own password (e.g. replacing a temporary one). */
export async function changePassword(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const staff = await requireStaff();

  try {
    const password = text(fd, "password") ?? "";
    const confirm = text(fd, "confirm") ?? "";
    if (password.length < 10) throw new FormError("Use at least 10 characters.");
    if (password !== confirm) throw new FormError("The two passwords don't match.");

    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      if (/different from the old/i.test(error.message)) throw new FormError("Choose a password you haven't used here before.");
      if (/weak|pwned|leaked/i.test(error.message)) throw new FormError("That password is too easy to guess. Try a longer one.");
      throw new FormError(`Couldn't change the password: ${error.message}`);
    }
    await logActivity(supabase, "user", staff.id, "password_changed");
  } catch (e) {
    return { error: errorMessage(e) };
  }

  redirect("/admin/account?changed=1");
}
