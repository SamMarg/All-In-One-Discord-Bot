import discord
from discord.ext import commands

# Set your bot token and admin user ID
BOT_TOKEN = "MTMwMzM0NTE5MzI3MzEzNTEzNQ.G2gVrX.K2TyvDD5Ff6Zf1sfsNr6RUtaCAqUWaUx4CL7oU"
ADMIN_USER_ID = 760125732524392458  # Replace with the actual admin's user ID

# Set up bot with intents
intents = discord.Intents.default()
intents.messages = True
intents.message_content = True

bot = commands.Bot(command_prefix="-", intents=intents)

@bot.event
async def on_ready():
    print(f'Logged in as {bot.user}')

@bot.command(name="purgeall")
async def purge_all(ctx):
    if ctx.author.id == ADMIN_USER_ID:
        await ctx.channel.purge()
        await ctx.send("All messages have been purged!", delete_after=3)
    else:
        await ctx.send(":x: You do not have permission to use this command.", delete_after=3)

# Run the bot
bot.run(BOT_TOKEN)