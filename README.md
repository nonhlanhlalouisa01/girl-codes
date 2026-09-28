# Reasona AI · Meeting Mirror

A working, local-first prototype for reflecting on customer conversations. Compare your intended message with observable discussion themes, inspect the source evidence, and prepare for the next conversation.

## Run

Requires **Node.js 22 or later**. There are no third-party dependencies, installation steps or build steps.

```sh
npm start
```

Open **http://127.0.0.1:3000**. The server binds to loopback by default. Set `PORT` to change the port; `HOST` can explicitly change the bind address. This is a local prototype, not an authenticated production service.

## Try it

1. Explore the clearly labelled fictional public-sector discovery meeting shown on first load.
2. Replace the meeting name, intended focus and transcript with information you are authorised to use. Put each speaker turn on a separate line, optionally prefixed with `Speaker:`.
3. Confirm authorisation and select **Create Meeting Mirror**.
4. Explore **The reflection**, **Conversation evidence** and **Next conversation** tabs.
5. Download a plain-text reflection with the arrow button, or use **Clear conversation & results** to start over.

Changing an input invalidates the old reflection so it cannot be mistaken for current analysis. Changing the transcript also resets the authorisation checkbox. Inputs are limited to 40,000 transcript characters and 500 intended-focus characters.

## What it does — and does not do

- Identifies English keyword-based topic signals, question wording, explicit concern candidates and possible commitments, with original line numbers and quotations.
- Compares recognised intended topics with leading observed themes across **all speakers**. Topic percentages describe shares of keyword-topic matches, not speaking time, customer priorities or importance. An excerpt may match several topics.
- Offers contextual next-conversation prompts grounded in excerpts. These are templates, **not** retrieved research or psychological findings.
- Uses deterministic rules **in the browser**, not an AI model. It does not record meetings, analyse audio, connect to a CRM, fetch research or require an API key.
- Cannot infer emotions, personality, honesty, intelligence, intentions, whether a message landed, or whether a question was resolved. Keyword rules miss nuance, negation and unfamiliar terminology. Review all results against the original conversation.

The “psychology layer” described in the product vision is not implemented as a research or diagnostic system. This prototype deliberately keeps interpretation modest and evidence visible.

## Privacy

No transcript uploads, third-party requests, analytics, cookies, local storage or database. The server only serves an explicit list of application assets, rejects mutation requests, and sets a restrictive content security policy. Conversation text is rendered as text, never executable markup.

Reloading starts again with fictional data. Clearing removes active inputs, results and rendered source excerpts from the page; it does not erase your clipboard or downloaded files. Exports include conversation excerpts and should be stored and shared only with appropriate authorisation. The app does not manage participant consent or establish a legal basis for processing.

## Development

```sh
npm test
npm run check
```

Tests use Node’s built-in test runner. The syntax check needs no additional tooling. No bundler or compilation is required.

- `src/analysis.js` — pure, evidence-linked heuristic analysis.
- `src/app.js` — accessible UI, consent checks, text-only rendering and export.
- `src/example.js` — fictional sample data.
- `src/styles.css` — responsive visual design.
- `server.js` — dependency-free, allowlisted static server.
- `test/` — analysis and HTTP behaviour tests.

Licensed under the repository’s GNU GPL v3 license; see `LICENSE`.
