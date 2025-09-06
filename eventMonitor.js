// Event monitoring system for Minecraft MCP bot
// Handles event detection, storage, and retrieval for LLM analysis

class EventMonitor {
  constructor(maxEvents = 100) {
    // Separate queues for different event categories
    this.eventQueues = {
      communication: [], // chat, whisper, message
      social: [],        // playerJoined, playerLeft
      entities: [],      // entitySpawn, entityGone
      world: [],         // blockUpdate, timeChange
      bot: [],           // botSpawned, botDied, healthChanged
      system: []         // any other events
    };
    
    this.maxEvents = {
      communication: 50,  // Keep more communication events
      social: 30,         // Player join/leave is important
      entities: 20,       // Limit high-volume entity events
      world: 20,          // Limit high-volume world events
      bot: 50,            // Bot status is important
      system: 20          // System events
    };
    
    this.lastEventId = 0;
    this.eventCategories = {
      'chat': 'communication',
      'whisper': 'communication', 
      'message': 'communication',
      'playerJoined': 'social',
      'playerLeft': 'social',
      'entitySpawn': 'entities',
      'entityGone': 'entities',
      'blockUpdate': 'world',
      'timeChange': 'world',
      'botSpawned': 'bot',
      'botDied': 'bot',
      'botKicked': 'bot',
      'healthChanged': 'bot'
    };
    
    // Import LLM handlers
    this.llmHandlers = require('./llm_handlers');
    this.mcpServer = null; // Will be set when setupMcpTools is called
  }

  addEvent(type, data) {
    const event = {
      id: ++this.lastEventId,
      type,
      timestamp: Date.now(),
      data
    };
    
    // Determine which queue this event belongs to
    const category = this.eventCategories[type] || 'system';
    const queue = this.eventQueues[category];
    const maxSize = this.maxEvents[category];
    
    // Add to appropriate queue
    queue.push(event);
    
    // Maintain queue size
    if (queue.length > maxSize) {
      queue.splice(0, queue.length - maxSize);
    }
    
    // Trigger LLM handlers for relevant events
    this.triggerLlmHandlers(event);
  }

  triggerLlmHandlers(event) {
    if (!this.botWrapper) return;
    
    try {
      switch (event.type) {
        case 'chat':
          // Check if this is a "special" chat that needs LLM attention
          if (this.isSpecialChat(event.data)) {
            this.llmHandlers.handleSpecialChat(event, this.botWrapper);
          }
          break;
        case 'whisper':
          // Whispers are always considered special
          this.llmHandlers.handleSpecialChat(event, this.botWrapper);
          break;
        case 'healthChanged':
          // Check if health is low
          if (event.data.health < 10) {
            this.llmHandlers.handleLowHealth(event, this.botWrapper);
          }
          break;
        case 'entitySpawn':
          // Check if it's a hostile mob
          if (this.isHostileMob(event.data.entityType)) {
            this.llmHandlers.handleHostileMobNearby(event, this.botWrapper);
          }
          break;
      }
    } catch (error) {
      console.error('Error triggering LLM handler:', error);
    }
  }
  
  isSpecialChat(data) {
    // Define what makes a chat "special" - mentions bot name, commands, etc.
    const message = data.message || '';
    const specialKeywords = ['mcpbot', 'bot', 'help', 'attack', 'follow', 'come'];
    return specialKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }
  
  isHostileMob(entityType) {
    // Define hostile mobs that should trigger the handler
    const hostileMobs = ['zombie', 'skeleton', 'spider', 'creeper', 'enderman'];
    return hostileMobs.includes(entityType.toLowerCase());
  }

  getEventsByCategory(category, since = 0, limit = 10) {
    if (!this.eventQueues[category]) {
      return [];
    }
    
    return this.eventQueues[category]
      .filter(event => event.timestamp > since)
      .slice(-limit);
  }

  getStats() {
    const stats = {
      totalEvents: this.lastEventId,
      categories: {}
    };
    
    Object.keys(this.eventQueues).forEach(category => {
      const queue = this.eventQueues[category];
      stats.categories[category] = {
        queueSize: queue.length,
        maxSize: this.maxEvents[category],
        oldestEvent: queue.length > 0 ? queue[0].timestamp : null,
        newestEvent: queue.length > 0 ? queue[queue.length - 1].timestamp : null,
        eventTypes: [...new Set(queue.map(e => e.type))]
      };
    });
    
    return stats;
  }

  setupBotEventListeners(bot) {
    // Communication events - comprehensive message capturing
    bot.on('chat', (username, message) => {
      this.addEvent('chat', { username, message });
    });

    bot.on('whisper', (username, message) => {
      this.addEvent('whisper', { username, message });
    });

    bot.on('message', (jsonMsg) => {
      // Catch-all for any message format we might miss
      this.addEvent('message', { 
        text: jsonMsg.toString(), 
        json: jsonMsg 
      });
    });

    bot.on('playerJoined', (player) => {
      this.addEvent('playerJoined', { username: player.username });
    });

    bot.on('playerLeft', (player) => {
      this.addEvent('playerLeft', { username: player.username });
    });

    // Entity events
    bot.on('entitySpawn', (entity) => {
      this.addEvent('entitySpawn', { 
        entityType: entity.name || entity.type,
        position: entity.position,
        id: entity.id
      });
    });

    bot.on('entityGone', (entity) => {
      this.addEvent('entityGone', { 
        entityType: entity.name || entity.type,
        id: entity.id
      });
    });

    // World events
    bot.on('blockUpdate', (oldBlock, newBlock) => {
      if (oldBlock && newBlock && oldBlock.type !== newBlock.type) {
        this.addEvent('blockUpdate', {
          position: { x: newBlock.position.x, y: newBlock.position.y, z: newBlock.position.z },
          oldType: oldBlock.type,
          newType: newBlock.type
        });
      }
    });

    // Bot status events
    bot.on('health', () => {
      this.addEvent('healthChanged', { 
        health: bot.health,
        food: bot.food
      });
    });

    bot.on('time', () => {
      this.addEvent('timeChange', { 
        time: bot.time.time,
        isDay: bot.time.isDay
      });
    });

    // Additional useful events
    bot.on('spawn', () => {
      this.addEvent('botSpawned', { 
        position: bot.entity.position 
      });
    });

    bot.on('death', () => {
      this.addEvent('botDied', { 
        position: bot.entity.position,
        cause: 'unknown' // Could be enhanced with death cause detection
      });
    });

    bot.on('kicked', (reason) => {
      this.addEvent('botKicked', { reason });
    });
  }

  setupMcpTools(server, createResponse, createErrorResponse, bot) {
    this.mcpServer = server; // Store reference for handlers
    this.bot = bot; // Store bot reference
    
    // Create a wrapper object with the methods expected by handlers
    this.botWrapper = {
      executeBotCommand: (command, params = []) => {
        try {
          const parameters = params.map(p => {
            if (p === 'true') return true;
            if (p === 'false') return false;
            return p;
          });
          
          let result = this.bot[command](...parameters);
          if (result && typeof result.then === 'function') {
            result = result.catch(err => console.error('Bot command error:', err));
          }
          return result;
        } catch (error) {
          console.error('Bot command execution error:', error);
        }
      },
      
      pathfindToPosition: (x, y, z, range = 0) => {
        try {
          const { Movements, goals } = require('mineflayer-pathfinder');
          const movements = new Movements(this.bot, this.bot.registry);
          this.bot.pathfinder.setMovements(movements);
          
          const goal = range > 0 ? 
            new goals.GoalNear(x, y, z, range) : 
            new goals.GoalBlock(x, y, z);
          
          this.bot.pathfinder.setGoal(goal);
        } catch (error) {
          console.error('Pathfinding error:', error);
        }
      },
      
      inspectBotProperty: (property) => {
        try {
          const propertyPath = property.split('.');
          let value = this.bot;
          
          for (let key of propertyPath) {
            if (value == null || typeof value !== 'object') {
              throw new Error(`Cannot access property '${key}'`);
            }
            value = value[key];
          }
          
          return value;
        } catch (error) {
          console.error('Property inspection error:', error);
          return null;
        }
      },
      
      sampling: server.sampling // Pass through sampling capability
    };
    
    const { z } = require('zod');
    
    // Event monitoring tool with category support
    server.tool(
      "get-recent-events",
      "Get events that happened since a specific time for LLM analysis",
      {
        since: z.number().optional().describe("Timestamp - get events since this time (default: 0 for all)"),
        limit: z.number().optional().describe("Maximum number of events to return (default: 10)"),
        category: z.string().optional().describe("Event category filter (communication, social, entities, world, bot, system)"),
        eventTypes: z.array(z.string()).optional().describe("Filter by specific event types")
      },
      async ({ since = 0, limit = 10, category, eventTypes }) => {
        try {
          let recentEvents;
          if (category) {
            recentEvents = this.getEventsByCategory(category, since, limit);
          } else {
            recentEvents = this.getRecentEvents(since, limit, eventTypes);
          }
          return createResponse(JSON.stringify(recentEvents, null, 2));
        } catch (error) {
          return createErrorResponse(error);
        }
      }
    );

    // Event monitoring statistics tool
    server.tool(
      "get-event-stats",
      "Get statistics about the event monitoring system",
      {},
      async () => {
        try {
          const stats = this.getStats();
          return createResponse(JSON.stringify(stats, null, 2));
        } catch (error) {
          return createErrorResponse(error);
        }
      }
    );
  }
}

module.exports = EventMonitor;
