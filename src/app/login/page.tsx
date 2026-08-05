import { redirect } from "next/navigation";
export default async function LoginCompatibility({ searchParams }: { searchParams: Promise<{ next?: string; sport?: string }> }) {
  const params = await searchParams;
  redirect(`/auth?next=${encodeURIComponent(params.next ?? "/start")}&sport=${encodeURIComponent(params.sport ?? "tennis")}`);
}
