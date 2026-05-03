import type { NextConfig } from 'next';
import { withWorkflow } from 'workflow/next';

const nextConfig: NextConfig = {
  // Each MCP server is pre-bundled into a single self-contained JS file at
  // build time (scripts/bundle-mcp.mjs, fired by the npm `prebuild` hook).
  // The bundles inline every transitive dep so Vercel's tree-shaker doesn't
  // need to resolve the deep dep graph at trace time. We just need to ship
  // the bundled-mcp/ directory inside the function payload.
  outputFileTracingIncludes: {
    'app/api/plan/**': ['./bundled-mcp/**'],
    'app/.well-known/workflow/**': ['./bundled-mcp/**'],
  },
};

// withWorkflow installs the SDK's bundler plugin so 'use workflow' / 'use step'
// directives compile correctly. Required for lib/workflows/planTrip.ts.
export default withWorkflow(nextConfig);
