




/**
 * Sets up sample tools and functionalities for the MCP server.
 * @param {McpServer} server - The MCP server instance.
 * @param {import('mineflayer').Bot} bot - The Mineflayer bot instance.
 */
setupSamplesForMcp = (mcpServer, bot) => {


   bot.on('whisper', (username, message) => {
    console.log(`Whisper from ${username}: ${message}`);
    const llmResponsePromise = mcpServer.server.createMessage({
      messages: [
        {
            role: 'system',
            content: {
                type: 'text',
                text: `You are the Minecraft bot's AI assistant, and you are responding to a whisper from a player.
                 Keep responses concise and relevant to Minecraft gameplay.
                 You don't need to say 'Whisper from [username]:' in your response.
                 Just provide the bot's reply message.
                 Your bot's name is ${bot.username}.
                 You can use the mcpServer.executeBotCommand tool to make the bot perform actions in the game, or get information/properties on your bot.`
            }
        },
        { 
          role: 'user', 
          content: { 
            type: 'text', 
            text: `Whisper from ${username}: ${message}. What should the bot respond with?` 
          } 
        }
      ]
    });
    console.log(`LLM response: ${llmResponsePromise}`);


    llmResponsePromise.then(llmResponse => {

      const responseText = llmResponse.content.text;
      bot.whisper(username, responseText);
    });
   });

}


module.exports = { setupSamplesForMcp };