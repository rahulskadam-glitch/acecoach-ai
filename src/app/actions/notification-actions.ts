"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient, requireUser } from "@/lib/supabase/server";

export async function updateReminderPreference(formData: FormData) {
  const user = await requireUser();
  const supabase = createAdminClient();

  const enabled = formData.get("reminderEmailsEnabled") === "on";
  const { error } = await supabase
    .from("profiles")
    .update({ reminder_emails_enabled: enabled })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}
