const mineflayer = require('mineflayer');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');

// Create the bot
const bot = mineflayer.createBot({
  host: '192.168.86.23',
  port: 25565,
  username: 'MCPBot'
});

// Helper functions
function createResponse(message) {
  return {
    content: [{ type: "text", text: message }]
  };
}

function createErrorResponse(error) {
  return {
    content: [{ type: "text", text: `Error: ${error.message}` }],
    isError: true
  };
}

// Setup MCP server
async function setupMcpServer() {
  const server = new McpServer(
    {
      name: "minecraft-mcp-server",
      version: "1.0.0"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // Generic Mineflayer command executor  
  server.tool(
    "execute-bot-command",
    "Execute any Mineflayer bot command with optional parameters",
    {
      command: z.string().describe("The Mineflayer bot command to execute (e.g., 'setControlState', 'chat')"),
      params: z.array(z.union([z.string(), z.number()])).optional().describe("Optional array of parameters to bind to the placeholders for execution.")
    },
    async ({ command, params = [] }) => {
      try {
        const parameters = params.map(p => {
          // Auto-convert string boolean values
          if (p === 'true') return true;
          if (p === 'false') return false;
          return p;
        });
        
        const startPos = bot.entity.position;
        
        // Special handling for movement commands - auto-add 2 second duration
        if (command === 'setControlState' && parameters.length >= 2) {
          // Execute command
          const result = bot[command](...parameters);
          
          // Wait 2 seconds for movement
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Clear controls
          bot.clearControlStates();
          
          const endPos = bot.entity.position;
          const distance = Math.sqrt(
            Math.pow(endPos.x - startPos.x, 2) + 
            Math.pow(endPos.z - startPos.z, 2) + 
            Math.pow(endPos.y - startPos.y, 2)
          );
          
          return createResponse(`Executed: bot.${command}(${parameters.join(', ')}) for 2000ms. Moved ${distance.toFixed(2)} blocks. Position: (${Math.floor(endPos.x)}, ${Math.floor(endPos.y)}, ${Math.floor(endPos.z)})`);
        } else {
          // Execute command directly
          let result = bot[command](...parameters);
          
          // Handle promises
          if (result && typeof result.then === 'function') {
            result = await result;
          }
          
          return createResponse(`Executed: bot.${command}(${parameters.join(', ')}). Result: ${JSON.stringify(result)}`);
        }
      } catch (error) {
        // Clean up on error
        bot.clearControlStates();
        return createErrorResponse(error);
      }
    }
  );

  return server;
}

// Start when bot spawns
bot.once('spawn', async () => {
  console.error('Bot has spawned in the world');
  
  try {
    const server = await setupMcpServer();
    
    // Connect to stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Server running on stdio");
    
  } catch (error) {
    console.error(`Failed to start MCP server: ${error.message}`);
  }
});

bot.on('error', err => console.error('Bot error:', err));
