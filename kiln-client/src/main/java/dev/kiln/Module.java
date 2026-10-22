package dev.kiln;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;

public abstract class Module {
    public final String id, name, category, group;
    public boolean enabled, applied;

    protected Module(String id, String name, String category, String group) {
        this.id = id; this.name = name; this.category = category; this.group = group;
    }
    public void onEnable(MinecraftClient mc) {}
    public void onDisable(MinecraftClient mc) {}
    public void tick(MinecraftClient mc) {}
    /** HUD text line. Return null if this module draws itself via render(). */
    public String text(MinecraftClient mc) { return null; }
    public void render(DrawContext ctx, MinecraftClient mc) {}
}
