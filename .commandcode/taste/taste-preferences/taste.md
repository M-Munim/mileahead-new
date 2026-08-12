# Taste Preferences
- Prefers simple, plain-language explanations over technical jargon ("tell me in simple"). Confidence: 0.8
- Frequently communicates issues by sharing screenshots rather than describing them in text. Confidence: 0.8
- New features must match the existing app's design system (CSS variables, tokens, component styles), NOT mockup or concept-design colors. Mockups are treated as layout/structure references only; their raw hex palettes should never be copied into the codebase. Confidence: 0.95
- Prefers building with realistic demo data first, then wiring backend APIs in a later phase. Confidence: 0.8
- Values clean, shareable documentation files (e.g., .md) for handoff to other developers (e.g., backend devs building API routes). Confidence: 0.8
- Does not want browser automation tools used without explicitly asking. Confidence: 0.9
- Explicitly demands bug-free, complete implementations — will say "do it 100% without any bug." Wants new features wired end-to-end (data model, API mapping, UI display, search) in one pass, not piecemeal. Confidence: 0.8
- Prefers concise, informal, copy-paste-ready messages for communicating with team members (e.g., backend devs) via informal channels like WhatsApp. Confidence: 0.7
- When debugging API integration issues, wants console.log statements added to inspect raw API responses (full JSON + object keys) directly in the browser console rather than relying solely on docs or specs. Confidence: 0.8
