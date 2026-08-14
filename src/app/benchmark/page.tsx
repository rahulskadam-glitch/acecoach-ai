import ReviewDrivenBenchmark from "@/components/benchmark/ReviewDrivenBenchmark";
import AthleteWorkspaceShell from "@/components/layout/AthleteWorkspaceShell";
import { requireUser } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function BenchmarkPage() {
  if (process.env.ENABLE_PRODUCT_BENCHMARK !== "1") notFound();
  await requireUser();
  return <AthleteWorkspaceShell><ReviewDrivenBenchmark /></AthleteWorkspaceShell>;
}
