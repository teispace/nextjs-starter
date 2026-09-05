# 007. No UI primitives in the starter

**Status**: accepted (v2)

**Decision**: the starter ships Tailwind v4 and the theme provider, but no button, dialog, or form components. `docs/ui-libraries.md` explains how to add shadcn/ui, Radix, MUI, Mantine, or HeroUI.

**Alternatives**: bundle shadcn/ui; ship a small in-house component set.

**Why**: a component library is a product decision that teams rarely want made for them, and a bundled set either goes unused or gets deleted. Every option installs in minutes and works with the existing theme setup, so the starter stays neutral and small. next-maker can offer the choice at project creation.
