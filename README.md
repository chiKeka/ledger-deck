# Chikeka Ledger Deck

An interactive, 13-slide progress report for [the Chikeka Ledger](https://github.com/chiKeka/ledger): a public record of falsifiable claims about AI, infrastructure, and institutions, with probabilities registered before resolution. The deck visualizes the claim field, related-claim graph, Brier scores, calibration, jurisdictions, and lessons from the record.

**The checked-in deck is a July 17, 2026 data snapshot**, covering June 10–July 17. Its 76 registered claims, 27 valid resolutions, and 0.190 Brier score are figures displayed in that snapshot, not refreshed or independently re-audited figures. The presentation reads bundled data; it does not fetch a live board as you present.

## Run locally

Use Node.js 22 and npm (verified with the committed lockfile).

```sh
git clone https://github.com/chiKeka/ledger-deck.git
cd ledger-deck
npm ci
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`. No account, API key, or backend is needed to view the bundled deck.

```sh
npx tsc --noEmit
npm run build -- --base=./
npm run preview
```

The relative base supports a static build served under a subdirectory such as `/ledger-deck/`. These install, type-check, and build commands were verified. There is no lint or automated test script in `package.json`.

## Presenting

| Key | Action |
| --- | --- |
| `→`, `↓`, `Space` | Next build or slide |
| `←`, `↑` | Previous build or slide |
| `Home`, `End` | First or last slide |
| `S` | Thumbnail sidebar |
| `G` | Grid overview |
| `A` | Annotation tools |
| `F` | Fullscreen |
| `P` | Presenter tab |
| `H` | Hide the UI |
| `Esc` | Close overlays |

Slides are deep-linkable with hashes such as `/#3`. Drag and hover the claim field, graph, and globe. Presenter mode uses a separate tab synchronized through `BroadcastChannel`; edited notes and annotations are stored locally.

## Update the snapshot for review

The source of figures is the public ledger's `ledger.json`. Updating requires a separately obtained public JSON file and Python 3:

```sh
python3 scripts/refresh_data.py /path/to/ledger.json
# Optional second argument: verified total ledger commit count for the cadence slide.
git diff -- src/data/claims.ts src/App.tsx
npx tsc --noEmit
npm run build -- --base=./
npm run preview
```

The generator updates `src/data/claims.ts` and selected statistics in `src/App.tsx`. It asserts expected replacement counts and reports editorial points requiring human judgment. Review that output, slide wording, chart captions, speaker notes, dates, and provenance together; changing numeric data does not make every narrative statement current. Check that no private material is introduced before publishing. This documentation change does not run a refresh or alter the July 17 figures.

For an authenticated `gh` installation, the convenience wrapper can fetch the public board and build without publishing:

```sh
SKIP_DEPLOY=1 bash scripts/refresh.sh
```

It still edits local source and reads GitHub. **Do not use the wrapper's default invocation for a review-only update:** without `SKIP_DEPLOY=1`, it commits, pushes `main` through a remote named `deck`, and force-pushes a `gh-pages` deployment. Review and publish through your normal approved process instead. Neither refresh nor deployment was executed for this README repair.

## Source and attribution

- `src/App.tsx`: Chikeka Ledger slide content and snapshot statistics.
- `src/data/claims.ts`: bundled claim nodes and relationships.
- `src/components/ClaimField3D.tsx`, `ClaimGraph.tsx`, `CalibrationCurve.tsx`: ledger visualizations.
- `src/deck/`: responsive deck engine and presentation controls.
- `src/styles/tokens.css`: theme; `scripts/`: data regeneration tools.

This project adapts [Bolt Slides by StackBlitz](https://github.com/stackblitz/bolt-slides). Its deck engine, component library, and [authoring skill](.bolt/skills/slides/SKILL.md) remain available. The old starter screenshots show upstream demonstrations rather than this ledger deck, so they are not presented as current product screenshots here.

The upstream [MIT license](LICENSE), copyright © 2026 StackBlitz, and source attribution are retained. See [CONTRIBUTING.md](CONTRIBUTING.md) for the inherited contributor guide.
