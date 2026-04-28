export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">BIC&apos;s Function Sheet</h1>
          <p className="text-sm text-muted-foreground">Bahrain International Circuit</p>
        </div>
        {children}
      </div>
    </div>
  );
}
