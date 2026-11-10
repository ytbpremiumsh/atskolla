// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Create school
    const { data: school, error: schoolErr } = await supabaseAdmin
      .from('schools')
      .insert({ name: 'SD Negeri 1 Demo', address: 'Jl. Pendidikan No. 1, Jakarta' })
      .select()
      .single();

    if (schoolErr) throw schoolErr;

    // 2. Create admin user
    const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@admin.com',
      password: 'admin123',
      email_confirm: true,
      user_metadata: { full_name: 'Admin Demo' },
    });

    if (userErr) throw userErr;

    const userId = userData.user.id;

    // 3. Update profile with school_id
    await supabaseAdmin
      .from('profiles')
      .update({ school_id: school.id, full_name: 'Admin Demo' })
      .eq('user_id', userId);

    // 4. Assign school_admin role
    await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userId, role: 'school_admin' });

    // 5. Create classes
    const classNames = ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '5A'];
    const classInserts = classNames.map(name => ({ school_id: school.id, name }));
    await supabaseAdmin.from('classes').insert(classInserts);

    // 6. Create 20 demo students
    const students = [
      { name: 'Ahmad Rizki', class: '1A', student_id: 'STD001', parent_name: 'Budi Santoso', parent_phone: '081234567890', qr_code: 'QR-STD001', school_id: school.id },
      { name: 'Siti Nurhaliza', class: '1A', student_id: 'STD002', parent_name: 'Hendra Wijaya', parent_phone: '081234567891', qr_code: 'QR-STD002', school_id: school.id },
      { name: 'Muhammad Farel', class: '1B', student_id: 'STD003', parent_name: 'Andi Pratama', parent_phone: '081234567892', qr_code: 'QR-STD003', school_id: school.id },
      { name: 'Putri Ayu', class: '1B', student_id: 'STD004', parent_name: 'Dewi Lestari', parent_phone: '081234567893', qr_code: 'QR-STD004', school_id: school.id },
      { name: 'Rafi Pratama', class: '2A', student_id: 'STD005', parent_name: 'Joko Widodo', parent_phone: '081234567894', qr_code: 'QR-STD005', school_id: school.id },
      { name: 'Anisa Rahma', class: '2A', student_id: 'STD006', parent_name: 'Sri Mulyani', parent_phone: '081234567895', qr_code: 'QR-STD006', school_id: school.id },
      { name: 'Dimas Arya', class: '2B', student_id: 'STD007', parent_name: 'Bambang Susilo', parent_phone: '081234567896', qr_code: 'QR-STD007', school_id: school.id },
      { name: 'Zahra Putri', class: '2B', student_id: 'STD008', parent_name: 'Ratna Sari', parent_phone: '081234567897', qr_code: 'QR-STD008', school_id: school.id },
      { name: 'Farhan Maulana', class: '3A', student_id: 'STD009', parent_name: 'Agus Hermawan', parent_phone: '081234567898', qr_code: 'QR-STD009', school_id: school.id },
      { name: 'Nabila Azzahra', class: '3A', student_id: 'STD010', parent_name: 'Yuni Astuti', parent_phone: '081234567899', qr_code: 'QR-STD010', school_id: school.id },
      { name: 'Rizky Ramadhan', class: '3B', student_id: 'STD011', parent_name: 'Wahyu Setiawan', parent_phone: '081234567900', qr_code: 'QR-STD011', school_id: school.id },
      { name: 'Aisha Zahra', class: '3B', student_id: 'STD012', parent_name: 'Fitri Handayani', parent_phone: '081234567901', qr_code: 'QR-STD012', school_id: school.id },
      { name: 'Bayu Aditya', class: '4A', student_id: 'STD013', parent_name: 'Eko Prasetyo', parent_phone: '081234567902', qr_code: 'QR-STD013', school_id: school.id },
      { name: 'Cantika Dewi', class: '4A', student_id: 'STD014', parent_name: 'Siti Aminah', parent_phone: '081234567903', qr_code: 'QR-STD014', school_id: school.id },
      { name: 'Galih Pramono', class: '4A', student_id: 'STD015', parent_name: 'Teguh Santoso', parent_phone: '081234567904', qr_code: 'QR-STD015', school_id: school.id },
      { name: 'Halimah Tusadiah', class: '5A', student_id: 'STD016', parent_name: 'Ahmad Fauzi', parent_phone: '081234567905', qr_code: 'QR-STD016', school_id: school.id },
      { name: 'Irfan Hakim', class: '5A', student_id: 'STD017', parent_name: 'Nurul Hidayah', parent_phone: '081234567906', qr_code: 'QR-STD017', school_id: school.id },
      { name: 'Jasmine Putri', class: '5A', student_id: 'STD018', parent_name: 'Rini Wulandari', parent_phone: '081234567907', qr_code: 'QR-STD018', school_id: school.id },
      { name: 'Kevin Pratama', class: '1A', student_id: 'STD019', parent_name: 'Doni Kurniawan', parent_phone: '081234567908', qr_code: 'QR-STD019', school_id: school.id },
      { name: 'Lintang Sari', class: '2A', student_id: 'STD020', parent_name: 'Maya Anggraeni', parent_phone: '081234567909', qr_code: 'QR-STD020', school_id: school.id },
    ];

    const { error: studentsErr } = await supabaseAdmin.from('students').insert(students);
    if (studentsErr) throw studentsErr;

    return new Response(JSON.stringify({ success: true, school_id: school.id, user_id: userId, students_count: students.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
