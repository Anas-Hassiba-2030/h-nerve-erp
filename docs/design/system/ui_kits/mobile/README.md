# UI Kit — Mobile Daily-Brief

A high-fidelity recreation of the H-Nerve **mobile "today" screen** (`BMV2026/app/m/`), presented inside an iOS device frame. A calm, second-person brief — not a dashboard crammed onto a phone.

## Run it
Open `index.html`. Loads React 18 + Babel + Lucide from CDN; mounts the screen inside the `ios-frame.jsx` starter device bezel. Tokens from `../../colors_and_type.css`.

## The structure (matches production)
Three columns of **at most three cards each** — the product's core idea:
- **Three to know** — what changed on its own (insights).
- **Three to decide** — waiting on your call (recommendations).
- **Three to approve** — one tap each (here: an "All clear" calm empty state, never a bare "No data").

Plus: a date eyebrow, a sans display **greeting** ("Close out today, Anas" / «أغلِق اليوم يا أنس»), an ochre-stroked **narrator** line, a warm sign-off footer, and a 4-tab bottom nav (Today / Activity / Approvals / Me).

## What's interactive
- **Language toggle** — tap the sliders icon (top corner) to flip EN ⇄ AR. The whole screen mirrors to RTL, swaps fonts (Inter Tight → Reem Kufi for the greeting), and re-lays the card band + action arrow to the correct edge.
- **Bottom nav** — tap to move the active (ochre) tab.
- Card press gives a subtle `scale(0.985)`.

## Fidelity notes
- Calm-clinical register: warm `#fbfaf7` ground, soft `14px` cards with a 4px colored **band** (blush = finance/know, ochre = decide), mono eyebrows, two-line clamped titles, a slow heartbeat dot on urgent cards.
- Copy is deliberately human and bilingual — the empty state and footer are lifted verbatim from the product's voice.
- Cosmetic only: static data; pull-to-refresh is represented by the top hairline but not wired.
