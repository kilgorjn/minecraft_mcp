
const { z } = require('zod');


// Movement detection constants
const MOVEMENT_THRESHOLD = 0.1; // Minimum blocks moved to consider bot as moving
const POSITION_CHECK_INTERVAL = 100; // How often to check position in ms

// Movement command handler
function handleMovementCommand(command, params) {
  // Check if this is a movement command
  if (command !== 'setControlState' || params.length < 2) {
    return false; // Not a movement command
  }
  
  const [direction, state] = params;
  const movementDirections = ['forward', 'back', 'left', 'right', 'jump', 'sneak', 'sprint'];
  
  if (!movementDirections.includes(direction)) {
    return false; // Not a movement direction
  }
  
  return true; // This is a movement command
}

// Attack command handler
function handleAttackCommand(command, params) {
  return command === 'attack' && params.length > 0;
}

async function executeAttackCommand(command, params) {
  const entityId = params[0];
  
  // Validate entity ID
  if (typeof entityId !== 'number' && isNaN(parseInt(entityId))) {
    return createErrorResponse(new Error(`Invalid entity ID: ${entityId}. Must be a number.`));
  }
  
  const targetEntity = bot.entities[parseInt(entityId)];
  if (!targetEntity) {
    return createErrorResponse(new Error(`Entity with ID ${entityId} not found`));
  }
  
  // Check distance
  const distance = bot.entity.position.distanceTo(targetEntity.position);
  if (distance > 4) {
    return createErrorResponse(new Error(`Target too far (${distance.toFixed(2)} blocks). Must be within 4 blocks to attack.`));
  }
  
  // Execute attack
  bot.attack(targetEntity);
  
  return createResponse(`Attacked entity ${entityId} (${targetEntity.name || targetEntity.type}) at distance ${distance.toFixed(2)} blocks`);
}

async function executeMovementCommand(command, params) {
  const startPos = bot.entity.position;
  
  // Default to 3 blocks if no distance specified, otherwise use third parameter
  const targetDistance = params.length >= 3 ? parseFloat(params[2]) : 3.0;
  // Default to 10 seconds if no timeout specified, otherwise use fourth parameter
  const maxTimeMs = params.length >= 4 ? parseFloat(params[3]) * 1000 : 10000;
  
  // Execute command
  const result = bot[command](params[0], params[1]);
  
  // Move until target distance is reached, timeout, or bot gets stuck
  const startTime = Date.now();
  let currentDistance = 0;
  let lastPos = bot.entity.position;
  let stuckTime = 0;
  
  while (currentDistance < targetDistance && (Date.now() - startTime) < maxTimeMs) {
    await new Promise(resolve => setTimeout(resolve, POSITION_CHECK_INTERVAL));
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
    
    if (positionChange < MOVEMENT_THRESHOLD) {
      stuckTime += POSITION_CHECK_INTERVAL;
      if (stuckTime >= STUCK_DETECTION_TIME) {
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
  } else if (stuckTime >= STUCK_DETECTION_TIME) {
    stopReason = "stuck/blocked";
  } else if ((Date.now() - startTime) >= maxTimeMs) {
    stopReason = "timeout";
  } else {
    stopReason = "unknown";
  }
  
  return createResponse(`Executed: bot.${command}(${params[0]}, ${params[1]}) for ${actualDistance.toFixed(2)} blocks (target: ${targetDistance}, ${stopReason}). Position: (${Math.floor(endPos.x)}, ${Math.floor(endPos.y)}, ${Math.floor(endPos.z)})`);
}


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



setupToolingForMcp = (server,bot,goals) => {


  // Bot property inspector tool
  server.tool(
    "inspect-bot-property",
    "Inspect bot properties like heldItem, inventory, health, position, etc.",
    {
      property: z.string().describe("The bot property to inspect (e.g., 'heldItem', 'inventory', 'health', 'food', 'entity.position', 'entity.yaw', 'quickBarSlot')")
    },
    async ({ property }) => {
      try {
        console.error(`[DEBUG] Attempting to access property: '${property}'`);
        
        // Navigate nested properties using dot notation
        const propertyPath = property.split('.');
        let value = bot;
        let currentPath = '';
        
        for (let i = 0; i < propertyPath.length; i++) {
          const key = propertyPath[i];
          currentPath = currentPath ? `${currentPath}.${key}` : key;
          
          console.error(`[DEBUG] Checking key '${key}' in path '${currentPath}'`);
          console.error(`[DEBUG] Current value type: ${typeof value}, is null/undefined: ${value == null}`);
          
          if (value == null) {
            return createErrorResponse(new Error(`Property path '${currentPath}' is null/undefined. Cannot access '${key}' in '${property}'`));
          }
          
          if (typeof value !== 'object') {
            return createErrorResponse(new Error(`Property path '${currentPath.substring(0, currentPath.lastIndexOf('.' + key))}' is not an object (type: ${typeof value}). Cannot access '${key}' in '${property}'`));
          }
          
          if (!(key in value)) {
            // List available properties for debugging
            const availableKeys = Object.keys(value).slice(0, 10); // Limit to first 10 keys
            return createErrorResponse(new Error(`Property '${key}' not found in '${currentPath.substring(0, currentPath.lastIndexOf('.' + key))}'. Available properties: ${availableKeys.join(', ')}${Object.keys(value).length > 10 ? '...' : ''}`));
          }
          
          value = value[key];
          console.error(`[DEBUG] Successfully accessed '${currentPath}', new value type: ${typeof value}`);
        }
        
        console.error(`[DEBUG] Final value type: ${typeof value}, is null: ${value == null}`);
        
        // Return the raw value - let the LLM handle formatting and interpretation
        const result = JSON.stringify(value, null, 2);
        console.error(`[DEBUG] JSON stringify successful, result length: ${result.length}`);
        
        return createResponse(`Property '${property}': ${result}`);
      } catch (error) {
        console.error(`[DEBUG] Error in inspect-bot-property for '${property}': ${error.message}`);
        console.error(`[DEBUG] Error stack: ${error.stack}`);
        return createErrorResponse(new Error(`Failed to inspect property '${property}': ${error.message}`));
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
        
        // Check if this is a movement command
        if (handleMovementCommand(command, parameters)) {
          return await executeMovementCommand(command, parameters);
        }
        
        // Check if this is an attack command
        if (handleAttackCommand(command, parameters)) {
          return await executeAttackCommand(command, parameters);
        }
        
        // Execute non-movement command directly
        let result = bot[command](...parameters);
        
        // Handle promises
        if (result && typeof result.then === 'function') {
          result = await result;
        }
        
        return createResponse(`Executed: bot.${command}(${parameters.join(', ')}). Result: ${JSON.stringify(result)}`);
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
}