package dev.kiln;

import java.util.ArrayDeque;

public final class Cps {
    private static final ArrayDeque<Long> LEFT = new ArrayDeque<>(), RIGHT = new ArrayDeque<>();

    public static void click(int button) {
        long now = System.currentTimeMillis();
        if (button == 0) LEFT.add(now); else if (button == 1) RIGHT.add(now);
    }
    public static int left() { return count(LEFT); }
    public static int right() { return count(RIGHT); }

    private static int count(ArrayDeque<Long> q) {
        long cutoff = System.currentTimeMillis() - 1000;
        while (!q.isEmpty() && q.peekFirst() < cutoff) q.pollFirst();
        return q.size();
    }
}
