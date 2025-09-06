const mineflayer = require('mineflayer');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { setupToolingForMcp } = require('./modules/tools');
const { setupSamplesForMcp } = require('./modules/samples');
// const EventMonitor = require('./eventMonitor');


// Initialize event monitoring system
// const eventMonitor = new EventMonitor();

// Create the bot
const bot = mineflayer.createBot({
  host: '192.168.86.161',
  port: 25565,
  username: 'MCPBot'
});
// Load pathfinder plugin
bot.loadPlugin(pathfinder);




// Setup MCP server
async function setupMcpServer() {
  const server = new McpServer(
    {
      name: "minecraft-mcp-server",
      version: "1.0.0"
    },
    {
      capabilities: {
        tools: {},
        sampling: {}
      }
    }
  );

  setupToolingForMcp(server, bot);
  setupSamplesForMcp(server, bot);

  bot.on('whisper', (username, message) => {
    if (username === bot.username) return; // Ignore messages from the bot itself
    console.log(`${username}: ${message}`);
    if (message === 'ping') {
      bot.chat('pong');
    }

  }); 
  return server;
} 



// Start when bot spawns
bot.once('spawn', async () => {
  console.error('Bot has spawned in the world');
  
  try {
    const server = await setupMcpServer();
    console.log("MCP Server setup complete");
    
    // Connect to stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Server running on stdio");
    
  } catch (error) {
    console.error(`Failed to start MCP server: ${error.message}`);
  }
});

bot.on('error', err => console.error('Bot error:', err));


