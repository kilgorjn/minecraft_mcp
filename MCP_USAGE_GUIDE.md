# Minecraft MCP Server - Usage Guide for LLMs

## 🎯 Quick Reference for AI Assistants

This MCP server provides two main tools for controlling a Minecraft bot. Here's what other LLMs need to know:

---

## 🔧 Tool: `execute-bot-command`

**Purpose:** Execute any Mineflayer bot command with optional parameters

### **Parameters:**
- `command` (string): The Mineflayer API method name
- `params` (array, optional): Parameters to pass to the method

### **Key Usage Patterns:**

#### **🚶 Movement Commands (Distance-Based)**
```javascript
// Move forward 2 blocks
execute-bot-command("setControlState", ["forward", true, 2])

// Move back 1.5 blocks with 5-second timeout
execute-bot-command("setControlState", ["back", true, 1.5, 5])

// Default: 3 blocks, 10-second timeout
execute-bot-command("setControlState", ["left", true])
```

**Movement Parameters:**
1. Direction: "forward", "back", "left", "right", "jump", "sneak"
2. State: true (to activate)
3. Distance: blocks to move (default: 3.0)
4. Timeout: seconds (default: 10)

**Movement Response Examples:**
- `"for 2.33 blocks (target: 2, reached target)"`
- `"for 1.04 blocks (target: 5, stuck/blocked)"`
- `"for 8.15 blocks (target: 10, timeout)"`

#### **💬 Communication**
```javascript
// Send chat message
execute-bot-command("chat", ["Hello world!"])
```

#### **🎯 Looking & Targeting**
```javascript
// Look in direction (yaw, pitch in radians)
execute-bot-command("look", [1.57, 0])  // Look east

// Find nearest entity
execute-bot-command("nearestEntity", [])
```

#### **ℹ️ Information Gathering**
```javascript
// Get bot's current position
execute-bot-command("entity.position", [])

// Get health
execute-bot-command("health", [])
```

---

## 🧭 Tool: `pathfind-to-position`

**Purpose:** Intelligent navigation to coordinates using pathfinder

### **Parameters:**
- `x` (number): Target X coordinate
- `y` (number): Target Y coordinate  
- `z` (number): Target Z coordinate
- `range` (number, optional): How close to get (default: 0 for exact)

### **Usage Examples:**
```javascript
// Navigate exactly to coordinates
pathfind-to-position(100, 64, 200)

// Navigate within 3 blocks of target
pathfind-to-position(100, 64, 200, 3)
```

**Key Points:**
- Returns immediately (pathfinding runs in background)
- Automatically avoids obstacles
- Use range > 0 for "get close enough" behavior

---

## 🔄 Common Command Sequences

### **Basic Movement Pattern:**
1. `execute-bot-command("chat", ["Moving forward"])` 
2. `execute-bot-command("setControlState", ["forward", true, 5])`
3. `execute-bot-command("chat", ["Movement complete"])`

### **Entity Following:**
1. `execute-bot-command("nearestEntity", [])` - Find target
2. Extract position from response
3. `pathfind-to-position(x, y, z, 2)` - Follow with 2-block range

### **Exploration Pattern:**
1. `execute-bot-command("look", [0, 0])` - Look north
2. `pathfind-to-position(x+50, y, z)` - Move 50 blocks north
3. `execute-bot-command("chat", ["Arrived at new location"])`

---

## ⚠️ Important Notes for LLMs

### **Movement System:**
- **Distance-based, not time-based** - Specify exact blocks to move
- **Automatic stuck detection** - Stops if blocked for 2+ seconds
- **Always returns distance moved** and reason (reached target/stuck/timeout)

### **Pathfinding:**
- **Asynchronous operation** - Returns immediately, movement happens in background
- **Use for long distances** or obstacle-heavy areas
- **Range parameter** useful for "get close enough" scenarios

### **Error Handling:**
- Bot automatically clears controls on errors
- Always check response messages for success/failure
- Movement can stop early due to obstacles

### **Coordinate System:**
- Standard Minecraft coordinates (X, Y, Z)
- Y is vertical (higher = up)
- Negative Y values are below sea level

---

## 🎮 Bot Capabilities Reference

**Available Controls:**
- Movement: forward, back, left, right
- Actions: jump, sneak
- Looking: look(yaw, pitch)
- Communication: chat(message)

**Information Access:**
- Position: entity.position
- Health: health  
- Nearby entities: nearestEntity()
- World state: Various Mineflayer API methods

**Navigation:**
- Basic movement: setControlState with distance
- Smart navigation: pathfind-to-position
- Both approaches work together

---

## 💡 Tips for Effective Usage

1. **For precise short movements:** Use `execute-bot-command` with setControlState
2. **For long-distance travel:** Use `pathfind-to-position`
3. **For interactive control:** Combine both tools as needed
4. **Always provide user feedback:** Use chat commands to communicate bot actions
5. **Check responses:** Movement outcomes tell you what actually happened

---

*This guide enables any LLM to effectively control the Minecraft bot through the MCP interface without prior context.*
