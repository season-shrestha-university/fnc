const I = (d, sw=2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICON = {
  x: I('<path d="M18 6 6 18M6 6l12 12"/>'),
  back: I('<path d="m15 18-6-6 6-6"/>'),
  arrow: I('<path d="M5 12h14M12 5l7 7-7 7"/>'),
  camera: I('<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>'),
  upload: I('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>'),
  flip: I('<path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5"/><circle cx="12" cy="12" r="3"/><path d="m18 22-3-3 3-3M6 2l3 3-3 3"/>'),
  face: I('<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>'),
  check: I('<path d="M20 6 9 17l-5-5"/>', 2.6),
  user: I('<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>'),
  id: I('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 10h2M16 14h2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.6-1.2 1.7-2 3-2s2.4.8 3 2"/>'),
  cal: I('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  mail: I('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>'),
  phone: I('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>'),
  pin: I('<path d="M20 10c0 5-8 12-8 12s-8-7-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>'),
  download: I('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>'),
  plus: I('<path d="M5 12h14M12 5v14"/>'),
  alert: I('<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>'),
  noimg: I('<path d="M2 2l20 20M9 9a3 3 0 0 0 4.2 4.2M17 17H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2M10 4h4l2.5 3H19a2 2 0 0 1 2 2v7.3"/>'),
  home: I('<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>'),
  users: I('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'),
  scan: I('<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/>'),
  chart: I('<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>'),
};
const PHOTO = 'assets/member-photo.jpg';
const MARK = 'assets/rollcall-mark-32-teal.svg';
const STEP_NAMES = ['Photo','Details','Contact'];

const status = t => `<div class="status"><span>${t}</span><span class="sys"><span class="bars"><i></i><i></i><i></i><i></i></span><span class="batt"><i></i></span></span></div>`;
const steps = n => `<div class="steps"><div class="seg">${[1,2,3].map(i=>`<i class="${i<=n?'on':''}"></i>`).join('')}</div><p><b>Step ${n} of 3</b> · ${STEP_NAMES[n-1]}</p></div>`;
const topbar = (title='Create a member QR') => `<header class="topbar"><button class="chipbtn" data-act="close" aria-label="Close">${ICON.x}</button><h1>${title}</h1><span></span></header>`;
const esc = s => String(s??'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmtDob = v => { if(!v) return ''; const [y,m,d]=v.split('-'); return `${+d} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1]} ${y}`; };
const thumb = s => `<span class="thumb">${s.photo?`<img src="${PHOTO}" alt="">`:ICON.user}</span>`;

const field = ({key,label,req,opt,icon,ph,type='text',val,focus,err,hint,tall}) => `
  <div class="field">
    <label for="f-${key}"><span>${label}${req?' <span class="req">*</span>':''}</span>${opt?`<small>${opt}</small>`:''}</label>
    <div class="input ${tall?'tall':''} ${focus?'focus':''} ${err?'err':''}">${icon}${tall
      ? `<textarea id="f-${key}" data-k="${key}" placeholder="${ph}">${esc(val)}</textarea>`
      : `<input id="f-${key}" data-k="${key}" type="${type}" placeholder="${ph}" value="${esc(val)}">`}</div>
    ${err?`<p class="error">${ICON.alert}${err}</p>`:hint?`<p class="hint">${hint}</p>`:''}
  </div>`;

function screen(s){
  const st = status(s.clock || '11:02');
  if (s.step === 'photo' || s.step === 'captured'){
    const cap = s.step === 'captured';
    return `${st}${topbar()}${steps(1)}
    <div class="step-viewport"><section class="content photo">
      <h2>Add a photo</h2>
      <p class="helper">Volunteers use this to recognise them at the door.</p>
      <div class="cam">${cap
        ? `<img class="shot" src="${PHOTO}" alt="Captured photo"><span class="added"><span>${ICON.check}</span>Photo added</span>`
        : `<div class="oval"></div><span class="live">Camera on</span><button class="flip" aria-label="Switch camera">${ICON.flip}</button><span class="tag">${ICON.face}Line their face up with the oval</span>`}</div>
    </section></div>
    ${cap
      ? `<footer class="footer split"><button class="btn btn-outline" data-act="retake">${ICON.camera}Retake</button><button class="btn btn-primary" data-act="next">Next${ICON.arrow}</button><i class="home"></i></footer>`
      : `<footer class="footer"><button class="btn btn-primary" data-act="take">${ICON.camera}Take photo</button><button class="btn btn-tint" data-act="upload">${ICON.upload}Upload from device</button><button class="link" data-act="skip">Skip for now</button><i class="home"></i></footer>`}`;
  }
  if (s.step === 'details'){
    return `${st}${topbar()}${steps(2)}
    <div class="step-viewport"><section class="content">
      <h2>Member details</h2>
      <div class="who">${thumb(s)}<div><b class="${s.name?'':'empty'}">${s.name?esc(s.name):'New member'}</b><span>${s.id?esc(s.id):'No member ID yet'}</span></div><button class="edit" data-act="photo">${s.photo?'Change':'Add photo'}</button></div>
      <div class="fields">
        ${field({key:'name',label:'Name',req:1,icon:ICON.user,ph:'Full name',val:s.name,focus:s.focus==='name',err:s.errName})}
        ${field({key:'id',label:'Member ID',icon:ICON.id,ph:'MEMBER-001',val:s.id})}
        ${field({key:'dob',label:'Date of birth',icon:ICON.cal,ph:'DD/MM/YYYY',val:s.dobText})}
      </div>
    </section></div>
    <footer class="footer split"><button class="btn btn-outline" data-act="back">${ICON.back}Back</button><button class="btn btn-primary" data-act="next">Next${ICON.arrow}</button><i class="home"></i></footer>`;
  }
  if (s.step === 'contact'){
    return `${st}${topbar()}${steps(3)}
    <div class="step-viewport"><section class="content">
      <h2>Contact details<span class="opt">Optional</span></h2>
      <div class="fields">
        ${field({key:'email',label:'Email',icon:ICON.mail,ph:'name@example.com',type:'email',val:s.email})}
        ${field({key:'phone',label:'Phone',icon:ICON.phone,ph:'07700 900000',type:'tel',val:s.phone})}
        ${field({key:'address',label:'Address',icon:ICON.pin,ph:'House, street, town, postcode',val:s.address,tall:1})}
      </div>
      <div class="summary"><h3>You’re adding</h3><div class="chips">
        <button class="chip ${s.photo?'':'muted'}" data-act="photo"><span class="ic">${s.photo?`<img src="${PHOTO}" alt="">`:ICON.noimg}</span>${s.photo?'Photo':'No photo'}</button>
        <button class="chip" data-act="back"><span class="ic">${ICON.user}</span>${esc(s.name)}</button>
        ${s.id?`<button class="chip" data-act="back"><span class="ic">${ICON.id}</span>${esc(s.id)}</button>`:''}
        ${s.dobText?`<button class="chip" data-act="back"><span class="ic">${ICON.cal}</span>${esc(s.dobText)}</button>`:''}
      </div></div>
    </section></div>
    <footer class="footer split even"><button class="btn btn-outline" data-act="back">${ICON.back}Back</button><button class="btn btn-primary" data-act="create">Create &amp; generate QR</button><i class="home"></i></footer>`;
  }
  // done
  return `${st}${topbar('Member created')}
    <div class="step-viewport"><section class="content">
      <div class="done-top"><span class="okbig">${ICON.check}</span><h2>${esc(s.name)} is set up</h2><p>Their QR code is ready to print or send.</p></div>
      <div class="qrcard">
        <div class="person">${thumb(s)}<div><b>${esc(s.name)}</b><span>${esc(s.id||'')}</span></div></div>
        <div class="qrbox"><img class="qr" src="assets/qr-member-001.svg" alt="QR code for ${esc(s.id)}"><span class="badge"><img src="${MARK}" alt=""></span></div>
        <p class="cap">${esc(s.id)} <span>· RollCall</span></p>
      </div>
    </section></div>
    <footer class="footer"><button class="btn btn-primary" data-act="download">${ICON.download}Download QR</button><button class="btn btn-tint" data-act="another">${ICON.plus}Add another member</button><button class="link" data-act="close">Done</button><i class="home"></i></footer>`;
}

const FILLED = {photo:true, name:'Bahadur Gurung', id:'MEMBER-001', dobText:'14/03/1961', email:'bahadur.gurung@outlook.com', phone:'07700 900481', address:'12 Victoria Road, Farnborough GU14\u00A07PG'};
function renderStatic(){
  const set = (id, s) => { const el = document.getElementById(id); if (el) el.innerHTML = screen(s); };
  set('m-photo',    {step:'photo', clock:'11:02'});
  set('m-captured', {step:'captured', clock:'11:02', photo:true});
  set('m-details',  {...FILLED, step:'details', clock:'11:03', focus:'name'});
  set('m-contact',  {...FILLED, step:'contact', clock:'11:04'});
  set('m-done',     {...FILLED, step:'done', clock:'11:04'});
}

// interactive prototype
const wait = ms => new Promise(r => setTimeout(r, ms));
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function prototype(el){
  const blank = () => ({step:'photo', photo:false, name:'', id:'', dobText:'', email:'', phone:'', address:'', errName:''});
  let s = blank();
  const order = ['photo','details','contact','done'];
  const go = (step, direction='forward') => swapStep(step, direction);
  function draw(){
    el.innerHTML = screen(s);
    const n = el.querySelector('[data-k="name"]');
    if (s.step==='details' && n && !s._swapping) { n.focus(); n.setSelectionRange(n.value.length,n.value.length); }
  }
  async function swapStep(step, direction){
    if (s._swapping) return;
    const viewport = el.querySelector('.step-viewport');
    const pane = viewport && viewport.querySelector('.content');
    if (!viewport || !pane || document.body.classList.contains('still')){
      s.step = step;
      draw();
      return;
    }
    s._swapping = true;
    const reduce = reduceMotion();
    const fromH = viewport.getBoundingClientRect().height;
    viewport.style.height = fromH + 'px';
    viewport.style.overflow = 'hidden';
    const exitX = reduce ? 0 : (direction === 'forward' ? -8 : 8);
    const enterX = reduce ? 0 : (direction === 'forward' ? 12 : -12);
    pane.style.transition = reduce
      ? 'opacity 120ms cubic-bezier(.3, 0, 1, 1)'
      : 'opacity 120ms cubic-bezier(.3, 0, 1, 1), transform 120ms cubic-bezier(.3, 0, 1, 1)';
    pane.style.opacity = '0';
    pane.style.transform = `translateX(${exitX}px)`;
    await wait(120);
    pane.style.visibility = 'hidden';
    s.step = step;
    draw();
    const vp = el.querySelector('.step-viewport');
    const next = vp && vp.querySelector('.content');
    if (!vp || !next){ s._swapping = false; return; }
    vp.style.height = fromH + 'px';
    vp.style.overflow = 'hidden';
    next.style.opacity = '0';
    next.style.visibility = 'visible';
    next.style.transform = `translateX(${enterX}px)`;
    next.style.transition = 'none';
    const toH = next.scrollHeight;
    void next.offsetWidth;
    const enterMs = reduce ? 120 : 200;
    next.style.transition = reduce
      ? 'opacity 120ms cubic-bezier(0, 0, 0, 1)'
      : 'opacity 200ms cubic-bezier(0, 0, 0, 1), transform 200ms cubic-bezier(0, 0, 0, 1)';
    next.style.opacity = '1';
    next.style.transform = 'translateX(0)';
    if (!reduce && Math.round(toH) !== Math.round(fromH)){
      vp.style.transition = 'height 200ms cubic-bezier(.2, 0, 0, 1)';
      vp.style.height = toH + 'px';
    }
    await wait(enterMs);
    next.style.transition = '';
    next.style.opacity = '';
    next.style.transform = '';
    vp.style.height = '';
    vp.style.overflow = '';
    vp.style.transition = '';
    s._swapping = false;
    const n = el.querySelector('[data-k="name"]');
    if (s.step==='details' && n) { n.focus(); n.setSelectionRange(n.value.length,n.value.length); }
  }
  el.addEventListener('input', e => {
    const k = e.target.dataset.k; if (!k) return;
    s[k==='dob'?'dobText':k] = e.target.value;
    if (k==='name') { if (s.errName && e.target.value.trim()) { s.errName=''; draw(); return; }
      const b = el.querySelector('.who b'); b.textContent = e.target.value || 'New member'; b.classList.toggle('empty', !e.target.value); }
    if (k==='id') el.querySelector('.who span').textContent = e.target.value || 'No member ID yet';
  });
  el.addEventListener('click', e => {
    const a = e.target.closest('[data-act]')?.dataset.act; if (!a) return;
    if (a==='take' || a==='upload') { s.photo = true; s.step='captured'; draw(); const c=el.querySelector('.cam'); c.classList.add('flash'); }
    if (a==='retake') { s.photo=false; go('photo', 'back'); }
    if (a==='skip') { s.photo=false; go('details', 'forward'); }
    if (a==='photo') go(s.photo?'captured':'photo', 'back');
    if (a==='next') {
      if (s.step==='photo'||s.step==='captured') go('details', 'forward');
      else if (s.step==='details') { if (!s.name.trim()) { s.errName='Enter the member’s name to continue'; draw(); } else go('contact', 'forward'); }
    }
    if (a==='back') go(s.step==='contact' ? 'details' : (s.photo?'captured':'photo'), 'back');
    if (a==='create') go('done', 'forward');
    if (a==='another' || a==='close') { s = blank(); draw(); }
    if (a==='download') { const l=document.createElement('a'); l.href='assets/qr-member-001.svg'; l.download=`${s.id||'member'}-qr.svg`; l.click(); }
  });
  draw();
}

renderStatic();
const live = document.getElementById('live'); if (live) prototype(live);
if (location.search.includes('still')) document.body.classList.add('still');
