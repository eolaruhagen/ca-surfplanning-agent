import type { NextConfig } from 'next';
import { withWorkflow } from 'workflow/next';

const nextConfig: NextConfig = {
  /* config options here */
};

// withWorkflow installs the SDK's bundler plugin so 'use workflow' / 'use step'
// directives compile correctly. Required for lib/workflows/planTrip.ts.
export default withWorkflow(nextConfig);
