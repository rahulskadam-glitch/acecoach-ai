import { redirect } from "next/navigation";
export default async function UploadCompatibility({ searchParams }: { searchParams: Promise<{ sport?: string }> }) {
  const params = await searchParams;
  redirect(`/start${params.sport ? `?sport=${encodeURIComponent(params.sport)}` : ""}`);
}
