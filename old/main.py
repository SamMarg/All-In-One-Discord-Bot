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
import ctypes
async def checkr():
    if "-r" in sys.argv:
        await restartedmessage()

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

# Welcome back message
#def is_restarter_running():
 #   restarter_name = 'restart.py'  # The name of your restarter file
  #  for proc in psutil.process_iter(attrs=['pid', 'name', 'cmdline']):
   #     try:
    #        cmdline = proc.info.get('cmdline')
     #       if cmdline and restarter_name in cmdline:
      #          return True
       # except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
        #    continue
    #return False

@bot.command()
async def restart(ctx):
    # Run restart.py
    subprocess.Popen(["python", "restart.py"])
    sys.exit()  # Stop the bot process

# Dictionary to keep track of voice clients and their audio sources
voice_clients = {}

# Function to search and stream from YouTube
async def search_and_play(interaction, query):
    # Step 1: Send the ephemeral message to acknowledge the command
    await interaction.response.send_message(
        "✅ **Your request is being processed!**", ephemeral=True
    )

    # Step 2: Create a message with the loading animation
    embed = discord.Embed(title="", color=discord.Color.blurple())
    embed.set_thumbnail(url="https://cdn.discordapp.com/attachments/1249420559423508540/1350433153637941369/loading.gif?ex=67d6b861&is=67d566e1&hm=c722c67d3d9f0f4ed69604a99eec0ef2c36ab107256b02dd343df41c27f0d72c&")
    loading_message = await interaction.channel.send(embed=embed)

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

            # Step 3: Delete the loading message after the new message is sent
            await loading_message.delete()

            # Join the channel and play audio
            voice_client = await interaction.user.voice.channel.connect()
            voice_clients[interaction.guild.id] = {'client': voice_client, 'info': info, 'start_time': asyncio.get_event_loop().time()}
            voice_client.play(discord.FFmpegPCMAudio(mp3_file), after=lambda e: print('done', e))

            # Step 4: Send the now playing embed
            embed = discord.Embed(
                title="Now Playing",
                description=f"**{info['title']}**",
                color=discord.Color.blurple()
            )
            embed.add_field(name="Uploader", value=info['uploader'])
            embed.add_field(name="Duration", value=str(datetime.timedelta(seconds=info['duration'])))
            embed.set_footer(text=f"Requested by {interaction.user.display_name}")
            await interaction.followup.send(embed=embed)

        except Exception as e:
            embed=discord.Embed(
                title="Error downloading audio",
                description={str(e)}
            )
            
            await interaction.followup.send(embed=embed)
            await loading_message.delete()  # Delete the loading message on error
            print(f"Error: {e}")

# Command to play a song from YouTube
@bot.tree.command(name="play", description="Play a song from YouTube")
async def play(interaction: discord.Interaction, query: str):
    if interaction.user.voice is None:
        embed=discord.Embed(
            color=discord.Color.red(),
            title=":x: You must be in a voice channel to play music!"
        )
        await interaction.response.send_message(embed=embed)
        return

    await search_and_play(interaction, query)

# Alias for play command
@bot.tree.command(name="p", description="Alias for play command")
async def p(interaction: discord.Interaction, query: str):
    await play(interaction, query=query)

# Command to pause the music
@bot.tree.command(name="pause", description="Pause the current music")
async def pause(interaction: discord.Interaction):
    if interaction.guild.id in voice_clients:
        voice_clients[interaction.guild.id]['client'].pause()
        embed=discord.Embed(
            color=discord.Color.blurple(),
            title="✅ Music paused"
        )
        await interaction.response.send_message(embed=embed)
    else:
        embed=discord.Embed(
            color=discord.Color.red(),
            title=":x: No music is currently playing"
        )
        await interaction.response.send_message(embed=embed)

# Command to resume the music
@bot.tree.command(name="resume", description="Resume the paused music")
async def resume(interaction: discord.Interaction):
    if interaction.guild.id in voice_clients:
        voice_clients[interaction.guild.id]['client'].resume()
        embed=discord.Embed(
            color=discord.Color.blurple(),
            title="✅ Music resumed"
        )
        await interaction.response.send_message(embed=embed)
    else:
        embed=discord.Embed(
            color=discord.Color.red(),
            title=":x: No music is currently playing"
        )
        await interaction.response.send_message(embed=embed)

# Command to show the current playing song
@bot.tree.command(name="playing", description="Show the current playing song")
async def playing(interaction: discord.Interaction):
    if interaction.guild.id in voice_clients and voice_clients[interaction.guild.id]['client'].is_playing():
        voice_client_info = voice_clients[interaction.guild.id]
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
        embed.set_footer(text=f"Requested by {interaction.user.display_name}")

        await interaction.response.send_message(embed=embed)
    else:
        embed2=discord.Embed(
            title=":x: No music is currently playing",
            color=discord.Color.red()
        )
        await interaction.response.send_message(embed=embed2)

# Alias for /playing
@bot.tree.command(name="np", description="Alias for playing command")
async def np(interaction: discord.Interaction):
    await playing(interaction)

# Command to stop and disconnect from the voice channel
@bot.tree.command(name="quit", description="Stop and disconnect from the voice channel")
async def quit(interaction: discord.Interaction):
    if interaction.guild.id in voice_clients:
        voice_clients[interaction.guild.id]['client'].stop()
        await voice_clients[interaction.guild.id]['client'].disconnect()
        del voice_clients[interaction.guild.id]
        embed=discord.Embed(
            color=discord.Color.blurple(),
            title="✅ Music stopped"
        )
        await interaction.response.send_message(embed=embed)
    else:
        embed=discord.Embed(
            title=":x: No music is playing or I'm not in a voice channel.",
            color=discord.Color.red()
        )
        await interaction.response.send_message(embed=embed)

# Alias for quit
@bot.tree.command(name="stop", description="Alias for quit")
async def stop(interaction: discord.Interaction):
    await quit(interaction)

@bot.tree.command(name="end", description="End the bot")
async def end(interaction: discord.Interaction):
    embed=discord.Embed(title="Shutting down", color=discord.Color.blurple())
    embed.set_thumbnail(url="https://cdn.discordapp.com/attachments/1249420559423508540/1350433153637941369/loading.gif?ex=67d6b861&is=67d566e1&hm=c722c67d3d9f0f4ed69604a99eec0ef2c36ab107256b02dd343df41c27f0d72c&")
    await interaction.response.send_message(embed=embed, ephemeral=True)
    await sys.exit()


@bot.tree.command(name="restart", description="Restart the bot")
async def restart(interaction: discord.Interaction):
    embed=discord.Embed(title="Restarting <a:loading:1350120606368010271>", color=discord.Color.blurple())
    await interaction.response.send_message(embed=embed, ephemeral=True)
    subprocess.Popen(["python", "restart.py"])
    ctypes.windll.user32.PostMessageW(ctypes.windll.kernel32.GetConsoleWindow(), 0x0010, 0, 0)
    os.system('exit')
    sys.exit()

@bot.tree.command(name="thema", description="Download and send PDFs")
async def thema(interaction: discord.Interaction, question_id: str):
    downloadlink = f"https://trapeza.z6.web.core.windows.net/{question_id}.pdf"
    solution_link = f"https://trapeza.z6.web.core.windows.net/{question_id}_SOLUTION.pdf"
    
    try:
        # Send a request to get the original PDF content
        response_pdf = requests.get(downloadlink)
        response_solution_pdf = requests.get(solution_link)
        
        # Check if both requests were successful
        if response_pdf.status_code == 200 and response_solution_pdf.status_code == 200:
            # Save both PDFs to local files
            pdf_filename = f"{question_id}.pdf"
            solution_pdf_filename = f"{question_id}_SOLUTION.pdf"
            
            with open(pdf_filename, 'wb') as f:
                f.write(response_pdf.content)
                
            with open(solution_pdf_filename, 'wb') as f:
                f.write(response_solution_pdf.content)
            
            # Upload both files to Discord in the same message
            with open(pdf_filename, 'rb') as f, open(solution_pdf_filename, 'rb') as solution_f:
                await interaction.response.send_message(
                    files=[discord.File(f, pdf_filename), discord.File(solution_f, solution_pdf_filename)]
                )

            # Delete the files after uploading
            os.remove(pdf_filename)
            os.remove(solution_pdf_filename)
            print(f"Files {pdf_filename} and {solution_pdf_filename} have been uploaded and deleted.")
        else:
            embed=discord.Embed(
                color=discord.Color.red(),
                title=":x: Failed to fetch one or both PDFs. Please check the ID and try again."
            )
            await interaction.response.send_message(embed=embed)
            print(f"Failed to download PDFs for ID {question_id}, Status Code: {response_pdf.status_code} and {response_solution_pdf.status_code}")

    except Exception as e:
        print(f"Error: {str(e)}")
        embed=discord.Embed(
            color=discord.Color.red(),
            title=":x: An error ocurred while processing your request:",
            description=e
        )
        await interaction.response.send_message(embed=embed)

async def restartedmessage():
    bot.tree.sync()
    x = bot.get_channel(1249420559423508540)
    if x:
        embed = discord.Embed(
            title="✅ Restarted Successfully",
            color=discord.Color.blurple()
        )
        embed.set_footer(text="Please wait for the commands to sync to Discord.")
        await x.send(embed=embed)

# async def restartercheck():
#    if is_restarter_running():  # Make sure `is_restarter_running()` is defined somewhere
 #       print("Restarter is running, sending a restarted message.")
  #      await restartedmessage()
   # else:
    #    print("Restarter is not running, not sending a restarted message.")

@bot.event
async def on_ready():
    await bot.tree.sync()
    await checkr()
    print(f'Logged in as {bot.user}')
    # Schedule the restarter check task to run once the bot is ready
#   await restartercheck()

@bot.tree.command(name="ping", description="Ping command")
async def ping(interaction: discord.Interaction):
    embed=discord.Embed(
        color=discord.Color.blurple(),
        title="✅ Pong!",
        description=f"⏱️ Latency is {bot.latency * 1000:.2f}ms"  # Calculate latency in milliseconds and format it to two decimal places
    )
    await interaction.response.send_message(embed=embed)

bot.run('MTM0OTg0MTQxMTY1ODM1MDcwMw.GQTf6E.gbyohOwj9qpRKwzHPMWblHwm18ZS1R6EEVKICs')  # Replace with your bot's token
