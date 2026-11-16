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
  lock: I('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),
  alert: I('<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>'),
  search: I('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
};
const PHOTO = 'assets/member-photo.jpg';
const STEPS = ['photo','details','contact'];
const STEP_LABEL = {photo:'Photo', details:'Details', contact:'Contact'};

const ORIGINAL = {
  photo: 'original',
  name: 'Bahadur Gurung',
  id: 'MEMBER-001',
  dobText: '14/03/1961',
  email: 'bahadur.gurung@outlook.com',
  phone: '07700 900481',
  address: '12 Victoria Road, Farnborough GU14\u00A07PG',
};

const esc = s => String(s??'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const status = t => `<div class="status"><span>${t}</span><span class="sys"><span class="bars"><i></i><i></i><i></i><i></i></span><span class="batt"><i></i></span></span></div>`;
const thumb = (s, cls='') => `<span class="thumb ${cls}">${s.photo?`<img src="${PHOTO}" alt="">`:ICON.user}</span>`;

function dirtyOf(s){
  return {
    photo: (s.photo||null) !== ORIGINAL.photo,
    details: (s.name||'') !== ORIGINAL.name || (s.dobText||'') !== ORIGINAL.dobText,
    contact: (s.email||'') !== ORIGINAL.email || (s.phone||'') !== ORIGINAL.phone || (s.address||'') !== ORIGINAL.address,
  };
}
const isDirty = s => Object.values(dirtyOf(s)).some(Boolean);
const canSave = s => isDirty(s) && !!(s.name||'').trim();

function tabs(s){
  const dirty = dirtyOf(s);
  const current = s.step === 'camera' ? 'photo' : s.step;
  return `<div class="tabs" role="tablist" aria-label="Member sections">${STEPS.map(k=>`
    <button class="tab ${current===k?'on':''}" role="tab" aria-selected="${current===k}" data-act="tab-${k}" id="tab-${k}">
      <i class="bar"></i>
      <span class="lbl">${STEP_LABEL[k]}${dirty[k]?`<span class="dot" title="Unsaved changes"></span>`:''}</span>
    </button>`).join('')}</div>`;
}

function who(s){
  const name = (s.name||'').trim();
  return `<div class="who-row">${thumb(s)}
    <div>
      <b class="${name?'':'empty'}">${name?esc(name):'Unnamed member'}</b>
      <span class="idchip">${ICON.lock}${esc(s.id)} <em>can’t be changed</em></span>
    </div>
  </div>`;
}

function field({key,label,req,icon,ph,type='text',val,focus,err,hint,tall,locked}){
  return `
  <div class="field">
    <label for="f-${key}"><span>${label}${req?' <span class="req">*</span>':''}</span></label>
    <div class="input ${tall?'tall':''} ${locked?'locked':''} ${focus?'focus':''} ${err?'err':''}">${icon}${
      locked
        ? `<input id="f-${key}" value="${esc(val)}" readonly disabled aria-readonly="true">`
        : tall
          ? `<textarea id="f-${key}" data-k="${key}" placeholder="${ph}">${esc(val)}</textarea>`
          : `<input id="f-${key}" data-k="${key}" type="${type}" placeholder="${ph}" value="${esc(val)}" ${err?'aria-invalid="true" aria-describedby="err-'+key+'"':''}>`
    }</div>
    ${err?`<p class="error" id="err-${key}" role="alert">${ICON.alert}${err}</p>`:hint?`<p class="hint">${hint}</p>`:''}
  </div>`;
}

function footer(s){
  const i = STEPS.indexOf(s.step==='camera'?'photo':s.step);
  const prev = i>0 ? STEPS[i-1] : null;
  const next = i<2 ? STEPS[i+1] : null;
  const saveOn = canSave(s);
  return `<footer class="footer edit">
    <div class="navrow">
      ${prev?`<button class="link nav" data-act="tab-${prev}">${ICON.back}${STEP_LABEL[prev]}</button>`:'<span></span>'}
      ${next?`<button class="link nav" data-act="tab-${next}">${STEP_LABEL[next]}${ICON.arrow}</button>`:'<span></span>'}
    </div>
    <div class="actions">
      <button class="btn btn-outline" data-act="cancel">Cancel</button>
      <button class="btn btn-primary${saveOn?'':' disabled'}" data-act="save" ${saveOn?'':'disabled'}>Save changes</button>
    </div>
    <i class="home"></i>
  </footer>`;
}

function discardSheet(s){
  if (!s.discard) return '';
  return `<div class="sheet-scrim" data-act="keep" role="presentation">
    <div class="sheet" role="alertdialog" aria-modal="true" aria-labelledby="discard-title" data-act="">
      <h2 id="discard-title">Discard changes?</h2>
      <p>You have unsaved edits for ${esc(ORIGINAL.name)}. Closing now will lose them.</p>
      <div class="btns">
        <button class="btn btn-outline" data-act="keep">Keep editing</button>
        <button class="btn btn-danger" data-act="discard">Discard</button>
      </div>
    </div>
  </div>`;
}

function membersView(s){
  return `${status(s.clock||'11:18')}
    <header class="topbar"><span></span><h1>Members</h1><span></span></header>
    ${s.toast?`<div class="toast-ok" role="status">${ICON.check}Updated ${esc(s.savedName||ORIGINAL.name)}</div>`:''}
    <section class="mlist">
      <div class="search">${ICON.search}Search members</div>
      <button class="mcard" data-act="open">${thumb({photo:true})}<div><b>Bahadur Gurung</b><span>MEMBER-001</span></div><span class="edit">Edit</span></button>
    </section>
    <footer class="footer" style="background:transparent;border:0;padding-top:0"><i class="home"></i></footer>`;
}

function screen(s){
  const st = status(s.clock || '11:18');
  if (s.view === 'list') return membersView(s);

  const top = `${st}<header class="topbar"><button class="chipbtn" data-act="close" aria-label="Close">${ICON.x}</button><h1>Edit member</h1><span></span></header>${who(s)}${tabs(s)}`;

  if (s.step === 'camera'){
    return `${top}
    <section class="content photo">
      <h2>Take a new photo</h2>
      <div class="cam"><div class="oval"></div><span class="live">Camera on</span><button class="flip" aria-label="Switch camera">${ICON.flip}</button><span class="tag">${ICON.face}Line their face up with the oval</span></div>
      <div class="portrait-actions" style="margin-top:14px">
        <button class="btn btn-tint" data-act="upload">${ICON.upload}Upload new</button>
        <button class="btn btn-primary" data-act="take">${ICON.camera}Take photo</button>
        <button class="link" data-act="cancel-cam">Cancel camera</button>
      </div>
    </section>
    ${footer(s)}${discardSheet(s)}`;
  }

  if (s.step === 'photo'){
    const has = !!s.photo;
    return `${top}
    <section class="content">
      <h2>${has?'Member photo':'Add a photo'}</h2>
      <p class="helper">Volunteers use this to recognise them at the door.</p>
      <div class="portrait">
        <div class="face ${has?'':'empty'}">${has?`<img src="${PHOTO}" alt="Current photo of ${esc(s.name||ORIGINAL.name)}">`:ICON.user}</div>
      </div>
      <div class="portrait-actions">
        <button class="btn btn-outline" data-act="retake">${ICON.camera}${has?'Retake':'Take photo'}</button>
        <button class="btn btn-tint" data-act="upload">${ICON.upload}Upload new</button>
        ${has?`<button class="link danger" data-act="remove">Remove photo</button>`:''}
      </div>
    </section>
    ${footer(s)}${discardSheet(s)}`;
  }

  if (s.step === 'details'){
    return `${top}
    <section class="content">
      <h2>Member details</h2>
      <div class="fields">
        ${field({key:'name',label:'Name',req:1,icon:ICON.user,ph:'Full name',val:s.name,focus:s.focus==='name',err:s.errName})}
        ${field({key:'id',label:'Member ID',icon:ICON.lock,val:s.id,locked:1})}
        ${field({key:'dob',label:'Date of birth',icon:ICON.cal,ph:'DD/MM/YYYY',val:s.dobText})}
      </div>
    </section>
    ${footer(s)}${discardSheet(s)}`;
  }

  // contact
  return `${top}
    <section class="content">
      <h2>Contact details<span class="opt">Optional</span></h2>
      <div class="fields">
        ${field({key:'email',label:'Email',icon:ICON.mail,ph:'name@example.com',type:'email',val:s.email,err:s.errEmail})}
        ${field({key:'phone',label:'Phone',icon:ICON.phone,ph:'07700 900000',type:'tel',val:s.phone})}
        ${field({key:'address',label:'Address',icon:ICON.pin,ph:'House, street, town, postcode',val:s.address,tall:1})}
      </div>
    </section>
    ${footer(s)}${discardSheet(s)}`;
}

function fresh(){
  return {view:'edit', step:'photo', clock:'11:18', ...ORIGINAL, errName:'', errEmail:'', discard:false, toast:false, focus:''};
}

function renderStatic(){
  const set = (id, s) => { const el = document.getElementById(id); if (el) el.innerHTML = screen(s); };
  set('m-photo',   fresh());
  set('m-details', {...fresh(), step:'details', name:'Bahadur B. Gurung', clock:'11:19', focus:'name'});
  set('m-error',   {...fresh(), step:'details', name:'', errName:'Enter the member’s name', clock:'11:19'});
  set('m-contact', {...fresh(), step:'contact', clock:'11:20'});
  set('m-camera',  {...fresh(), step:'camera', clock:'11:19'});
  set('m-discard', {...fresh(), step:'details', name:'Bahadur B. Gurung', discard:true, clock:'11:19'});
}

function prototype(el){
  let s = fresh();
  const draw = () => { el.innerHTML = screen(s); };
  const requestClose = () => {
    if (isDirty(s)) { s.discard = true; draw(); }
    else { s = {view:'list', clock:s.clock, toast:false}; draw(); }
  };

  el.addEventListener('input', e => {
    const k = e.target.dataset.k; if (!k) return;
    if (k==='dob') s.dobText = e.target.value;
    else s[k] = e.target.value;
    if (k==='name') {
      if (s.errName && e.target.value.trim()) s.errName = '';
      else if (!e.target.value.trim()) s.errName = 'Enter the member’s name';
      const b = el.querySelector('.who-row b');
      if (b) { b.textContent = e.target.value.trim() || 'Unnamed member'; b.classList.toggle('empty', !e.target.value.trim()); }
    }
    // refresh tabs + save without stealing focus
    const tabWrap = el.querySelector('.tabs');
    if (tabWrap) tabWrap.outerHTML = tabs(s);
    const btn = el.querySelector('[data-act="save"]');
    if (btn) {
      const on = canSave(s);
      btn.disabled = !on;
      btn.classList.toggle('disabled', !on);
    }
  });

  el.addEventListener('click', e => {
    const t = e.target.closest('[data-act]'); if (!t) return;
    const a = t.dataset.act;
    if (a==='open') { s = fresh(); draw(); return; }
    if (a==='tab-photo' || a==='tab-details' || a==='tab-contact') {
      s.step = a.slice(4);
      s.focus = a==='tab-details' ? 'name' : '';
      draw(); return;
    }
    if (a==='retake') { s.step = 'camera'; draw(); return; }
    if (a==='cancel-cam') { s.step = 'photo'; draw(); return; }
    if (a==='take' || a==='upload') { s.photo = 'new'; s.step = 'photo'; draw(); const f=el.querySelector('.face'); if(f) f.style.boxShadow='0 0 0 6px var(--tint-2)'; return; }
    if (a==='remove') { s.photo = null; draw(); return; }
    if (a==='cancel' || a==='close') { requestClose(); return; }
    if (a==='keep') { s.discard = false; draw(); return; }
    if (a==='discard') { s = {view:'list', clock:s.clock, toast:false}; draw(); return; }
    if (a==='save') {
      if (!canSave(s)) {
        if (!(s.name||'').trim()) { s.step='details'; s.errName='Enter the member’s name'; s.focus='name'; draw(); }
        return;
      }
      s = {view:'list', clock:s.clock, toast:true, savedName:s.name.trim()};
      draw();
      return;
    }
  });

  draw();
}

renderStatic();
const live = document.getElementById('live'); if (live) prototype(live);
if (location.search.includes('still')) document.body.classList.add('still');
