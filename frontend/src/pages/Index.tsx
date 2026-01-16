import Navbar from "@/components/landing/Navbar";
import PremiumHero from "@/components/landing/PremiumHero";
import StatsSection from "@/components/landing/StatsSection";
import DecisionSection from "@/components/landing/DecisionSection";
import GoalsSection from "@/components/landing/GoalsSection";
import RiskSection from "@/components/landing/RiskSection";
import PricingSection from "@/components/landing/PricingSection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <PremiumHero />
        <StatsSection />
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
