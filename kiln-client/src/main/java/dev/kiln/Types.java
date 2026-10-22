package dev.kiln;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.option.GameOptions;
import net.minecraft.client.option.SimpleOption;
import net.minecraft.entity.effect.StatusEffectInstance;
import net.minecraft.entity.effect.StatusEffects;
import java.util.function.Function;

public final class Types {
    private Types() {}

    /** One line of HUD text. */
    public static class Text extends Module {
        private final Function<MinecraftClient, String> fn;
        public Text(String id, String name, String cat, String group, Function<MinecraftClient, String> fn) {
            super(id, name, cat, group); this.fn = fn;
        }
        @Override public String text(MinecraftClient mc) {
            try { return fn.apply(mc); } catch (Exception e) { return name + ": ?"; }
        }
    }

    /** Sets a game option while enabled and restores the old value when disabled. */
    public static class Opt<T> extends Module {
        private final Function<GameOptions, SimpleOption<T>> get;
        private final T value;
        private T saved;
        public Opt(String id, String name, String cat, String group, Function<GameOptions, SimpleOption<T>> get, T value) {
            super(id, name, cat, group); this.get = get; this.value = value;
        }
        @Override public void onEnable(MinecraftClient mc) {
            SimpleOption<T> o = get.apply(mc.options);
            saved = o.getValue();
            o.setValue(value);
        }
        @Override public void onDisable(MinecraftClient mc) {
            if (saved != null) get.apply(mc.options).setValue(saved);
            saved = null;
        }
    }

    /** No logic of its own; a mixin or the client checks Modules.on(id). */
    public static class Flag extends Module {
        public Flag(String id, String name, String cat) { super(id, name, cat, ""); }
    }

    public static class ToggleSprint extends Module {
        public ToggleSprint() { super("togglesprint", "Toggle sprint", "Utility", ""); }
        @Override public void tick(MinecraftClient mc) {
            if (mc.player != null && mc.currentScreen == null && mc.options.forwardKey.isPressed()
                    && !mc.player.isSneaking() && !mc.player.horizontalCollision) {
                mc.player.setSprinting(true);
            }
        }
    }

    /** Fullbright via a client-side night vision effect. */
    public static class Fullbright extends Module {
        public Fullbright() { super("fullbright", "Fullbright", "Visual", ""); }
        @Override public void tick(MinecraftClient mc) {
            if (mc.player == null) return;
            StatusEffectInstance cur = mc.player.getStatusEffect(StatusEffects.NIGHT_VISION);
            if (cur == null || cur.getDuration() < 300) {
                mc.player.addStatusEffect(new StatusEffectInstance(StatusEffects.NIGHT_VISION, 600, 0, false, false, false));
            }
        }
        @Override public void onDisable(MinecraftClient mc) {
            if (mc.player != null) mc.player.removeStatusEffect(StatusEffects.NIGHT_VISION);
        }
    }
}
