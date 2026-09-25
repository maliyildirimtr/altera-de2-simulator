import { useEffect, useRef, type ElementType, type ReactNode } from 'react';

interface RevealProps {
  as?: ElementType;
  className?: string;
  children: ReactNode;
  /** Stagger delay in milliseconds. */
  delay?: number;
}

/**
 * Restrained entrance animation for landing sections.
 * Content is revealed once when it scrolls into view; reduced-motion users
 * and browsers without IntersectionObserver see it immediately.
 */
export function Reveal({ as: Tag = 'div', className, children, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof IntersectionObserver === 'undefined') {
      el.dataset.reveal = 'in';
      return;
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          el.dataset.reveal = 'in';
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.06 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={className}
      data-reveal=""
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
