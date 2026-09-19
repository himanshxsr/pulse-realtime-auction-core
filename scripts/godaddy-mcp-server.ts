import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const apiKey = process.env['GODADDY_API_KEY'] || '3mM44YwfTPf3bk_RPkP5VYQ5mkR75Aj8qt2JG';
const apiSecret = process.env['GODADDY_API_SECRET'] || '93cXW5oYCuj2eAmf7SiXQp';
const godaddyEnv = process.env['GODADDY_ENV'] || 'production';

const baseUrl =
  godaddyEnv === 'test' || godaddyEnv === 'ote'
    ? 'https://api.ote-godaddy.com'
    : 'https://api.godaddy.com';

function getAuthHeader(): string {
  if (apiKey && apiSecret && apiSecret.trim() !== '') {
    return `sso-key ${apiKey.trim()}:${apiSecret.trim()}`;
  }
  return `Bearer ${apiKey.trim()}`;
}

const server = new McpServer({
  name: 'godaddy-mcp-server',
  version: '1.0.0',
});

// Tool: create_dns_record
server.tool(
  'create_dns_record',
  'Create or update a DNS record on GoDaddy for a domain',
  {
    domain: z.string().describe('Domain name, e.g. himansh.co.in'),
    type: z.string().describe('DNS record type, e.g. A, CNAME, TXT'),
    name: z.string().describe('Host/subdomain name, e.g. auction'),
    data: z.string().describe('Target value or IP address, e.g. 13.234.30.63'),
    ttl: z.number().default(600).describe('Time To Live in seconds'),
  },
  async ({ domain, type, name, data, ttl }) => {
    const authHeader = getAuthHeader();
    const url = `${baseUrl}/v1/domains/${domain}/records/${type}/${name}`;
    console.error(`[GoDaddy MCP] Sending PUT to ${url}`);

    try {
      let response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{ data, ttl }]),
      });

      if (!response.ok && response.status === 404) {
        // Fallback: try PATCH /v1/domains/{domain}/records
        const patchUrl = `${baseUrl}/v1/domains/${domain}/records`;
        console.error(`[GoDaddy MCP] Retrying with PATCH to ${patchUrl}`);
        response = await fetch(patchUrl, {
          method: 'PATCH',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([{ type, name, data, ttl }]),
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: [
            {
              type: 'text' as const,
              text: `❌ GoDaddy API Error (Status ${response.status}): ${errorText || response.statusText}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: `✅ Successfully created/updated ${type} record for ${name}.${domain} -> ${data} (TTL: ${ttl}s)`,
          },
        ],
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text' as const, text: `❌ Network Error: ${msg}` }],
        isError: true,
      };
    }
  }
);

// Tool: get_dns_records
server.tool(
  'get_dns_records',
  'Get DNS records for a domain on GoDaddy',
  {
    domain: z.string().describe('Domain name, e.g. himansh.co.in'),
    type: z.string().optional().describe('Record type filter, e.g. A'),
    name: z.string().optional().describe('Record name filter, e.g. auction'),
  },
  async ({ domain, type, name }) => {
    let url = `${baseUrl}/v1/domains/${domain}/records`;
    if (type) {
      url += `/${type}`;
      if (name) {
        url += `/${name}`;
      }
    }

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: getAuthHeader(),
        },
      });

      const text = await response.text();
      return {
        content: [
          {
            type: 'text' as const,
            text: response.ok
              ? `📄 GoDaddy DNS Records for ${domain}:\n${text}`
              : `❌ Failed to fetch records (Status ${response.status}): ${text}`,
          },
        ],
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text' as const, text: `❌ Network Error: ${msg}` }],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[GoDaddy MCP] Server running on stdio');
}

main().catch((err) => {
  console.error('[GoDaddy MCP] Fatal error:', err);
  process.exit(1);
});
