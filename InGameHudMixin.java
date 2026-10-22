package dev.kiln.mixin;

import dev.kiln.Modules;
import net.minecraft.client.gui.hud.InGameHud;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(InGameHud.class)
public class InGameHudMixin {
    @Inject(method = "renderVignetteOverlay", at = @At("HEAD"), cancellable = true)
    private void kiln$noVignette(CallbackInfo ci) {
        if (Modules.on("novignette")) ci.cancel();
    }

    @Inject(method = "renderStatusEffectOverlay", at = @At("HEAD"), cancellable = true)
    private void kiln$hidePotions(CallbackInfo ci) {
        if (Modules.on("hidevanillapotions")) ci.cancel();
    }
}
