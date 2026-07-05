
-- Notifications: hot query "order by created_at desc" + filter per sekolah
CREATE INDEX IF NOT EXISTS idx_notifications_created_desc
  ON public.notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_school_created
  ON public.notifications (school_id, created_at DESC);

-- Teaching reminder scan (edge function tiap menit) — partial index utk kondisi WHERE
CREATE INDEX IF NOT EXISTS idx_school_integrations_reminder_scan
  ON public.school_integrations (school_id)
  WHERE teaching_reminder_enabled = true AND is_active = true;

-- Teaching schedules: hot query filter (school_id, day_of_week, is_active, start_time)
CREATE INDEX IF NOT EXISTS idx_teaching_schedules_lookup
  ON public.teaching_schedules (school_id, day_of_week, is_active, start_time);

-- Students by school (listing, dashboards)
CREATE INDEX IF NOT EXISTS idx_students_school_id
  ON public.students (school_id);
CREATE INDEX IF NOT EXISTS idx_students_school_class
  ON public.students (school_id, class);

-- SPP invoices recent list per school
CREATE INDEX IF NOT EXISTS idx_spp_invoices_school_created
  ON public.spp_invoices (school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spp_invoices_student_created
  ON public.spp_invoices (student_id, created_at DESC);

-- Payment transactions (super admin & school)
CREATE INDEX IF NOT EXISTS idx_payment_tx_school_created
  ON public.payment_transactions (school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_tx_status_created
  ON public.payment_transactions (status, created_at DESC);

-- WA logs
CREATE INDEX IF NOT EXISTS idx_wa_message_logs_school_created
  ON public.wa_message_logs (school_id, created_at DESC);

-- Attendance logs per school+date already exists — add student-only latest lookup
CREATE INDEX IF NOT EXISTS idx_attendance_logs_school_created
  ON public.attendance_logs (school_id, created_at DESC);

-- School announcements
CREATE INDEX IF NOT EXISTS idx_school_announcements_school_created
  ON public.school_announcements (school_id, created_at DESC);

-- Login logs per school (super admin dashboards)
CREATE INDEX IF NOT EXISTS idx_login_logs_email
  ON public.login_logs (email);
