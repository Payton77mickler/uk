package dev.kiln;

import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.text.Text;
import net.minecraft.util.Formatting;
import java.util.List;

/** In-game module menu (Right Shift): category switcher plus paged toggles. */
public class ModulesScreen extends Screen {
    private static int cat = 0, page = 0;
    private static final int PER_PAGE = 16;

    public ModulesScreen() { super(Text.literal("Kiln Modules")); }

    @Override
    protected void init() {
        List<String> cats = Modules.categories();
        if (cat >= cats.size()) cat = 0;
        List<Module> list = Modules.inCategory(cats.get(cat));
        int pages = Math.max(1, (list.size() + PER_PAGE - 1) / PER_PAGE);
        if (page >= pages) page = 0;
        int cx = this.width / 2;

        addDrawableChild(ButtonWidget.builder(Text.literal("<"), b -> { cat = (cat - 1 + cats.size()) % cats.size(); page = 0; clearAndInit(); })
                .dimensions(cx - 110, 16, 20, 20).build());
        ButtonWidget title = ButtonWidget.builder(Text.literal(cats.get(cat) + " (" + list.size() + ")"), b -> {})
                .dimensions(cx - 86, 16, 172, 20).build();
        title.active = false;
        addDrawableChild(title);
        addDrawableChild(ButtonWidget.builder(Text.literal(">"), b -> { cat = (cat + 1) % cats.size(); page = 0; clearAndInit(); })
                .dimensions(cx + 90, 16, 20, 20).build());

        int from = page * PER_PAGE, to = Math.min(list.size(), from + PER_PAGE);
        for (int i = from; i < to; i++) {
            Module m = list.get(i - 0);
            int idx = i - from, col = idx % 2, row = idx / 2;
            addDrawableChild(ButtonWidget.builder(label(m), b -> { Modules.set(m.id, !m.enabled); clearAndInit(); })
                    .dimensions(cx - 156 + col * 158, 46 + row * 22, 154, 20).build());
        }

        int by = 46 + 8 * 22 + 6;
        ButtonWidget prev = ButtonWidget.builder(Text.literal("Prev page"), b -> { page--; clearAndInit(); })
                .dimensions(cx - 156, by, 76, 20).build();
        ButtonWidget next = ButtonWidget.builder(Text.literal("Next page"), b -> { page++; clearAndInit(); })
                .dimensions(cx - 78, by, 76, 20).build();
        prev.active = page > 0;
        next.active = page < pages - 1;
        addDrawableChild(prev);
        addDrawableChild(next);
        addDrawableChild(ButtonWidget.builder(Text.literal("Done"), b -> close()).dimensions(cx + 6, by, 154, 20).build());
    }

    private static Text label(Module m) {
        return Text.literal(m.name).formatted(m.enabled ? Formatting.GREEN : Formatting.GRAY);
    }

    @Override
    public void render(DrawContext ctx, int mouseX, int mouseY, float delta) {
        super.render(ctx, mouseX, mouseY, delta);
    }
}
