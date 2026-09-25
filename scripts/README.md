UI regression checks
====================

Run `npm install`, start the frontend with `npm run dev` on port 5173,
then run `npm run test:ui`. The checks use an installed Google Chrome.
They mock the API and use a fresh browser profile, so no backend or real
account data is changed.

Covers seven viewport widths (320–1440px), chart containment, long titles,
catalogue title/composer search, scrolling, keyboard focus and Escape,
removal of the current focus, saved progress preservation, and session
identity, failed-save retry, and timer reset.

Review screenshots are saved in `BugEvidence/fixed/`.
