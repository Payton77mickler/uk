package dev.kiln;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.entity.EquipmentSlot;
import net.minecraft.entity.LivingEntity;
import net.minecraft.entity.effect.StatusEffectInstance;
import net.minecraft.item.ItemStack;

public final class Overlays {
    private Overlays() {}

    public static class Keystrokes extends Module {
        public Keystrokes() { super("keystrokes", "Keystrokes", "Overlay", ""); }
        @Override public void render(DrawContext ctx, MinecraftClient mc) {
            int x = 6, y = ctx.getScaledWindowHeight() - 74;
            key(ctx, mc, "W", mc.options.forwardKey, x + 22, y, 20);
            key(ctx, mc, "A", mc.options.leftKey,    x,      y + 22, 20);
            key(ctx, mc, "S", mc.options.backKey,    x + 22, y + 22, 20);
            key(ctx, mc, "D", mc.options.rightKey,   x + 44, y + 22, 20);
            key(ctx, mc, "LMB " + Cps.left(),  mc.options.attackKey, x,      y + 44, 31);
            key(ctx, mc, "RMB " + Cps.right(), mc.options.useKey,    x + 33, y + 44, 31);
            key(ctx, mc, "SPACE", mc.options.jumpKey, x, y + 66, 64);
        }
        private void key(DrawContext ctx, MinecraftClient mc, String label, KeyBinding kb, int x, int y, int w) {
            boolean down = kb.isPressed();
            ctx.fill(x, y, x + w, y + 20, down ? 0x99FFFFFF : 0x66000000);
            ctx.drawCenteredTextWithShadow(mc.textRenderer, label, x + w / 2, y + 6, down ? 0xFF000000 : 0xFFFFFFFF);
        }
    }

    public static class ArmorHud extends Module {
        public ArmorHud() { super("armorhud", "Armor HUD", "Overlay", ""); }
        @Override public void render(DrawContext ctx, MinecraftClient mc) {
            EquipmentSlot[] slots = {EquipmentSlot.HEAD, EquipmentSlot.CHEST, EquipmentSlot.LEGS, EquipmentSlot.FEET, EquipmentSlot.OFFHAND};
            int x = ctx.getScaledWindowWidth() - 22, y = ctx.getScaledWindowHeight() / 2 - 45;
            for (int i = 0; i < slots.length; i++) {
                ItemStack s = mc.player.getEquippedStack(slots[i]);
                if (s.isEmpty()) continue;
                ctx.drawItem(s, x, y + i * 18);
                ctx.drawItemInSlot(mc.textRenderer, s, x, y + i * 18);
            }
        }
    }

    public static class PotionHud extends Module {
        public PotionHud() { super("potionhud", "Potion HUD", "Overlay", ""); }
        @Override public void render(DrawContext ctx, MinecraftClient mc) {
            int y = 4;
            for (StatusEffectInstance e : mc.player.getStatusEffects()) {
                int d = e.getDuration();
                String time = d < 0 || e.isInfinite() ? "inf" : String.format("%d:%02d", d / 1200, (d / 20) % 60);
                String t = net.minecraft.text.Text.translatable(e.getTranslationKey()).getString() + " " + (e.getAmplifier() + 1) + "  " + time;
                ctx.drawTextWithShadow(mc.textRenderer, t, ctx.getScaledWindowWidth() - mc.textRenderer.getWidth(t) - 4, y, 0xFFFFFFFF);
                y += 11;
            }
        }
    }

    public static class InventoryHud extends Module {
        public InventoryHud() { super("inventoryhud", "Inventory HUD", "Overlay", ""); }
        @Override public void render(DrawContext ctx, MinecraftClient mc) {
            int x0 = ctx.getScaledWindowWidth() - 9 * 18 - 6, y0 = ctx.getScaledWindowHeight() - 3 * 18 - 30;
            ctx.fill(x0 - 2, y0 - 2, x0 + 9 * 18 + 2, y0 + 3 * 18 + 2, 0x66000000);
            for (int i = 0; i < 27; i++) {
                ItemStack s = mc.player.getInventory().getStack(9 + i);
                if (s.isEmpty()) continue;
                int x = x0 + (i % 9) * 18, y = y0 + (i / 9) * 18;
                ctx.drawItem(s, x, y);
                ctx.drawItemInSlot(mc.textRenderer, s, x, y);
            }
        }
    }

    public static class TargetHud extends Module {
        public TargetHud() { super("targethud", "Target HUD", "Overlay", ""); }
        @Override public void render(DrawContext ctx, MinecraftClient mc) {
            if (mc.targetedEntity instanceof LivingEntity le) {
                String t = le.getName().getString() + "  " + (int) Math.ceil(le.getHealth()) + "/" + (int) le.getMaxHealth();
                ctx.drawCenteredTextWithShadow(mc.textRenderer, t, ctx.getScaledWindowWidth() / 2, ctx.getScaledWindowHeight() / 2 + 20, 0xFFFFFFFF);
            }
        }
    }

    public static class CrosshairDot extends Module {
        public CrosshairDot() { super("crosshair_dot", "Crosshair dot", "Overlay", ""); }
        @Override public void render(DrawContext ctx, MinecraftClient mc) {
            int cx = ctx.getScaledWindowWidth() / 2, cy = ctx.getScaledWindowHeight() / 2;
            ctx.fill(cx - 1, cy - 1, cx + 1, cy + 1, 0xFFFFFFFF);
        }
    }

    public static class CrosshairCross extends Module {
        public CrosshairCross() { super("crosshair_cross", "Colored crosshair", "Overlay", ""); }
        @Override public void render(DrawContext ctx, MinecraftClient mc) {
            int cx = ctx.getScaledWindowWidth() / 2, cy = ctx.getScaledWindowHeight() / 2, c = 0xFF55FFAA;
            ctx.fill(cx - 6, cy, cx - 2, cy + 1, c); ctx.fill(cx + 2, cy, cx + 6, cy + 1, c);
            ctx.fill(cx, cy - 6, cx + 1, cy - 2, c); ctx.fill(cx, cy + 2, cx + 1, cy + 6, c);
        }
    }
}
