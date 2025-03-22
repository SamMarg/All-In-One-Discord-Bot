import discord
import requests
from discord.ext import commands
import yt_dlp as youtube_dl
import asyncio
import datetime
from pydub import AudioSegment
import os
import sys
import psutil
import subprocess

intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix='-', intents=intents)

def clear_downloads():
    folder = "downloads"
    if os.path.exists(folder):
        for file in os.listdir(folder):
            file_path = os.path.join(folder, file)
            try:
                if os.path.isfile(file_path):
                    os.remove(file_path)
            except Exception as e:
                print(f"Error deleting {file_path}: {e}")

# Clear the downloads folder on startup
clear_downloads()

# welcome back message

def is_restarter_running():
    restarter_name = 'restart.py'  # The name of your restarter file
    for proc in psutil.process_iter(attrs=['pid', 'name', 'cmdline']):
        try:
            cmdline = proc.info.get('cmdline')
            if cmdline and restarter_name in cmdline:
                return True
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue
    return False

@bot.command()
async def restart(ctx):
    # Run restart.py
    subprocess.Popen(["python", "restart.py"])
    sys.exit()  # Stop the bot process

# Dictionary to keep track of voice clients and their audio sources
voice_clients = {}

# Global playlist
playlist = []

# Function to search and stream from YouTube
async def search_and_play(ctx, query):
    loading_message = await ctx.send("<a:loading:1350120606368010271>")

    # Set up options for yt-dlp (the youtube-dl replacement)
    ydl_opts = {
        'format': 'bestaudio/best',
        'extractaudio': True,
        'audioquality': 1,
        'outtmpl': 'downloads/%(id)s.%(ext)s',
        'restrictfilenames': True,
        'noplaylist': True,
        'quiet': True,
        'logtostderr': False,
    }

    with youtube_dl.YoutubeDL(ydl_opts) as ydl:
        # Search YouTube for the query
        try:
            info = ydl.extract_info(f"ytsearch:{query}", download=True)['entries'][0]
            webm_file = f"downloads/{info['id']}.webm"
            mp3_file = f"downloads/{info['id']}.mp3"

            # Convert .webm to .mp3
            audio = AudioSegment.from_file(webm_file, format="webm")
            audio.export(mp3_file, format="mp3")

            # Delete the original .webm file
            os.remove(webm_file)

            # Send the download is done message
            await loading_message.edit(content=f"✅ **Downloaded: {info['title']}**")

            # Join the channel and play audio
            voice_client = await ctx.author.voice.channel.connect()
            voice_clients[ctx.guild.id] = {'client': voice_client, 'info': info, 'start_time': asyncio.get_event_loop().time()}
            voice_client.play(discord.FFmpegPCMAudio(mp3_file), after=lambda e: print('done', e))

            # Send the now playing embed
            embed = discord.Embed(
                title="Now Playing",
                description=f"**{info['title']}**",
                color=discord.Color.blurple()
            )
            embed.add_field(name="Uploader", value=info['uploader'])
            embed.add_field(name="Duration", value=str(datetime.timedelta(seconds=info['duration'])))
            embed.set_footer(text=f"Requested by {ctx.author.display_name}")
            await ctx.send(embed=embed)

        except Exception as e:
            await loading_message.edit(content="❌ **Error downloading audio:** " + str(e))
            print(f"Error: {e}")

# Command to play a song from YouTube
@bot.command()
async def play(ctx, *, query):
    if ctx.author.voice is None:
        await ctx.send("You must be in a voice channel to play music!")
        return

    await search_and_play(ctx, query)

# Alias for play command
@bot.command(name="p")
async def p(ctx, *, query):
    await play(ctx, query=query)

# Command to pause the music
@bot.command()
async def pause(ctx):
    if ctx.guild.id in voice_clients:
        voice_clients[ctx.guild.id]['client'].pause()
        await ctx.send("Music paused!")
    else:
        await ctx.send("No music is currently playing!")

# Command to resume the music
@bot.command()
async def resume(ctx):
    if ctx.guild.id in voice_clients:
        voice_clients[ctx.guild.id]['client'].resume()
        await ctx.send("Music resumed!")
    else:
        await ctx.send("No music is currently playing!")

# Command to show the current playing song
@bot.command()
async def playing(ctx):
    if ctx.guild.id in voice_clients and voice_clients[ctx.guild.id]['client'].is_playing():
        voice_client_info = voice_clients[ctx.guild.id]
        song_info = voice_client_info['info']
        start_time = voice_client_info['start_time']
        elapsed_time = asyncio.get_event_loop().time() - start_time
        duration = song_info['duration']

        # Calculate progress (10 emojis)
        progress = int((elapsed_time / duration) * 10)
        progress_bar = '' + '➖' * progress + ' ⚪ ' + '➖' * (9 - progress)

        # Calculate remaining time
        remaining_time = str(datetime.timedelta(seconds=int(duration - elapsed_time)))

        embed = discord.Embed(title="Now Playing", description=f"**{song_info['title']}**",
                              color=discord.Color.blurple())
        embed.add_field(name="Duration", value=f"{remaining_time} remaining")
        embed.add_field(name="Progress", value=progress_bar)
        embed.set_footer(text=f"Requested by {ctx.author.display_name}")

        await ctx.send(embed=embed)
    else:
        await ctx.send("No music is currently playing.")

# Alias for /playing
@bot.command(name="np")
async def np(ctx):
    await playing(ctx)

# Command to stop and disconnect from the voice channel
@bot.command()
async def quit(ctx):
    if ctx.guild.id in voice_clients:
        voice_clients[ctx.guild.id]['client'].stop()
        await voice_clients[ctx.guild.id]['client'].disconnect()
        del voice_clients[ctx.guild.id]
        await ctx.send("Music stopped and disconnected.")
    else:
        await ctx.send("No music is playing or I'm not in a voice channel.")

# Alias for quit
@bot.command(name="stop")
async def stop(ctx):
    await quit(ctx)

@bot.command(name="end")
async def end(ctx):
    await sys.exit()

@bot.command()
async def thema(ctx, question_id: str):
    downloadlink = f"https://trapeza.z6.web.core.windows.net/{question_id}.pdf"
    try:
        # Send a request to get the PDF content
        response = requests.get(downloadlink)
        
        if response.status_code == 200:
            # Save the PDF to a local file
            pdf_filename = f"{question_id}.pdf"
            with open(pdf_filename, 'wb') as f:
                f.write(response.content)
            
            # Upload the file to Discord
            with open(pdf_filename, 'rb') as f:
                await ctx.send(file=discord.File(f, pdf_filename))

            # Delete the file after uploading
            os.remove(pdf_filename)
            print(f"File {pdf_filename} has been uploaded and deleted.")
        else:
            await ctx.send("Failed to fetch the PDF. Please check the ID and try again.")
            print(f"Failed to download PDF for ID {question_id}, Status Code: {response.status_code}")
    except Exception as e:
        print(f"Error: {str(e)}")
        await ctx.send("An error occurred while processing your request.")

async def restartedmessage():
    x = bot.get_channel(1249420559423508540)
    if x:
        embed = discord.Embed(
            title="Restarted Successfully",
            color=discord.Color.blurple()
        )
        await x.send(embed=embed)

async def restartercheck():
    if is_restarter_running():  # Make sure `is_restarter_running()` is defined somewhere
        print("Restarter is running, sending a restarted message.")
        await restartedmessage()
    else:
        print("Restarter is not running, not sending a restarted message.")

@bot.event
async def on_ready():
    print(f'Logged in as {bot.user}')
    # Schedule the restarter check task to run once the bot is ready
    await restartercheck()

# **Playlist logic below**:

# Global playlist
playlist = []

# Function to add a song to the playlist
async def add_to_playlist(ctx, song):
    playlist.append(song)  # Add song to the list

# Function to play the next song in the playlist
async def play_next(ctx):
    if playlist:
        song = playlist.pop(0)  # Get the first song in the playlist
        await search_and_play(ctx, song)  # Play the song
    else:
        await ctx.send("No songs left in the playlist.")

# Command to add a song to the playlist
@bot.command()
async def add(ctx, *, song_name):
    await add_to_playlist(ctx, song_name)
    await ctx.send(f"Added **{song_name}** to the playlist!")

# Command to play the next song in the playlist
@bot.command()
async def next(ctx):
    await play_next(ctx)

# Command to show the playlist
@bot.command()
async def playlist(ctx):
    if playlist:
        await ctx.send("Current Playlist:\n" + "\n".join(playlist))
    else:
        await ctx.send("The playlist is empty.")

bot.run('MTM0OTg0MTQxMTY1ODM1MDcwMw.Gf3oaI.MzP4xNF3_6PpGeN719alrbEnd-QhLfPx8d0GG8')  # Replace with your bot's token
