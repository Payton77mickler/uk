package dev.kiln;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;

public final class Hud {
    public static void render(DrawContext ctx) {
        MinecraftClient mc = MinecraftClient.getInstance();
        if (mc.player == null || mc.world == null || mc.options.hudHidden) return;

        float s = Modules.hudScale;
        ctx.getMatrices().push();
        ctx.getMatrices().scale(s, s, 1f);
        int y = (int) (Modules.hudY / s);
        int x = (int) (Modules.hudX / s);
        for (Module m : Modules.ALL.values()) {
            if (!m.enabled) continue;
            try {
                String t = m.text(mc);
                if (t != null) { ctx.drawTextWithShadow(mc.textRenderer, t, x, y, 0xFFFFFFFF); y += 11; }
            } catch (Exception ignored) {}
        }
        ctx.getMatrices().pop();

        for (Module m : Modules.ALL.values()) {
            if (!m.enabled) continue;
            try { m.render(ctx, mc); } catch (Exception ignored) {}
        }
    }
}
