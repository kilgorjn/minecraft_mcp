# Minecraft MCP Bot

A Model Context Protocol (MCP) server that provides programmatic control of a Minecraft bot using the Mineflayer library. This project enables AI assistants to interact with Minecraft through a clean, extensible interface.

## Project Goals

- **AI-Controlled Minecraft Bot**: Create an intelligent bot that can be controlled through natural language commands via MCP
- **Full Mineflayer API Access**: Provide comprehensive access to Minecraft bot capabilities through a generic command interface
- **Intelligent Navigation**: Implement pathfinder-based movement for precise, obstacle-aware navigation
- **Extensible Architecture**: Build a modular system that can be easily extended with new capabilities
- **Training Environment**: Establish a safe, flat-world testing ground for bot behavior development
- **Clean Integration**: Seamless integration with VS Code and AI assistants through MCP protocol

## Features

### Current Capabilities
- **Generic Command Interface**: Execute any Mineflayer bot command with flexible parameter handling
- **Intelligent Pathfinding**: Navigate to specific coordinates with obstacle avoidance
- **Chat Communication**: Send messages and interact with players
- **Entity Detection**: Scan for and interact with nearby players, mobs, and objects
- **Flexible Movement**: Both manual control states and intelligent pathfinding options
- **Safe Testing Environment**: Operates in a flat world to prevent terrain-related issues

### Tools Available
1. **`execute-bot-command`**: Generic interface for all Mineflayer API functions
2. **`pathfind-to-position`**: Intelligent navigation to specific coordinates

## Technical Stack

- **Mineflayer**: Core Minecraft bot library
- **MCP SDK**: Model Context Protocol server implementation
- **Pathfinder**: Intelligent navigation and movement
- **Zod**: Schema validation for tool parameters
- **Node.js**: Runtime environment

## Getting Started

### Prerequisites
- Node.js (v20+)
- Minecraft server (configured for flat world)
- VS Code with MCP extension

### Installation
```bash
npm install
```

### Configuration
1. Update server connection details in `index.js`
2. Configure MCP in VS Code settings (`.vscode/mcp.json`)
3. Ensure Minecraft server is running with flat world generation

### Running
```bash
node index.js
```

## Development

### Branch Structure
- `main`: Stable, production-ready code
- `add-pathfinder`: Pathfinding integration development
- Feature branches for new capabilities

### Contributing
1. Create feature branches for new development
2. Test thoroughly in flat world environment
3. Ensure clean integration with existing MCP tools
4. Commit incremental changes with clear messages

## Future Enhancements

- **Building and Construction**: Block placement and structure creation
- **Inventory Management**: Item handling and crafting capabilities
- **Advanced AI Behaviors**: Complex task execution and planning
- **Multi-Bot Coordination**: Manage multiple bots simultaneously
- **Real-World Integration**: Connect to live Minecraft servers safely

## Security Considerations

⚠️ **IMPORTANT SECURITY WARNING** ⚠️

This project currently provides **unrestricted access** to the Mineflayer API through the generic command interface. This means:

- **Any Mineflayer command can be executed** without validation or restrictions
- **The LLM has full bot control** including potentially destructive actions
- **No command filtering or sandboxing** is currently implemented
- **Suitable for trusted environments only** (local testing, controlled servers)

### Current Risk Level: **HIGH**
- ✅ Safe for: Local development, private servers, controlled testing
- ❌ **NOT safe for**: Public servers, untrusted environments, production use
- 🔥 It could set your world on fire. 🔥

### Recommended Security Improvements (Future Development)
- **Command Whitelist**: Restrict available commands to approved set
- **Parameter Validation**: Strict validation of command parameters
- **Action Limits**: Rate limiting and scope restrictions
- **Audit Logging**: Track all executed commands
- **Permission System**: Granular control over bot capabilities
- **Safe Mode**: Default to restricted command set

## Architecture Philosophy

This project emphasizes:
- **Simplicity**: Clean, minimal codebase with focused functionality
- **Flexibility**: Generic interfaces that adapt to diverse use cases
- **Controlled Testing**: Safe environment for development and experimentation
- **Extensibility**: Modular design for easy capability expansion
- **Security Awareness**: Recognizing and documenting security implications
