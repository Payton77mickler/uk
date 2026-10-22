package dev.kiln;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientLifecycleEvents;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.fabricmc.fabric.api.client.rendering.v1.HudRenderCallback;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.client.util.InputUtil;
import org.lwjgl.glfw.GLFW;

public class KilnClient implements ClientModInitializer {
    private static KeyBinding menuKey, zoomKey;

    public static boolean zoomHeld() { return zoomKey != null && zoomKey.isPressed(); }

    @Override
    public void onInitializeClient() {
        Modules.init();
        menuKey = KeyBindingHelper.registerKeyBinding(
                new KeyBinding("key.kiln.menu", InputUtil.Type.KEYSYM, GLFW.GLFW_KEY_RIGHT_SHIFT, "category.kiln"));
        zoomKey = KeyBindingHelper.registerKeyBinding(
                new KeyBinding("key.kiln.zoom", InputUtil.Type.KEYSYM, GLFW.GLFW_KEY_C, "category.kiln"));

        HudRenderCallback.EVENT.register((ctx, tick) -> Hud.render(ctx));

        ClientTickEvents.END_CLIENT_TICK.register(mc -> {
            while (menuKey.wasPressed()) mc.setScreen(new ModulesScreen());
            if (mc.player != null) Modules.tickAll(mc);
        });

        // put the player's original settings back before options are written to disk
        ClientLifecycleEvents.CLIENT_STOPPING.register(mc -> {
            Modules.restoreAll(mc);
            mc.options.write();
        });
    }
}
