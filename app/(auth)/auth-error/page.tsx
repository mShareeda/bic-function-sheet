import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const isPending = error === "PendingApproval";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          {isPending ? "Account pending approval" : "Sign-in problem"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {isPending
            ? "Your Microsoft 365 account has been registered and is awaiting administrator approval. You will be able to sign in once an admin activates your account."
            : "We couldn't complete your sign-in. Try again, or contact your administrator if this keeps happening."}
        </p>
        <Link href="/signin" className="text-sm text-primary underline">
          Back to sign in
        </Link>
      </CardContent>
    </Card>
  );
}
