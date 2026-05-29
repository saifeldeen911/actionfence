import NavBar from "@/components/ui/NavBar";
import Hero from "@/components/ui/Hero";
import ProblemStatement from "@/components/ui/ProblemStatement";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-start overflow-x-hidden">
      <NavBar />
      <Hero />
      <ProblemStatement />
    </main>
  );
}
