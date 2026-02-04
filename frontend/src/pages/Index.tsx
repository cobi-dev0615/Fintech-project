import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import PremiumHero from "@/components/landing/PremiumHero";
import AboutSection from "@/components/landing/AboutSection";
import ContentsSection from "@/components/landing/ContentsSection";
import DecisionSection from "@/components/landing/DecisionSection";
import GoalsSection from "@/components/landing/GoalsSection";
import RiskSection from "@/components/landing/RiskSection";
import PricingSection from "@/components/landing/PricingSection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  const { hash } = useLocation();

  useEffect(() => {
    const targetId = hash?.replace("#", "");
    if (targetId) {
      const el = document.getElementById(targetId);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [hash]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <PremiumHero />
        <AboutSection />
        <ContentsSection />
        <DecisionSection />
        <GoalsSection />
        <RiskSection />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
