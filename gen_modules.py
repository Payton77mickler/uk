#!/usr/bin/env python3
"""Single source of truth for Kiln modules.
Edit the lists below, then run:  python3 tools/gen_modules.py
Outputs: src/main/java/dev/kiln/Registry.java  and  ../kiln/modules.json
"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JAVA_OUT = os.path.join(ROOT, 'src/main/java/dev/kiln/Registry.java')
JSON_OUT = os.path.join(ROOT, '..', 'kiln', 'modules.json')

DEFAULT_ON = {'fps', 'cps', 'keystrokes', 'togglesprint'}
mods = []  # (id, name, category, group, java_ctor_expression)

def text(id, name, cat, expr, group=''):
    mods.append((id, name, cat, group,
      f'new Types.Text("{id}","{name}","{cat}","{group}", mc -> {{ ClientPlayerEntity p = mc.player; ClientWorld w = mc.world; return {expr}; }})'))
def opt(id, name, cat, acc, val, group=''):
    mods.append((id, name, cat, group, f'new Types.Opt<>("{id}","{name}","{cat}","{group}", o -> o.{acc}, {val})'))
def flag(id, name, cat):
    mods.append((id, name, cat, '', f'new Types.Flag("{id}","{name}","{cat}")'))
def custom(id, name, cat, ctor):
    mods.append((id, name, cat, '', ctor))

# ---------------- Info ----------------
I = 'Info'
text('fps','FPS counter',I,'"FPS: "+mc.getCurrentFps()')
text('ping','Ping',I,'"Ping: "+U.ping(mc)')
text('cps','CPS (both)',I,'"CPS: "+Cps.left()+" | "+Cps.right()')
text('cps_left','CPS left click',I,'"LMB: "+Cps.left()')
text('cps_right','CPS right click',I,'"RMB: "+Cps.right()')
text('clock24','Clock 24h',I,'LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm"))')
text('clock12','Clock 12h',I,'LocalTime.now().format(DateTimeFormatter.ofPattern("hh:mm a"))')
text('clock_sec','Clock with seconds',I,'LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss"))')
text('date','Date',I,'LocalDate.now().toString()')
text('weekday','Day of week',I,'LocalDate.now().getDayOfWeek().toString()')
text('session','Session timer',I,'"Session: "+U.session()')
text('playercount','Player count',I,'"Players: "+(mc.getNetworkHandler()==null?1:mc.getNetworkHandler().getPlayerList().size())')
text('server','Server address',I,'"Server: "+U.server(mc)')
text('username','Username',I,'"Name: "+mc.getSession().getUsername()')
text('gamemode','Game mode',I,'"Mode: "+(mc.interactionManager==null?"?":mc.interactionManager.getCurrentGameMode().getName())')
text('difficulty','Difficulty',I,'"Difficulty: "+w.getDifficulty().getName()')
text('dimension','Dimension',I,'"Dim: "+w.getRegistryKey().getValue().getPath()')
text('singleplayer','Singleplayer / multiplayer',I,'mc.isInSingleplayer()?"Singleplayer":"Multiplayer"')

# ---------------- Position ----------------
P = 'Position'
text('coords','Coordinates',P,'String.format("XYZ: %.1f %.1f %.1f", p.getX(), p.getY(), p.getZ())')
text('coord_x','X coordinate',P,'String.format("X: %.1f", p.getX())')
text('coord_y','Y coordinate',P,'String.format("Y: %.1f", p.getY())')
text('coord_z','Z coordinate',P,'String.format("Z: %.1f", p.getZ())')
text('blockpos','Block position',P,'"Block: "+p.getBlockX()+" "+p.getBlockY()+" "+p.getBlockZ()')
text('chunkpos','Chunk position',P,'"Chunk: "+(p.getBlockX()>>4)+" "+(p.getBlockZ()>>4)')
text('chunk_offset','Position in chunk',P,'"In chunk: "+(p.getBlockX()&15)+" "+(p.getBlockZ()&15)')
text('nether_coords','Nether coordinates',P,'"Nether: "+(p.getBlockX()/8)+" "+(p.getBlockZ()/8)')
text('overworld_coords','Overworld coordinates',P,'"Overworld: "+(p.getBlockX()*8)+" "+(p.getBlockZ()*8)')
text('direction','Facing direction',P,'"Facing: "+p.getHorizontalFacing().asString()')
text('yaw','Yaw',P,'String.format("Yaw: %.1f", MathHelper.wrapDegrees(p.getYaw()))')
text('pitch','Pitch',P,'String.format("Pitch: %.1f", p.getPitch())')
text('speed','Speed (blocks/s)',P,'String.format("Speed: %.2f b/s", U.speed(p))')
text('speed_kmh','Speed (km/h)',P,'String.format("Speed: %.1f km/h", U.speed(p)*3.6)')
text('vspeed','Vertical speed',P,'String.format("V-Speed: %.2f", (p.getY()-p.prevY)*20)')
text('fall','Fall distance',P,'String.format("Fall: %.1f", p.fallDistance)')
text('walked','Distance walked',P,'"Walked: "+U.walked(p)')
text('sealevel','Height above sea level',P,'"Sea level: "+(p.getBlockY()-w.getSeaLevel())')
text('biome','Biome',P,'"Biome: "+U.biome(mc)')

# ---------------- Player ----------------
Y = 'Player'
text('health','Health',Y,'"HP: "+(int)Math.ceil(p.getHealth())+"/"+(int)p.getMaxHealth()')
text('absorption','Absorption',Y,'"Absorb: "+(int)p.getAbsorptionAmount()')
text('hunger','Hunger',Y,'"Food: "+p.getHungerManager().getFoodLevel()')
text('saturation','Saturation',Y,'String.format("Sat: %.1f", p.getHungerManager().getSaturationLevel())')
text('armor','Armor points',Y,'"Armor: "+p.getArmor()')
text('armor_total','Total armor durability',Y,'"Armor dur: "+U.armorDurability(p)')
text('xplevel','XP level',Y,'"XP level: "+p.experienceLevel')
text('xpprogress','XP progress',Y,'"XP bar: "+(int)(p.experienceProgress*100)+"%"')
text('air','Air supply',Y,'"Air: "+(p.getAir()/20)+"s"')
text('status','Movement state',Y,'p.isSneaking()?"Sneaking":p.isSprinting()?"Sprinting":p.isSwimming()?"Swimming":p.isFallFlying()?"Gliding":p.isClimbing()?"Climbing":"Walking"')
text('onground','On ground',Y,'p.isOnGround()?"Grounded":"Airborne"')
text('inwater','In water',Y,'p.isTouchingWater()?"In water":"Dry"')
text('onfire','On fire',Y,'p.isOnFire()?"On fire":"Not burning"')
text('flying','Flying',Y,'p.getAbilities().flying?"Flying":"Not flying"')
text('effects','Active effect count',Y,'"Effects: "+p.getStatusEffects().size()')
text('slot','Selected hotbar slot',Y,'"Slot: "+(p.getInventory().selectedSlot+1)')
text('cooldown','Attack cooldown',Y,'"Cooldown: "+(int)(p.getAttackCooldownProgress(0.5f)*100)+"%"')

# ---------------- Items ----------------
T = 'Items'
text('mainhand','Main hand item',T,'"Hand: "+p.getMainHandStack().getName().getString()')
text('offhand','Offhand item',T,'"Offhand: "+p.getOffHandStack().getName().getString()')
text('hand_count','Held stack size',T,'"Count: "+p.getMainHandStack().getCount()')
text('hand_dur','Held item durability',T,'"Durability: "+U.durability(p.getMainHandStack())')
text('helmet_dur','Helmet durability',T,'"Helmet: "+U.durability(p.getEquippedStack(EquipmentSlot.HEAD))')
text('chest_dur','Chestplate durability',T,'"Chest: "+U.durability(p.getEquippedStack(EquipmentSlot.CHEST))')
text('legs_dur','Leggings durability',T,'"Legs: "+U.durability(p.getEquippedStack(EquipmentSlot.LEGS))')
text('boots_dur','Boots durability',T,'"Boots: "+U.durability(p.getEquippedStack(EquipmentSlot.FEET))')
text('free_slots','Free inventory slots',T,'"Free slots: "+U.freeSlots(p)')
for id_, nm, item in [
  ('arrows','Arrow count','ARROW'),('pearls','Ender pearl count','ENDER_PEARL'),
  ('gapples','Golden apple count','GOLDEN_APPLE'),('egapples','Enchanted golden apple count','ENCHANTED_GOLDEN_APPLE'),
  ('totems','Totem count','TOTEM_OF_UNDYING'),('xpbottles','XP bottle count','EXPERIENCE_BOTTLE'),
  ('rockets','Firework count','FIREWORK_ROCKET'),('tnt','TNT count','TNT'),
  ('obsidian','Obsidian count','OBSIDIAN'),('crystals','End crystal count','END_CRYSTAL'),
  ('snowballs','Snowball count','SNOWBALL'),('eggs','Egg count','EGG'),
  ('diamonds','Diamond count','DIAMOND'),('iron','Iron ingot count','IRON_INGOT'),
  ('gold','Gold ingot count','GOLD_INGOT'),('emeralds','Emerald count','EMERALD'),
  ('netherite','Netherite ingot count','NETHERITE_INGOT'),('cobble','Cobblestone count','COBBLESTONE'),
  ('steak','Cooked beef count','COOKED_BEEF'),('bread','Bread count','BREAD'),
]:
    text(id_, nm, T, f'"{nm.replace(" count","")}: "+U.count(p, Items.{item})')

# ---------------- World ----------------
W = 'World'
text('light','Light level',W,'"Light: "+w.getLightLevel(p.getBlockPos())')
text('blocklight','Block light',W,'"Block light: "+w.getLightLevel(LightType.BLOCK, p.getBlockPos())')
text('skylight','Sky light',W,'"Sky light: "+w.getLightLevel(LightType.SKY, p.getBlockPos())')
text('daytime','World time',W,'"Time: "+(w.getTimeOfDay()%24000)')
text('daycount','Day count',W,'"Day: "+(w.getTimeOfDay()/24000)')
text('moon','Moon phase',W,'"Moon: "+w.getMoonPhase()')
text('weather','Weather',W,'w.isThundering()?"Thunder":w.isRaining()?"Rain":"Clear"')
text('look_block','Block you are looking at',W,'"Looking: "+U.targetBlock(mc)')
text('look_pos','Targeted block position',W,'"Target: "+U.targetPos(mc)')
text('look_entity','Entity you are looking at',W,'"Entity: "+U.targetEntity(mc)')
text('look_dist','Target distance',W,'"Dist: "+U.targetDistance(mc)')

# ---------------- System ----------------
S = 'System'
text('mem','Memory usage',S,'"RAM: "+U.memory()')
text('mem_pct','Memory percent',S,'"RAM: "+U.memoryPercent()+"%"')
text('java','Java version',S,'"Java "+System.getProperty("java.version")')
text('mcver','Minecraft version',S,'"MC "+SharedConstants.getGameVersion().getName()')
text('os','Operating system',S,'System.getProperty("os.name")')
text('cores','CPU cores',S,'"Cores: "+Runtime.getRuntime().availableProcessors()')
text('modcount','Loaded mod count',S,'"Mods: "+FabricLoader.getInstance().getAllMods().size()')
text('fov_show','FOV setting',S,'"FOV: "+mc.options.getFov().getValue()')
text('rd_show','Render distance',S,'"Render: "+mc.options.getViewDistance().getValue()')
text('sd_show','Simulation distance',S,'"Sim: "+mc.options.getSimulationDistance().getValue()')
text('gui_show','GUI scale',S,'"GUI: "+mc.options.getGuiScale().getValue()')
text('maxfps_show','FPS limit',S,'"Max FPS: "+mc.options.getMaxFps().getValue()')
text('sens_show','Mouse sensitivity',S,'"Sens: "+(int)(mc.options.getMouseSensitivity().getValue()*200)+"%"')
text('window','Window size',S,'"Window: "+mc.getWindow().getWidth()+"x"+mc.getWindow().getHeight()')

# ---------------- Overlay ----------------
O = 'Overlay'
custom('keystrokes','Keystrokes',O,'new Overlays.Keystrokes()')
custom('armorhud','Armor HUD',O,'new Overlays.ArmorHud()')
custom('potionhud','Potion HUD',O,'new Overlays.PotionHud()')
custom('inventoryhud','Inventory HUD',O,'new Overlays.InventoryHud()')
custom('targethud','Target HUD',O,'new Overlays.TargetHud()')
custom('crosshair_dot','Crosshair dot',O,'new Overlays.CrosshairDot()')
custom('crosshair_cross','Colored crosshair',O,'new Overlays.CrosshairCross()')

# ---------------- Visual ----------------
V = 'Visual'
custom('fullbright','Fullbright',V,'new Types.Fullbright()')
opt('nobob','No view bobbing',V,'getBobView()','false')
opt('nofovfx','No FOV effects',V,'getFovEffectScale()','0.0')
opt('nodistort','No distortion effects',V,'getDistortionEffectScale()','0.0')
opt('fov70','FOV 70',V,'getFov()','70','fov')
opt('fov90','FOV 90',V,'getFov()','90','fov')
opt('fov110','FOV 110',V,'getFov()','110','fov')
opt('clouds_off','Clouds off',V,'getCloudRenderMode()','CloudRenderMode.OFF')
opt('ao_off','Smooth lighting off',V,'getAo()','false')
opt('no_shadows','No entity shadows',V,'getEntityShadows()','false')
opt('blend0','No biome blending',V,'getBiomeBlendRadius()','0')
opt('gui2','GUI scale 2',V,'getGuiScale()','2','gui')
opt('gui3','GUI scale 3',V,'getGuiScale()','3','gui')
opt('gui4','GUI scale 4',V,'getGuiScale()','4','gui')
flag('nohurtcam','No hurt camera shake',V)
flag('nofire','No fire overlay',V)
flag('nounderwater','Clear underwater view',V)
flag('novignette','No vignette',V)
flag('hidevanillapotions','Hide vanilla potion icons',V)
flag('noweather','No rain / snow rendering',V)

# ---------------- Performance ----------------
F = 'Performance'
opt('fast_graphics','Fast graphics',F,'getGraphicsMode()','GraphicsMode.FAST')
opt('particles_min','Minimal particles',F,'getParticles()','ParticlesMode.MINIMAL','particles')
opt('particles_dec','Decreased particles',F,'getParticles()','ParticlesMode.DECREASED','particles')
opt('entdist_low','Entity distance 50%',F,'getEntityDistanceScaling()','0.5','entdist')
opt('entdist_high','Entity distance 300%',F,'getEntityDistanceScaling()','3.0','entdist')
opt('vsync_off','VSync off',F,'getEnableVsync()','false')
opt('fps_unlimited','Unlimited FPS',F,'getMaxFps()','260')
for n in (6, 8, 12, 16, 24, 32):
    opt(f'chunks{n}', f'Render distance {n}', F, 'getViewDistance()', str(n), 'renderdist')
for n in (5, 8, 12):
    opt(f'sim{n}', f'Simulation distance {n}', F, 'getSimulationDistance()', str(n), 'simdist')

# ---------------- Sound ----------------
N = 'Sound'
for id_, nm, cat in [('mute_all','Mute everything','MASTER'),('no_music','Mute music','MUSIC'),
  ('no_ambient','Mute ambient','AMBIENT'),('no_weather_snd','Mute weather sounds','WEATHER'),
  ('no_hostile','Mute hostile mobs','HOSTILE'),('no_neutral','Mute neutral mobs','NEUTRAL'),
  ('no_blocks','Mute blocks','BLOCKS'),('no_records','Mute jukeboxes','RECORDS'),
  ('no_voice','Mute voice','VOICE'),('no_players','Mute players','PLAYERS')]:
    opt(id_, nm, N, f'getSoundVolumeOption(SoundCategory.{cat})', '0.0')

# ---------------- Chat ----------------
C = 'Chat'
opt('chat_clear','No chat background',C,'getTextBackgroundOpacity()','0.0')
opt('chat_opaque','Fully opaque chat',C,'getChatOpacity()','1.0')
opt('chat_big','Large chat',C,'getChatScale()','1.0','chatscale')
opt('chat_small','Small chat',C,'getChatScale()','0.7','chatscale')
opt('chat_wide','Wide chat',C,'getChatWidth()','1.0')
opt('chat_tall','Tall chat',C,'getChatHeightFocused()','1.0')

# ---------------- Utility ----------------
U_ = 'Utility'
custom('togglesprint','Toggle sprint',U_,'new Types.ToggleSprint()')
opt('togglesneak','Toggle sneak',U_,'getSneakToggled()','true')
flag('zoom','Zoom (hold C)',U_)
opt('autojump','Auto jump',U_,'getAutoJump()','true')
opt('subtitles','Subtitles',U_,'getShowSubtitles()','true')
opt('mouse_low','Low mouse sensitivity',U_,'getMouseSensitivity()','0.3','sens')
opt('mouse_high','High mouse sensitivity',U_,'getMouseSensitivity()','0.8','sens')

# ---------------- emit ----------------
ids = [m[0] for m in mods]
assert len(ids) == len(set(ids)), 'duplicate module id'
java = '''package dev.kiln;

// GENERATED by tools/gen_modules.py. Do not edit by hand.
import net.minecraft.client.network.ClientPlayerEntity;
import net.minecraft.client.world.ClientWorld;
import net.minecraft.client.option.*;
import net.minecraft.entity.EquipmentSlot;
import net.minecraft.item.Items;
import net.minecraft.sound.SoundCategory;
import net.minecraft.util.math.MathHelper;
import net.minecraft.world.LightType;
import net.minecraft.SharedConstants;
import net.fabricmc.loader.api.FabricLoader;
import java.time.*;
import java.time.format.DateTimeFormatter;

final class Registry {
    static void init() {
''' + '\n'.join(f'        Modules.add({m[4]});' for m in mods) + f'''
        Modules.DEFAULT_ON.addAll(java.util.List.of({", ".join('"%s"' % d for d in sorted(DEFAULT_ON))}));
    }}
}}
'''
open(JAVA_OUT, 'w').write(java)
os.makedirs(os.path.dirname(JSON_OUT), exist_ok=True)
json.dump([{'id': m[0], 'name': m[1], 'category': m[2], 'group': m[3], 'default': m[0] in DEFAULT_ON} for m in mods],
          open(JSON_OUT, 'w'), indent=1)
print(f'{len(mods)} modules generated')
