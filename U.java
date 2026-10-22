package dev.kiln;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.ClientPlayerEntity;
import net.minecraft.client.network.PlayerListEntry;
import net.minecraft.client.network.ServerInfo;
import net.minecraft.entity.EquipmentSlot;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.util.hit.BlockHitResult;
import net.minecraft.util.hit.EntityHitResult;
import net.minecraft.util.hit.HitResult;

/** Small helpers used by generated module expressions. */
public final class U {
    private U() {}
    private static final long START = System.currentTimeMillis();
    private static double walked, lastX, lastZ;
    private static boolean walkInit;

    public static String ping(MinecraftClient mc) {
        if (mc.getNetworkHandler() == null || mc.player == null) return "-";
        PlayerListEntry e = mc.getNetworkHandler().getPlayerListEntry(mc.player.getUuid());
        return e == null ? "-" : e.getLatency() + " ms";
    }
    public static double speed(ClientPlayerEntity p) {
        double dx = p.getX() - p.prevX, dz = p.getZ() - p.prevZ;
        return Math.sqrt(dx * dx + dz * dz) * 20;
    }
    public static String walked(ClientPlayerEntity p) {
        if (walkInit) {
            double d = Math.hypot(p.getX() - lastX, p.getZ() - lastZ);
            if (d < 10) walked += d;
        }
        lastX = p.getX(); lastZ = p.getZ(); walkInit = true;
        return (int) walked + " m";
    }
    public static String session() {
        long s = (System.currentTimeMillis() - START) / 1000;
        return String.format("%d:%02d:%02d", s / 3600, (s / 60) % 60, s % 60);
    }
    public static String server(MinecraftClient mc) {
        ServerInfo e = mc.getCurrentServerEntry();
        return e == null ? (mc.isInSingleplayer() ? "Singleplayer" : "-") : e.address;
    }
    public static String biome(MinecraftClient mc) {
        return mc.world.getBiome(mc.player.getBlockPos()).getKey().map(k -> k.getValue().getPath()).orElse("?");
    }
    public static String durability(ItemStack s) {
        if (s.isEmpty() || !s.isDamageable()) return "-";
        return (s.getMaxDamage() - s.getDamage()) + "/" + s.getMaxDamage();
    }
    public static String armorDurability(ClientPlayerEntity p) {
        int cur = 0, max = 0;
        for (EquipmentSlot slot : new EquipmentSlot[]{EquipmentSlot.HEAD, EquipmentSlot.CHEST, EquipmentSlot.LEGS, EquipmentSlot.FEET}) {
            ItemStack s = p.getEquippedStack(slot);
            if (!s.isEmpty() && s.isDamageable()) { cur += s.getMaxDamage() - s.getDamage(); max += s.getMaxDamage(); }
        }
        return max == 0 ? "-" : (cur * 100 / max) + "%";
    }
    public static int count(ClientPlayerEntity p, Item item) {
        int n = 0;
        for (int i = 0; i < p.getInventory().size(); i++) {
            ItemStack s = p.getInventory().getStack(i);
            if (s.isOf(item)) n += s.getCount();
        }
        return n;
    }
    public static int freeSlots(ClientPlayerEntity p) {
        int n = 0;
        for (int i = 0; i < 36; i++) if (p.getInventory().getStack(i).isEmpty()) n++;
        return n;
    }
    public static String memory() {
        Runtime r = Runtime.getRuntime();
        return ((r.totalMemory() - r.freeMemory()) >> 20) + "/" + (r.maxMemory() >> 20) + " MB";
    }
    public static int memoryPercent() {
        Runtime r = Runtime.getRuntime();
        return (int) ((r.totalMemory() - r.freeMemory()) * 100 / r.maxMemory());
    }
    public static String targetBlock(MinecraftClient mc) {
        if (mc.crosshairTarget instanceof BlockHitResult b && b.getType() == HitResult.Type.BLOCK)
            return mc.world.getBlockState(b.getBlockPos()).getBlock().getName().getString();
        return "-";
    }
    public static String targetPos(MinecraftClient mc) {
        if (mc.crosshairTarget instanceof BlockHitResult b && b.getType() == HitResult.Type.BLOCK)
            return b.getBlockPos().getX() + " " + b.getBlockPos().getY() + " " + b.getBlockPos().getZ();
        return "-";
    }
    public static String targetEntity(MinecraftClient mc) {
        if (mc.crosshairTarget instanceof EntityHitResult e) return e.getEntity().getName().getString();
        return "-";
    }
    public static String targetDistance(MinecraftClient mc) {
        HitResult h = mc.crosshairTarget;
        if (h == null || h.getType() == HitResult.Type.MISS) return "-";
        return String.format("%.1f", mc.player.getCameraPosVec(1f).distanceTo(h.getPos()));
    }
}
