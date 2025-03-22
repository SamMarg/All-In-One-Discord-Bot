const { Client, GatewayIntentBits, EmbedBuilder, REST, SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const process = require('process');
const ps = require('ps-node');
const { execSync } = require('child_process');
const { AudioPlayer, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const { joinVoiceChannel } = require('@discordjs/voice');
const mp3Duration = require('mp3-duration');
const axios = require('axios')

const config = require('./config.json')
const birthdaysFile = require('./birthdays.json');
const { debug } = require('console');

const tickets = new Map();

let birthdays = {};
let priority = ""

if (fs.existsSync(birthdaysFile)) { 
    birthdays = JSON.parse(fs.readFileSync(birthdaysFile));
}

const bot = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages]
});

let debugMode=config.debugMode

const voiceClients = {}
let songDurationFormatted = ''

let prefix = config.prefix
const AdminID = config.AdminID
const SupportID = config.supportID

bot.on('ready', async () => {
    await bot.guilds.cache.forEach(async (guild) => {
      const commands = [
         new SlashCommandBuilder()
         .setName('play')
         .setDescription('Plays a song')
         .addStringOption(option => option.setName('query').setDescription('The song title')),
         new SlashCommandBuilder()
         .setName('pause')
         .setDescription('Pauses the currently playing song'),
         new SlashCommandBuilder()
         .setName('resume')
         .setDescription('Resumes the currently playing song'),
         new SlashCommandBuilder()
         .setName('stop')
         .setDescription('Stops the currently playing song'),
         new SlashCommandBuilder()
         .setName('quit')
         .setDescription('Alias for stop'),
         new SlashCommandBuilder()
         .setName('end')
         .setDescription('Shuts down the bot'),
         new SlashCommandBuilder()
         .setName('restart')
         .setDescription('Restarts the bot'),
         new SlashCommandBuilder()
         .setName('playing')
         .setDescription('Displays information about the currently playing song'),
         new SlashCommandBuilder()
         .setName('np')
         .setDescription('Alias for playing'),
         new SlashCommandBuilder()
         .setName('cocktail')
         .setDescription('Look up information about a cocktail')
         .addStringOption(option => option.setName('cocktail').setDescription('The name of the cocktail').setRequired(true)),
         new SlashCommandBuilder()
         .setName('joke')
         .setDescription('Tells a random joke'),
         new SlashCommandBuilder()
         .setName('pokedex')
         .setDescription('Displays information about a Pokémon')
         .addStringOption(option => option.setName('pokemon').setDescription('The name of the Pokémon').setRequired(true)),
         new SlashCommandBuilder()
         .setName('lyrics')
         .setDescription('Displays lyrics for a song')
         .addStringOption(option => option.setName('artist').setDescription("The song's artist").setRequired(true))
         .addStringOption(option => option.setName('track').setDescription('The name of the track').setRequired(true)),
         new SlashCommandBuilder()
         .setName('birthday')
         .setDescription('Register your birthday!')
         .addStringOption(option => option.setName('day').setDescription('The day of the month of your birthday').setRequired(true))
         .addStringOption(option => option.setName('month').setDescription('The month of the year of your birthday').setRequired(true)),
         new SlashCommandBuilder()
         .setName('showbirthday')
         .setDescription("Shows a user's birthday")
         .addUserOption(option => option.setName('user').setDescription('The user whose birthday you want to see').setRequired(true)),
         new SlashCommandBuilder()
         .setName('ticket')
         .setDescription('Creates a ticket for a specified category'),
         new SlashCommandBuilder()
         .setName('close')
         .setDescription('Closes a ticket'),
         new SlashCommandBuilder()
         .setName('priority')
         .setDescription('Changes the priority of a ticket')
         .addIntegerOption(option => option.setName('priority').setDescription('The priority of the ticket (1-5, 5 being highest)').setRequired(true)),
         new SlashCommandBuilder()
         .setName('resolved')
         .setDescription('Mark a ticket as Resolved.'),
         new SlashCommandBuilder()
         .setName('help')
         .setDescription('Open a support ticket.'),
         new SlashCommandBuilder()
         .setName('transcript')
         .addIntegerOption(option => option.setName('ticketid').setDescription('The ID of the ticket').setRequired(true))
         .setDescription('Fetch a transcript of a specified ticket.'),
         new SlashCommandBuilder()
         .setName('suggest')
         .addStringOption(option => option.setName('suggestion').setDescription('What you want to suggest').setRequired(true))
         .setDescription('Suggest something new'),
        ];
  
      await guild.commands.set(commands.map(command => command.toJSON()));
    });
  });

bot.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    if (message.content.startsWith(config.prefix + "prefix ")) {
        if (message.author.id === AdminID) {
            const newPrefix = message.content.slice(config.prefix.length + 7)
            if (newPrefix.length > 2) {
                const embed = new EmbedBuilder()
                    .setTitle("✖️ Prefix cannot be longer than 2 characters.")
                    .setColor('#000000');
                message.reply({ embeds: [embed] });
            } else {
                config.prefix = newPrefix
                fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
                console.log("Changed prefix to " + newPrefix);
                const embed = new EmbedBuilder()
                .setTitle("Prefix changed to " + config.prefix)
                .setColor('#ff0000');
                message.reply({ embeds: [embed] });
                if (debugMode) {
                    const user = await bot.users.fetch(AdminID);
                    user.send("Prefix changed to " + config.prefix + " by " + message.author.tag);
                }
            }
        } else {
            const embed = new EmbedBuilder()
                .setTitle("✖️ You are not authorized to use this command")
                .setColor('#000000');
            message.reply({ embeds: [embed] });
        }
    }
    else if(message === config.prefix + "prefix") {
        const embed = new EmbedBuilder()
           .setTitle("Current prefix is " + config.prefix)
           .setColor('#FF0000');
        message.reply({ embeds: [embed] });

    }
});


bot.on("messageCreate", async (message) => {
    if (message.content === config.prefix + "clearTickets") {
        if (message.author.id === AdminID) {
    
            const guild = await bot.guilds.fetch(config.GuildID);
            const channels = guild.channels.cache.filter(
                (channel) => channel.type === 'GUILD_TEXT' && (channel.name.startsWith("ticket-") || channel.name.startsWith('resolved-'))
            );
    
            for (const [channelID, channel] of channels) {
                try {
                    await channel.delete();
                } catch (error) {
                    console.error(`Error deleting channel ${channel.name}:`, error);
                }
            }
    
            const embed = new EmbedBuilder()
                .setTitle("Tickets cleared")
                .setColor('#FF0000');
            message.reply({ embeds: [embed] });
    
            if (debugMode) {
                const user = await bot.users.fetch(AdminID);
                user.send(`Tickets cleared by ${message.author.tag}`);
            }
        } else {
            const embed = new EmbedBuilder()
                .setTitle("✖️ You are not authorized to use this command")
                .setColor('#000000');
            message.reply({ embeds: [embed] });
        }
    }
    

    if (message.author.bot) return;

    if (message.content.startsWith(config.prefix + "debug ")) {
        const state = message.content.slice(8).toLowerCase()
        
        if (message.author.id !== AdminID) {
            const embed = new EmbedBuilder()
                .setTitle("✖️ You are not authorized to use this command")
                .setColor('#000000');
            return message.reply({ embeds: [embed] });
        }
        
        if (state === "true" || state === "false") {
            debugMode = state === "true";
            config.debugMode = debugMode;
            fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
            const embed = new EmbedBuilder()
                .setTitle(`✅ Changed the state of Debug Mode to ${debugMode}`)
                .setColor('#ff0000');
            return message.reply({ embeds: [embed] });
        }
        
        const embed = new EmbedBuilder()
            .setTitle("✖️ An error occurred while changing the state of Debug Mode. Please use 'true' or 'false'.")
            .setColor('#000000');
        return message.reply({ embeds: [embed] });
    }
    else if(message === config.prefix + "debug"){
        const embed = new EmbedBuilder()
           .setTitle("Current Debug Mode state is " + config.debugMode)
           .setColor('#FF0000');
        message.reply({ embeds: [embed] });
    }
});

function updateSongDuration() {
    try {
      const files = fs.readdirSync('./downloads');
  
      const mp3File = files.find(file => file.endsWith('.mp3'));
  
      if (!mp3File) {
        console.log('No MP3 file found in ./downloads');
        return;
      }
  
      const filePath = path.join(__dirname, 'downloads', mp3File);
  
      mp3Duration(filePath, (err, duration) => {
        if (err) {
          console.error('Error reading MP3 duration:', err);
          return;
        }
  
        const formattedDuration = formatDuration(duration);
  
        songDurationFormatted = formattedDuration;
  
        console.log(`Song Duration Updated: ${songDurationFormatted}`);
      });
  
    } catch (err) {
      console.error('Error getting MP3 duration:', err);
    }
  }
  
  function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
  
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }
  
  function handleFileChange(eventType, filename) {
    if (filename && filename.endsWith('.mp3')) {
      const filePath = path.join(__dirname, 'downloads', filename);
  
      if (eventType === 'rename' && fs.existsSync(filePath)) {
        // New MP3 file added
        if(debugMode === true) {
        console.log(`New MP3 file detected: ${filename}`);
    }
        updateSongDuration()
      }
    }
  }
  
  fs.watch('./downloads', handleFileChange);
  
  fs.readdir('./downloads', (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      return;
    }
  
    const mp3File = files.find(file => file.endsWith('.mp3'));
  
    if (mp3File) {
      const filePath = path.join(__dirname, 'downloads', mp3File);
      updateSongDuration()
    }
  });
function clearDownloads() {
    const folder = "downloads";
    if (fs.existsSync(folder)) {
        fs.readdirSync(folder).forEach(file => {
            const filePath = path.join(folder, file);
            try {
                if (fs.statSync(filePath).isFile()) {
                    fs.unlinkSync(filePath);
                }
            } catch (e) {
                console.log(`Error deleting ${filePath}: ${e}`);
            }
        });
    }
}

async function restart() {
    await exec("python restart.py", () => {
        if(debugMode === true) {
            const user = bot.users.fetch(AdminID);
            user.send("Restarting Initiated")
        } else {return}
        setTimeout(() => {
            exec("exit")
            process.exit(0)
        }, 1000);
    });
}


async function searchAndPlay(interaction, query) {
    if (!interaction.member.voice.channel) {
        const embed = new EmbedBuilder()
           .setTitle("✖️ You need to be in a voice channel to play music.")
           .setColor("#000000")
        return interaction.followUp({embeds:[embed]});
    }

    const connection = joinVoiceChannel({
        channelId: interaction.member.voice.channel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
    });

    connection.on('error', (error) => {
        console.error('Voice connection error:', error);
        const embed = new EmbedBuilder()
            .setTitle("✖️ Error connecting to the voice channel.")
            .setColor("#000000")
        interaction.followUp({embeds:[embed]});
    });

    await interaction.reply({
        content: "✅ **Your request is being processed!**",
        ephemeral: true
    });

    const loadingEmbed = new EmbedBuilder()
        .setColor("#FF0000")
        .setThumbnail('https://cdn.discordapp.com/attachments/1249420559423508540/1350433153637941369/loading.gif')
        .setTitle(`Searching for "${query}" ...`);
    
    const loadingMessage = await interaction.channel.send({ embeds: [loadingEmbed] });
    const yt_dlp_path = ".\\assets\\yt-dlp.exe"
    const downloadPath = "C:/Users/Sam Marg/Desktop/newmusic/downloads"
    if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);
    
    try {
        const ytdlpCommand = `${yt_dlp_path} -f bestaudio --extract-audio --audio-format mp3 --output "${downloadPath}/%(title)s.%(ext)s" "ytsearch:${query}"`;
        execSync(ytdlpCommand, { stdio: 'ignore' });

        const files = fs.readdirSync(downloadPath).filter(file => file.endsWith('.mp3'));
        if (files.length === 0) throw new Error('No audio file found.');

        const mp3FilePath = path.join(downloadPath, files[0]);
        await loadingMessage.delete();

        const player = createAudioPlayer();
        const audioResource = createAudioResource(mp3FilePath);
        connection.subscribe(player);
        player.play(audioResource);

        voiceClients[interaction.guild.id] = {
            client: connection,
            player: player,
            info: { title: path.basename(mp3FilePath, '.mp3') },
            startTime: Date.now(),
        };

        player.on(AudioPlayerStatus.Idle, () => {
            fs.unlinkSync(mp3FilePath);
            connection.destroy();
            delete voiceClients[interaction.guild.id];
        });
        const nowPlayingEmbed = new EmbedBuilder()
            .setTitle("Now Playing")
            .setDescription(`**${path.basename(mp3FilePath, '.mp3')}**`)
            .setColor("#FF0000")
            .setFooter({ text: `Requested by ${interaction.user.username}` })
            .addFields({name: "Duration", value: songDurationFormatted})
        await interaction.followUp({ embeds: [nowPlayingEmbed] });

            } catch (e) {
                console.log(`Error: ${e}`);
                const embed = new EmbedBuilder()
                    .setTitle("✖️ Error downloading audio")
                    .setColor("#000000")
                    .setDescription(e.message)
                await interaction.followUp({embeds:[embed]});
                await loadingMessage.delete();
    }
}

bot.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'play' || interaction.commandName === 'p') {
        const query = interaction.options.getString('query')
        if(debugMode === true) {
            const user = await bot.users.fetch(AdminID);
            user.send("Play command used by **" + interaction.user.username + "**: \n" + query);
        }
        if (!interaction.member.voice.channel) {
            const embed = new EmbedBuilder()
               .setTitle('✖️ You must be in a voice channel to play music.')
               .setColor("#000000")
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return
        }
        await searchAndPlay(interaction, query)
    }

    if (interaction.commandName === 'pause') {
        if(debugMode === true) {
            const user = await bot.users.fetch(AdminID);
            user.send("Pause command used by " + interaction.user.username)
        }
        if (voiceClients[interaction.guild.id] && voiceClients[interaction.guild.id].player) {
            voiceClients[interaction.guild.id].player.pause()
            const embed = new EmbedBuilder()
                .setTitle("✅ Music Paused")
                .setColor("#FF0000")
            await interaction.reply({embeds:[embed]})
        } else {
            const embed = new EmbedBuilder()
                .setTitle('✖️ No music is currently playing.')
                .setColor("#000000")
            await interaction.reply({embeds:[embed]})
        }
    }    
    

    if (interaction.commandName === 'resume') {
        if(debugMode === true) {
            const user = await bot.users.fetch(AdminID);
            user.send("Resume command used by " + interaction.user.username)
        }
        if (voiceClients[interaction.guild.id] && voiceClients[interaction.guild.id].player) {
            voiceClients[interaction.guild.id].player.unpause()
            const embed = new EmbedBuilder()
               .setTitle("✅ Music Resumed")
               .setColor("#FF0000")
            await interaction.reply({embeds:[embed]});
        } else {
            const embed = new EmbedBuilder()
                .setTitle("✖️ No music is currently playing.")
                .setColor("#000000")
            await interaction.reply({embeds:[embed]})
        }
    }    

    function convertToSeconds(durationFormatted) {
        const [minutes, seconds] = durationFormatted.split(':').map(Number);
        return (minutes * 60) + seconds;
      }

    if (interaction.commandName === 'playing' || interaction.commandName === 'np') {
        if(debugMode === true) {
            const user = await bot.users.fetch(AdminID);
            user.send("Playing / np command used by " + interaction.user.username)
        }
        const voiceClientInfo = voiceClients[interaction.guild.id];
    
        if (voiceClientInfo && voiceClientInfo.player) {
            const songInfo = voiceClientInfo.info;

    
            const startTime = voiceClientInfo.startTime;
            const elapsedTime = (Date.now() - startTime) / 1000
            const duration = songInfo.duration
            const remainingTime = duration - elapsedTime
    
            console.log("{DEBUG}:" + elapsedTime)
            const progress = Math.min(10, Math.floor((elapsedTime / convertToSeconds(songDurationFormatted) * 10)));
            const progressBar = '<:hmwhite:1350795538420727879>'.repeat(progress) + '⚪' + '➖'.repeat(10 - progress);
    
            const nowPlayingEmbed = new EmbedBuilder()
                .setTitle("Now Playing")
                .setDescription(`**${songInfo.title}**`)
                .setColor("#FF0000")
                .addFields(
                    { name: "Duration", value: songDurationFormatted },
                    { name: "Progress", value: progressBar }
                )
                if(debugMode === true) {
                    const user = await bot.users.fetch(AdminID)
                    user.send({embeds:[nowPlayingEmbed]})
                }
            await interaction.reply({ embeds: [nowPlayingEmbed] })
        } else {
            const embed = new EmbedBuilder()
                .setTitle("✖️ No music is currently playing.")
                .setColor("#000000")
            await interaction.reply({embeds: [embed]})
        }
    }
    
    
        
    
    if (interaction.commandName === 'quit' || interaction.commandName === 'stop') {
        if(debugMode === true) {
            const user = await bot.users.fetch(AdminID);
            user.send("Quit / Stop command used by " + interaction.user.username)
        }
        clearDownloads()
        // Stop the music and disconnect from the voice channel
        if (voiceClients[interaction.guild.id]) {
            const voiceClientInfo = voiceClients[interaction.guild.id];
    
            // Stop the music
            if (voiceClientInfo.player) {
                voiceClientInfo.player.stop();
            }
    
            // Disconnect from the voice channel
            await voiceClientInfo.client.disconnect();
    
            // Remove the client from the voiceClients object
            delete voiceClients[interaction.guild.id];
            const embed = new EmbedBuilder()
             .setTitle("✅ Music stopped")
             .setColor("#FF0000")
            await interaction.reply({ embeds: [embed] });
        } else {
            const embed = new EmbedBuilder()
                .setTitle("✖️ No music is playing or I'm not in a voice channel")
                .setColor("#000000")
            await interaction.reply({ embeds: [embed] });
        }
    }
   

    if (interaction.commandName === 'end') {
        if (interaction.user.id === AdminID) {
            if(debugMode === true) {
                const user = await bot.users.fetch(AdminID);
                user.send("Shutdown initiated by " + interaction.user.username)
            }
        const embed = new EmbedBuilder()
            .setTitle("Shutting down")
            .setColor("#FF0000")
            .setThumbnail("https://cdn.discordapp.com/attachments/1249420559423508540/1350433153637941369/loading.gif")
        await interaction.reply({ embeds: [embed], ephemeral: true });
        process.exit();
    }
        else if (interaction.user.id !== AdminID){
            if(debugMode === true) {
                const user = await bot.users.fetch(AdminID);
                user.send("Restart denied by " + interaction.user.username)
            }
            const embed = new EmbedBuilder()
            .setTitle('✖️ You are not authorized to use this command.')
            .setColor("#000000")
            interaction.reply({ embeds: [embed] })
        }
        else {
            if(debugMode === true) {
                const user = await bot.users.fetch(AdminID);
                user.send("Restart failed by " + interaction.user.username)
            }
            const embed = new EmbedBuilder()
            .setTitle('✖️ Something went wrong.')
            .setColor("#000000")
            interaction.reply({ embeds: [embed] })
        }
    }

    if (interaction.commandName === 'restart') {
        if (interaction.user.id === AdminID) {
            config.lastInteractionBeforeRestart = interaction.channel.id
            fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
            if(debugMode === true) {
                const user = await bot.users.fetch(AdminID);
                user.send("Restart initiated by " + interaction.user.username)
            }
            const embed = new EmbedBuilder()
            .setTitle("Restarting")
            .setThumbnail("https://cdn.discordapp.com/attachments/1249420559423508540/1350433153637941369/loading.gif")
            .setColor("#FF0000");
        await interaction.reply({ embeds: [embed], ephemeral: true });
        await restart();
        }
        else if (interaction.user.id !== AdminID) {
            if(debugMode === true) {
                const user = await bot.users.fetch(AdminID);
                user.send("Restart denied by " + interaction.user.username)
            }
            const embed = new EmbedBuilder()
            .setTitle('✖️ You are not authorized to use this command.')
            .setColor("#000000")
            interaction.reply({ embeds: [embed] })
        }
        else {
            if(debugMode === true) {
                const user = await bot.users.fetch(AdminID);
                user.send("Restart failed by " + interaction.user.username)
            }
            const embed = new EmbedBuilder()
            const errorid=Math.floor(100000 + Math.random() * 900000).toString()
            .setTitle('✖️ Something went wrong. ID: ' + errorid)
            .setColor("#000000")
            interaction.reply({ embeds: [embed] })
            console.log("Something went wrong. ID " + errorid)
        }
    }
    if (interaction.commandName === 'cocktail') {
        const drinkName = interaction.options.getString('cocktail');
        
        try {
            const response = await axios.get("https://www.thecocktaildb.com/api/json/v1/1/search.php?s=" + drinkName);
            const drink = response.data.drinks ? response.data.drinks[0] : null;
    
            if (!drink) {
                const embed = new EmbedBuilder()
                    .setTitle('✖️ No such drink found.')
                    .setColor("#000000");
                return interaction.reply({ embeds: [embed] });
            }
    
            let ingredients = [];
            for (let i = 1; i <= 15; i++) {
                const ingredient = drink[`strIngredient${i}`];
                if (ingredient) {
                    ingredients.push(ingredient);
                }
            }
    
            const embed = new EmbedBuilder()
                .setColor("#FF0000")
                .setTitle(drink.strDrink)
                .setImage(drink.strDrinkThumb || '')
                .addFields(
                    { name: "Category", value: "> " + drink.strCategory || '> N/A' },
                    { name: "Glass", value: "> " +drink.strGlass || '> N/A' },
                    { name: "Instructions", value: "> " +drink.strInstructions || '> No instructions available.' },
                    { name: "Alcoholic", value: "> " +drink.strAlcoholic || '> N/A' },
                    { name: "Ingredients", value: "> " + (ingredients.length > 0 ? ingredients.join(',\n> ') : '> No ingredients available.') }
                )
                .setFooter({ text: "Enjoy responsibly!" });
    
            await interaction.reply({ embeds: [embed] });
    
        } catch (error) {
            console.error("Error fetching cocktail data:", error);
            const embed = new EmbedBuilder()
                .setTitle('✖️ Something went wrong.')
                .setColor("#000000");
            await interaction.reply({ embeds: [embed] });
        }
    }

    if (interaction.commandName === "joke") {
        try {
            const response = await axios.get("https://official-joke-api.appspot.com/random_joke");
            const joke = response.data;
            
            const embed = new EmbedBuilder()
                .setTitle(joke.setup)
                .setDescription("> " + joke.punchline)
                .setFooter({ text: "Joke ID: " + joke.id })
                .setColor('#FF0000');
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.log(error);
        }
    }
    if (interaction.commandName === "pokedex") {
        const pokemonName = interaction.options.getString("pokemon").toLowerCase();
      
        fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`)
          .then(response => response.json())
          .then(data => {
            const name = data.name.charAt(0).toUpperCase() + data.name.slice(1);
            const image = data.sprites.front_default;
            const types = data.types.map(type => type.type.name).join(', ');
            const speciesUrl = data.species.url;
      
            fetch(speciesUrl)
              .then(response => response.json())
              .then(speciesData => {
                const generation = speciesData.generation.name;
                const description = speciesData.flavor_text_entries
                  .find(entry => entry.language.name === "en")?.flavor_text || "No description available.";
      
                const embed = new EmbedBuilder()
                  .setTitle(`${name}`)
                  .setImage(image)
                  .addFields(
                    { name: "Types", value: types, inline: true},
                    { name: "Generation", value: generation, inline: true }
                    )
                  .setDescription(description)
                  .setColor("#ee1515");
      
                interaction.reply({ embeds: [embed] });
              })
              .catch(err => {
                interaction.reply("Could not fetch species data.");
                console.error(err);
              });
          })
          .catch(err => {
            interaction.reply("Pokémon not found or there was an error.");
            console.error(err);
          });
    }
    if (interaction.commandName === "lyrics") {
        const artist = interaction.options.getString("artist")
        const track = interaction.options.getString("track")
        
        // Replace spaces in artist and track with %20
        const artistEncoded = encodeURIComponent(artist);
        const trackEncoded = encodeURIComponent(track);
        
        try {
            const response = await fetch(`https://api.lyrics.ovh/v1/${artistEncoded}/${trackEncoded}`);
            const data = await response.json();
    
            if (data.lyrics) {
                const formattedLyrics = data.lyrics.replace(/\n\n+/g, '\n');
                const embed = new EmbedBuilder()
                .setTitle("Lyrics for " + track)
                .setDescription(formattedLyrics)
                .setColor('#FF0000');
                await interaction.reply({embeds:[embed]});
            } else {
                await interaction.reply({
                    content: `Sorry, I couldn't find lyrics for **${track}** by **${artist}**.`,
                });
            }
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: "There was an error while fetching the lyrics. Please try again later.",
            });
        }
    }
    if (interaction.commandName === "birthday") {
        if (interaction.options.getString('day') && interaction.options.getString('month')) {
            const day = parseInt(interaction.options.getString('day'));
            const month = parseInt(interaction.options.getString('month'));
        
            // Check if the day and month are valid
            if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                const userId = interaction.user.id;
        
                // Save the birthday data
                birthdays[userId] = { day, month };
                fs.writeFileSync('./birthdays.json', JSON.stringify(birthdays, null, 2));
        
                // Create the embed
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('Birthday Registered')
                    .setDescription(`Your birthday has been registered as ${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}.`);
        
                interaction.reply({ embeds: [embed] });
            } else {
                interaction.reply('Invalid day or month. Please make sure the day is between 1 and 31, and the month is between 1 and 12.')
            }
        } else {
            const embed = new EmbedBuilder()
                .setColor('#000000')
                .setTitle('Invalid Format')
                .setDescription('Please use the correct format: `/birthday DD/MM`.');

           interaction.reply({ embeds: [embed] });
        }
    }
    if (interaction.commandName === "showbirthday") {
        const mentionedUser = interaction.options.getUser('user');
        const mentionedUserID = mentionedUser.id;
    
        if (mentionedUser) {
            // Check if the user's birthday exists in the birthdays data
            if (birthdaysFile[mentionedUserID]) {
                const { day, month } = birthdaysFile[mentionedUserID];
    
                // Create and send the embed with the birthday information
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle(`${mentionedUser.username}'s Birthday`)
                    .setDescription(`${mentionedUser.username}'s birthday is on ${day}/${month}.`);
    
                interaction.reply({ embeds: [embed] });
            } else {
                // Handle case when the user's birthday is not found
                const embed = new EmbedBuilder()
                    .setColor('#000000')
                    .setTitle('Birthday Not Found')
                    .setDescription(`${mentionedUser.username} has not registered their birthday.`);
    
                interaction.reply({ embeds: [embed] });
            }
        } else {
            // Handle missing user error (this shouldn't occur with proper interaction setup)
            const errorid = Math.floor(100000 + Math.random() * 900000).toString();
            console.log("An error has occurred while trying to register a birthday. ID: " + errorid);
            const embed = new EmbedBuilder()
                .setColor('#000000')
                .setTitle('✖️ An error has occurred')
                .setDescription('Please contact an administrator with the information below.')
                .setFooter("Error ID: " + errorid);
    
            interaction.reply({ embeds: [embed] });
        }
    }
    if (interaction.commandName === 'ticket'){
        if (interaction.channel.name.startsWith('ticket-') || interaction.channel.name.startsWith('resolved-')){
            const embed = new EmbedBuilder()
            .setTitle('You cannot create a ticket inside of a ticket channel.')
            .setColor('#000000');
            return interaction.reply({ embeds: [embed] });
        }
        //support category 1303352626200711231
        const guild = bot.guilds.cache.get(config.GuildID)
        const categoryId = config.SupportCategory
        const supportId = config.SupportID
        try{
            config.ticketNumber ++
            const embed = new EmbedBuilder()
            .setTitle("Created #ticket-" + config.ticketNumber )
            .setColor('#FF0000')
            interaction.reply({embeds: [embed], ephemeral: true})
            fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
            let priority = "0"
            const channel = await guild.channels.create({
                name: `ticket-${priority}-${config.ticketNumber}`,
                type: 0,
                parent: categoryId,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel],
                    },
                    {
                        id: supportId,
                        allow: [
                            PermissionFlagsBits.ViewChannel, // View the channel
                            PermissionFlagsBits.SendMessages, // Send messages
                            PermissionFlagsBits.ReadMessageHistory, // View message history
                            PermissionFlagsBits.AttachFiles, // Attach files
                            PermissionFlagsBits.MentionEveryone, // Mention @everyone
                            PermissionFlagsBits.AddReactions, // Add reactions
                        ],
                    },
                    {
                        id: interaction.user.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel, // View the channel
                            PermissionFlagsBits.SendMessages, // Send messages
                            PermissionFlagsBits.ReadMessageHistory, // View message history
                            PermissionFlagsBits.AttachFiles, // Attach files
                            PermissionFlagsBits.MentionEveryone, // Mention @everyone
                            PermissionFlagsBits.AddReactions, // Add reactions
                        ],
                    }
                ]

            })
            const embed2 = new EmbedBuilder()
            .setTitle("Ticket opened by " + interaction.user.tag )
            .setColor('#FF0000')
            .setDescription("Support will be here to assist you. Please state what's bothering you, \nand we'll do our best to fix it.")
            await channel.send("@everyone")
            await channel.send({embeds: [embed2]})
        } catch (error){
            if (debugMode){
                AdminID.send("An error occurred while trying to create a ticket. " + error)
            }
            console.log(error)
        }
    }
    if (interaction.commandName === "close") {
        const guild = await bot.guilds.fetch(config.GuildID);
            const ticketchannel = guild.channels.cache.filter(
                (channel) => channel.type === 'GUILD_TEXT' && channel.name.startsWith("ticket-")
            );
        if (!interaction.channel.name.startsWith('ticket-') && !interaction.channel.name.startsWith('resolved-')){
            const embed = new EmbedBuilder()
            .setTitle('✖️ You cannot run this command outside of tickets.')
            .setColor('#000000')
            interaction.reply({embeds: [embed]})
        }
        else if (interaction.user.id === config.AdminID){
            const embed = new EmbedBuilder()
            .setTitle('Closing ticket...')
            .setColor('#FF0000')
            interaction.reply({embeds: [embed]})
            const channel = interaction.channel
            setTimeout(() => {
                channel.delete()
              }, 3000)
        }
        else{
            const embed = new EmbedBuilder()
            .setTitle('✖️ You are not authorized to run this command.')
            .setColor('#000000')
            interaction.reply({embeds: [embed]})
        }
    }
    if (interaction.commandName === "priority") {
        if (interaction.channel.name.startsWith('ticket-') || interaction.channel.name.startsWith('resolved-')) {
            const priorityArgument = interaction.options.getInteger('priority');
            
            if (priorityArgument < 1 || priorityArgument > 5) {
                const embed = new EmbedBuilder()
                    .setTitle('Priority can only be 1-5.')
                    .setColor('#000000');
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
    
            if (interaction.user.id === config.AdminID) {
                const ticketChannel = await interaction.guild.channels.fetch(interaction.channel.id);
                let ticketName = interaction.channel.name;
                let newTicketName = ticketName.replace(/-\d+-/, `-${priorityArgument}-`);
                
                await ticketChannel.setName(newTicketName);
                const embed = new EmbedBuilder()
                    .setTitle('Priority changed to ' + priorityArgument)
                    .setColor('#FF0000');
                return interaction.reply({ embeds: [embed] });
            }
    
            const embed = new EmbedBuilder()
                .setTitle('✖️ You are not authorized to use this command.')
                .setColor('#000000');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
            const embed = new EmbedBuilder()
                .setTitle('✖️ You cannot run this command outside of tickets.')
                .setColor('#000000');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
    
    if (interaction.commandName === 'resolved') {
        if (interaction.channel.name.startsWith('ticket-')) { 
            if (interaction.user.id === config.AdminID) { 
                const channel = await interaction.guild.channels.fetch(interaction.channel.id);
                const resolvedChannel = interaction.channel.name.replace("ticket-", "resolved-");
    
                channel.setName(resolvedChannel);
    
                const embed = new EmbedBuilder()
                    .setTitle('Ticket marked as resolved.') 
                    .setColor('#FF0000');
    
                interaction.reply({ embeds: [embed] }); 
            } else { 
                const embed = new EmbedBuilder()
                    .setTitle('✖️ You are not authorized to use this command.')
                    .setColor('#000000');
    
                await interaction.reply({ embeds: [embed], ephemeral: true }); 
            }
        }
    }
    if (interaction.commandName === "help") {
        const embed = new EmbedBuilder()
        .setTitle('Click the button below to open a ticket.')
        .setColor('#FF0000')
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
            .setCustomId('openTicket')
            .setLabel('Open a Ticket')
            .setStyle(ButtonStyle.Primary)
        )
        await interaction.reply({embeds: [embed], components: [row]})
    }
    if (interaction.commandName === 'transcript') {
        if (interaction.user.id === AdminID){
        const ticketID = interaction.options.getInteger('ticketid')
        const ticketPattern = `ticket-\\d+-${ticketID}`
        console.log(`Filtering logs for ticket pattern: ${ticketPattern}`)
    
        const logFilePath = './logs.txt';
        const transcriptDir = './transcripts'
    
        if (!fs.existsSync(transcriptDir)) {
            fs.mkdirSync(transcriptDir)
        }
    
        try {
            const logs = fs.readFileSync(logFilePath, 'utf-8').split('\n')
    
            const regex = new RegExp(`ticket-\\d+-${ticketID}`)
    
            const filteredLogs = logs.filter(log => regex.test(log.trim()))
    
            if (filteredLogs.length === 0) {
                return interaction.reply({ content: 'No messages found for this ticket.', ephemeral: true })
            }
    
            const transcriptFilePath = `${transcriptDir}/transcript-${ticketID}.txt`
            fs.writeFileSync(transcriptFilePath, filteredLogs.join('\n'))
    
            await interaction.reply({
                content: `Here is the transcript for ticket ${ticketID}:`,
                files: [transcriptFilePath]
            });
    
        } catch (error) {
            console.error(error);
            return interaction.reply({ content: 'There was an error processing the transcript.', ephemeral: true })
        }
    }else{
        interaction.reply('You are not authorized to use this command.')
    }}
    if (interaction.commandName === 'suggest'){
        const suggestion = interaction.options.getString('suggestion')
        const suggestionChannelId = config.suggestionChannel
        const suggestionChannel = bot.channels.cache.get(suggestionChannelId) 
        config.suggestionNumber ++
        const embed = new EmbedBuilder()
        .setTitle('Suggestion ' + config.suggestionNumber)
        .setColor('#FF0000')
        .setDescription(suggestion)
        const sentMessage = await suggestionChannel.send({embeds: [embed]})
        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
        await sentMessage.react('⬆️')
        await sentMessage.react('❔')
        await sentMessage.react('⬇️')
        const interactionembed = new EmbedBuilder()
        .setTitle('Suggestion submitted as Suggestion '+ config.suggestionNumber)
        .setColor('#FF0000');
        interaction.reply({embeds: [interactionembed]})
        if (debugMode){
            const admin = bot.users.cache.get(AdminID)
            admin.send({embeds: [embed]})
        }

    }
});

bot.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return

    if (interaction.customId === "openTicket") {
            if (interaction.channel.name.startsWith('ticket-') || interaction.channel.name.startsWith('resolved-')){
                const embed = new EmbedBuilder()
                .setTitle('You cannot create a ticket inside of a ticket channel.')
                .setColor('#000000');
                return interaction.reply({ embeds: [embed] })
            }
            //support category 1303352626200711231
            const guild = bot.guilds.cache.get(config.GuildID)
            const categoryId = config.SupportCategory
            const supportId = config.SupportID
            try{
                config.ticketNumber ++
                const embed = new EmbedBuilder()
                .setTitle("Created #ticket-" + config.ticketNumber )
                .setColor('#FF0000')
                interaction.reply({embeds: [embed], ephemeral: true})
                fs.writeFileSync('./config.json', JSON.stringify(config, null, 2))
                let priority = "0"
                const channel = await guild.channels.create({
                    name: `ticket-${priority}-${config.ticketNumber}`,
                    type: 0,
                    parent: categoryId,
                    permissionOverwrites: [
                        {
                            id: guild.roles.everyone.id,
                            deny: [PermissionFlagsBits.ViewChannel],
                        },
                        {
                            id: supportId,
                            allow: [
                                PermissionFlagsBits.ViewChannel, // View the channel
                                PermissionFlagsBits.SendMessages, // Send messages
                                PermissionFlagsBits.ReadMessageHistory, // View message history
                                PermissionFlagsBits.AttachFiles, // Attach files
                                PermissionFlagsBits.MentionEveryone, // Mention @everyone
                                PermissionFlagsBits.AddReactions, // Add reactions
                            ],
                        },
                        {
                            id: interaction.user.id,
                            allow: [
                                PermissionFlagsBits.ViewChannel, // View the channel
                                PermissionFlagsBits.SendMessages, // Send messages
                                PermissionFlagsBits.ReadMessageHistory, // View message history
                                PermissionFlagsBits.AttachFiles, // Attach files
                                PermissionFlagsBits.MentionEveryone, // Mention @everyone
                                PermissionFlagsBits.AddReactions, // Add reactions
                            ],
                        }
                    ]
    
                })
                const embed2 = new EmbedBuilder()
                .setTitle("Ticket opened by " + interaction.user.tag )
                .setColor('#FF0000')
                .setDescription("Support will be here to assist you. Please state what's bothering you, \nand we'll do our best to fix it.")
                await channel.send("@everyone")
                await channel.send({embeds: [embed2]})
                if (debugMode) {
                    AdminID.send({embeds: [embed2]})
                }
            } catch (error){
                if (debugMode){
                    AdminID.send("An error occurred while trying to create a ticket. " + error)
                }
                console.log(error)
            }
        }
    }
);
async function sendRestartedMessage() {
    const lastinteractionchannelid = config.lastInteractionBeforeRestart.toString()
    const lastinteractionchannel = bot.channels.cache.get(lastinteractionchannelid);
    if (lastinteractionchannel) {
      const embed = new EmbedBuilder()
        .setTitle('Restarted Successfully')
        .setColor('#FF0000');
      await lastinteractionchannel.send({ embeds: [embed] });
      if(debugMode === true) {
        const user = await bot.users.fetch(AdminID);
        user.send({embeds: [embed]})
    }
    }
    else if(!lastinteractionchannel){console.log("No 'last interaction' channel found")}
  }
  
  function checkForRestartArgument() {
    const args = process.argv.slice(2);
    if (args.includes('-r')) {
      console.log("Restart argument detected, sending restart message.");
      if(debugMode === true) {
        bot.users.fetch(config.AdminID)
                 .then(user => user.send("Restart argument detected, sending restart message."))
    }
      sendRestartedMessage();
    } else {
        if(debugMode === true) {
            bot.users.fetch(config.AdminID)
                 .then(user => user.send("No restart argument detected, skipping."))
        }
      console.log("No restart argument detected, skipping.");
    }
  }
  
  bot.on('ready', async () => {

    console.log(`Logged in as ${bot.user.tag}`);
    await bot.guilds.fetch();
    setInterval(await checkBirthdays, 24 * 60 * 60 * 1000);
    checkForRestartArgument();
    await checkBirthdays();

    const folderPath = path.join(__dirname, 'downloads');

fs.readdir(folderPath, (err, files) => {
    if (err) return;

    files.forEach(file => {
        const filePath = path.join(folderPath, file);
        fs.rm(filePath, { recursive: true, force: true }, err => {
            if (err) console.error(`Error deleting ${filePath}:`, err);
        });
    });
});
  });

  function APOD(){
    const apodChannel = bot.channels.fetch(config.apodChannelID);

    axios.get('https://api.nasa.gov/planetary/apod?api_key=xOHNufVgAhotffHGPnW8XWe80QJN5Dny9PYSfmwl')
          .then(response => {
            const imageUrl = response.data.url
            const description = response.data.explanation
            const embed = new EmbedBuilder()
             .setTitle(response.data.title)
             .setColor('#FF0000')
             .setDescription(description)
             .setImage(imageUrl)
             apodChannel.send({embeds: [embed]})
          .catch(error => {
            console.error('Error fetching APOD:', error);
          })
      }
      
          )
  }

  async function checkBirthdays() {
    const today = new Date()
    const day = today.getDate()
    const month = today.getMonth() + 1

    for (const userId in birthdays) {
        const birthday = birthdays[userId]
        if (birthday.day === day && birthday.month === month) {
            let user = bot.users.cache.get(userId)
            if (!user) {
                try {
                    user = await bot.users.fetch(userId)
                } catch (err) {
                    console.log(`Failed to fetch user ${userId}:`, err)
                    continue;
                }
            }

            if (user) {
                const embed = new EmbedBuilder()
                    .setColor('#FFFFFF')
                    .setTitle('Happy Birthday!')
                    .setDescription(`🎉🎂 Happy Birthday, ${user.username}! 🎂🎉\nWe hope you have a fantastic day!`)

                const channel = bot.channels.cache.get(config.BirthdayChannel)
                if (channel) {
                    channel.send({ embeds: [embed] })
                } else {
                    console.log("No birthdays channel found")
                }
            }
        }
    }
}


bot.on('messageUpdate', (oldMessage, newMessage) => {
    if (oldMessage.author.bot) return;

    const currentDateTime = new Date();
    const day = String(currentDateTime.getDate()).padStart(2, '0');
    const month = String(currentDateTime.getMonth() + 1).padStart(2, '0');
    const year = currentDateTime.getFullYear();
    const hours = String(currentDateTime.getHours()).padStart(2, '0');
    const minutes = String(currentDateTime.getMinutes()).padStart(2, '0');
    const seconds = String(currentDateTime.getSeconds()).padStart(2, '0');

    const logMessage = `[${day}/${month}/${year}, ${hours}:${minutes}:${seconds}] "${newMessage.author.tag} (${newMessage.author.id}) edited a message in ${newMessage.channel.name} (${newMessage.channel.id}):\n  Original: "${oldMessage.content}"\n  Edited: "${newMessage.content}"\n\n`;

    fs.appendFile('logs.txt', logMessage, (err) => {
        if (err) {
            console.error('Failed to write edited message to log file:', err);
        }
    });
});

bot.on('messageCreate', (message) => {
    if (message.author.bot) return;

    const currentDateTime = new Date();
    const day = String(currentDateTime.getDate()).padStart(2, '0');
    const month = String(currentDateTime.getMonth() + 1).padStart(2, '0');
    const year = currentDateTime.getFullYear();
    const hours = String(currentDateTime.getHours()).padStart(2, '0');
    const minutes = String(currentDateTime.getMinutes()).padStart(2, '0');
    const seconds = String(currentDateTime.getSeconds()).padStart(2, '0');

    const logMessage = `[${day}/${month}/${year}, ${hours}:${minutes}:${seconds}] "${message.author.tag} (${message.author.id}) in ${message.channel.name} (${message.channel.id}): ${message.content}"\n`;

    fs.appendFile('logs.txt', logMessage, (err) => {
        if (err) {
            console.error('Failed to write message to log file:', err);
        }
    });
});
  function scheduleDailyFunction() {
    const now = new Date()
    const targetTime = new Date()
  
    targetTime.setHours(10, 0, 0, 0)
  
    let delay = targetTime.getTime() - now.getTime()

    if (delay <= 0) {
      targetTime.setDate(targetTime.getDate() + 1)
      delay = targetTime.getTime() - now.getTime()
    }
  
    setTimeout(() => {
      APOD();
      setInterval(DailyFunction, 24 * 60 * 60 * 1000)
    }, delay);
  }


scheduleDailyFunction()
clearDownloads();
bot.login(config.token)
