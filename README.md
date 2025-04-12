# All-In-One-Discord-Bot
 A discord bot with a bit of everything:
    * Music
    * Tickets
    * Suggestions
    * Birthdays
    * Welcome messages
    * And so much more!

## Setting up
 To set up the bot, you will need to have created a discord bot. You can do that in the [discord developer portal](https://discord.com/developers/applications). After you create a bot, you need to do some things:
    * Navigate to the bot you just created from [this](https://discord.com/developers/applications) page.
    * From there, look for the "Bot" option on the left navigation menu and click on it
    * Then, scroll down to `Privileged Gateway Intents` and enable all three options, as shown below 
 
![image](https://github.com/user-attachments/assets/28392327-821b-41b1-a2c0-440b2f8d09d0)

 * After doing that, scroll up until you see a "Reset Token" button, then click on it, and copy the token you are provided with. _Do not share this token to ANYONE. If anyone gets this token, they can do ANYTHING they want with your bot, including and not limited to nuking your server, spamming messages in your server/DMs etc_. 
## Configuring the server
To use this bot, your Discord Server must have:
   
   * An admin (Most likely you. This person can do anything to the bot)
   * An APOD channel (APOD stands for Astronomy Picture Of the Day; this is where the bot will send a picture every day)
   * A support role (This role will have access to all tickets)
   * A support category (This category is where all tickets will be created) 
   * A birthdays channel (This is where the bot will send "Happy Birthday" messages)
   * A transcript channel (This is where the bot will send transcripts of all closed tickets.)
   * A suggestion channel (This is where the bot will send suggestions)
   * A welcome channel (This is where the bot will send "Welcome" messages)
After creating these, you're good to proceed to the next stage.
## Configuring the bot
   * Download [this](https://github.com/SamMarg/All-In-One-Discord-Bot/archive/refs/heads/main.zip) zip and extract it to a folder.
   * Then, go to the folder where you extracted the zip you downloaded. Look for a `config.json` file, and open it with your IDE of choice (You _can_ edit it with Notepad, but if you're not careful, you can mess up the syntax and make it unreadable by the bot.)
   * Fill out the required fields:
      * "token" -> This is the token you copied earlier when you created your bot. Simply paste it in.
      * "prefix" -> The prefix for many commands of the bot. Default is "!!", but you can set this to anything you like.
      * "debugMode" -> This isn't your casual debug mode. It will DM you messages about what happens with commands. In most scenarios you don't need this. Set it to `false`.
      * (string) "AdminID" -> This is the admin's (your) user ID. Simply paste it in.
      * (string) "apodChannelID" -> This is the APOD channel's ID. Simply paste it in.
      * (boolean) "lastInteractionBeforeRestart": **Do not touch this**. Leave it blank.
      * (string) "SupportID" -> This is the support role's ID. Simply paste it in.
      * (string) "GuildID" -> This is the guild (server)'s ID where you wish to use the bot. Simply paste it in.
      * (string) "SupportCategory" -> This is the support category's ID. Simply paste it in.
      * (integer) "ticketNumber" -> **Do not touch this**. Leave it as is (default is 0)
      * (string) "BirthdayChannel" -> This is the Birthday channel's ID. Simply paste it in.
      * (string) "TranscriptChannel" -> This is the transcripts' channel ID. Simply paste it in.
      * (string) "suggestionChannel" -> This is the suggestions' channel ID. Simply paste it in.
      * (integer) "suggestionNumber" -> **Do not touch this.** Leave it as is (default is 0)
      * (string) "joinChannelID" -> This is the welcome channel's ID. Simply paste it in.

         **Attention:** 
           * (string) -> `"000000000000000"`, `"hello"`
           * (boolean) -> Can only be `true` or `false`. `"true"` is a string, while `true` is a boolean.
           * (integer) -> `0000000000000`, `1986872`, `1234`. This differs from a number, since numbers also include decimals (`1.323`, `π`), while integers cannot. `"1234"` is a string, while `1234` is an integer.

         **Example:**
```
"token": "abc123def456",
"debugMode": false,
"ticketNumber": 1
 ``` 

## Running the bot
To run the bot, you need [NodeJS](https://nodejs.org/en/download) installed.
   * Navigate to the folder where you extracted your zip.
   * On the top navigation bar, type "cmd" and press enter, as shown below
      ![image](https://github.com/user-attachments/assets/4254ba9e-5c83-42b3-b649-c3d53bd73fd3)
   * In the newly opened CMD window, type `npm i discord.js @discord.js/voice axios yt-search` and press enter
   * After it's finished, type `node main.js` and press enter
   * You should see some startup messages
## Info
   * This code is nowhere near a professional solution. Use it with that in mind. Feedback and reporting bugs are appreciated, though :)
   * It might take a hot second for the slash commands to sync to discord. Give it up to a minute.
   * When the commands have synced, run `/help` in the discord server to see everything the bot can do.
   * The default color for embeds is red. The default color for error embeds is black.

And with that, you're done! 
