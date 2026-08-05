import { Activity, BarChart3, Clock3, PlayCircle } from "lucide-react";

type StatsCardsProps = {
  videoCount: number;
  analysisCount: number;
  averageScore: number | null;
  latestUploadedAt: string | null;
};

export default function StatsCards({ videoCount, analysisCount, averageScore, latestUploadedAt }: StatsCardsProps) {
  const stats = [
    { title: "Videos Uploaded", value: String(videoCount), detail: "Your latest upload history", icon: PlayCircle },
    { title: "Analyses Completed", value: String(analysisCount), detail: "AI insights available", icon: Activity },
    { title: "Average Execution Index", value: averageScore && averageScore > 0 ? `${averageScore}/100` : "—", detail: "Only reliability-gated reports", icon: BarChart3 },
    { title: "Latest Upload", value: latestUploadedAt ?? "No uploads yet", detail: "Most recent session date", icon: Clock3 },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.title} className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-400">{stat.title}</p>
              <div className="rounded-2xl bg-emerald-500/15 p-2 text-emerald-400"><Icon className="h-5 w-5" /></div>
            </div>
            <p className="mt-6 text-3xl font-semibold text-white">{stat.value}</p>
            <p className="mt-2 text-sm text-slate-500">{stat.detail}</p>
          </div>
        );
      })}
    </div>
  );
}
