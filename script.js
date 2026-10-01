const jobs=[
 {co:'TCS',logo:'TCS',role:'Data Analyst Intern',src:'College Source',yr:'2nd & 3rd Year',dur:'2 Months',skills:'SQL, Excel, Power BI',loc:'Hyderabad',pay:'₹15,000/month'},
 {co:'Microsoft',logo:'🟦',role:'Software Developer Intern',src:'Self Found',yr:'3rd Year',dur:'3 Months',skills:'Python, DSA, C++',loc:'Remote',pay:'₹30,000/month'}];
const sidebar=(items,on)=>`<div class="side"><b>${on}</b><hr>${items.map(i=>`<a href="#${i[1]}">${i[0]}</a>`).join('')}</div>`;
const studentSide=sidebar([['Dashboard','dashboard'],['My Saved Internships','search'],['My Questions','ask'],['My Submissions','verify'],['Log Out','home']],'Student');
const adminSide=sidebar([['Verify Documents','admin'],['Manage Internships','search'],['Manage Coordinators','companies'],['Manage Companies','companies'],['Analytics','analytics'],['Log Out','home']],'Admin Dashboard');
const jobCard=(j,i)=>`<div class="card job" onclick="location.hash='details'"><div class="logo">${j.logo}</div><div><b>${j.role}</b><br><span class="tag b">${j.src}</span><span class="tag">✔ Verified</span><div class="mut">${j.co} | ${j.yr} | ${j.dur}<br>Skills: ${j.skills}<br>Location: ${j.loc} | Stipend: ${j.pay}</div></div></div>`;
const pages={
home:()=>`<section class="hero"><h1>Your Journey to<br>Internship Starts Here</h1><p>Discover verified internship opportunities from your college and learn from your seniors' real experiences.</p><a class="btn" href="#search">Explore Internships</a> <a class="btn alt" href="#senior">View Senior Experiences</a></section>
<div class="grid g4" style="margin-top:16px">${[['🏛️','College Internships','Opportunities through college network','categories'],['🌐','Self-Found Internships','Opportunities through personal network','categories'],['📘','Learn from Seniors','Real experiences & step-by-step guides','senior'],['💬','Ask a Senior','Get answers to your questions','ask']].map(c=>`<a class="card c" href="#${c[3]}"><div class="ico">${c[0]}</div><b>${c[1]}</b><div class="mut">${c[2]}</div></a>`).join('')}</div>
<p class="mut">The homepage gives an overview of the platform and its key features. Students can explore internships or read senior experiences.</p>`,
login:()=>`<div class="card login"><h2 style="text-align:center">🎓 College Internship Hub</h2><div class="tabs"><span class="on" id="tl">Login</span><span id="ts">Sign Up</span></div>
<form id="loginForm"><label class="mut">Login as</label><div class="roles" id="roles">
    <label class="role on"><input type="radio" name="role" value="student" checked>🎓 Student</label>
    <label class="role"><input type="radio" name="role" value="faculty">👨‍🏫 Faculty</label>
    <label class="role"><input type="radio" name="role" value="admin">🛡️ Admin</label>
</div>
<div id="idFields"></div><input type="password" placeholder="Password" required><button class="btn full">Login</button></form>
<p style="text-align:center"><a href="#login" class="mut">Forgot Password?</a></p><p style="text-align:center" class="mut">OR</p>
<button class="btn out full">Continue with Google</button><button class="btn out full">Continue with College Email</button></div>`,
categories:()=>`<h1>Internships</h1><div class="grid g2"><div class="card c"><div class="ico">🏛️</div><h2>College-Sourced Internships</h2><p class="mut">Opportunities provided through college coordinators, placement cell, faculty recommendation and college/company connections.</p><a class="btn full" href="#search">View College Internships</a></div>
<div class="card c"><div class="ico">🌐</div><h2>Self-Found Internships</h2><p class="mut">Opportunities obtained independently through LinkedIn, referrals, company websites, personal network, etc.</p><a class="btn out full" href="#search">View Self-Found Internships</a></div></div>
<p class="mut">Students can choose between College-Sourced or Self-Found internships.</p>`,
years:()=>`<h1>Browse by Year</h1><div class="grid g2">${[['1st Year','Explore internships suitable for 1st year students'],['2nd Year','Opportunities for 2nd year students'],['3rd Year','Industry internships and pre-placement opportunities'],['4th Year','Final year internships and conversion opportunities']].map(y=>`<a class="card" href="#search"><b>🎓 ${y[0]}</b><div class="mut">${y[1]}</div></a>`).join('')}</div><p class="mut">Internships are organized by year to help students find relevant opportunities.</p>`,
search:()=>`<h1>Internships</h1><div class="split"><aside class="card"><b>Filters</b><p><b>Year</b></p>${['1st','2nd','3rd','4th'].map(y=>`<label><input type="checkbox" class="f" value="${y}" style="width:auto;margin:0 6px 0 0">${y} Year</label>`).join('')}<p><b>Branch</b></p><select><option>Select Branch</option><option>CSE</option><option>ECE</option><option>EEE</option><option>MECH</option><option>CIVIL</option></select><p><b>Type</b></p><label><input type="checkbox" class="t" value="College" style="width:auto;margin:0 6px 0 0">College</label><label><input type="checkbox" class="t" value="Self" style="width:auto;margin:0 6px 0 0">Self Found</label></aside>
<div><input id="q" placeholder="Search by company, role, or skills..."><div id="list">${jobs.map(jobCard).join('')}</div></div></div><p class="mut">Use filters to find internships based on year, branch, type, role, location, stipend, etc.</p>`,
details:()=>{const j=jobs[0];return `<a href="#search" class="mut">← Back to Results</a><div class="card" style="margin-top:10px"><div class="job"><div class="logo">TCS</div><div><h2 style="margin:0">${j.role}</h2><span class="tag b">College Source</span><span class="tag">✔ Verified</span><div class="mut">TCS | 2nd & 3rd Year | 2 Months | ${j.loc}<br>Stipend: ${j.pay} | On-site</div></div></div>
<div class="tabs" id="dt">${['Overview','How I Got It','Selection Process','Skills','Preparation','Advice'].map((t,i)=>`<span class="${i?'':'on'}">${t}</span>`).join('')}</div>
<div id="dtc"><b>About the Internship</b><p class="mut">Work on real-time data analytics projects and gain hands-on experience with industry tools and datasets.</p></div></div><p class="mut">Detailed information about the internship, including source, duration, stipend and more.</p>`},
senior:()=>`<h1>My Internship Journey</h1><div class="card"><div class="mut" style="float:right">Shared by <b>Riya Sharma</b><br>3rd Year, CSE <span class="ok">✔ Verified</span></div><ul class="steps">${[['How I got it','Source: College Coordinator'],['Application Process','Submitted through college portal'],['Selection Process','Resume Shortlisting → Aptitude Test → Technical Interview → HR Interview'],['Skills Required','Python, SQL, Excel, Communication'],['Preparation','SQL basics, Excel practice, previous projects'],['Advice for Juniors','"Keep improving your technical skills and be consistent."']].map((s,i)=>`<li data-n="${i+1}"><b>${s[0]}</b><div class="mut">${s[1]}</div></li>`).join('')}</ul></div><p class="mut">Seniors share their complete journey — from how they got it to their advice for juniors.</p>`,
verify:()=>`<h1>Document Verification</h1><div class="card"><div class="doc"><div>📄 <b>Offer Letter</b><div class="mut">Uploaded: 12 Apr 2025</div></div><span class="ok">● Verified</span></div><div class="doc"><div>📄 <b>Completion Certificate</b><div class="mut">Uploaded: 20 Jul 2025</div></div><span class="ok">● Verified</span></div>
<input type="file"><div class="flow"><span>📤<br>Submitted</span><span>📋<br>Admin Review</span><span class="ok">✅<br>Verified</span></div></div><p class="mut">Seniors upload offer letters and completion certificates. Admins verify them before it becomes visible to students.</p>`,
ask:()=>`<h1>Ask a Senior</h1><div class="card"><div style="display:flex;gap:8px"><input id="aq" placeholder="Ask a question about this internship..." style="margin:0"><button class="btn" id="askBtn">Ask</button></div><div id="qs">${[['What type of coding questions were asked in the interview?','Rahul (2nd Year, CSE) · 2 days ago','It was mostly DSA based. I was asked array, string and tree related questions. Focus more on problem solving.'],['How difficult was the interview process?','Priya (1st Year, CSE) · 3 days ago','The technical round was moderate, HR round was basic and focused on communication.']].map(q=>`<div class="card" style="margin-top:12px"><b>❓ ${q[0]}</b><div class="mut">${q[1]}</div><p>👤 ${q[2]}</p></div>`).join('')}</div></div><p class="mut">Students can ask questions and get answers from seniors who have already gone through the same process.</p>`,
dashboard:()=>`<div class="dash">${studentSide}<div><h1>Dashboard</h1><div class="grid g2">${[['Total Internships Viewed',12],['Saved Internships',5],['Questions Asked',3],['My Submissions',1]].map(s=>`<div class="card"><div class="mut">${s[0]}</div><div class="stat">${s[1]}</div></div>`).join('')}</div><h2>Recommended for You</h2>${jobCard(jobs[0])}</div></div><p class="mut">Students can track their activity, saved internships, questions and more.</p>`,
coordinator:()=>`<div class="dash">${sidebar([['Post Internship','coordinator'],['Manage Opportunities','search'],['View Submissions','verify'],['Analytics','analytics'],['Profile','coordinator'],['Log Out','home']],'Coordinator Dashboard')}<div class="card"><h2>Post New Internship</h2><form id="postForm"><div class="grid g2"><div>Company Name<input placeholder="ABC Technologies" required></div><div>Role<input placeholder="Data Analyst Intern" required></div><div>Eligibility<select><option>2nd & 3rd Year</option><option>3rd Year</option><option>4th Year</option></select></div><div>Duration<select><option>2 Months</option><option>3 Months</option><option>6 Months</option></select></div></div>Source<select><option>College</option><option>Self</option></select>Description<textarea rows="4" placeholder="About the internship..."></textarea><button class="btn full">Submit</button></form></div></div><p class="mut">College coordinators can add internship opportunities, which will be visible to students after verification.</p>`,
admin:()=>`<div class="dash">${adminSide}<div class="card"><h2>Pending Verifications</h2><table id="vt"><tr><th>Student</th><th>Company</th><th>Document</th><th>Action</th></tr>${[['Riya Sharma','TCS','Offer Letter'],['Arjun Kumar','Microsoft','Offer Letter'],['Sneha Patel','Infosys','Certificate']].map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td><a href="#verify" class="mut">View</a> <button class="btn ap">Approve</button></td></tr>`).join('')}</table></div></div><p class="mut">Admins verify documents, manage content and view platform analytics.</p>`,
companies:()=>`<div class="dash">${adminSide}<div class="card"><div style="display:flex;justify-content:space-between"><h2>Manage Companies</h2><button class="btn" id="addCo">+ Add Company</button></div><table id="ct"><tr><th>Company Name</th><th>Type</th><th>Actions</th></tr>${[['TCS','College'],['Microsoft','Self Found'],['Infosys','College'],['Amazon','Self Found']].map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td><button class="btn out">Edit</button> <button class="btn del" style="background:#dc2626">Delete</button></td></tr>`).join('')}</table></div></div><p class="mut">Admins can manage companies and coordinators.</p>`,
analytics:()=>`<div class="dash">${adminSide}<div><h1>Internship Insights</h1><div class="grid g3">${[['Total Internships',248],['College Sourced',96],['Self Found',152]].map(s=>`<div class="card"><div class="mut">${s[0]}</div><div class="stat">${s[1]}</div></div>`).join('')}</div><div class="card" style="margin-top:16px"><b>Internships by Year</b><div class="bars">${[45,72,90,41].map((v,i)=>`<div style="height:${v}%">${v}<br>${i+1}st</div>`).join('')}</div></div></div></div><p class="mut">Shows overall statistics and insights about internships.</p>`,
journey:()=>`<h1>Example: Student Journey</h1><div class="grid g4">${[['🔍','Explore Internships'],['📖','Learn from Seniors'],['💬','Ask Questions'],['📝','Apply & Prepare'],['✈️','Get Internship']].slice(0,4).map(s=>`<div class="card c"><div class="ico">${s[0]}</div><b>${s[1]}</b></div>`).join('')}</div><div class="card" style="margin-top:16px"><b>Example Path</b> — 2nd Year CSE Student → TCS Data Analyst Intern (College Source)<ul><li>Found opportunity in College Internships</li><li>Read senior's experience and preparation tips</li><li>Asked a question in the Ask a Senior section</li><li>Applied and went through the selection process</li><li>Got the internship!</li></ul></div><p class="mut">A complete pathway from finding the opportunity to getting the internship.</p>`
};
const dash={student:'dashboard',faculty:'coordinator',admin:'admin'};
const getUser=()=>{try{return JSON.parse(sessionStorage.getItem('user'))}catch(e){return null}};
const ini=u=>(u.name||u.id||'?')[0].toUpperCase();
const opt=(a,v)=>a.map(x=>`<option ${x===v?'selected':''}>${x}</option>`).join('');
const av=(u,big)=>`<span class="avatar${big?' big':''}">${u.photo?`<img src="${u.photo}" alt="">`:ini(u)}</span>`;
const saveUser=p=>{sessionStorage.setItem('user',JSON.stringify({...getUser(),...p}));route()};
const subs=()=>{const S=[['Offer Letter','TCS','12 Apr 2025',3],['Completion Certificate','TCS','20 Jul 2025',2],['Offer Letter','Infosys','01 Oct 2026',1]],L=['Submitted','Admin Review','Verified'];
 return `<div class="card" style="margin-top:16px"><h2>My Submissions</h2>${S.map(s=>`<div class="doc"><div>📄 <b>${s[0]}</b> — ${s[1]}<div class="mut">Uploaded: ${s[2]}</div><div class="prog">${L.map((l,i)=>`<span class="${i<s[3]?'done':''}">${l}</span>`).join('')}</div></div><span class="${s[3]===3?'ok':'mut'}">● ${L[s[3]-1]}</span></div>`).join('')}<a class="btn out" href="#verify">+ Upload New Document</a></div>`};

pages.profile=()=>{const u=getUser();if(!u){location.hash='login';return ''}
 const L={student:['Roll Number','Email'],faculty:['Employee Number','Phone Number'],admin:['User ID','Phone Number']}[u.role];
 const extra=u.role==='student'
    ?`Branch<select name="branch">${opt(['CSE','ECE','EEE','MECH','CIVIL','IT'],u.branch)}</select>Year<select name="year">${opt(['1st Year','2nd Year','3rd Year','4th Year'],u.year)}</select>`
    :`Department<input name="dept" value="${u.dept||''}" placeholder="e.g. CSE">`;
 return `<h1>My Profile</h1><div class="grid prof"><div class="card c"><label class="upl">${av(u,1)}<span class="cam">📷</span><input type="file" id="photoIn" accept="image/*" hidden></label>${u.photo?'<button class="btn out full" id="rmPhoto" style="margin:0 0 8px">Remove Photo</button>':''}<h2>${u.name||'Add your name'}</h2><span class="tag b">${u.role.toUpperCase()}</span><p class="mut">${u.id}</p><a class="btn out full" href="#${dash[u.role]}">My Dashboard</a><button class="btn full" style="background:#dc2626" onclick="logout()">🚪 Log Out</button></div>
 <div class="card"><h2>Edit Profile</h2><form id="profForm">Full Name<input name="name" value="${u.name||''}" required>${L[0]}<input name="id" value="${u.id}" required>${L[1]}<input name="contact" value="${u.contact}" required>${extra}About me<textarea name="about" rows="3" placeholder="Skills, interests, goals...">${u.about||''}</textarea><button class="btn">Save Changes</button></form></div></div>${u.role==='student'?subs():''}`};

function logout(){sessionStorage.removeItem('user');renderNav();location.hash='home';route()}
function renderNav(){const u=getUser(),a=document.getElementById('authArea');
 a.innerHTML=u?`<span class="pm"><button class="pbtn" id="pBtn">${av(u)}${u.name||u.id}</button><span class="pdrop" id="pDrop"><a href="#profile">👤 My Profile</a><a href="#${dash[u.role]}">📊 My Dashboard</a><a href="#" id="loBtn">🚪 Log Out</a></span></span>`:'<a href="#login">Login</a>';
 if(u){document.getElementById('pBtn').onclick=e=>{e.stopPropagation();document.getElementById('pDrop').classList.toggle('open')};
    document.getElementById('loBtn').onclick=e=>{e.preventDefault();logout()}}}
document.addEventListener('click',()=>{const d=document.getElementById('pDrop');d&&d.classList.remove('open')});
document.addEventListener('submit',e=>{if(e.target.id!=='profForm')return;e.preventDefault();
 sessionStorage.setItem('user',JSON.stringify({...getUser(),...Object.fromEntries(new FormData(e.target))}));
 renderNav();alert('Profile updated');route()});

const app=document.getElementById('app');
function bind(){
 const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
 const tl=$('#tl');if(tl){
  const fields={
   student:[['Roll Number','text',''],['Email','email','']],
   faculty:[['Employee Number','text',''],['Phone Number','tel','[0-9]{10}']],
   admin:[['User ID','text',''],['Phone Number','tel','[0-9]{10}']]};
  const render=role=>{$('#idFields').innerHTML=fields[role].map(f=>`<input type="${f[1]}" placeholder="${f[0]}" ${f[2]?`pattern="${f[2]}" title="Enter a 10-digit phone number"`:''} required>`).join('')};
  render('student');
  $('#ts').onclick=()=>{$('#ts').classList.add('on');tl.classList.remove('on');$('#loginForm button.btn.full').textContent='Sign Up'};
  tl.onclick=()=>{tl.classList.add('on');$('#ts').classList.remove('on');$('#loginForm button.btn.full').textContent='Login'};
  $$('.role input').forEach(r=>r.onchange=()=>{$$('.role').forEach(l=>l.classList.remove('on'));r.parentElement.classList.add('on');render(r.value)});
  $('#loginForm').onsubmit=e=>{e.preventDefault();
   const role=$('input[name="role"]:checked').value;
    const v=$$('#idFields input').map(i=>i.value);
    sessionStorage.setItem('user',JSON.stringify({role,id:v[0],contact:v[1],name:''}));
    location.hash='home'}}
 if($('#list')){const run=()=>{const q=$('#q').value.toLowerCase(),ys=$$('.f:checked').map(x=>x.value),ts=$$('.t:checked').map(x=>x.value);
  $('#list').innerHTML=jobs.filter(j=>(j.role+j.co+j.skills).toLowerCase().includes(q)&&(!ys.length||ys.some(y=>j.yr.includes(y)))&&(!ts.length||ts.some(t=>j.src.includes(t)))).map(jobCard).join('')||'<p class="mut">No results</p>'};
  $('#q').oninput=run;$$('.f,.t').forEach(c=>c.onchange=run)}
 if($('#dt')){const t={Overview:'Work on real-time data analytics projects and gain hands-on experience with industry tools and datasets.','How I Got It':'Source: College Coordinator.','Selection Process':'Resume Shortlisting → Aptitude Test → Technical Interview → HR Interview','Skills':'SQL, Excel, Power BI','Preparation':'SQL basics, Excel practice, previous projects','Advice':'Keep improving your technical skills and be consistent.'};
  $$('#dt span').forEach(s=>s.onclick=()=>{$$('#dt span').forEach(x=>x.classList.remove('on'));s.classList.add('on');$('#dtc').innerHTML=`<b>${s.textContent}</b><p class="mut">${t[s.textContent]}</p>`})}
 const ab=$('#askBtn');if(ab)ab.onclick=()=>{const v=$('#aq').value.trim();if(v){$('#qs').insertAdjacentHTML('afterbegin',`<div class="card" style="margin-top:12px"><b>❓ ${v.replace(/</g,'&lt;')}</b><div class="mut">You · just now</div><p class="mut">Waiting for a senior to answer...</p></div>`);$('#aq').value=''}};
 $$('.ap').forEach(b=>b.onclick=()=>{b.closest('tr').remove()});$$('.del').forEach(b=>b.onclick=()=>b.closest('tr').remove());
 const ac=$('#addCo');if(ac)ac.onclick=()=>{const n=prompt('Company name?');if(n)$('#ct').insertAdjacentHTML('beforeend',`<tr><td>${n.replace(/</g,'&lt;')}</td><td>College</td><td><button class="btn out">Edit</button> <button class="btn del" style="background:#dc2626" onclick="this.closest('tr').remove()">Delete</button></td></tr>`)};
 const pf=$('#postForm');if(pf)pf.onsubmit=e=>{e.preventDefault();alert('Internship submitted for verification');pf.reset()};
 const pi=$('#photoIn');if(pi)pi.onchange=()=>{const f=pi.files[0];if(!f)return;
   const rd=new FileReader();rd.onload=()=>{const im=new Image();im.onload=()=>{
    const c=document.createElement('canvas');c.width=c.height=150;const s=Math.min(im.width,im.height);
    c.getContext('2d').drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,0,0,150,150);
    saveUser({photo:c.toDataURL('image/jpeg',.8)})};im.src=rd.result};rd.readAsDataURL(f)};
 const rp=$('#rmPhoto');if(rp)rp.onclick=()=>saveUser({photo:''});
}
function route(){renderNav();const p=(location.hash||'#home').slice(1);app.innerHTML=(pages[p]||pages.home)();bind();window.scrollTo(0,0);document.getElementById('links').classList.remove('open')}
document.getElementById('menuBtn').onclick=()=>document.getElementById('links').classList.toggle('open');
addEventListener('hashchange',route);route();
