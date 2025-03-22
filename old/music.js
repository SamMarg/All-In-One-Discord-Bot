const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const ytSearch = require('yt-search');
const { spawn } = require('child_process');
const path = require('path');
const config = require('./config.json')

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
});

const ytDlpPath = path.join(__dirname, 'assets', 'yt-dlp.exe');

let currentPlayer = null;
let currentSong = null;

client.once('ready', () => {
  console.log('Bot is online!');
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return

  const args = message.content.split(' ');
  const command = args[0].toLowerCase();
  const query = args.slice(1).join(' ');

  if (command === '!!play' || command === '!!p') {
    if (!query) {
      const embed = new EmbedBuilder()
        .setColor('#000000')
        .setTitle('✖️ Please provide a query to search for music.');
      return message.channel.send({ embeds: [embed] });
    }

    const voiceChannel = message.member?.voice.channel;
    if (!voiceChannel) {
      const embed = new EmbedBuilder()
        .setTitle('✖️ You need to join a voice channel first.')
        .setColor('#000000')
      return message.channel.send({ embeds: [embed] });
    }

    const results = await ytSearch(query);
    if (results.videos.length === 0) {
      const embed = new EmbedBuilder()
        .setColor('#000000')
        .setTitle('✖️ No results found for your search query.');
      return message.channel.send({ embeds: [embed] });
    }

    const video = results.videos[0]
    currentSong = video
    const stream = spawn(ytDlpPath, ['-f', 'bestaudio', '-o', '-', video.url]);

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    });

    currentPlayer = createAudioPlayer();
    const resource = createAudioResource(stream.stdout);

    currentPlayer.play(resource);
    connection.subscribe(currentPlayer);

    const embed = new EmbedBuilder()
      .setColor('000000')
      .setTitle(`${video.title}`)
      .setURL(video.url)
      .addFields(
        { name: 'Uploader', value: video.author.name },
        { name: 'Duration', value: formatDuration(video.duration) }
      );
    message.channel.send({ embeds: [embed] });

    currentPlayer.on(AudioPlayerStatus.Idle, () => {
      connection.destroy();
      currentSong = null;
      currentPlayer = null;
    });

  } else if (command === '!!pause') {
    if (!currentPlayer || currentPlayer.state.status !== AudioPlayerStatus.Playing) {
      const embed = new EmbedBuilder()
        .setColor('#000000')
        .setTitle('✖️ No music is currently playing.');
      return message.channel.send({ embeds: [embed] });
    }

    currentPlayer.pause();
    const embed = new EmbedBuilder()
      .setTitle('Music Paused')
      .setColor('ff0000')
    message.channel.send({ embeds: [embed] });

  } else if (command === '!!resume') {
    if (!currentPlayer || currentPlayer.state.status !== AudioPlayerStatus.Paused) {
      const embed = new EmbedBuilder()
        .setColor('#000000')
        .setDescription('✖️ Music is not paused.');
      return message.channel.send({ embeds: [embed] });
    }

    currentPlayer.unpause();
    const embed = new EmbedBuilder()
      .setTitle('Music Resumed')
      .setColor('ff0000')
    message.channel.send({ embeds: [embed] });

  } else if (command === '!!stop') {
    if (!currentPlayer || currentPlayer.state.status === AudioPlayerStatus.Idle) {
      const embed = new EmbedBuilder()
        .setTitle('✖️ No music is currently playing.')
        .setColor('#000000')
      return message.channel.send({ embeds: [embed] });
    }

    currentPlayer.stop();
    currentSong = null;
    const embed = new EmbedBuilder()
      .setTitle('Music Stopped')
    message.channel.send({ embeds: [embed] });

  } else if (command === '!!nowplaying' || command === '!!np') {
    if (!currentSong) {
      const embed = new EmbedBuilder()
        .setTitle('✖️ No music is currently playing.')
        .setColor('#000000')
      return message.channel.send({ embeds: [embed] });
    }

    const progressBar = getProgressBar();
    const embed = new EmbedBuilder()
      .setTitle(`[${currentSong.title}](${currentSong.url})`)
      .setDescription(progressBar)
      .addFields(
        { name: 'Uploader', value: currentSong.author.name },
        { name: 'Duration', value: formatDuration(currentSong.duration) }
      );
    message.channel.send({ embeds: [embed] });
  }
});

function formatDuration(duration) {
    if (typeof duration === 'object' && duration.seconds) {
      const minutes = Math.floor(duration.seconds / 60);
      const seconds = duration.seconds % 60;
      return `${minutes}m ${seconds}s`;
    }
  
    if (typeof duration === 'number') {
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      return `${minutes}m ${seconds}s`;
    }
  
    if (typeof duration === 'string' && duration.includes(':')) {
      const [minutes, seconds] = duration.split(':');
      return `${minutes}m ${seconds}s`;
    }
  
    return 'Unknown duration'
  }
  

function getProgressBar() {
  const timePassed = currentPlayer.state.resource.playbackDuration || 0;
  const songDuration = currentSong.duration * 1000;
  const progress = Math.round((timePassed / songDuration) * 10);
  let progressBar = '➖➖➖➖➖➖➖➖➖➖';
  progressBar = progressBar.slice(0, progress) + '⚪' + progressBar.slice(progress + 1);
  return progressBar;
}

client.login(config.token);
