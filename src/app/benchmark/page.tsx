import ReviewDrivenBenchmark from "@/components/benchmark/ReviewDrivenBenchmark";
import AthleteWorkspaceShell from "@/components/layout/AthleteWorkspaceShell";
import { requireUser } from "@/lib/supabase/server";

export default async function BenchmarkPage() {
  await requireUser();
  return <AthleteWorkspaceShell><ReviewDrivenBenchmark /></AthleteWorkspaceShell>;
}
