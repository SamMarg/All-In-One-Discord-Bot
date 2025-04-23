
# All-In-One-Discord-Bot
A versatile Discord bot with a bit of everything!  
Includes music, tickets, suggestions, birthdays, welcome messages, and much more!

## Setting up

To set up the bot, you first need to create a Discord bot. You can do that in the [Discord Developer Portal](https://discord.com/developers/applications). Once your bot is created, follow these steps:

1. Navigate to the bot you just created on [this page](https://discord.com/developers/applications).
2. In the left navigation menu, click on "Bot".
3. Scroll down to `Privileged Gateway Intents` and enable all three options, as shown below:

   ![image](https://github.com/user-attachments/assets/28392327-821b-41b1-a2c0-440b2f8d09d0)

4. After enabling the intents, scroll up to the "Reset Token" button. Click it and copy the token provided.  
   **Important:** Do **not** share this token with anyone. If someone gains access to it, they can take full control of your bot, including actions like server nuking, spamming messages, etc.

## Configuring the Server

For the bot to work properly, your Discord server must include the following:

- **An admin** (typically you) who can manage the bot.
- **An APOD channel** (Astronomy Picture of the Day) where the bot will send daily pictures.
- **A support role** that has access to all tickets.
- **A support category** where all tickets will be created.
- **A birthdays channel** for the bot to send birthday messages.
- **A transcript channel** where the bot will send ticket transcripts.
- **A suggestion channel** where the bot will post suggestions.
- **A welcome channel** where the bot will send welcome messages.

Once these channels and roles are set up, you're ready to proceed to the next stage.

## Configuring the Bot

1. Download the [bot zip file](https://github.com/SamMarg/All-In-One-Discord-Bot/archive/refs/heads/main.zip) and extract it to a folder.
2. In the extracted folder, locate the `config.json` file and open it with your preferred IDE.  
   *While you can edit it with Notepad, it’s easier to avoid syntax issues with an IDE.*
3. Fill out the required fields in `config.json`:

   - (string) `"token"`: Paste the bot token you copied earlier.
   - (string) `"prefix"`: The prefix for bot commands. Default is `!!`, but you can change it.
   - (boolean) `"debugMode"`: Set to `false` unless you need to receive DM updates about commands.
   - (string) `"AdminID"`: Paste your Discord user ID.
   - (string) `"apodChannelID"`: Paste the APOD channel’s ID.
   - (string) `"lastInteractionBeforeRestart"`: **Do not modify**. Leave it blank.
   - (string) `"SupportID"`: Paste the support role’s ID.
   - (string) `"GuildID"`: Paste the server’s ID.
   - (string) `"SupportCategory"`: Paste the support category’s ID.
   - (integer) `"ticketNumber"`: **Do not modify**. Leave it as `0`.
   - (string) `"BirthdayChannel"`: Paste the birthday channel’s ID.
   - (string) `"TranscriptChannel"`: Paste the transcript channel’s ID.
   - (string) `"suggestionChannel"`: Paste the suggestion channel’s ID.
   - (integer) `"suggestionNumber"`: **Do not modify**. Leave it as `0`.
   - (string) `"joinChannelID"`: Paste the welcome channel’s ID.

   **Important:**
   - **(string)**: `"000000000000000"`, `"hello"`
   - **(boolean)**: Can only be `true` or `false`. `"true"` is a string, while `true` is a boolean.
   - **(integer)**: `1234`, `1986872`. This differs from a number, since numbers can have decimal points (`3.1415`, `14.04`), while integers cannot.

   **Example:**
   ```json
   "token": "abc123def456",
   "debugMode": false,
   "ticketNumber": 0
   ```

## Running the Bot

To run the bot, you need to have [Node.js](https://nodejs.org/en/download) installed.

1. Navigate to the folder where you extracted the zip.
2. In the folder, click on the address bar at the top, type `cmd`, and press Enter. This will open the Command Prompt.
   ![image](https://github.com/user-attachments/assets/4254ba9e-5c83-42b3-b649-c3d53bd73fd3)
3. In the command prompt, type:
   ```
   npm i discord.js @discord.js/voice axios yt-search
   ```
   and press Enter.
4. Once the installation is finished, type:
   ```
   node main.js
   ```
   and press Enter. You should see startup messages in the console.

## Info

- This code is not a professional solution, so use it with that in mind. Feedback and bug reports are appreciated!
- Slash commands might take a minute to sync with Discord. Be patient.
- Once the commands have synced, you can run `/help` in the server to see all available bot commands.
- The default color for embeds is red, and error embeds are black.

And that's it! You're all set up. Enjoy using your bot!
