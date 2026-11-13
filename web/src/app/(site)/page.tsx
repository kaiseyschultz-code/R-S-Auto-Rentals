import { Suspense } from "react";
import Hero from "@/components/home/Hero";
import FeaturedVehicles from "@/components/home/FeaturedVehicles";
import TrustIndicators from "@/components/home/TrustIndicators";
import HowItWorks from "@/components/home/HowItWorks";
import Testimonials from "@/components/home/Testimonials";

export default function Home() {
  return (
    <>
      <Hero />
      <Suspense fallback={null}>
        <FeaturedVehicles />
      </Suspense>
      <TrustIndicators />
      <HowItWorks />
      <Testimonials />
    </>
  );
}
