const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const ytSearch = require('yt-search'); // Import yt-search for searching YouTube
const { SlashCommandBuilder } = require('@discordjs/builders');
const token="MTM0OTg0MTQxMTY1ODM1MDcwMw.GQTf6E.gbyohOwj9qpRKwzHPMWblHwm18ZS1R6EEVKICs"
const { execFile } = require('child_process');


const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Needed to read message content
],
});

const downloadFolder = 'downloads';

// Ensure the downloads directory exists
if (!fs.existsSync(downloadFolder)) {
  fs.mkdirSync(downloadFolder);
}

function parseDuration(duration) {
  const timeParts = duration.split(':').map(part => parseInt(part, 10));
  if (timeParts.length === 2) {
    // Format like "mm:ss"
    return {
      minutes: timeParts[0],
      seconds: timeParts[1],
    };
  } else if (timeParts.length === 3) {
    // Format like "hh:mm:ss"
    return {
      minutes: timeParts[1],
      seconds: timeParts[2],
    };
  }
  return { minutes: 0, seconds: 0 };
}

async function getVideoInfo(query) {
    try {
      const res = await ytSearch(query);
      const video = res.videos[0]; // Get the first video from the search results
      const { title, author: { name: uploader }, thumbnail, duration, url: videoUrl } = video;
  
      console.log('Duration:', duration);  // Debugging the duration here
  
      // Use the timestamp from duration
      const { timestamp } = duration;
      const [minutes, seconds] = timestamp.split(':').map(part => parseInt(part, 10));
  
      return {
        title,
        uploader,
        thumbnail,
        duration: { minutes, seconds },
        videoUrl,
      };
    } catch (error) {
      console.error(error);
      return null;
    }
  }
  
  async function info(interaction) {
    const query = interaction.options.getString('query');
    
    try {
      // Acknowledge the interaction early to prevent timeout
      await interaction.deferReply();
  
      // Get the video information
      const videoInfo = await getVideoInfo(query);
  
      if (videoInfo) {
        const { title, uploader, thumbnail, duration, videoUrl } = videoInfo;
        const formattedDuration = `${duration.minutes.toString().padStart(2, '0')}:${duration.seconds.toString().padStart(2, '0')}`;
  
        const embed = new EmbedBuilder()
          .setTitle(title)
          .setColor('Red')
          .setURL(videoUrl)
          .setImage(thumbnail)
          .addFields(
            { name: 'Duration', value: formattedDuration },
            { name: 'Uploader', value: uploader }
          );
  
        // Reply with the embed
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.editReply('Could not find any results for your query.');
      }
    } catch (error) {
      console.error(error);
      await interaction.editReply('There was an error processing your request.');
    }
  }
  

  async function downloadAndUpload(interaction, query) {
    try {
      // Send loading message
      const embed = new EmbedBuilder()
        .setColor('Red')
        .setThumbnail('https://cdn.discordapp.com/attachments/1249420559423508540/1350433153637941369/loading.gif')
        .setTitle("Searching for " + "**" + query +"**...");
      const message = await interaction.reply({ embeds: [embed], fetchReply: true });
  
      const videoInfo = await getVideoInfo(query);
      if (!videoInfo) {
        await interaction.editReply({ content: 'Error: Could not fetch video info.' });
        return;
      }
  
      const { title, videoUrl } = videoInfo;
  
      // Download the audio stream using yt-dlp
      const ytDlpPath = 'S:/yt-dlp.exe'; // Adjust the path to where your yt-dlp executable is located
      const filePath = path.join(downloadFolder, `${title}.mp3`);
  
      console.log(`Starting download of ${videoUrl} to ${filePath}`); // Debugging step
  
      execFile(ytDlpPath, ['-f', 'bestaudio/best', '--extract-audio', '--audio-format', 'mp3', '--output', filePath, videoUrl], (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing yt-dlp: ${error.message}`);
          return interaction.editReply({ content: 'Error: Failed to execute yt-dlp.' });
        }
        if (stderr) {
          console.error(`stderr: ${stderr}`);
        }
        console.log(`stdout: ${stdout}`);
  
        // Once the download is complete, check if the file exists
        if (fs.existsSync(filePath)) {
          const file = fs.createReadStream(filePath);
          interaction.editReply({embeds: [], files: [{ attachment: file, name: `${title}.mp3` }]})
            .then(() => {
              fs.unlinkSync(filePath); // Clean up after sending the file
            })
            .catch((err) => {
              console.error("Error sending file:", err);
              interaction.editReply({ content: 'Error: Failed to send the MP3 file.' });
            });
        } else {
          interaction.editReply({ content: 'Error: File not found after download.' });
        }
      });
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: 'Error: Something went wrong.' });
    }
  }
  
bot.on('ready', async () => {
  console.log(`Logged in as ${bot.user.tag}!`);
  await bot.guilds.cache.forEach(async (guild) => {
    const commands = [
      new SlashCommandBuilder().setName('info').setDescription('Get information about a video').addStringOption(option => option.setName('query').setDescription('Search query').setRequired(true)),
      new SlashCommandBuilder().setName('download').setDescription('Download and send a video as MP3').addStringOption(option => option.setName('query').setDescription('Search query').setRequired(true)),
    ];

    await guild.commands.set(commands.map(command => command.toJSON()));
  });
});

bot.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'info') {
    const query = interaction.options.getString('query');
    const videoInfo = await getVideoInfo(query);

    if (videoInfo) {
      const { title, uploader, thumbnail, duration, videoUrl } = videoInfo;
      const formattedDuration = `${duration.minutes.toString().padStart(2, '0')}:${duration.seconds.toString().padStart(2, '0')}`;

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor('Red')
        .setURL(videoUrl)
        .setImage(thumbnail)
        .addFields(
          { name: 'Duration', value: formattedDuration },
          { name: 'Uploader', value: uploader }
        );

      await interaction.reply({ embeds: [embed] });
    } else {
      await interaction.reply('Could not find any results for your query.');
    }
  }

  if (interaction.commandName === 'download') {
    const query = interaction.options.getString('query');
    await downloadAndUpload(interaction, query);
  }
});

bot.login(token);
