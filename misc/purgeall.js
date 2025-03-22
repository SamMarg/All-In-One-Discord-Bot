const { Client, GatewayIntentBits } = require('discord.js');

// Create a new instance of the client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// The ID of the user who can run the command
const authorizedUserId = '760125732524392458';  // Replace with the specific user's ID

// When the bot is ready, this function will run
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Event listener for messages
client.on('messageCreate', async (message) => {
  // Ignore bot's own messages
  if (message.author.bot) return;

  // Command trigger check
  if (message.content === '-purgeall') {
    // Check if the message author has the correct ID
    if (message.author.id !== authorizedUserId) {
      return message.reply('You do not have permission to use this command.');
    }

    // Fetch all messages in the channel and delete them one by one
    try {
      let messagesDeleted = 0;

      // Loop to fetch and delete messages one by one
      while (true) {
        // Fetch a batch of 100 messages
        const messages = await message.channel.messages.fetch({ limit: 100 });

        // If no more messages to delete, break the loop
        if (messages.size === 0) break;

        // Delete each message individually
        for (const msg of messages.values()) {
          await msg.delete();
          messagesDeleted++;
        }

        // Optionally, you can add a small delay between deletions to avoid hitting rate limits
        // await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between deletions
      }

      // Inform the user that the purge was successful
      message.channel.send(`Purged ${messagesDeleted} messages.`)
        .then((msg) => {
          setTimeout(() => msg.delete(), 5000); // Deletes the success message after 5 seconds
        });
    } catch (err) {
      console.error(err);
      message.reply('There was an error trying to purge the messages.');
    }
  }
});

// Log the bot in using the token
client.login('MTMwMzM0NTE5MzI3MzEzNTEzNQ.GAI32D.Q7Ps8jAEUs4w-XuHT1TJj-_Dr1G9OMmNb4XmMs');  // Replace with your bot's token
