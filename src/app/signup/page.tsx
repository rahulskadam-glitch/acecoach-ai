import { redirect } from "next/navigation";
export default async function SignupCompatibility({ searchParams }: { searchParams: Promise<{ sport?: string }> }) {
  const params = await searchParams;
  redirect(`/auth?sport=${encodeURIComponent(params.sport ?? "tennis")}&next=/start`);
}
