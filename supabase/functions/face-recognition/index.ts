import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { captured_image, school_id } = await req.json();
    if (!captured_image || !school_id) {
      return new Response(JSON.stringify({ success: false, error: "captured_image dan school_id wajib diisi" }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Sistem langganan berpaket dihapus — semua sekolah boleh pakai Face Recognition.



    const [studentsRes, teachersRes, rolesRes] = await Promise.all([
      supabaseAdmin
        .from('students')
        .select('id, name, student_id, class, photo_url, parent_name, parent_phone')
        .eq('school_id', school_id)
        .not('photo_url', 'is', null),
      supabaseAdmin
        .from('profiles')
        .select('user_id, full_name, photo_url, qr_code')
        .eq('school_id', school_id)
        .not('photo_url', 'is', null),
      supabaseAdmin
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['teacher', 'staff', 'bendahara']),
    ]);

    if (studentsRes.error) throw studentsRes.error;
    const students = studentsRes.data || [];
    const allTeacherIds = new Set((rolesRes.data || []).map((r: any) => r.user_id));
    const teachers = (teachersRes.data || []).filter((t: any) => allTeacherIds.has(t.user_id));

    if (students.length === 0 && teachers.length === 0) {
      return new Response(JSON.stringify({ success: false, match: false, error: "Tidak ada data dengan foto" }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build image content for AI - send captured image + up to 15 students + 5 teachers
    const studentBatch = students.slice(0, 15);
    const teacherBatch = teachers.slice(0, 5);

    const studentList = studentBatch.map((s, i) =>
      `Person #${i + 1} [STUDENT]: Name="${s.name}", ID="${s.student_id}", Class="${s.class}"`
    ).join('\n');
    const teacherList = teacherBatch.map((t: any, i) =>
      `Person #${studentBatch.length + i + 1} [TEACHER]: Name="${t.full_name}"`
    ).join('\n');
    const combinedList = [studentList, teacherList].filter(Boolean).join('\n');

    const imageContent: any[] = [
      {
        type: "text",
        text: `You are a face recognition system for a school attendance app.
Compare the FIRST image (captured from camera) with the subsequent person photos.

Your task: Determine which person (if any) matches the face in the captured image.

Person list:
${combinedList}

The images follow in order: first is the captured image, then person photos in order (#1, #2, etc.).

IMPORTANT:
- If you find a match, respond ONLY with the JSON: {"match": true, "person_index": <number>}
- If no match is found, respond ONLY with: {"match": false}
- person_index is 1-based (first person = 1)
- Be reasonably lenient - same person with slightly different angle/lighting should match
- Do NOT include any other text, only the JSON`
      },
      {
        type: "image_url",
        image_url: { url: captured_image }
      }
    ];

    for (const s of studentBatch) {
      if (s.photo_url) imageContent.push({ type: "image_url", image_url: { url: s.photo_url } });
    }
    for (const t of teacherBatch) {
      if (t.photo_url) imageContent.push({ type: "image_url", image_url: { url: t.photo_url } });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: imageContent }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ success: false, match: false, error: "Terlalu banyak permintaan, coba lagi nanti" }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ success: false, match: false, error: "Kredit AI habis" }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    const jsonMatch = content.match(/\{[^}]+\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ success: true, match: false, error: "Could not parse AI response" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = JSON.parse(jsonMatch[0]);

    if (result.match && result.person_index) {
      const idx = result.person_index - 1;
      if (idx < studentBatch.length) {
        const m = studentBatch[idx];
        return new Response(JSON.stringify({
          success: true, match: true, type: "student",
          student: {
            id: m.id, name: m.name, student_id: m.student_id, class: m.class,
            photo_url: m.photo_url, parent_name: m.parent_name, parent_phone: m.parent_phone,
          }
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const tIdx = idx - studentBatch.length;
      if (tIdx >= 0 && tIdx < teacherBatch.length) {
        const t: any = teacherBatch[tIdx];
        return new Response(JSON.stringify({
          success: true, match: true, type: "teacher",
          teacher: {
            user_id: t.user_id, full_name: t.full_name, photo_url: t.photo_url, qr_code: t.qr_code || t.user_id,
          }
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    return new Response(JSON.stringify({ success: true, match: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Face recognition error:", error);
    return new Response(JSON.stringify({ success: false, match: false, error: error.message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
