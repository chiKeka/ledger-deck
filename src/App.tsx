import Deck from './deck/Deck';
import Slide from './deck/Slide';
import Build from './deck/Build';
import Bento from './components/Bento';
import Split from './components/Split';
import CountUp from './components/CountUp';
import StatGrid from './components/StatGrid';
import { BarChart } from './components/Charts';
import Quote from './components/Quote';
import Steps from './components/Steps';
import Cover from './components/Cover';
import BigNumber from './components/BigNumber';
import Contrast from './components/Contrast';
import Globe from './components/Globe';
import ClaimField3D from './components/ClaimField3D';
import ClaimGraph from './components/ClaimGraph';
import CalibrationCurve from './components/CalibrationCurve';

/* ~4.5 minute run: 13 slides, ±20s each. Visual-forward - every data slide
   is a chart, field, graph, or globe; text slides are builds or tiles. */

export default function App() {
  return (
    <Deck>
      {/* 1 - Cover · ~15s */}
      <Cover
        nav="Cover"
        notes="15s. One breath: public falsifiable record, probabilities locked, scored by reality. Then move."
        kicker="Progress report · Jun 10 → Jul 17, 2026"
        title={
          <>
            The Chikeka Ledger,
            <br />
            <span className="accent-text">five weeks</span> on the record.
          </>
        }
        subtitle="Falsifiable claims about AI, infrastructure, and institutions. Probability locked at registration, scored when the world answers. The misses stay on the board."
        foot="github.com/chiKeka/ledger · public since 2026-06-10"
      />

      {/* 2 - The claim field · ~30s */}
      <ClaimField3D
        nav="The claim field"
        notes="30s. Drag it once, hover one point. Time runs right, confidence runs up, the two planes are the frame split. Point out: nothing early was stated above 90%."
        kicker="Interactive · drag to rotate, hover a point"
        title="76 claims in five weeks; none stated above 90%."
        foot="x: registration day · y: stated confidence · depth: frame"
      />

      {/* 3 - The headline number · ~20s */}
      <BigNumber
        nav="Brier 0.190"
        notes="20s. Lower is better; coin flip is 0.250. The gap is the skill. Don't explain Brier - the caption does."
        kicker="The scoreboard"
        value={<CountUp to={0.19} decimals={3} duration={1800} />}
        caption={
          <>
            Brier score across 27 resolved claims.
            <br />A coin flip scores 0.250 - lower is better.
          </>
        }
        foot="Skill vs coin-flip +0.060 · vs recorded base rates +0.021 · board figures, 2026-07-17"
      />

      {/* 4 - The record · ~20s */}
      <StatGrid
        nav="The record"
        notes="20s. Read only the labels. Land on: 2 invalidated means the record polices itself."
        kicker="The record"
        title="The record polices itself."
        stats={[
          {
            value: <CountUp to={76} />,
            label: 'Claims registered',
            caption: '73 by the twin, 3 by Bruno',
          },
          {
            value: <CountUp to={20} />,
            label: 'Confirmed',
            caption: 'sealed with evidence',
          },
          {
            value: <CountUp to={7} />,
            label: 'Disconfirmed',
            caption: 'visible forever',
          },
          {
            value: <CountUp to={47} />,
            label: 'Still open',
            caption: 'resolving through Q1 2027',
          },
          {
            value: <CountUp to={2} />,
            label: 'Invalidated',
            caption: 'wins refused, never scored',
          },
          {
            value: <CountUp to={7} />,
            label: 'Method experiments',
            caption: 'in the workshop, off the ledger',
          },
        ]}
      />

      {/* 5 - Nodes and edges · ~30s */}
      <ClaimGraph
        nav="The graph"
        notes="30s. Drag one node. The 38 edges are real ledger data - probes, sharpens, opposes. One resolution updates its neighbors."
        kicker="Interactive · drag a node, hover for the claim"
        title="The record is a graph, not a list."
        foot="38 typed links from the ledger's related_to field · in-frame gathers left, out-of-frame right"
      />

      {/* 6 - Cadence · ~20s */}
      <Split
        nav="Cadence"
        notes="20s. The Jun 29 spike is June registrations maturing. No human hands in the loop."
        kicker="Cadence"
        title="Resolution is a rhythm, not an event."
        body={
          <p>
            The board updates daily and reckons every Sunday, without
            intervention. 42 commits since go-live - every one a ledger event.
          </p>
        }
        media={
          <div
            style={{
              display: 'grid',
              placeItems: 'center',
              height: '100%',
              padding: 'clamp(20px, 4vw, 56px)',
            }}
          >
            <div style={{ width: '100%', maxWidth: 560 }}>
              <p className="kicker" style={{ marginBottom: 16 }}>
                Resolutions per week
              </p>
              <BarChart
                height={240}
                data={[
                  { label: 'Jun 8', value: 2 },
                  { label: 'Jun 15', value: 5 },
                  { label: 'Jun 22', value: 2 },
                  { label: 'Jun 29', value: 12 },
                  { label: 'Jul 6', value: 2 },
                  { label: 'Jul 13', value: 6 },
                ]}
              />
            </div>
          </div>
        }
      />

      {/* 7 - Calibration curve · ~25s */}
      <Slide
        center
        nav="Calibration"
        notes="25s. Diagonal = perfect. The 70s bucket floats above the line: underconfident. Grey dots too small to read."
      >
        <p className="kicker" style={{ marginInline: 'auto' }}>
          Calibration · hover a bucket
        </p>
        <h2
          className="headline"
          style={{
            marginInline: 'auto',
            textAlign: 'center',
            maxWidth: '24ch',
            marginBottom: 4,
          }}
        >
          Above 70%, the record runs underconfident.
        </h2>
        <CalibrationCurve
          buckets={[
            { mid: 35, n: 1, hit: 0 },
            { mid: 45, n: 3, hit: 100 },
            { mid: 55, n: 7, hit: 57 },
            { mid: 65, n: 6, hit: 67 },
            { mid: 75, n: 6, hit: 83 },
            { mid: 85, n: 1, hit: 100 },
            { mid: 95, n: 3, hit: 100 },
          ]}
          caption="27 valid resolutions · dot area = number of claims · grey dots are buckets too small to read"
        />
      </Slide>

      {/* 8 - The frame split · ~20s */}
      <Contrast
        nav="Frame split"
        notes="20s. The finding that justifies the twin: skill lives OUTSIDE the home turf. Flag the small n, don't oversell."
        kicker="The frame split"
        title="The record scores better away from home."
        left={{
          label: 'In-frame',
          title: "Bruno's home turf",
          points: [
            'Inside his reading and thesis orbit',
            '4 resolutions · Brier 0.253',
            'No better than a coin flip',
          ],
        }}
        right={{
          label: 'Out-of-frame',
          title: 'Outside the bubble',
          points: [
            'Retrieved against his profile, not from it',
            '23 resolutions · Brier 0.179',
            'The measurable skill lives here',
          ],
        }}
      />

      {/* 9 - The globe · ~25s */}
      <Globe
        nav="The map"
        notes="25s. Drag it. Every marker is a jurisdiction the record bets on; arcs run from Edmonton, where the claims are written."
        kicker="Where the record resolves"
        title="Written in Edmonton, answered on four continents."
        body="64 of 76 claims resolve against a named institution: the Fed, the ECB, the Bank of England, EU gazettes, Kenyan and Nigerian infrastructure filings."
        markers={[
          { location: [53.55, -113.5], label: 'Edmonton', size: 0.06 },
          { location: [38.9, -77.0], label: 'Washington', value: '20', size: 0.09 },
          { location: [51.5, -0.12], label: 'London', value: '15', size: 0.08 },
          { location: [50.85, 4.35], label: 'Brussels', value: '10', size: 0.07 },
          { location: [-1.29, 36.82], label: 'Nairobi', value: '8', size: 0.07 },
          { location: [50.11, 8.68], size: 0.05 },
          { location: [42.3, -83.7], size: 0.05 },
          { location: [6.45, 3.39], label: 'Lagos', value: '2', size: 0.06 },
          { location: [39.9, 116.4], size: 0.05 },
          { location: [28.6, 77.2], size: 0.05 },
        ]}
        arcs={[
          { from: [53.55, -113.5], to: [38.9, -77.0] },
          { from: [53.55, -113.5], to: [51.5, -0.12] },
          { from: [53.55, -113.5], to: [50.85, 4.35] },
          { from: [53.55, -113.5], to: [-1.29, 36.82] },
          { from: [53.55, -113.5], to: [6.45, 3.39] },
        ]}
        stats={[
          { value: '9', label: 'jurisdictions on the board' },
          { value: '64', label: 'claims tied to a named institution' },
          { value: '4', label: 'continents in play' },
        ]}
      />

      {/* 10 - Ledger lessons · ~25s */}
      <Bento
        nav="Ledger lessons"
        notes="25s. Two keeps, two stops, each with a receipt. Misses in the same type size as wins - that's the point."
        kicker="Lessons · the record"
        title="Keep two things. Stop two things."
        tiles={[
          {
            k: 'KEEP · Brier 0.179 vs 0.253',
            title: 'Go out-of-frame',
            body: 'Claims retrieved against the profile beat home-turf claims. The edge is outside the bubble.',
            c: 6,
            variant: 'accent',
          },
          {
            k: 'KEEP · 2 wins refused',
            title: 'Refuse your own wins',
            body: 'Invalidating both launch-day wins cost the early score and bought the credibility.',
            c: 6,
          },
          {
            k: 'STOP · 3 of 4 came true',
            title: 'The sub-50% blind spot',
            body: 'Claims stated as unlikely kept happening. Low confidence is where hedging hides.',
            c: 6,
          },
          {
            k: 'STOP · +0.021 at n=27',
            title: 'Calling the margin skill',
            body: 'The edge over base rates is real but thin. The bar is surviving n=100.',
            c: 6,
          },
        ]}
      />

      {/* 11 - Institution lessons · ~30s */}
      <Steps
        nav="AI institution"
        notes="30s. The bigger experiment: the ledger is AI deployed as an institution, not an assistant. These four principles are what five weeks of that taught us."
        kicker="Deploying AI · what five weeks taught us"
        title="An institution, not an assistant."
        items={[
          {
            title: 'Constitution over supervision',
            body: 'The loop runs unattended under locked rules. Governance lives in the protocol, not in review meetings.',
          },
          {
            title: 'Machine proposes, human ratifies',
            body: 'Nothing promotes itself. Every claim and every rule change reopens a loop a person must close.',
          },
          {
            title: 'Buy credibility with refusals',
            body: 'The power to void its own wins is what makes the record admissible to skeptics.',
          },
          {
            title: 'Audit the auditor',
            body: 'Automated loops die silently. Heartbeats, invariants, and a self-checking audit watch the watchman.',
          },
        ]}
      />

      {/* 12 - The line · ~10s */}
      <Quote
        nav="The line"
        notes="10s. Verbatim from the entry that refused the launch wins. Let it sit."
        text="A question answered before it was asked is not a forecast."
        name="The invalidation protocol"
        role="Ledger entry, 2026-06-11"
      />

      {/* 13 - Close · ~15s */}
      <Slide
        center
        nav="Close"
        notes="15s. The ask is participation: pick a probability and disagree with it publicly."
      >
        <p className="kicker" style={{ marginInline: 'auto' }}>
          The ask
        </p>
        <h2
          className="display"
          style={{ marginInline: 'auto', textAlign: 'center', maxWidth: '14ch' }}
        >
          Watch the record.
          <br />
          <span className="accent-text">Then bet against it.</span>
        </h2>
        <Build at={1}>
          <p className="lead" style={{ marginInline: 'auto', maxWidth: '48ch' }}>
            Every claim, seal, and miss is public. If you think a probability
            is wrong, that is exactly the conversation this ledger exists to
            start.
          </p>
        </Build>
        <Build at={2}>
          <p
            style={{
              marginInline: 'auto',
              fontFamily: 'var(--font-mono)',
              fontSize: 'clamp(0.8rem, 1.4vw, 0.95rem)',
              color: 'var(--fg-muted)',
            }}
          >
            github.com/chiKeka/ledger · x.com/Chikeka
          </p>
        </Build>
      </Slide>
    </Deck>
  );
}
