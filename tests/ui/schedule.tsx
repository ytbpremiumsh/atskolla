import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {ClassScheduleBoard} from '../../src/components/schedule/ClassScheduleBoard';
import {ScheduleEditor} from '../../src/components/schedule/ScheduleEditor';
import AllFeatures from '../../src/pages/AllFeatures';
import type {ScheduleEntry, ScheduleForm} from '../../src/lib/classSchedule';
import '../../src/index.css';
const classes=[{id:'a',name:'7A'},{id:'b',name:'7B'},{id:'c',name:'8A'}];
const teachers=[{user_id:'t1',full_name:'Ahmad Fauzi, S.Pd.'},{user_id:'t2',full_name:'Budi Santoso, M.Pd.'},{user_id:'t3',full_name:'Dewi Sartika, S.Si.'}];
const subjects=[{id:'s1',name:'Al-Quran Hadits',color:'#6550be',is_active:true},{id:'s2',name:'Matematika',color:'#4f46e5',is_active:true},{id:'s3',name:'Ilmu Pengetahuan Alam (IPA)',color:'#0f9a79',is_active:true}];
const schedules:ScheduleEntry[]=[
{id:'1',teacher_id:'t1',subject_id:'s1',class_id:'a',day_of_week:0,start_time:'07:00',end_time:'08:20',room:'Ruang 7A',notes:'',is_active:true},
{id:'2',teacher_id:'t2',subject_id:'s2',class_id:'a',day_of_week:1,start_time:'07:00',end_time:'07:40',room:'Ruang 7A',notes:'',is_active:true},
{id:'3',teacher_id:'t3',subject_id:'s3',class_id:'a',day_of_week:2,start_time:'07:00',end_time:'07:40',room:'Lab IPA',notes:'',is_active:true},
{id:'4',teacher_id:'t1',subject_id:'s1',class_id:'a',day_of_week:3,start_time:'08:20',end_time:'09:00',room:'Ruang 7A',notes:'',is_active:true},
{id:'5',teacher_id:'t2',subject_id:'s2',class_id:'c',day_of_week:4,start_time:'09:30',end_time:'10:10',room:'Ruang 8A',notes:'',is_active:true}];
function Preview(){const [open,setOpen]=useState(false);const [editing,setEditing]=useState(false);const [value,setValue]=useState<ScheduleForm>({teacher_id:'',subject_id:'',class_id:'',day_of_week:0,start_time:'07:00',end_time:'08:00',room:'',notes:''});return <main className="mx-auto max-w-[1500px] p-4 sm:p-6">{location.search.includes('features')?<AllFeatures/>:<><ClassScheduleBoard classes={classes} teachers={teachers} subjects={subjects} schedules={schedules} isAdmin={!location.search.includes("readonly")} onAdd={defaults=>{setEditing(false);setValue({teacher_id:'',subject_id:'',class_id:'',day_of_week:0,start_time:'07:00',end_time:'08:00',room:'',notes:'',...defaults});setOpen(true)}} onEdit={entry=>{setEditing(true);setValue({...entry,room:entry.room||'',notes:entry.notes||''});setOpen(true)}} onDelete={()=>{}}/><ScheduleEditor open={open} onOpenChange={setOpen} editing={editing} saving={false} value={value} onChange={setValue} onSave={()=>{setOpen(false)}} teachers={teachers} subjects={subjects} classes={classes}/></>}</main>}
createRoot(document.getElementById('root')!).render(<BrowserRouter><Preview/></BrowserRouter>);
