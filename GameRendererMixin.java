package dev.kiln.mixin;

import dev.kiln.KilnClient;
import dev.kiln.Modules;
import net.minecraft.client.render.GameRenderer;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

@Mixin(GameRenderer.class)
public class GameRendererMixin {
    @Inject(method = "getFov", at = @At("RETURN"), cancellable = true)
    private void kiln$zoom(CallbackInfoReturnable<Double> cir) {
        if (Modules.on("zoom") && KilnClient.zoomHeld()) cir.setReturnValue(cir.getReturnValue() / 3.0);
    }

    @Inject(method = "tiltViewWhenHurt", at = @At("HEAD"), cancellable = true)
    private void kiln$noHurtCam(CallbackInfo ci) {
        if (Modules.on("nohurtcam")) ci.cancel();
    }
}
