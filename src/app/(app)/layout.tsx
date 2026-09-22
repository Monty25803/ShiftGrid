import { AppNav } from "@/components/app-nav";
import { PasswordGate } from "@/components/password-gate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <PasswordGate>
      <div className="min-h-screen">
        <AppNav />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </div>
    </PasswordGate>
  );
}
