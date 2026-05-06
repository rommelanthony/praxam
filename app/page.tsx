import Nav from '@/components/Nav';
import Hero from '@/components/Hero';
import { Stats, Features, SampleSection, Pricing, Faq, CtaBand, Footer } from '@/components/Sections';

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Stats />
        <Features />
        <SampleSection />
        <Pricing />
        <Faq />
        <CtaBand />
      </main>
      <Footer />
    </>
  );
}
