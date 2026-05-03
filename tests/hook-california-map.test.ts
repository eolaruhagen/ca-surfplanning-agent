// Bridge file: the canonical hook test is co-located with the hook at
// app/components/map/hook.test.tsx (per CLAUDE.md "React component + hook
// co-location" rule). The npm test glob (`tests/*.test.ts`) does not pick up
// .tsx in subdirectories, so we re-import here to register its describes()
// with node:test. Once the test glob is broadened (see AGENT-COORDINATION.md
// "Open questions / asks" — UI → Backend), this shim can be deleted.
import '../app/components/map/hook.test';
