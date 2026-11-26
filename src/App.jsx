import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3, CalendarDays, ChevronLeft, ChevronRight, Download,
  FileText, GraduationCap, LayoutDashboard, Menu, Moon, Plus,
  Search, Settings as SettingsIcon, Sun, Trash2, UserRound, Users, X, Bell, Pencil, LogOut, LockKeyhole
} from 'lucide-react'
import { BarChart, Bar, CartesianGrid, Cell, PieChart, Pie, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import './App.css'

const ETH_MONTHS = ['መስከረም','ጥቅምት','ኅዳር','ታኅሣሥ','ጥር','የካቲት','መጋቢት','ሚያዝያ','ግንቦት','ሰኔ','ሐምሌ','ነሐሴ','ጳጉሜ']

const sampleNames = [
  ['Abel Tesfaye','Male','Grade 8'],['Betelhem Kebede','Female','Grade 8'],['Daniel Alemayehu','Male','Grade 8'],
  ['Eden Mekonnen','Female','Grade 9'],['Feven Girma','Female','Grade 9'],['Henok Solomon','Male','Grade 9'],
  ['Ioanna Berhanu','Female','Grade 7'],['Kaleab Tadesse','Male','Grade 7'],['Liya Desta','Female','Grade 7'],
  ['Mekdes Haile','Female','Grade 8'],['Nahom Worku','Male','Grade 9'],['Rahel Yohannes','Female','Grade 8'],
  ['Samuel Bekele','Male','Grade 7'],['Sara Alemu','Female','Grade 9'],['Tewodros Assefa','Male','Grade 8'],
  ['Tsion Getachew','Female','Grade 7'],['Yonas Fikadu','Male','Grade 9'],['Yordanos Tesema','Female','Grade 8'],
  ['Zekarias Lemma','Male','Grade 7'],['Meron Abebe','Female','Grade 9']
]

const initialStudents = sampleNames.map(([name,gender,grade], i) => ({
  id: `ST-${String(i+1).padStart(3,'0')}`, name, gender, age: 12+(i%5), grade,
  phone: `+251 9${String(12+i).padStart(2,'0')} ${String(345+i*7).padStart(3,'0')} ${String(210+i*3).padStart(3,'0')}`,
  guardian: `${name.split(' ')[0]} Parent`, guardianPhone: `+251 91 ${100+i} ${200+i}`,
  enrolled: '2026-09-12', status: i===19?'Inactive':'Active',
  photo: `https://i.pravatar.cc/160?img=${i+11}`
}))

const initialHolidays = [
  { id:1, name:'Ethiopian New Year', date:'2026-09-11', category:'National', schoolDay:false, description:'Enkutatash — Ethiopian New Year.' },
  { id:2, name:'Meskel', date:'2026-09-27', category:'Orthodox', schoolDay:false, description:'The Finding of the True Cross.' },
  { id:3, name:'Genna', date:'2027-01-07', category:'Orthodox', schoolDay:false, description:'Ethiopian Christmas.' },
  { id:4, name:'Adwa Victory Day', date:'2027-03-02', category:'National', schoolDay:false, description:'Commemorates the victory at Adwa.' },
  { id:5, name:'World Environment Day', date:'2027-06-05', category:'International', schoolDay:true, description:'International environmental awareness day.' }
]

const navItems = [
  ['Dashboard',LayoutDashboard],['Students',Users],['Attendance',GraduationCap],['Calendar',CalendarDays],
  ['Holidays',Bell],['Attendance Reports',FileText],['Settings',SettingsIcon]
]
const demoAccounts = {
  Admin: { email: 'admin@school.edu', password: '12345', name: 'School Administrator' },
  Teacher: { email: 'teacher@school.edu', password: '12345', name: 'Mr. Dawit' }
}

function dateKey(date) {
  const d = new Date(date)
  d.setMinutes(d.getMinutes()-d.getTimezoneOffset())
  return d.toISOString().slice(0,10)
}

function getEthParts(date) {
  const formatter = new Intl.DateTimeFormat('en-US-u-ca-ethiopic-nu-latn', {year:'numeric',month:'numeric',day:'numeric'})
  const parts = Object.fromEntries(formatter.formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]))
  return { year:Number(parts.year), month:Number(parts.month), day:Number(parts.day) }
}

function ethToGreg(year, month, day) {
  const target = {year,month,day}
  for(let offset=-15; offset<61; offset++) {
    const d = new Date(year+7, 8, 11+offset)
    if (getEthParts(d).year===target.year && getEthParts(d).month===target.month && getEthParts(d).day===target.day) return d
  }
  return new Date(year+7,8,11)
}

function formatGregorian(date) {
  return date.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}) + ' G.C.'
}

function formatEthiopian(date) {
  const e = getEthParts(date)
  return `${e.day} ${ETH_MONTHS[e.month-1]} ${e.year} E.C.`
}

function load(key,fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

export default function App() {
  const [user,setUser]=useState(()=>load('currentUser',null))
  const [page,setPage]=useState('Dashboard')
  const [sidebar,setSidebar]=useState(true)
  const [mobileOpen,setMobileOpen]=useState(false)
  const [dark,setDark]=useState(load('theme',false))
  const [students,setStudents]=useState(()=>load('students',initialStudents))
  const [attendance,setAttendance]=useState(()=>load('attendance',{}))
  const [holidays,setHolidays]=useState(()=>load('holidays',initialHolidays))
  const [settings,setSettings]=useState(()=>load('settings',{schoolName:'Addis International School',teacher:'Mr. Dawit',academicYear:'2019 E.C.',calendar:'Dual Calendar',workingDays:['Mon','Tue','Wed','Thu','Fri']}))
  const [toast,setToast]=useState('')

  useEffect(()=>localStorage.setItem('students',JSON.stringify(students)),[students])
  useEffect(()=>localStorage.setItem('attendance',JSON.stringify(attendance)),[attendance])
  useEffect(()=>localStorage.setItem('holidays',JSON.stringify(holidays)),[holidays])
  useEffect(()=>localStorage.setItem('settings',JSON.stringify(settings)),[settings])
  useEffect(()=>localStorage.setItem('theme',JSON.stringify(dark)),[dark])

  const notify=(text)=>{setToast(text); setTimeout(()=>setToast(''),2600)}
  const today=new Date()
  const signOut=()=>{localStorage.removeItem('currentUser');setUser(null);setPage('Dashboard')}

  if (!user) {
    return <Login onLogin={(account)=>{localStorage.setItem('currentUser',JSON.stringify(account));setUser(account)}}/>
  }
  const visibleNav=user.role==='Admin'?navItems:navItems.filter(([label])=>!['Students','Holidays','Settings'].includes(label))

  return (
    <div className={dark?'app dark':'app'}>
      <aside id="primary-navigation" className={`sidebar${sidebar?'':' collapsed'}${mobileOpen?' mobile-open':''}`}>
        <div className="brand"><div className="brand-mark"><GraduationCap size={22}/></div>{sidebar&&<div><strong>My Students</strong><small>Attendance System</small></div>}</div>
        <button className="mobile-sidebar-close" aria-label="Close navigation" onClick={()=>setMobileOpen(false)}><X size={20}/></button>
        <nav>{visibleNav.map(([label,Icon])=><button key={label} className={page===label?'nav-item active':'nav-item'} onClick={()=>{setPage(label);setMobileOpen(false)}} title={label}><Icon size={20}/>{sidebar&&<span>{label}</span>}</button>)}</nav>
        <button className="collapse" onClick={()=>setSidebar(!sidebar)}>{sidebar?<ChevronLeft size={18}/>:<ChevronRight size={18}/>}</button>
      </aside>
      {mobileOpen&&<button className="mobile-backdrop" aria-label="Close navigation" onClick={()=>setMobileOpen(false)}/>}
      <main>
        <header className="topbar">
          <button type="button" className="icon-btn mobile-menu" aria-label={mobileOpen?'Close navigation':'Open navigation'} aria-expanded={mobileOpen} aria-controls="primary-navigation" onClick={()=>setMobileOpen(!mobileOpen)}><Menu size={20}/></button>
          <div className="dates"><strong>{formatEthiopian(today)}</strong><span>{formatGregorian(today)}</span></div>
          <div className="top-actions">
            <button className="icon-btn" onClick={()=>setDark(!dark)}>{dark?<Sun size={19}/>:<Moon size={19}/>}</button>
            <button className="icon-btn"><Bell size={19}/><i/></button>
            <div className="avatar">{user.name.split(' ').map(part=>part[0]).slice(0,2).join('').toUpperCase()}</div><div className="profile"><strong>{user.name}</strong><span>{user.role}</span></div>
            <button className="icon-btn" aria-label="Sign out" title="Sign out" onClick={signOut}><LogOut size={18}/></button>
          </div>
        </header>
        <section className="content">
          {page==='Dashboard'&&<Dashboard students={students} attendance={attendance} holidays={holidays} setPage={setPage}/>}
          {page==='Students'&&<Students students={students} setStudents={setStudents} notify={notify}/>}
          {page==='Attendance'&&<Attendance students={students} attendance={attendance} setAttendance={setAttendance} notify={notify}/>}
          {page==='Calendar'&&<CalendarView attendance={attendance} holidays={holidays}/>}
          {page==='Holidays'&&<Holidays holidays={holidays} setHolidays={setHolidays} notify={notify}/>}
          {page==='Attendance Reports'&&<Reports students={students} attendance={attendance}/>}
          {page==='Settings'&&<Settings settings={settings} setSettings={setSettings} notify={notify}/>}
        </section>
      </main>
      {toast&&<div className="toast">{toast}</div>}
    </div>
  )
}

function Login({onLogin}) {
  const [role,setRole]=useState('Admin')
  const [email,setEmail]=useState(demoAccounts.Admin.email)
  const [password,setPassword]=useState('')
  const [error,setError]=useState('')
  const account=demoAccounts[role]
  const submit=(event)=>{
    event.preventDefault()
    if(email.trim().toLowerCase()!==account.email||password!==account.password) {
      setError('Email or password is incorrect for this account.')
      return
    }
    onLogin({name:account.name,email:account.email,role})
  }
  const selectRole=(nextRole)=>{setRole(nextRole);setEmail(demoAccounts[nextRole].email);setPassword('');setError('')}
  return <div className="login-page">
    <div className="login-card">
      <div className="login-brand"><span className="brand-mark"><GraduationCap size={23}/></span><div><strong>My Students</strong><small>Attendance Management</small></div></div>
      <div className="login-intro"><h1>Welcome back</h1><p>Sign in to manage your classroom.</p></div>
      <div className="role-picker" aria-label="Choose account type">
        {['Admin','Teacher'].map(option=><button type="button" key={option} className={role===option?'role-choice selected':'role-choice'} onClick={()=>selectRole(option)}><span className="role-icon">{option==='Admin'?<LockKeyhole size={18}/>:<GraduationCap size={19}/>}</span><span><strong>{option}</strong><small>{option==='Admin'?'Full access':'Classroom access'}</small></span></button>)}
      </div>
      <form className="login-form" onSubmit={submit}>
        <label>Email address<input type="email" autoComplete="username" value={email} onChange={event=>setEmail(event.target.value)} required/></label>
        <label>Password<input type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={event=>setPassword(event.target.value)} required/></label>
        {error&&<p className="login-error" role="alert">{error}</p>}
        <button className="primary login-submit">Sign in as {role}</button>
      </form>
      <div className="demo-hint"><strong>Demo credentials</strong><span>{account.email}</span><span>Password: {account.password}</span></div>
      <p className="login-foot">Ethiopian and Gregorian attendance tracking</p>
    </div>
    <div className="login-decoration"><div className="decoration-orbit orbit-one"/><div className="decoration-orbit orbit-two"/><div className="decoration-mark"><GraduationCap size={60}/></div><p>Make every school day count.</p></div>
  </div>
}

function PageTitle({title,subtitle,action}) {
  return <div className="page-title"><div><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div>{action}</div>
}

function Dashboard({students,attendance,holidays,setPage}) {
  const key=dateKey(new Date())
  const todayRecord=attendance[key]||{}
  const counts={Present:0,Absent:0,Late:0,Excused:0}
  Object.values(todayRecord).forEach(v=>{if(counts[v.status]!=null)counts[v.status]++})
  const cards=[
    ['Total Students',students.length,'users','blue'],['Present Today',counts.Present,'check','green'],
    ['Absent Today',counts.Absent,'x','red'],['Late Students',counts.Late,'clock','orange'],
    ['Attendance %',students.length?Math.round((counts.Present/students.length)*100):0,'percent','purple']
  ]
  const weekly=[{name:'Mon',present:14,absent:4},{name:'Tue',present:16,absent:3},{name:'Wed',present:15,absent:3},{name:'Thu',present:17,absent:2},{name:'Fri',present:counts.Present||13,absent:counts.Absent||3}]
  const pie=[{name:'Present',value:counts.Present},{name:'Absent',value:counts.Absent},{name:'Late',value:counts.Late},{name:'Excused',value:counts.Excused}]
  const colors=['#20a779','#ef5b60','#f59e0b','#4b75d1']
  return <>
    <PageTitle title="Dashboard" subtitle="Welcome back! Here is your attendance overview." action={<button className="primary" onClick={()=>setPage('Attendance')}>Record Attendance</button>}/>
    <div className="summary-grid">{cards.map(([label,value,icon,color])=><div className="summary-card" key={label}><div className={`summary-icon ${color}`}>{icon==='users'?<Users/>:icon==='check'?'✓':icon==='x'?'×':icon==='clock'?'◷':'%'}</div><div><span>{label}</span><strong>{value}{label==='Attendance %'?'%':''}</strong></div></div>)}</div>
    <div className="chart-grid">
      <div className="panel"><div className="panel-head"><div><h3>Weekly Attendance</h3><p>Monday — Friday</p></div></div><div className="chart"><ResponsiveContainer><BarChart data={weekly}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="present" fill="#1c6b9a" radius={[5,5,0,0]}/><Bar dataKey="absent" fill="#ef5b60" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></div>
      <div className="panel"><div className="panel-head"><div><h3>Today's Status</h3><p>Attendance distribution</p></div></div><div className="chart pie-chart"><ResponsiveContainer><PieChart><Pie data={pie} dataKey="value" innerRadius={55} outerRadius={82} paddingAngle={3}>{pie.map((_,i)=><Cell key={i} fill={colors[i]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div></div>
    </div>
    <div className="bottom-grid">
      <div className="panel"><div className="panel-head"><h3>Upcoming Holidays</h3><button onClick={()=>setPage('Holidays')}>View all</button></div><div className="holiday-list">{holidays.slice(0,4).map(h=><div className="holiday-row" key={h.id}><div className="date-box"><strong>{new Date(h.date+'T12:00').getDate()}</strong><span>{new Date(h.date+'T12:00').toLocaleString('en',{month:'short'})}</span></div><div><strong>{h.name}</strong><p>{h.category} • {h.schoolDay?'School day':'Non-school day'}</p></div></div>)}</div></div>
      <div className="panel"><div className="panel-head"><h3>Recent Activities</h3></div><div className="activities"><div><span className="activity-dot green"/> <p><strong>Attendance recorded</strong><small>Today, 8:15 AM</small></p></div><div><span className="activity-dot blue"/> <p><strong>{students[0]?.name} added</strong><small>Yesterday, 3:40 PM</small></p></div><div><span className="activity-dot orange"/> <p><strong>Attendance updated</strong><small>Yesterday, 10:20 AM</small></p></div></div></div>
    </div>
  </>
}

function Students({students,setStudents,notify}) {
  const [search,setSearch]=useState('')
  const [gender,setGender]=useState('All')
  const [modal,setModal]=useState(null)
  const filtered=students.filter(s=>(gender==='All'||s.gender===gender)&&(`${s.name} ${s.id}`).toLowerCase().includes(search.toLowerCase()))
  const save=(e)=>{
    e.preventDefault(); const fd=new FormData(e.currentTarget); const data=Object.fromEntries(fd.entries())
    if(modal.id) setStudents(students.map(s=>s.id===modal.id?{...s,...data}:s))
    else setStudents([...students,{...data,id:`ST-${String(students.length+1).padStart(3,'0')}`,photo:`https://i.pravatar.cc/160?img=${students.length+21}` }])
    setModal(null); notify(modal.id?'Student updated successfully':'Student added successfully')
  }
  return <>
    <PageTitle title="Students" subtitle={`${students.length} students enrolled`} action={<button className="primary" onClick={()=>setModal({})}><Plus size={17}/>Add Student</button>}/>
    <div className="toolbar"><div className="search"><Search size={17}/><input placeholder="Search name or ID..." value={search} onChange={e=>setSearch(e.target.value)}/></div><select value={gender} onChange={e=>setGender(e.target.value)}><option>All</option><option>Male</option><option>Female</option></select></div>
    <div className="table-wrap"><table><thead><tr><th>Student</th><th>Student ID</th><th>Gender</th><th>Age</th><th>Grade</th><th>Guardian</th><th>Status</th><th></th></tr></thead><tbody>{filtered.map(s=><tr key={s.id}><td><div className="student-cell"><img src={s.photo} alt="" onError={e=>e.currentTarget.style.visibility='hidden'}/><strong>{s.name}</strong></div></td><td>{s.id}</td><td>{s.gender}</td><td>{s.age}</td><td>{s.grade}</td><td><strong>{s.guardian}</strong><small>{s.guardianPhone}</small></td><td><span className={`status ${s.status.toLowerCase()}`}>{s.status}</span></td><td><button className="icon-btn" onClick={()=>setModal(s)}><Pencil size={16}/></button><button className="icon-btn danger" onClick={()=>{if(confirm(`Delete ${s.name}?`)){setStudents(students.filter(x=>x.id!==s.id));notify('Student deleted')}}}><Trash2 size={16}/></button></td></tr>)}</tbody></table></div>
    {modal&&<div className="modal-backdrop"><form className="modal" onSubmit={save}><div className="modal-head"><h2>{modal.id?'Edit Student':'Add New Student'}</h2><button type="button" className="icon-btn" onClick={()=>setModal(null)}><X/></button></div><div className="form-grid">{[['name','Full Name'],['guardian','Guardian Name'],['guardianPhone','Guardian Phone'],['phone','Phone Number'],['age','Age'],['enrolled','Enrollment Date']].map(([key,label])=><label key={key}>{label}<input name={key} type={key==='age'?'number':key==='enrolled'?'date':'text'} defaultValue={modal[key]||''} required/></label>)}<label>Gender<select name="gender" defaultValue={modal.gender||'Male'}><option>Male</option><option>Female</option></select></label><label>Grade<select name="grade" defaultValue={modal.grade||'Grade 7'}>{['Grade 7','Grade 8','Grade 9'].map(g=><option key={g}>{g}</option>)}</select></label><label>Status<select name="status" defaultValue={modal.status||'Active'}><option>Active</option><option>Inactive</option></select></label></div><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setModal(null)}>Cancel</button><button className="primary">Save Student</button></div></form></div>}
  </>
}

function Attendance({students,attendance,setAttendance,notify}) {
  const [date,setDate]=useState(dateKey(new Date()))
  const [search,setSearch]=useState('')
  const record=attendance[date]||{}
  const setStatus=(id,status)=>setAttendance({...attendance,[date]:{...(attendance[date]||{}),[id]:{status,note:(attendance[date]?.[id]?.note||'')}}})
  const filtered=students.filter(s=>s.name.toLowerCase().includes(search.toLowerCase())
  )
  const counts=Object.values(record).reduce((a,r)=>({...a,[r.status]: (a[r.status]||0)+1}),{})
  const markAll=()=>setAttendance({...attendance,[date]:Object.fromEntries(students.map(s=>[s.id,{status:'Present',note:''}]))})
  const save=()=>notify('Attendance saved successfully')
  return <>
    <PageTitle title="Daily Attendance" subtitle="Record and manage student attendance" action={<button className="primary" onClick={save}>Save Attendance</button>}/>
    <div className="attendance-controls"><div className="search"><Search size={17}/><input placeholder="Search student..." value={search} onChange={e=>setSearch(e.target.value)}/></div><label>Attendance Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><button className="secondary" onClick={markAll}>Mark All Present</button></div>
    <div className="attendance-stats"><div><span>Present</span><strong className="green-text">{counts.Present||0}</strong></div><div><span>Absent</span><strong className="red-text">{counts.Absent||0}</strong></div><div><span>Late</span><strong className="orange-text">{counts.Late||0}</strong></div><div><span>Excused</span><strong className="blue-text">{counts.Excused||0}</strong></div></div>
    <div className="attendance-list">{filtered.map(s=><div className="attendance-row" key={s.id}><div className="student-cell"><img src={s.photo} alt=""/><div><strong>{s.name}</strong><small>{s.id} • {s.grade}</small></div></div><div className="status-buttons">{['Present','Absent','Late','Excused'].map(st=><button key={st} className={(record[s.id]?.status===st?`active ${st.toLowerCase()}`:`${st.toLowerCase()}`)} onClick={()=>setStatus(s.id,st)}>{st}</button>)}</div><input className="note" placeholder="Note..." value={record[s.id]?.note||''} onChange={e=>setAttendance({...attendance,[date]:{...(attendance[date]||{}),[s.id]:{status:record[s.id]?.status||'Present',note:e.target.value}}})}/></div>)}</div>
  </>
}

function CalendarView({attendance,holidays}) {
  const [cursor,setCursor]=useState(new Date())
  const [calendar,setCalendar]=useState('Dual')
  const year=cursor.getFullYear(), month=cursor.getMonth()
  const first=new Date(year,month,1), start=new Date(first); start.setDate(1-first.getDay())
  const days=[]
  for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);days.push(d)}
  const eth=getEthParts(cursor)
  const move=(n)=>setCursor(new Date(year,month+n,1))
  return <>
    <PageTitle title="Calendar" subtitle="Ethiopian and Gregorian calendar" action={<select className="calendar-select" value={calendar} onChange={e=>setCalendar(e.target.value)}><option>Dual Calendar</option><option>Ethiopian Calendar</option><option>Gregorian Calendar</option></select>}/>
    <div className="calendar-layout"><div className="panel calendar-panel"><div className="calendar-head"><button className="icon-btn" onClick={()=>move(-1)}><ChevronLeft/></button><div><h3>{cursor.toLocaleString('en',{month:'long',year:'numeric'})}</h3>{calendar!== 'Gregorian Calendar'&&<p>{ETH_MONTHS[eth.month-1]} {eth.year} E.C.</p>}</div><button className="icon-btn" onClick={()=>move(1)}><ChevronRight/></button></div><div className="weekdays">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><span key={d}>{d}</span>)}</div><div className="month-grid">{days.map(d=>{const key=dateKey(d);const e=getEthParts(d);const holiday=holidays.find(h=>h.date===key);const recorded=attendance[key];return <button key={key} className={`${d.getMonth()!==month?'muted':''} ${key===dateKey(new Date())?'today':''}`} onClick={()=>setCursor(d)}><strong>{d.getDate()}</strong>{calendar!=='Gregorian Calendar'&&<small>{e.day} {e.month===eth.month?ETH_MONTHS[e.month-1]:''}</small>}{holiday&&<i className="holiday-dot"/>}{recorded&&<i className="attendance-dot"/>}</button>})}</div></div><div className="panel upcoming"><h3>Upcoming Holidays</h3>{holidays.map(h=><div className="holiday-row" key={h.id}><div className="date-box"><strong>{new Date(h.date+'T12:00').getDate()}</strong><span>{new Date(h.date+'T12:00').toLocaleString('en',{month:'short'})}</span></div><div><strong>{h.name}</strong><p>{h.category}</p></div></div>)}</div></div>
  </>
}

function Holidays({holidays,setHolidays,notify}) {
  const [modal,setModal]=useState(null)
  const save=(e)=>{e.preventDefault();const fd=new FormData(e.currentTarget);const data=Object.fromEntries(fd.entries());data.schoolDay=data.schoolDay==='on';data.id=modal.id||Date.now();if(modal.id)setHolidays(holidays.map(h=>h.id===modal.id?{...h,...data}:h));else setHolidays([...holidays,data]);setModal(null);notify('Holiday saved successfully')}
  return <>
    <PageTitle title="Holidays" subtitle="Manage national, religious, and international holidays" action={<button className="primary" onClick={()=>setModal({})}><Plus size={17}/>Add Holiday</button>}/>
    <div className="holiday-cards">{holidays.map(h=><div className="holiday-card" key={h.id}><div className={`category ${h.category.toLowerCase()}`}>{h.category}</div><h3>{h.name}</h3><p>{h.description}</p><div className="holiday-card-foot"><span>{new Date(h.date+'T12:00').toLocaleDateString('en',{month:'long',day:'numeric',year:'numeric'})}</span><div><button className="icon-btn" onClick={()=>setModal(h)}><Pencil size={16}/></button><button className="icon-btn danger" onClick={()=>setHolidays(holidays.filter(x=>x.id!==h.id))}><Trash2 size={16}/></button></div></div></div>)}</div>
    {modal&&<div className="modal-backdrop"><form className="modal" onSubmit={save}><div className="modal-head"><h2>{modal.id?'Edit Holiday':'Add Holiday'}</h2><button type="button" className="icon-btn" onClick={()=>setModal(null)}><X/></button></div><div className="form-grid"><label>Holiday Name<input name="name" defaultValue={modal.name||''} required/></label><label>Date<input type="date" name="date" defaultValue={modal.date||dateKey(new Date())} required/></label><label>Category<select name="category" defaultValue={modal.category||'National'}><option>National</option><option>Orthodox</option><option>Islamic</option><option>International</option></select></label><label className="check"><input type="checkbox" name="schoolDay" defaultChecked={modal.schoolDay}/> School day</label><label className="wide">Description<textarea name="description" defaultValue={modal.description||''}/></label></div><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setModal(null)}>Cancel</button><button className="primary">Save Holiday</button></div></form></div>}
  </>
}

function Reports({students,attendance}) {
  const [range,setRange]=useState('Monthly')
  const rows=useMemo(()=>students.map(s=>{let present=0,absent=0,late=0,excused=0,total=0;Object.values(attendance).forEach(r=>{const x=r[s.id];if(x){total++;if(x.status==='Present')present++;if(x.status==='Absent')absent++;if(x.status==='Late')late++;if(x.status==='Excused')excused++}});return {...s,total,present,absent,late,excused,percentage:total?Math.round(present/total*100):0}}),[students,attendance])
  const excel=()=>{const ws=XLSX.utils.json_to_sheet(rows);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Attendance');XLSX.writeFile(wb,'attendance-report.xlsx')}
  const pdf=()=>{const doc=new jsPDF();doc.text('My Students - Attendance Report',14,16);autoTable(doc,{startY:24,head:[['Name','ID','Present','Absent','Late','Excused','%']],body:rows.map(r=>[r.name,r.id,r.present,r.absent,r.late,r.excused,r.percentage])});doc.save('attendance-report.pdf')}
  return <>
    <PageTitle title="Attendance Reports" subtitle="Analyze and export student attendance" action={<div className="report-actions"><button className="secondary" onClick={()=>window.print()}><Download size={16}/>Print</button><button className="secondary" onClick={excel}>Excel</button><button className="primary" onClick={pdf}>PDF Report</button></div>}/>
    <div className="toolbar"><select value={range} onChange={e=>setRange(e.target.value)}><option>Daily</option><option>Weekly</option><option>Monthly</option><option>Yearly</option></select><span className="muted-label">Report period: {range}</span></div>
    <div className="table-wrap"><table><thead><tr><th>Student</th><th>ID</th><th>Total Days</th><th>Present</th><th>Absent</th><th>Late</th><th>Excused</th><th>Attendance</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><strong>{r.name}</strong></td><td>{r.id}</td><td>{r.total}</td><td className="green-text">{r.present}</td><td className="red-text">{r.absent}</td><td className="orange-text">{r.late}</td><td className="blue-text">{r.excused}</td><td><div className="progress"><span style={{width:`${r.percentage}%`}}/><strong>{r.percentage}%</strong></div></td></tr>)}</tbody></table></div>
  </>
}

function Settings({settings,setSettings,notify}) {
  const save=(e)=>{e.preventDefault();const fd=new FormData(e.currentTarget);setSettings({...settings,schoolName:fd.get('schoolName'),teacher:fd.get('teacher'),academicYear:fd.get('academicYear'),calendar:fd.get('calendar')});notify('Settings saved successfully')}
  const backup=()=>{const data={students:load('students',initialStudents),attendance:load('attendance',{}),holidays:load('holidays',initialHolidays),settings};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='my-students-backup.json';a.click();URL.revokeObjectURL(url)}
  const restore=(e)=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);if(data.students)localStorage.setItem('students',JSON.stringify(data.students));if(data.attendance)localStorage.setItem('attendance',JSON.stringify(data.attendance));if(data.holidays)localStorage.setItem('holidays',JSON.stringify(data.holidays));if(data.settings)localStorage.setItem('settings',JSON.stringify(data.settings));notify('Backup restored. Refreshing...');setTimeout(()=>location.reload(),800)}catch{notify('Invalid backup file')}};reader.readAsText(file)}
  return <>
    <PageTitle title="Settings" subtitle="Configure school and application preferences"/>
    <form className="settings-grid" onSubmit={save}>
      <div className="panel settings-panel"><h3>School Information</h3><div className="form-grid"><label>School Name<input name="schoolName" defaultValue={settings.schoolName}/></label><label>Teacher Name<input name="teacher" defaultValue={settings.teacher}/></label><label>Academic Year<input name="academicYear" defaultValue={settings.academicYear}/></label><label>Default Calendar<select name="calendar" defaultValue={settings.calendar}><option>Dual Calendar</option><option>Ethiopian Calendar</option><option>Gregorian Calendar</option></select></label></div></div>
      <div className="panel settings-panel"><h3>Data Management</h3><p>Back up all application data or restore a previous JSON backup.</p><div className="data-actions"><button type="button" className="secondary" onClick={backup}>Download Backup</button><label className="primary file-button">Restore Backup<input type="file" accept=".json" onChange={restore}/></label></div></div>
      <div className="settings-save"><button className="primary">Save Settings</button></div>
    </form>
  </>
}
