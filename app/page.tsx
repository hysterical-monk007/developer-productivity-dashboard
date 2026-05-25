import { LoginCard } from "@/components/auth/login-card";
import { AuroraBackground } from "@/components/effects/aurora";

export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <AuroraBackground />
      <div className="relative z-10">
        <LoginCard />
      </div>
    </main>
  );
}
