import NavBar from "@/components/ui/NavBar";
import Hero from "@/components/ui/Hero";
import ProblemStatement from "@/components/ui/ProblemStatement";
import HowItWorks from "@/components/ui/HowItWorks";
import FeaturesGrid from "@/components/ui/FeaturesGrid";
import CodeExamples from "@/components/ui/CodeExamples";
import TrustModel from "@/components/ui/TrustModel";
import ReceiptChain from "@/components/ui/ReceiptChain";
import UseCases from "@/components/ui/UseCases";
import Comparison from "@/components/ui/Comparison";
import Footer from "@/components/ui/Footer";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-start overflow-x-hidden">
      <NavBar />
      <Hero />
      <ProblemStatement />
      <HowItWorks />
      <FeaturesGrid />
      <CodeExamples />
      <TrustModel />
      <ReceiptChain />
      <UseCases />
      <Comparison />
      <Footer />
    </main>
  );
}
