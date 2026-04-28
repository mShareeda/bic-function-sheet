export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mb-4 inline-grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground shadow-glass">
            <span className="text-lg font-bold">BIC</span>
          </div>
          <h1 className="text-h1 tracking-tight">Function Sheet</h1>
          <p className="text-sm text-muted-foreground">Bahrain International Circuit</p>
        </div>
        {children}
      </div>
    </div>
  );
}
