import discord
from discord.ext import commands, tasks
import random

TOKEN = "MTM0OTg0MTQxMTY1ODM1MDcwMw.GQTf6E.gbyohOwj9qpRKwzHPMWblHwm18ZS1R6EEVKICs"
GUILD_ID = 1197197375937183834

COLORS = ["#FF0000", "#FFA500", "#FFFF00", "#008000", "#ADD8E6", "#00008B", "#800080", "#FFFFFF", "#A1A1A1"]

intents = discord.Intents.default()
intents.guilds = True
intents.guild_messages = True
intents.message_content = True
intents.members = True  # Required to fetch members

bot = commands.Bot(command_prefix="-", intents=intents)

@bot.event
async def on_ready():
    print(f"Logged in as {bot.user}")
    assign_missing_colors.start()

async def create_roles(guild):
    existing_roles = {role.name.lower(): role for role in guild.roles}
    for i, color in enumerate(COLORS):
        role_name = f"color_{i+1}"
        if role_name not in existing_roles:
            new_role = await guild.create_role(name=role_name, colour=discord.Colour(int(color[1:], 16)))
            existing_roles[role_name] = new_role
    if "hascolor" not in existing_roles:
        new_role = await guild.create_role(name="HasColor")
        existing_roles["hascolor"] = new_role
    return existing_roles

async def assign_roles(guild):
    roles = await create_roles(guild)
    has_color_role = roles.get("hascolor")
    
    color_roles = [role for name, role in roles.items() if name.startswith("color_")]
    
    for member in guild.members:
        if not any(role in color_roles for role in member.roles):
            color_role = random.choice(color_roles)
            await member.add_roles(color_role, has_color_role)

@tasks.loop(minutes=1)
async def assign_missing_colors():
    guild = bot.get_guild(GUILD_ID)
    if guild:
        roles = await create_roles(guild)
        has_color_role = roles.get("hascolor")
        
        color_roles = [role for name, role in roles.items() if name.startswith("color_")]
        
        for member in guild.members:
            if has_color_role not in member.roles and color_roles:
                color_role = random.choice(color_roles)
                await member.add_roles(color_role, has_color_role)

@bot.command()
@commands.has_permissions(administrator=True)
async def colors(ctx):
    await assign_roles(ctx.guild)
    await ctx.send("Color roles assigned!")

bot.run(TOKEN)