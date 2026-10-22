package dev.kiln.mixin;

import dev.kiln.Modules;
import net.minecraft.client.render.WorldRenderer;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(WorldRenderer.class)
public class WorldRendererMixin {
    @Inject(method = "renderWeather", at = @At("HEAD"), cancellable = true)
    private void kiln$noWeather(CallbackInfo ci) {
        if (Modules.on("noweather")) ci.cancel();
    }
}
