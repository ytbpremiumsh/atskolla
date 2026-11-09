import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, Users, MapPin, ChevronRight, PlayCircle, BookOpen, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS_FULL = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const DAYS_LETTER = ["S", "S", "R", "K", "J", "S", "M"];

interface Schedule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  class_id: string;
  subject_id: string;
  class_name?: string;
  subject_name?: string;
  subject_color?: string;
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function getStatus(startTime: string, endTime: string, now: Date): "upcoming" | "active" | "done" {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (currentMinutes >= start && currentMinutes < end) return "active";
  if (currentMinutes >= end) return "done";
  return "upcoming";
}

interface Props {
  weekSchedules: Record<number, Schedule[]>;
  todayDay: number;
  now: Date;
  totalSessions: number;
  onSelectSchedule: (s: Schedule) => void;
}

export function WeekScheduleCard({ weekSchedules, todayDay, now, totalSessions, onSelectSchedule }: Props) {
  // Default selected = today (or Monday if weekend)
  const initialDay = todayDay >= 0 && todayDay <= 6 ? todayDay : 0;
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const daySchedules = weekSchedules[selectedDay] || [];

  const totalCount = daySchedules.length;
  const activeCount = selectedDay === todayDay
    ? daySchedules.filter(s => getStatus(s.start_time, s.end_time, now) === "active").length
    : 0;

  return (
    <div className="rounded-3xl overflow-hidden shadow-elevated bg-card border border-border/40">
      {/* Hero Header */}
      <div className="relative bg-gradient-to-br from-primary via-primary to-[#4c5ded] px-5 pt-5 pb-16 sm:px-6 sm:pt-6 sm:pb-20 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute top-8 right-16 w-24 h-24 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 blur-2xl" />
        <svg className="absolute top-0 right-0 opacity-10" width="180" height="180" viewBox="0 0 180 180" fill="none">
          <pattern id="dots-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="white" />
          </pattern>
          <rect width="180" height="180" fill="url(#dots-pattern)" />
        </svg>

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-white/70 text-[11px] font-medium uppercase tracking-wider">Jadwal Mengajar</p>
              <h2 className="text-white text-xl sm:text-2xl font-bold leading-tight mt-0.5">Minggu Ini</h2>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-white" />
              <span className="text-white text-[11px] font-bold">{totalSessions} Sesi</span>
            </div>
          </div>

          {/* Day picker tabs */}
          <div className="flex items-center justify-between gap-1.5 sm:gap-2 mt-5">
            {[0, 1, 2, 3, 4, 5, 6].map((d) => {
              const isSelected = d === selectedDay;
              const isToday = d === todayDay;
              const dayCount = (weekSchedules[d] || []).length;
              return (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className={cn(
                    "flex flex-col items-center gap-1 flex-1 py-2 px-1 rounded-2xl transition-all relative",
                    isSelected
                      ? "bg-white text-primary shadow-lg scale-105"
                      : "text-white/80 hover:bg-white/10"
                  )}
                >
                  <span className={cn("text-[9px] font-bold uppercase tracking-wider", isSelected ? "text-primary/70" : "text-white/60")}>
                    {DAYS_FULL[d].slice(0, 3)}
                  </span>
                  <span className={cn("text-base sm:text-lg font-bold leading-none", isSelected ? "text-primary" : "text-white")}>
                    {DAYS_LETTER[d]}
                  </span>
                  {dayCount > 0 && (
                    <span className={cn(
                      "text-[8px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center mt-0.5",
                      isSelected ? "bg-primary/15 text-primary" : "bg-white/20 text-white"
                    )}>
                      {dayCount}
                    </span>
                  )}
                  {isToday && !isSelected && (
                    <span className="absolute -top-0.5 right-1 h-1.5 w-1.5 rounded-full bg-amber-400 ring-2 ring-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* White card content overlap */}
      <div className="relative -mt-10 mx-3 sm:mx-4 mb-4 bg-card rounded-2xl shadow-card border border-border/30 overflow-hidden">
        <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-border/40 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">{DAYS_FULL[selectedDay]}</p>
            <p className="text-sm font-bold flex items-center gap-2">
              {totalCount} Sesi
              {activeCount > 0 && (
                <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  {activeCount} LIVE
                </span>
              )}
            </p>
          </div>
          {selectedDay === todayDay && (
            <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-full">
              HARI INI
            </span>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={selectedDay}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="px-3 sm:px-4 py-4"
          >
            {daySchedules.length === 0 ? (
              <div className="text-center py-10">
                <div className="h-14 w-14 rounded-full bg-muted/40 flex items-center justify-center mx-auto mb-3">
                  <Calendar className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-semibold text-foreground">Hari Libur</p>
                <p className="text-xs text-muted-foreground mt-0.5">Tidak ada jadwal mengajar</p>
              </div>
            ) : (
              <div className="relative">
                {/* Vertical timeline line */}
                <div className="absolute left-[19px] top-3 bottom-3 w-px bg-border" />

                <div className="space-y-3">
                  {daySchedules.map((s, i) => {
                    const status = selectedDay === todayDay ? getStatus(s.start_time, s.end_time, now) : "upcoming";
                    const color = s.subject_color || "#5B6CF9";
                    return (
                      <motion.button
                        key={s.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => onSelectSchedule(s)}
                        className="w-full text-left flex gap-3 group"
                      >
                        {/* Timeline dot */}
                        <div className="flex flex-col items-center pt-3.5 shrink-0">
                          <div
                            className={cn(
                              "h-[10px] w-[10px] rounded-full ring-4 ring-card z-10 transition-all",
                              status === "active" && "shadow-[0_0_0_4px_rgba(16,185,129,0.2)]"
                            )}
                            style={{
                              backgroundColor: status === "done" ? "hsl(var(--muted-foreground) / 0.4)" : color,
                              borderColor: color,
                            }}
                          />
                        </div>

                        {/* Card */}
                        <div
                          className={cn(
                            "flex-1 rounded-xl border bg-background p-3 sm:p-3.5 transition-all group-hover:shadow-md group-hover:-translate-y-0.5 group-active:scale-[0.98]",
                            status === "active" && "border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 to-transparent shadow-[0_0_0_1px_rgba(16,185,129,0.15)]",
                            status === "done" && "opacity-65",
                            status === "upcoming" && "border-border/60 hover:border-primary/40"
                          )}
                          style={status === "active" ? undefined : { borderLeftWidth: "3px", borderLeftColor: color }}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono mb-0.5">
                                <Clock className="h-3 w-3" />
                                <span className="font-semibold">{s.start_time.slice(0, 5)}</span>
                                <span>—</span>
                                <span>{s.end_time.slice(0, 5)}</span>
                              </div>
                              <h3 className="text-sm sm:text-[15px] font-bold leading-tight truncate" style={{ color }}>
                                {s.subject_name}
                              </h3>
                            </div>
                            {status === "active" ? (
                              <span className="flex items-center gap-1 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 animate-pulse">
                                <PlayCircle className="h-2.5 w-2.5" /> LIVE
                              </span>
                            ) : status === "done" ? (
                              <span className="bg-muted text-muted-foreground text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0">
                                Selesai
                              </span>
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" /> Kelas {s.class_name}
                            </span>
                            {s.room && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {s.room}
                              </span>
                            )}
                            {selectedDay === todayDay && status === "upcoming" && (
                              <span className="flex items-center gap-1 ml-auto text-amber-600 font-medium">
                                <BookOpen className="h-3 w-3" /> Akan datang
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
