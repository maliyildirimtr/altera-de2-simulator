import { Reveal } from './Reveal';

const USES = [
  'Digital logic courses',
  'FPGA introduction',
  'Classroom demonstrations',
  'Self-study',
  'Lab preparation',
];

export function TeachingSection() {
  return (
    <section className="lx-section lx-dark lx-teaching" aria-labelledby="lx-teaching-title">
      <div className="lx-container lx-teaching__grid">
        <Reveal className="lx-teaching__copy">
          <p className="lx-eyebrow">Built for learning</p>
          <h2 id="lx-teaching-title" className="lx-heading lx-heading--stack">
            <span>See the circuit.</span>
            <span>Change it.</span>
            <span className="lx-accent-text">Understand it.</span>
          </h2>
          <p className="lx-lead">
            Flip a switch and watch the HEX displays respond. Change one line of HDL and see
            the waveform and the synthesized gates change with it. Engineering Lab makes cause
            and effect visible—on a projector, in a lab, or at home.
          </p>
          <ul className="lx-uses">
            {USES.map((use, i) => (
              <li key={use}>
                <span className="lx-mono">{String(i + 1).padStart(2, '0')}</span>
                {use}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal as="figure" className="lx-teaching__visual" delay={90}>
          <div className="lx-teaching__frame">
            <img
              src="/landing/screens/de2-demonstration.png"
              alt="Virtual DE2 board with HEX7 to HEX0 showing 7 6 5 4 3 2 1 0 above the red LEDs and slide switches"
              width={641}
              height={299}
              loading="lazy"
              decoding="async"
            />
          </div>
          <figcaption className="lx-mono lx-teaching__caption">
            <span>HEX7–HEX0 · LEDR · SW</span>
            <span>Live board state</span>
          </figcaption>
        </Reveal>
      </div>
    </section>
  );
}
