import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';

async function testGodaddyMcp() {
  console.log('⚡ Initializing GoDaddy MCP Client test...');

  const apiKey = process.env['GODADDY_API_KEY'] || '3mM44YwfTPf3bk_RPkP5VYQ5mkR75Aj8qt2JG';
  const apiSecret = process.env['GODADDY_API_SECRET'] || '93cXW5oYCuj2eAmf7SiXQp';
  const godaddyEnv = process.env['GODADDY_ENV'] || 'production';

  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', 'tsx', path.join(process.cwd(), 'scripts/godaddy-mcp-server.ts')],
    env: {
      GODADDY_API_KEY: apiKey,
      GODADDY_API_SECRET: apiSecret,
      GODADDY_ENV: godaddyEnv,
    },
  });

  const client = new Client(
    { name: 'test-client', version: '1.0.0' },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log('✅ Connected to GoDaddy MCP Server over stdio!');

  console.log('📌 Executing tool: create_dns_record...');
  const result = await client.callTool({
    name: 'create_dns_record',
    arguments: {
      domain: 'himansh.co.in',
      type: 'A',
      name: 'auction',
      data: '13.234.30.63',
      ttl: 600,
    },
  });

  console.log('\n📥 MCP Tool Call Result:\n', JSON.stringify(result, null, 2));

  await client.close();
}

testGodaddyMcp().catch((err) => {
  console.error('❌ MCP Client Error:', err);
  process.exit(1);
});
