import { Reveal } from './Reveal';

const STEPS = [
  { index: '01', title: 'Write', detail: 'Verilog / SystemVerilog', artifact: 'half_adder.sv' },
  { index: '02', title: 'Compile', detail: 'Browser simulation', artifact: 'no local toolchain' },
  { index: '03', title: 'Map', detail: 'QSF → DE2 I/O', artifact: 'PIN_N25 → SW[0]' },
  { index: '04', title: 'Run', detail: 'Virtual hardware', artifact: 'SW · KEY · LED · HEX' },
  { index: '05', title: 'Inspect', detail: 'Waveform + schematic', artifact: 'timing · RTL' },
];

export function WorkflowSection() {
  return (
    <section className="lx-section lx-light lx-light--alt lx-workflow" aria-labelledby="lx-workflow-title">
      <div className="lx-container">
        <Reveal className="lx-section-head">
          <div>
            <p className="lx-eyebrow">How it works</p>
            <h2 id="lx-workflow-title" className="lx-heading">
              From source code
              <br />
              to circuit behavior.
            </h2>
          </div>
          <p className="lx-lead lx-section-head__aside">
            The same design moves through every stage of a real FPGA flow—written, compiled,
            pinned to the board, exercised, and inspected—inside a single browser tab.
          </p>
        </Reveal>

        <Reveal as="ol" className="lx-flow" delay={80}>
          {STEPS.map((step, i) => (
            <li key={step.index} className="lx-flow__step">
              <div className="lx-flow__marker" aria-hidden="true">
                <span className="lx-flow__node">{step.index}</span>
                {i < STEPS.length - 1 && <span className="lx-flow__connector" />}
              </div>
              <div className="lx-flow__body">
                <h3 className="lx-flow__title">{step.title}</h3>
                <p className="lx-flow__detail">{step.detail}</p>
                <p className="lx-mono lx-flow__artifact">{step.artifact}</p>
              </div>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
