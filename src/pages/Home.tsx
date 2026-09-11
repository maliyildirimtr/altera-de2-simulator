
import { Hero }            from '../components/landing/Hero';
import { ToolShowcase }    from '../components/landing/ToolShowcase';
import { LearningSection } from '../components/landing/LearningSection';
import { TeachingSection } from '../components/landing/TeachingSection';
import { Footer }          from '../components/landing/Footer';

/**
 * Home / Landing page.
 *
 * Uses `absolute inset-0 overflow-y-auto` to create an independent
 * scroll context within the App shell's `relative overflow-hidden` container,
 * while the dark simulator tool pages remain fully unchanged.
 *
 * Section order:
 *   Hero → Tool Showcase → Learning → Teaching → Footer
 */
export default function Home() {
  return (
    <div
      className="landing-page absolute inset-0 overflow-y-auto"
      style={{ background: 'var(--landing-bg)', color: 'var(--landing-text)' }}
    >
      <Hero />
      <ToolShowcase />
      <LearningSection />
      <TeachingSection />
      <Footer />
    </div>
  );
}
