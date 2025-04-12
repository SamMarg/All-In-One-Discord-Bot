const { Client, GatewayIntentBits, EmbedBuilder, REST, SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, Partials } = require('discord.js');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const process = require('process');
const ps = require('ps-node');
const { spawn } = require('child_process');
const ytSearch = require('yt-search');
const { AudioPlayer, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const { joinVoiceChannel } = require('@discordjs/voice');
const axios = require('axios')

const ytDlpPath = path.join(__dirname, 'assets', 'yt-dlp.exe');

const config = require('./config.json')
const birthdaysFile = require('./birthdays.json');
const { debug } = require('console');

const tickets = new Map();

let birthdays = {};
let priority = ""

let currentPlayer = null;
let currentSong = null;

if (fs.existsSync(birthdaysFile)) { 
    birthdays = JSON.parse(fs.readFileSync(birthdaysFile));
}

const bot = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages], partials: [Partials.GuildMember]
});

let debugMode=config.debugMode

let prefix = config.prefix

const AdminID = config.AdminID
const SupportID = config.supportID

bot.on('ready', async () => {
    await bot.guilds.cache.forEach(async (guild) => {
      const commands = [
         new SlashCommandBuilder()
         .setName('end')
         .setDescription('Shuts down the bot'),
         new SlashCommandBuilder()
         .setName('restart')
         .setDescription('Restarts the bot'),
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
         .setDescription('Creates a support ticket'),
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
         .setName('support')
         .setDescription('Open a support ticket.'),
         new SlashCommandBuilder()
         .setName('transcript')
         .addIntegerOption(option => option.setName('ticketid').setDescription('The ID of the ticket').setRequired(true))
         .setDescription('Fetch a transcript of a specified ticket.'),
         new SlashCommandBuilder()
         .setName('suggest')
         .addStringOption(option => option.setName('suggestion').setDescription('What you want to suggest').setRequired(true))
         .setDescription('Suggest something new'),
         new SlashCommandBuilder()
         .setName('help')
         .setDescription("See the bot's commands")
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

function restart() {
    // Run restart.js
    exec('node restart.js', (err, stdout, stderr) => {
        if (err) {
            console.error(`Error executing restart: ${err}`);
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });

    // Wait 2 seconds before exiting
    setTimeout(() => {
        process.exit();
    }, 2000);  // 2-second delay before exiting
}
bot.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;       

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
    /*
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
    */
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
    if (interaction.commandName === "support") {
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
    if (interaction.commandName === "help"){
        await interaction.deferReply()
        const commandsList = `
        **Application Commands**
        > _**/help** **->** Shows this message_
        > _**/suggest** <suggestion> **->** Suggest a feature_
        > _**/cocktail** <cocktail> **->** Fetch information about a cocktail_
        > _**/pokedex** <pokemon> **->** Fetch information about a pokemon_
        > _**/support** **->** Opens a support ticket_
        > _**/joke** **->** Tells a random joke_
        > _**/birthday** <DD/MM> **->** Register your Birthday_
        > _**/showbirthday** <user> **->** See a user's birthday_

        **Moderation Commands**
        > _**/close** **->** Closes the current ticket_
        > _**/priority** <priority> **->** Changes the priority of a ticket (1-5)_
        > _**/resolved** **->** Marks a ticket as resolved_
        > _**/transcript** <ticketid> **->** Generates a transcript for a specific ticket_

        **Admin Commands**
        > _**/end** **->** Stops the bot completely_
        > _**/restart** **->** Restarts the bot_
        > _**/debug** <true/false> **->** Enables or disables debug mode_

        **Music Commands**
        > _**${config.prefix}play** <query> **->** Plays a song_
        > _**${config.prefix}pause** **->** Pauses the current song_
        > _**${config.prefix}resume** **->** Resumes the current song_
        > _**${config.prefix}stop** **->** Stops music playback_
        > _**${config.prefix}nowplaying** **->** Shows the currently playing song_
        > _**${config.prefix}np** **->** Alias for **nowplaying**_
        `
        const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setAuthor({ name: 'RubyRealms Commands', iconURL: 'https://cdn.discordapp.com/attachments/1303344480224805015/1353055828466335786/ruby.webp?ex=67e042f0&is=67def170&hm=92c90d87a4c55f04879c8e4b83bdf9baa5edb322d771d590085ec4ef182e3672&'})
        .setDescription(commandsList)
        await interaction.editReply({embeds: [embed]})
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

let queue = []; // Queue to store songs
let isLoopingOne = false; // Whether we are looping the current song
let isLoopingAll = false; // Whether we are looping the entire queue

bot.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const args = message.content.split(' ');
    const command = args[0].toLowerCase();
    const query = args.slice(1).join(' ');

    if (command === config.prefix + 'play' || command === config.prefix + 'p') {
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
                .setColor('#000000');
            return message.channel.send({ embeds: [embed] });
        }

        const results = await ytSearch(query);
        if (results.videos.length === 0) {
            const embed = new EmbedBuilder()
                .setColor('#000000')
                .setTitle('✖️ No results found for your search query.');
            return message.channel.send({ embeds: [embed] });
        }

        const video = results.videos[0];
        console.log(video); //debug duration
        queue.push(video); // Add the song to the queue

        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle(`Added ${video.title} to the queue.`)
            .setURL(video.url || "");
        message.channel.send({ embeds: [embed] });

        if (queue.length === 1) { // Only play the first song if the queue was empty
            const stream = spawn(ytDlpPath, ['-f', 'bestaudio', '-o', '-',( video.url || "")]);

            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });

            currentPlayer = createAudioPlayer();
            const resource = createAudioResource(stream.stdout);

            currentPlayer.play(resource);
            connection.subscribe(currentPlayer);

            const playingEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle(`Now Playing: ${video.title}`)
                .setURL(video.url || "")
                .addFields(
                    { name: 'Uploader', value: video.author.name, inline: true },
                    { name: 'Duration', value: formatDuration(video.duration), inline: true }
                );
            message.channel.send({ embeds: [playingEmbed] });

            currentPlayer.on(AudioPlayerStatus.Idle, () => {
                if (isLoopingOne) {
                    queue.push(queue[0]); // Loop the current song
                    playNextSong(connection);
                } else if (isLoopingAll) {
                    queue.push(queue.shift()); // Loop the entire queue
                    playNextSong(connection);
                } else {
                    queue.shift(); // Remove the song from the queue
                    playNextSong(connection);
                }
            });
        }

    } else if (command === config.prefix + 'skip') {
        if (queue.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('✖️ No songs in the queue.')
                .setColor('#000000');
            return message.channel.send({ embeds: [embed] });
        }

        const skippedSong = queue[0];
        currentPlayer.stop(); // Stop current song

        const skipEmbed = new EmbedBuilder()
            .setTitle(`Skipped: ${skippedSong.title}`)
            .setColor('#ff0000')
            .setURL(skippedSong.url || "");
        message.channel.send({ embeds: [skipEmbed] });

        // After skipping, now play the next song in the queue
        queue.shift(); // Remove the skipped song from the queue
        if (queue.length > 0) {
            playNextSongAfterSkip(message);
        } else {
            const embed = new EmbedBuilder()
                .setTitle('✖️ No more songs in the queue.')
                .setColor('#000000');
            message.channel.send({ embeds: [embed] });
        }
    } else if (command === config.prefix + 'clearqueue') {
        queue = []; // Clear the queue
        const embed = new EmbedBuilder()
            .setTitle('Queue has been cleared.')
            .setColor('#ff0000');
        return message.channel.send({ embeds: [embed] });
    } else if (command === config.prefix + 'loopone') {
        isLoopingOne = !isLoopingOne;
        isLoopingAll = false; // Disable loop all if loop one is enabled
        const embed = new EmbedBuilder()
            .setTitle(isLoopingOne ? 'Looping the current song.' : 'Loop one disabled.')
            .setColor('#ff0000');
        message.channel.send({ embeds: [embed] });
    } else if (command === config.prefix + 'loopall') {
        isLoopingAll = !isLoopingAll;
        isLoopingOne = false; // Disable loop one if loop all is enabled
        const embed = new EmbedBuilder()
            .setTitle(isLoopingAll ? 'Looping the entire queue.' : 'Loop all disabled.')
            .setColor('#ff0000');
        message.channel.send({ embeds: [embed] });
    } else if (command === config.prefix + 'queue') {
        if (queue.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('✖️ The queue is empty.')
                .setColor('#000000');
            return message.channel.send({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
            .setTitle('Current Queue')
            .setColor('#ff0000')
            .setDescription(queue.map((song, index) => `${index + 1}. ${song.title}`).join('\n'));
        message.channel.send({ embeds: [embed] });
    } else if (command === config.prefix + 'pause') {
        if (!currentPlayer || currentPlayer.state.status !== AudioPlayerStatus.Playing) {
            const embed = new EmbedBuilder()
                .setColor('#000000')
                .setTitle('✖️ No music is currently playing.');
            return message.channel.send({ embeds: [embed] });
        }

        currentPlayer.pause();
        const embed = new EmbedBuilder()
            .setTitle('Music Paused')
            .setColor('#ff0000');
        message.channel.send({ embeds: [embed] });

    } else if (command === config.prefix + 'resume') {
        if (!currentPlayer || currentPlayer.state.status !== AudioPlayerStatus.Paused) {
            const embed = new EmbedBuilder()
                .setColor('#000000')
                .setDescription('✖️ Music is not paused.');
            return message.channel.send({ embeds: [embed] });
        }

        currentPlayer.unpause();
        const embed = new EmbedBuilder()
            .setTitle('Music Resumed')
            .setColor('#ff0000');
        message.channel.send({ embeds: [embed] });

    } else if (command === config.prefix + 'stop') {
        if (!currentPlayer || currentPlayer.state.status === AudioPlayerStatus.Idle) {
            const embed = new EmbedBuilder()
                .setTitle('✖️ No music is currently playing.')
                .setColor('#000000');
            return message.channel.send({ embeds: [embed] });
        }
    
        currentPlayer.stop();
        currentSong = null;
        isLoopingOne = false;  // Clear loopone state
        isLoopingAll = false;  // Clear loopall state
        const embed = new EmbedBuilder()
            .setTitle('Music Stopped')
            .setColor('#ff0000');
        message.channel.send({ embeds: [embed] });
    } else if (command === config.prefix + 'nowplaying' || command === config.prefix + 'np') {
        if (!currentSong) {
            const embed = new EmbedBuilder()
                .setTitle('✖️ No music is currently playing.')
                .setColor('#000000');
            return message.channel.send({ embeds: [embed] });
        }

        const progressBar = getProgressBar();
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle(currentSong.title)
            .setDescription(progressBar)
            .setURL(currentSong.url || "")
            .addFields(
                { name: 'Uploader', value: currentSong.author.name, inline: true },
                { name: 'Duration', value: formatDuration(currentSong.duration), inline: true }
            );
        message.channel.send({ embeds: [embed] });
    }
});

function playNextSong(connection) {
    if (queue.length === 0) {
        connection.destroy();
        currentPlayer = null;
        currentSong = null;
        return;
    }
    const nextSong = queue[0];
    const stream = spawn(ytDlpPath, ['-f', 'bestaudio', '-o', '-', (nextSong.url || "")]);
    const resource = createAudioResource(stream.stdout);
    currentPlayer.play(resource);
    connection.subscribe(currentPlayer);
    currentSong = nextSong;
}

function playNextSongAfterSkip(message) {
    const nextSong = queue[0];
    const stream = spawn(ytDlpPath, ['-f', 'bestaudio', '-o', '-', (nextSong.url || "")]);
    const resource = createAudioResource(stream.stdout);

    const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle(`Now Playing: ${nextSong.title}`)
        .setURL(nextSong.url || "")
        .addFields(
            { name: 'Uploader', value: nextSong.author.name, inline: true },
            { name: 'Duration', value: formatDuration(nextSong.duration), inline: true }
        );

    message.channel.send({ embeds: [embed] });

    currentPlayer.play(resource);
    currentSong = nextSong;
}



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
        const timePassed = currentPlayer.state.resource.playbackDuration;
        const songDuration = (currentSong.duration?.seconds) * 1000;
    
        if (songDuration === 0) {
            return 'NaN';
        }
    
        const progress = Math.round((timePassed / songDuration) * 10);
        let progressBar = '➖➖➖➖➖➖➖➖➖➖';

        const clampedProgress = Math.max(0, Math.min(progress, 10));
        
        progressBar = progressBar.slice(0, clampedProgress) + '⚪' + progressBar.slice(clampedProgress + 1);
        
        return progressBar;
    }
    
  
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
    config.lastInteractionBeforeRestart = ""
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
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
    console.log('///////////')
    console.log('v0.1-BETA')
    console.log('///////////')
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
bot.login(config.token)
