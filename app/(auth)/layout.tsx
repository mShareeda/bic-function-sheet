import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/bic-logo.png"
            alt="Bahrain International Circuit"
            width={200}
            height={160}
            priority
            className="mb-4 h-32 w-auto object-contain"
          />
          <h1 className="text-h1 tracking-tight">Function Sheet</h1>
          <p className="text-sm text-muted-foreground">
            Bahrain International Circuit
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
