const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.on('messageCreate', (message) => {
  if (message.content === '!!pfp') {
    message.reply({ content: message.client.user.displayAvatarURL() });
  }
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`)
});
const config = require('./config.json')
client.login(config.token);
