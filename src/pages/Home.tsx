import '../components/landing/landing.css';
import { Hero } from '../components/landing/Hero';
import { ProductShowcase } from '../components/landing/ProductShowcase';
import { ToolShowcase } from '../components/landing/ToolShowcase';
import { WorkflowSection } from '../components/landing/WorkflowSection';
import { TeachingSection } from '../components/landing/TeachingSection';
import { LearningSection } from '../components/landing/LearningSection';
import { FinalCta } from '../components/landing/FinalCta';
import { Footer } from '../components/landing/Footer';

/**
 * Home / Landing page.
 *
 * Uses `absolute inset-0 overflow-y-auto` to create an independent
 * scroll context within the App shell's `relative overflow-hidden` container.
 *
 * Section order:
 *   Hero → Product showcase → Tools → Workflow →
 *   Teaching → Examples → Final CTA → Footer
 */
export default function Home() {
  return (
    <div className="landing-page lx absolute inset-0 overflow-y-auto">
      <Hero />
      <ProductShowcase />
      <ToolShowcase />
      <WorkflowSection />
      <TeachingSection />
      <LearningSection />
      <FinalCta />
      <Footer />
    </div>
  );
}
