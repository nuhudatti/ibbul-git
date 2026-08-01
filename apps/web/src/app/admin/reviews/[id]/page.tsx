import { redirect } from "next/navigation";

interface PageProps {
  params: { id: string };
}

export default function AdminReviewDetailRedirectPage({ params }: PageProps) {
  redirect(`/dashboard/reviews/${params.id}`);
}
