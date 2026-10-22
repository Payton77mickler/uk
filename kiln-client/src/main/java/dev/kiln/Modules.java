package dev.kiln;

import com.google.gson.*;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.MinecraftClient;
import java.nio.file.*;
import java.util.*;

/** Registry + persistence. State is shared with the launcher through config/kiln-modules.json. */
public final class Modules {
    public static final Map<String, Module> ALL = new LinkedHashMap<>();
    public static final Set<String> DEFAULT_ON = new HashSet<>();
    public static int hudX = 4, hudY = 4;
    public static float hudScale = 1f;
    private static final Path FILE = FabricLoader.getInstance().getConfigDir().resolve("kiln-modules.json");

    public static void add(Module m) { ALL.put(m.id, m); }
    public static boolean on(String id) { Module m = ALL.get(id); return m != null && m.enabled; }

    public static List<String> categories() {
        return new ArrayList<>(new LinkedHashSet<>(ALL.values().stream().map(m -> m.category).toList()));
    }
    public static List<Module> inCategory(String cat) {
        return ALL.values().stream().filter(m -> m.category.equals(cat)).toList();
    }

    /** Turn a module on or off. Enabling one member of a group turns the others off. */
    public static void set(String id, boolean v) {
        Module m = ALL.get(id);
        if (m == null) return;
        m.enabled = v;
        if (v && !m.group.isEmpty()) for (Module o : ALL.values()) if (o != m && o.group.equals(m.group)) o.enabled = false;
        save();
    }

    public static void init() {
        Registry.init();
        for (String id : DEFAULT_ON) { Module m = ALL.get(id); if (m != null) m.enabled = true; }
        load();
    }

    public static void load() {
        try {
            if (!Files.exists(FILE)) { save(); return; }
            JsonObject o = JsonParser.parseString(Files.readString(FILE)).getAsJsonObject();
            for (Module m : ALL.values()) if (o.has(m.id)) m.enabled = o.get(m.id).getAsBoolean();
            if (o.has("_hudX")) hudX = o.get("_hudX").getAsInt();
            if (o.has("_hudY")) hudY = o.get("_hudY").getAsInt();
            if (o.has("_hudScale")) hudScale = Math.max(0.5f, Math.min(3f, o.get("_hudScale").getAsFloat()));
            Set<String> seen = new HashSet<>(); // keep only the first enabled module in each group
            for (Module m : ALL.values()) if (m.enabled && !m.group.isEmpty() && !seen.add(m.group)) m.enabled = false;
        } catch (Exception e) { e.printStackTrace(); }
    }

    public static void save() {
        try {
            JsonObject o = new JsonObject();
            ALL.values().forEach(m -> o.addProperty(m.id, m.enabled));
            o.addProperty("_hudX", hudX); o.addProperty("_hudY", hudY); o.addProperty("_hudScale", hudScale);
            Files.writeString(FILE, new GsonBuilder().setPrettyPrinting().create().toJson(o));
        } catch (Exception e) { e.printStackTrace(); }
    }

    private static void safe(Runnable r) { try { r.run(); } catch (Throwable t) { t.printStackTrace(); } }

    /** Disable first, then enable, so grouped options restore before the next one saves. */
    public static void tickAll(MinecraftClient mc) {
        for (Module m : ALL.values()) if (!m.enabled && m.applied) { safe(() -> m.onDisable(mc)); m.applied = false; }
        for (Module m : ALL.values()) if (m.enabled) {
            if (!m.applied) { safe(() -> m.onEnable(mc)); m.applied = true; }
            safe(() -> m.tick(mc));
        }
    }

    public static void restoreAll(MinecraftClient mc) {
        for (Module m : ALL.values()) if (m.applied) { safe(() -> m.onDisable(mc)); m.applied = false; }
    }
}
