const I = (d, sw=2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICON = {
  x: I('<path d="M18 6 6 18M6 6l12 12"/>'),
  back: I('<path d="m15 18-6-6 6-6"/>'),
  arrow: I('<path d="M5 12h14M12 5l7 7-7 7"/>'),
  check: I('<path d="M20 6 9 17l-5-5"/>', 2.6),
  cal: I('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  lock: I('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),
  alert: I('<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>'),
  type: I('<path d="M4 7V4h16v3M9 20h6M12 4v16"/>'),
  scan: I('<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/>'),
  plus: I('<path d="M5 12h14M12 5v14"/>'),
};

const TODAY = '2026-11-17';
const TOGGLE_FIELDS = [
  ['email', 'Email'],
  ['phone', 'Phone'],
  ['address', 'Address'],
  ['dob', 'Date of birth'],
  ['photo', 'Photo'],
];
const TABS = ['basics', 'fields'];
const TAB_LABEL = {basics:'Basics', fields:'Check-in fields'};
const EMPTY_FIELDS = {email:false, phone:false, address:false, dob:false, photo:false};
const ORIGINAL = {
  name: 'Community Lunch',
  date: TODAY,
  fields: {...EMPTY_FIELDS},
};

const esc = s => String(s??'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmtDate = iso => {
  if (!iso) return '';
  const [y,m,d] = iso.split('-');
  return `${+d} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1]} ${y}`;
};
const status = t => `<div class="status"><span>${t||'9:41'}</span><span class="sys"><span class="bars"><i></i><i></i><i></i><i></i></span><span class="batt"><i></i></span></span></div>`;
const topbar = (title, {close=true}={}) => `<header class="topbar">${close?`<button class="chipbtn" data-act="close" aria-label="Close">${ICON.x}</button>`:'<span></span>'}<h1>${title}</h1><span></span></header>`;

function steps(n){
  const names = ['Basics', 'Check-in fields'];
  return `<div class="steps"><div class="seg">${[1,2].map(i=>`<i class="${i<=n?'on':''}"></i>`).join('')}</div><p><b>${n} of 2</b> · ${names[n-1]}</p></div>`;
}

function dirtyOf(s){
  const fields = s.fields || EMPTY_FIELDS;
  const orig = s.original || ORIGINAL;
  const origFields = orig.fields || EMPTY_FIELDS;
  const fieldsDirty = TOGGLE_FIELDS.some(([k]) => !!fields[k] !== !!origFields[k]);
  return {
    basics: (s.name||'') !== (orig.name||'') || (s.date||'') !== (orig.date||''),
    fields: fieldsDirty,
  };
}
const isDirty = s => Object.values(dirtyOf(s)).some(Boolean);
const canSave = s => isDirty(s) && !!(s.name||'').trim();

function tabs(s){
  const dirty = dirtyOf(s);
  return `<div class="tabs" role="tablist" aria-label="Event sections">${TABS.map(k=>`
    <button class="tab ${s.step===k?'on':''}" role="tab" aria-selected="${s.step===k}" data-act="tab-${k}" id="tab-${k}">
      <i class="bar"></i>
      <span class="lbl">${TAB_LABEL[k]}${dirty[k]?`<span class="dot" title="Unsaved changes"></span>`:''}</span>
    </button>`).join('')}</div>`;
}

function nameField(s, {focus}={}){
  const err = s.errName;
  return `<div class="field">
    <label for="f-name"><span>Event name <span class="req">*</span></span></label>
    <div class="input ${focus?'focus':''} ${err?'err':''}"><input id="f-name" data-k="name" type="text" placeholder="e.g. Community Lunch" value="${esc(s.name||'')}" ${err?'aria-invalid="true" aria-describedby="err-name"':''}></div>
    ${err?`<p class="error" id="err-name" role="alert">${ICON.alert}${err}</p>`:''}
  </div>`;
}

function dateField(s){
  const iso = s.date || TODAY;
  return `<div class="field">
    <label for="f-date"><span>Date</span></label>
    <div class="input date">${ICON.cal}<span class="date-label">${fmtDate(iso)}</span><input id="f-date" data-k="date" type="date" value="${esc(iso)}" aria-label="Date"></div>
  </div>`;
}

function fieldRows(s){
  const fields = s.fields || EMPTY_FIELDS;
  const locked = [['Name','name'],['Member ID','id']].map(([,key]) => `
    <div class="track-row locked">
      <span class="left">${ICON.lock}${key==='name'?'Name':'Member ID'}</span>
      <span class="meta">Always recorded</span>
    </div>`).join('');
  const toggles = TOGGLE_FIELDS.map(([key,label]) => {
    const on = !!fields[key];
    return `<button type="button" class="track-row" data-act="toggle-${key}" aria-pressed="${on}">
      <span>${label}</span>
      <span class="toggle ${on?'on':''}" aria-hidden="true"><i></i></span>
    </button>`;
  }).join('');
  return `<div class="track">${locked}${toggles}</div>`;
}

function discardSheet(s){
  if (!s.discard) return '';
  const who = (s.mode==='edit' ? (s.original?.name || ORIGINAL.name) : (s.name||'').trim());
  const body = s.mode==='edit'
    ? `You have unsaved edits for ${esc(who)}. Closing now will lose them.`
    : `You have started creating this event. Closing now will lose it.`;
  return `<div class="sheet-scrim" data-act="keep" role="presentation">
    <div class="sheet" role="alertdialog" aria-modal="true" aria-labelledby="discard-title" data-act="">
      <h2 id="discard-title">Discard changes?</h2>
      <p>${body}</p>
      <div class="btns">
        <button class="btn btn-outline" data-act="keep">Keep editing</button>
        <button class="btn btn-danger" data-act="discard">Discard</button>
      </div>
    </div>
  </div>`;
}

function deleteSheet(s){
  if (!s.deleteConfirm) return '';
  const who = (s.original?.name || s.name || ORIGINAL.name);
  return `<div class="sheet-scrim" data-act="cancel-delete" role="presentation">
    <div class="sheet" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" data-act="">
      <h2 id="delete-title">Delete ${esc(who)}?</h2>
      <p>This will permanently remove the event and all check-in data for this session. This action cannot be undone.</p>
      <div class="btns">
        <button class="btn btn-outline" data-act="cancel-delete">Cancel</button>
        <button class="btn btn-danger" data-act="confirm-delete">Delete event</button>
      </div>
    </div>
  </div>`;
}

function createFooter(s){
  if (s.step==='basics'){
    return `<footer class="footer split"><button class="btn btn-outline" data-act="cancel">Cancel</button><button class="btn btn-primary" data-act="next">Next${ICON.arrow}</button><i class="home"></i></footer>`;
  }
  return `<footer class="footer split"><button class="btn btn-outline" data-act="back">${ICON.back}Back</button><button class="btn btn-primary" data-act="create">Create event</button><i class="home"></i></footer>`;
}

function editFooter(s){
  const on = canSave(s);
  return `<footer class="footer edit">
    <button class="btn btn-primary${on?'':' disabled'}" data-act="save" ${on?'':'disabled'}>Save changes</button>
    <i class="home"></i>
  </footer>`;
}

function eventsView(s){
  const created = s.created || [];
  const items = [
    {name:'Community Lunch', date:TODAY, canEdit:true},
    {name:'Saturday Yoga', date:'2026-11-10', canEdit:true},
    ...created.filter(e => e.name && e.name !== 'Community Lunch'),
  ];
  return `${status(s.clock)}
    <header class="topbar"><span></span><h1>Events</h1><span></span></header>
    <section class="elist">
      <div class="lead"><h2>Upcoming</h2><p>Create an event, or edit one that’s already set up.</p></div>
      <button class="btn btn-primary" data-act="open-create">${ICON.plus}Create event</button>
      ${items.map(e=>`<div class="ecard">
        <span class="mark">${ICON.cal}</span>
        <div><b>${esc(e.name)}</b><span>${fmtDate(e.date)}</span></div>
        ${e.canEdit?`<button class="edit" data-act="open-edit" data-name="${esc(e.name)}" data-date="${esc(e.date)}">Edit</button>`:''}
      </div>`).join('')}
    </section>
    <footer class="footer" style="background:transparent;border:0;padding-top:0"><i class="home"></i></footer>`;
}

function checkinView(s){
  return `${status(s.clock)}
    <header class="topbar"><button class="chipbtn" data-act="to-events" aria-label="Back">${ICON.back}</button><h1>Check-in</h1><span></span></header>
    <section class="checkin">
      <div class="hero">
        <h2>${esc(s.name)}</h2>
        <p class="when">${fmtDate(s.date)}</p>
      </div>
      <div class="scan">
        <span class="ic">${ICON.scan}</span>
        <b>Ready for check-in</b>
        <p>Scan a member QR at the door to record their visit.</p>
      </div>
    </section>
    <footer class="footer"><button class="btn btn-outline" data-act="to-events">Back to events</button><i class="home"></i></footer>`;
}

function screen(s){
  const st = status(s.clock);
  if (s.view==='list') return eventsView(s);
  if (s.view==='checkin') return checkinView(s);

  if (s.view==='done'){
    return `${st}
      <section class="done">
        <span class="okbig" aria-hidden="true">${ICON.check}</span>
        <div class="ename">${esc(s.name)}</div>
        <div class="edate">${fmtDate(s.date)}</div>
        <div class="title">Event created</div>
        <div class="done-actions">
          <button class="btn btn-primary" data-act="start-checkin">Start check-in</button>
          <button class="btn btn-outline" data-act="to-events">Back to events</button>
        </div>
        <i class="home"></i>
      </section>`;
  }

  if (s.mode==='edit'){
    const top = `${st}${topbar('Edit event')}${tabs(s)}`;
    if (s.step==='fields'){
      return `${top}
        <section class="content fields-step">
          <h2 class="prompt">What should we record at the door?</h2>
          ${fieldRows(s)}
        </section>
        ${editFooter(s)}${discardSheet(s)}${deleteSheet(s)}`;
    }
    return `${top}
      <section class="content">
        <div class="fields">
          ${nameField(s, {focus:s.focus==='name'})}
          ${dateField(s)}
        </div>
        <button class="link danger" data-act="delete">Delete event</button>
      </section>
      ${editFooter(s)}${discardSheet(s)}${deleteSheet(s)}`;
  }

  // create
  const top = `${st}${topbar('Create event')}${steps(s.step==='fields'?2:1)}`;
  if (s.step==='fields'){
    return `${top}
      <section class="content fields-step">
        <div class="summary">
          <span class="who">${esc(s.name)} <small>${fmtDate(s.date)}</small></span>
          <button class="edit" data-act="back">Edit</button>
        </div>
        <h2 class="prompt">What should we record at the door?</h2>
        ${fieldRows(s)}
      </section>
      ${createFooter(s)}${discardSheet(s)}`;
  }
  return `${top}
    <section class="content">
      <div class="fields">
        ${nameField(s, {focus:s.focus==='name'})}
        ${dateField(s)}
      </div>
    </section>
    ${createFooter(s)}${discardSheet(s)}`;
}

function blankCreate(){
  return {view:'create', mode:'create', step:'basics', clock:'9:41', name:'', date:TODAY, fields:{...EMPTY_FIELDS}, errName:'', focus:'', discard:false, deleteConfirm:false, created:[], original:{name:'', date:TODAY, fields:{...EMPTY_FIELDS}}};
}
function freshEdit(over={}){
  return {view:'edit', mode:'edit', step:'basics', clock:'9:41', name:ORIGINAL.name, date:ORIGINAL.date, fields:{...ORIGINAL.fields}, errName:'', focus:'', discard:false, deleteConfirm:false, original:{...ORIGINAL, fields:{...ORIGINAL.fields}}, ...over};
}

function renderStatic(){
  const set = (id, s) => { const el = document.getElementById(id); if (el) el.innerHTML = screen(s); };
  set('m-basics',  blankCreate());
  set('m-error',   {...blankCreate(), errName:'Give the event a name', focus:'name'});
  set('m-fields',  {...blankCreate(), step:'fields', name:'Community Lunch', fields:{...EMPTY_FIELDS, email:true, phone:true}});
  set('m-done',    {view:'done', clock:'9:41', name:'Community Lunch', date:TODAY});
  set('m-edit-dirty', freshEdit({name:'Saturday Community Lunch', focus:'name'}));
  set('m-delete',  freshEdit({deleteConfirm:true}));
  set('m-discard', freshEdit({name:'Saturday Community Lunch', discard:true}));
}

function createIsDirty(s){
  return !!(s.name||'').trim() || s.date !== TODAY || Object.values(s.fields||{}).some(Boolean);
}

function prototype(el){
  let s = blankCreate();
  const draw = () => { el.innerHTML = screen(s); };
  const goList = (extra={}) => { s = {view:'list', clock:s.clock, created:s.created||[], ...extra}; draw(); };
  const requestClose = () => {
    if (s.mode==='edit' ? isDirty(s) : createIsDirty(s)) { s.discard = true; draw(); }
    else goList();
  };

  el.addEventListener('input', e => {
    const k = e.target.dataset.k; if (!k) return;
    if (k==='name') {
      s.name = e.target.value;
      if (s.errName && e.target.value.trim()) s.errName = '';
      else if (s.mode==='edit' && !e.target.value.trim()) s.errName = 'Give the event a name';
    }
    if (k==='date') {
      s.date = e.target.value || TODAY;
      const label = el.querySelector('.date-label');
      if (label) label.textContent = fmtDate(s.date);
    }
    if (s.mode==='edit'){
      const tabWrap = el.querySelector('.tabs');
      if (tabWrap) tabWrap.outerHTML = tabs(s);
      const btn = el.querySelector('[data-act="save"]');
      if (btn) {
        const on = canSave(s);
        btn.disabled = !on;
        btn.classList.toggle('disabled', !on);
      }
      if (k==='name'){
        const err = el.querySelector('#err-name');
        const wrap = el.querySelector('#f-name')?.closest('.input');
        if (s.errName && !err) {
          // fall back to a redraw if the error just appeared
          draw();
          const n = el.querySelector('[data-k="name"]');
          if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
          return;
        }
        if (!s.errName && err) {
          err.remove();
          if (wrap) wrap.classList.remove('err');
        }
      }
    }
  });

  el.addEventListener('click', e => {
    const t = e.target.closest('[data-act]'); if (!t) return;
    const a = t.dataset.act;
    if (a==='open-create') { s = {...blankCreate(), created:s.created||[], clock:s.clock}; draw(); return; }
    if (a==='open-edit') {
      const name = t.dataset.name || ORIGINAL.name;
      const date = t.dataset.date || TODAY;
      s = freshEdit({name, date, original:{name, date, fields:{...EMPTY_FIELDS}}, created:s.created||[]});
      draw(); return;
    }
    if (a==='tab-basics' || a==='tab-fields') { s.step = a.slice(4); s.focus = a==='tab-basics' ? '' : ''; draw(); return; }
    if (a.startsWith('toggle-')) {
      const key = a.slice(7);
      s.fields = {...(s.fields||EMPTY_FIELDS), [key]: !s.fields[key]};
      draw(); return;
    }
    if (a==='next') {
      if (!(s.name||'').trim()) { s.errName = 'Give the event a name'; s.focus = 'name'; draw(); const n=el.querySelector('[data-k="name"]'); if(n) n.focus(); return; }
      s.errName = ''; s.step = 'fields'; draw(); return;
    }
    if (a==='back') { s.step = 'basics'; s.focus = ''; draw(); return; }
    if (a==='create') {
      s = {view:'done', clock:s.clock, name:s.name.trim(), date:s.date, fields:s.fields, created:[...(s.created||[]), {name:s.name.trim(), date:s.date}]};
      draw(); return;
    }
    if (a==='start-checkin') { s = {view:'checkin', clock:s.clock, name:s.name, date:s.date, created:s.created||[]}; draw(); return; }
    if (a==='to-events') { goList(); return; }
    if (a==='cancel' || a==='close') { requestClose(); return; }
    if (a==='keep') { s.discard = false; draw(); return; }
    if (a==='discard') { goList(); return; }
    if (a==='delete') { s.deleteConfirm = true; draw(); return; }
    if (a==='cancel-delete') { s.deleteConfirm = false; draw(); return; }
    if (a==='confirm-delete') { goList(); return; }
    if (a==='save') {
      if (!canSave(s)) {
        if (!(s.name||'').trim()) { s.step='basics'; s.errName='Give the event a name'; s.focus='name'; draw(); }
        return;
      }
      goList(); return;
    }
  });

  draw();
}

renderStatic();
const live = document.getElementById('live'); if (live) prototype(live);
if (location.search.includes('still')) document.body.classList.add('still');
