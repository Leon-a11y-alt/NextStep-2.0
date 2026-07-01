# styles/

In the Next.js **App Router**, the single global stylesheet lives at
`app/globals.css` and is imported once in `app/layout.js`. That file holds
the whole NextStep design system (colors, cards, buttons, badges, sidebar,
calendar, etc.).

This `styles/` folder is kept for future component-scoped CSS Modules
(e.g. `Button.module.css`) if the team wants them later.
