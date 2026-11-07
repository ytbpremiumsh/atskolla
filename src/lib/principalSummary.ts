import {supabase} from '@/integrations/supabase/client';
import {fetchAllPages} from './pagedQuery';
import {getLocalDateString} from './dateLocal';
import {computeAvailableSaldo} from './bendaharaSaldo';
import {format,startOfMonth,subMonths} from 'date-fns';
export function buildFinanceSnapshot(invoices:any[],cash:any[],today:string,withdrawFee:number){
 const sum=(rows:any[],fn:(r:any)=>number)=>rows.reduce((n,r)=>n+fn(r),0);
 return {
  totalTagihan:sum(invoices,i=>Number(i.total_amount??0)),
  totalPembayaran:sum(invoices,i=>i.status==='paid'?Number(i.total_amount??0):Math.min(Number(i.installment_paid_amount??0),Number(i.total_amount??0))),
  tunggakan:sum(invoices.filter(i=>['pending','unpaid','partial'].includes(i.status)&&i.due_date&&i.due_date<today),i=>Math.max(0,Number(i.total_amount??0)-Number(i.installment_paid_amount??0))),
  saldoKas:sum(cash,c=>(c.direction==='in'?1:-1)*Number(c.amount??0)),
  danaPending:computeAvailableSaldo(invoices,withdrawFee).finalPayout,
  splitAllocated:sum(invoices.filter(i=>i.doku_split),i=>i.status==='paid'?Number(i.total_amount??0):Number(i.installment_paid_amount??0)),
 };
}
/** Compatibility until the reviewed database migration has been deployed. */
export async function loadPrincipalSummary(schoolId:string){
 const rpc=await supabase.rpc('principal_finance_summary',{p_school_id:schoolId});
 if(!rpc.error)return rpc.data as any;
 if(rpc.error.code!=='PGRST202'&&rpc.error.code!=='42883')throw rpc.error;
 const school=await supabase.from('schools').select('timezone').eq('id',schoolId).single();if(school.error)throw school.error;
 const timezone=school.data.timezone||'Asia/Jakarta';const today=getLocalDateString(timezone);
 const first=format(subMonths(startOfMonth(new Date(today+'T12:00:00')),5),'yyyy-MM-dd');
 const [invoices,cash,teacher,student,settings]=await Promise.all([
  fetchAllPages(()=>supabase.from('spp_invoices').select('id,total_amount,status,due_date,paid_at,doku_split,payment_method,settlement_id,net_amount,gateway_fee,installment_paid_amount').eq('school_id',schoolId)),
  fetchAllPages(()=>supabase.from('cash_book_entries').select('id,amount,direction,entry_date').eq('school_id',schoolId)),
  fetchAllPages(()=>supabase.from('teacher_attendance_logs').select('id,user_id,date').eq('school_id',schoolId).eq('status','hadir').eq('attendance_type','datang').gte('date',first)),
  fetchAllPages(()=>supabase.from('attendance_logs').select('id,student_id,date').eq('school_id',schoolId).eq('status','hadir').eq('attendance_type','datang').gte('date',first)),
  supabase.from('bendahara_settings').select('withdraw_fee_default').eq('school_id',schoolId).maybeSingle(),
 ]);if(settings.error)throw settings.error;
 const monthly=Array.from({length:6},(_,i)=>{const key=format(subMonths(startOfMonth(new Date(today+'T12:00:00')),5-i),'yyyy-MM');
 return {key:key+'-01',SPP:invoices.data.filter(i=>i.status==='paid'&&i.paid_at&&getLocalDateString(timezone,new Date(i.paid_at)).startsWith(key)).reduce((a,i)=>a+Number(i.total_amount??0),0),Pendapatan:cash.data.filter(c=>c.direction==='in'&&c.entry_date.startsWith(key)).reduce((a,c)=>a+c.amount,0),Pengeluaran:cash.data.filter(c=>c.direction==='out'&&c.entry_date.startsWith(key)).reduce((a,c)=>a+c.amount,0),Guru:teacher.data.filter(t=>t.date.startsWith(key)).length,Siswa:new Set(student.data.filter(t=>t.date.startsWith(key)).map(t=>t.student_id+':'+t.date)).size};});
 return {payments_today:invoices.data.filter(i=>i.status==='paid'&&i.paid_at&&getLocalDateString(timezone,new Date(i.paid_at))===today).length,finance:buildFinanceSnapshot(invoices.data,cash.data,today,settings.data?.withdraw_fee_default??3000),monthly,timezone};
}
