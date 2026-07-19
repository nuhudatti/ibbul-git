import { CredentialVerifyView } from "@/components/credential/credential-verify-view";

export default async function VerifyCredentialPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <CredentialVerifyView token={token} />;
}
