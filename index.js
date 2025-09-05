const mineflayer = require('mineflayer');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

// Create the bot
const bot = mineflayer.createBot({
  host: '192.168.86.23',
  port: 25565,
  username: 'MCPBot'
});

// Load pathfinder plugin
bot.loadPlugin(pathfinder);

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
        
        // Special handling for movement commands - distance-based movement
        if (command === 'setControlState' && parameters.length >= 2) {
          // Default to 3 blocks if no distance specified, otherwise use third parameter
          const targetDistance = parameters.length >= 3 ? parseFloat(parameters[2]) : 3.0;
          // Default to 10 seconds if no timeout specified, otherwise use fourth parameter
          const maxTimeMs = parameters.length >= 4 ? parseFloat(parameters[3]) * 1000 : 10000;
          
          // Execute command
          const result = bot[command](parameters[0], parameters[1]);
          
          // Move until target distance is reached, timeout, or bot gets stuck
          const startTime = Date.now();
          let currentDistance = 0;
          let lastPos = bot.entity.position;
          let stuckTime = 0;
          const stuckThreshold = 2000; // 2 seconds without movement = stuck
          
          while (currentDistance < targetDistance && (Date.now() - startTime) < maxTimeMs) {
            await new Promise(resolve => setTimeout(resolve, 100)); // Check every 100ms
            const currentPos = bot.entity.position;
            currentDistance = Math.sqrt(
              Math.pow(currentPos.x - startPos.x, 2) + 
              Math.pow(currentPos.z - startPos.z, 2) + 
              Math.pow(currentPos.y - startPos.y, 2)
            );
            
            // Check if bot is stuck (not moving)
            const positionChange = Math.sqrt(
              Math.pow(currentPos.x - lastPos.x, 2) + 
              Math.pow(currentPos.z - lastPos.z, 2) + 
              Math.pow(currentPos.y - lastPos.y, 2)
            );
            
            if (positionChange < 0.1) { // Less than 0.1 block movement
              stuckTime += 100;
              if (stuckTime >= stuckThreshold) {
                break; // Exit if stuck for too long
              }
            } else {
              stuckTime = 0; // Reset stuck timer if moving
              lastPos = currentPos;
            }
          }
          
          // Clear controls
          bot.clearControlStates();
          
          const endPos = bot.entity.position;
          const actualDistance = Math.sqrt(
            Math.pow(endPos.x - startPos.x, 2) + 
            Math.pow(endPos.z - startPos.z, 2) + 
            Math.pow(endPos.y - startPos.y, 2)
          );
          
          // Determine why movement stopped
          let stopReason = "";
          if (actualDistance >= targetDistance - 0.2) {
            stopReason = "reached target";
          } else if (stuckTime >= stuckThreshold) {
            stopReason = "stuck/blocked";
          } else if ((Date.now() - startTime) >= maxTimeMs) {
            stopReason = "timeout";
          } else {
            stopReason = "unknown";
          }
          
          return createResponse(`Executed: bot.${command}(${parameters[0]}, ${parameters[1]}) for ${actualDistance.toFixed(2)} blocks (target: ${targetDistance}, ${stopReason}). Position: (${Math.floor(endPos.x)}, ${Math.floor(endPos.y)}, ${Math.floor(endPos.z)})`);
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

  // Pathfinder navigation tool
  server.tool(
    "pathfind-to-position",
    "Use pathfinder to navigate to specific coordinates",
    {
      x: z.number().describe("Target X coordinate"),
      y: z.number().describe("Target Y coordinate"),
      z: z.number().describe("Target Z coordinate"),
      range: z.number().optional().describe("How close to get (default: 0 for exact position)")
    },
    async ({ x, y, z, range = 0 }) => {
      try {
        // Set up movements
        const movements = new Movements(bot, bot.registry);
        bot.pathfinder.setMovements(movements);
        
        // Create goal
        const goal = range > 0 ? 
          new goals.GoalNear(x, y, z, range) : 
          new goals.GoalBlock(x, y, z);
        
        // Start pathfinding
        bot.pathfinder.setGoal(goal);
        
        return createResponse(`Started pathfinding to (${x}, ${y}, ${z})${range > 0 ? ` within ${range} blocks` : ' exactly'}`);
      } catch (error) {
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
