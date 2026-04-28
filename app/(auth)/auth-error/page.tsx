import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuthErrorPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Sign-in problem</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t complete your sign-in. Try again, or contact your administrator if this keeps happening.
        </p>
        <Link href="/signin" className="text-sm text-primary underline">
          Back to sign in
        </Link>
      </CardContent>
    </Card>
  );
}
