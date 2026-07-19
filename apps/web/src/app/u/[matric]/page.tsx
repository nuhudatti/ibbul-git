import { PublicProfile } from "@/components/portfolio/public-profile";

export default async function StudentPublicPage({
  params,
}: {
  params: Promise<{ matric: string }>;
}) {
  const { matric } = await params;
  return <PublicProfile matric={matric} />;
}
