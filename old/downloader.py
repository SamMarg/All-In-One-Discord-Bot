import discord
import yt_dlp
import os
from discord.ext import commands

# Set up the discord bot
intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix='-', intents=intents)

# Ensure the downloads directory exists
if not os.path.exists('downloads'):
    os.makedirs('downloads')

# Function to get video info (title, uploader, thumbnail, duration, and URL)
def get_video_info(query):
    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(f"ytsearch:{query}", download=False)['entries'][0]
            return info['title'], info['uploader'], info['thumbnail'], info['duration'], info['webpage_url']
        except Exception:
            return None, None, None, None, None

# Function to download the video and send it as an MP3 file
async def download_and_upload(interaction, query):
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': 'downloads/%(title)s.%(ext)s',
        'quiet': False,
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
    }

    try:# Send the embed with loading emoji
        embed = discord.Embed(color=discord.Color.red())
        embed.set_image(url="https://cdn.discordapp.com/attachments/1249420559423508540/1350433153637941369/loading.gif?ex=67d6b861&is=67d566e1&hm=c722c67d3d9f0f4ed69604a99eec0ef2c36ab107256b02dd343df41c27f0d72c&")
        message = await interaction.response.send_message(embed=embed)

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"ytsearch:{query}", download=True)['entries'][0]
            file_path_webm = ydl.prepare_filename(info)
            file_path_mp3 = file_path_webm.replace('.webm', '.mp3')

        downloads_folder = 'downloads'
        mp3_files = [f for f in os.listdir(downloads_folder) if f.endswith('.mp3')]

        if mp3_files:
            latest_mp3 = max(mp3_files, key=lambda f: os.path.getmtime(os.path.join(downloads_folder, f)))
            latest_mp3_path = os.path.join(downloads_folder, latest_mp3)

            with open(latest_mp3_path, 'rb') as f:
                # Fetch the original response message
                original_message = await interaction.original_response()
                # Delete the original embed message
                await original_message.delete()
                # Send the MP3 file as a reply to the user
                await interaction.followup.send(file=discord.File(f, latest_mp3))

            os.remove(file_path_webm) if os.path.exists(file_path_webm) else None
            os.remove(latest_mp3_path) if os.path.exists(latest_mp3_path) else None

        else:
            await interaction.followup.send(f"Error: Download failed for {query}")
    except Exception as e:
        await interaction.followup.send(f"Error: {str(e)}")

# Event when the bot is ready
@bot.event
async def on_ready():
    print(f'We have logged in as {bot.user}')

# Slash command to get video info
@bot.tree.command(name="info", description="Get information about a video")
async def info(interaction: discord.Interaction, query: str):
    loading_emoji = "<a:loading:1350120606368010271>"
    await interaction.response.defer()

    title, uploader, thumbnail, duration, video_url = get_video_info(query)

    if title:
        minutes = duration // 60
        seconds = duration % 60
        formatted_duration = f"{minutes:02}:{seconds:02}"

        embed = discord.Embed(title=title, color=discord.Color.red(), url=video_url)
        embed.set_image(url=thumbnail)
        embed.add_field(name="Duration", value=formatted_duration)
        embed.add_field(name="Uploader", value=uploader)

        await interaction.followup.send(embed=embed)
    else:
        await interaction.followup.send("Could not find any results for your query.")

# Slash command to download and send the video file
@bot.tree.command(name="download", description="Download and send a video as MP3")
async def download(interaction: discord.Interaction, query: str):
    await download_and_upload(interaction, query)

# Syncing commands with Discord
@bot.event
async def on_ready():
    await bot.tree.sync()
    print("Bot is ready and commands synced!")

TOKEN = 'MTM0OTg0MTQxMTY1ODM1MDcwMw.GQTf6E.gbyohOwj9qpRKwzHPMWblHwm18ZS1R6EEVKICs'
bot.run(TOKEN)
