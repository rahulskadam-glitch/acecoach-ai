"use server";

import { revalidatePath } from "next/cache";

import { APP_VERSION } from "@/lib/config/version";
import { createAdminClient, requireUser } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null, max: number) {
  return (value?.toString().trim() ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, max);
}

export async function createSupportRequest(formData: FormData) {
  const user = await requireUser();
  const supabase = createAdminClient();
  const category = clean(formData.get("category"), 40);
  const description = clean(formData.get("description"), 2000);
  const sessionId = clean(formData.get("sessionId"), 80) || null;
  const jobId = clean(formData.get("jobId"), 80) || null;
  const browser = clean(formData.get("browser"), 300) || null;
  const lastStage = clean(formData.get("lastStage"), 80) || null;

  const allowed = new Set(["upload", "processing", "movement", "report", "practice", "billing", "account", "other"]);
  if (!allowed.has(category)) throw new Error("Choose a valid issue category.");
  if (description.length < 10) throw new Error("Describe the issue in at least 10 characters.");

  const { error } = await supabase.from("support_requests").insert({
    user_id: user.id,
    category,
    description,
    session_reference: sessionId,
    job_reference: jobId,
    app_version: APP_VERSION,
    browser_summary: browser,
    last_processing_stage: lastStage,
    status: "received",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/support");
  return { created: true };
}
