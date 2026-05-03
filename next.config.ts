import type { NextConfig } from 'next';
import { withWorkflow } from 'workflow/next';

const nextConfig: NextConfig = {
  // Vercel only ships node_modules referenced by import graph. The MCP server
  // packages are spawned as child processes (not imported), so without this
  // they get tree-shaken out of the deployment bundle and the spawn fails
  // with ENOENT. List both the package payloads and the bin entrypoints.
  outputFileTracingIncludes: {
    'app/api/plan/**': [
      './node_modules/open-meteo-mcp-server/**',
      './node_modules/@modelcontextprotocol/server-google-maps/**',
      './node_modules/@modelcontextprotocol/server-filesystem/**',
      // The MCP server packages import @modelcontextprotocol/sdk at runtime —
      // they aren't `import`ed by our code so Next won't bundle the SDK
      // package alongside them without an explicit trace.
      './node_modules/@modelcontextprotocol/sdk/**',
      './node_modules/.bin/open-meteo-mcp-server',
      './node_modules/.bin/mcp-server-google-maps',
      './node_modules/.bin/mcp-server-filesystem',
    ],
    'app/.well-known/workflow/**': [
      './node_modules/open-meteo-mcp-server/**',
      './node_modules/@modelcontextprotocol/server-google-maps/**',
      './node_modules/@modelcontextprotocol/server-filesystem/**',
      // The MCP server packages import @modelcontextprotocol/sdk at runtime —
      // they aren't `import`ed by our code so Next won't bundle the SDK
      // package alongside them without an explicit trace.
      './node_modules/@modelcontextprotocol/sdk/**',
      './node_modules/.bin/open-meteo-mcp-server',
      './node_modules/.bin/mcp-server-google-maps',
      './node_modules/.bin/mcp-server-filesystem',
    ],
  },
};

// withWorkflow installs the SDK's bundler plugin so 'use workflow' / 'use step'
// directives compile correctly. Required for lib/workflows/planTrip.ts.
export default withWorkflow(nextConfig);
