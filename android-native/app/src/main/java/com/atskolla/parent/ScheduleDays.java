package com.atskolla.parent;

/** Same day_of_week contract as the school dashboard: Monday=0 through Sunday=6. */
final class ScheduleDays {
    static final String[] NAMES = {"Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"};
    static int fromIsoDay(int day) {
        if (day < 1 || day > 7) throw new IllegalArgumentException("Hari tidak valid");
        return day - 1;
    }
    private ScheduleDays() {}
}
