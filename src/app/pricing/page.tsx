import ContextualPageShell from "@/components/layout/ContextualPageShell";
import PricingPlanExperience from "@/features/billing/presentation/PricingPlanExperience";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Plans & Membership | Athlentra Tennis",
  description: "Unlock up to 10 monthly 60fps biomechanical tennis stroke audits, 3D Kinematic telemetry, trajectory flight funnels, and your personal AI Coach.",
};

export default function PricingPage() {
  return (
    <ContextualPageShell>
      <div className="py-6 sm:py-10">
        <PricingPlanExperience />
      </div>
    </ContextualPageShell>
  );
}
