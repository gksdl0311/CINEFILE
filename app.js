'use strict';
const A=Archive, main=document.querySelector('main'), dialog=document.querySelector('dialog'), inside=document.querySelector('#inside');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(action,label,cls='btn')=>`<button class="${cls}" data-action="${action}">${label}</button>`;
const link=(route,label,cls='textlink')=>`<a class="${cls}" href="#${route}">${label}</a>`;
const date=v=>new Date(v+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
const score=r=>A.score(r)===null?'Unrated':A.score(r)+' / 5';
const meta=r=>[A.format(r),A.year(r),score(r)].filter(Boolean).map(esc).join(' · ');
const opt=(v,t,sel)=>`<option value="${esc(v)}"${v===sel?' selected':''}>${esc(t)}</option>`;
const select=(id,label,options,val)=>`<label>${label}<select id="${id}">${options.map(([v,t])=>opt(v,t,val)).join('')}</select></label>`;
const formats=[['','All formats'],...['Film','Series','Documentary','Unknown format'].map(v=>[v,v])];
const empty=(msg,action='')=>`<div class="empty"><p>${msg}</p>${action}</div>`;
const head=(k,h,p='')=>`<div class="wrap pagehead"><span class="eyebrow">${k}</span><h1>${h}</h1>${p&&`<p class="intro">${p}</p>`}</div>`;
const section=(k,h,content,action='')=>`<section class="block"><div class="sectionhead"><div><span class="eyebrow">${k}</span><h2>${h}</h2></div>${action}</div>${content}</section>`;
let data=A.blank(), rows=new Map(), events=[], latest=new Map(), history=new Map(), terms=new Map(), page=0, view='gallery', route='home', timelineLimit=80, journalLimit=30;
let query={search:'',format:'',rating:'',year:'',when:'',sort:'recent'}, time={month:'',year:'',format:''};
function index() {
  rows=new Map(data.records.map(r=>[r._key,r]));events=[...data.activity].sort((a,b)=>b.Date.localeCompare(a.Date));latest=new Map();history=new Map();terms=new Map();
  for(const e of events){if(!latest.has(e._key))latest.set(e._key,e);if(!history.has(e._key))history.set(e._key,[]);history.get(e._key).push(e);}
  for(const r of data.records)terms.set(r._key,A.norm([A.title(r),r.Title,r.TitleEN,r.TitleKO,r.OriginalTitle,A.year(r),r.Directors,r.Director,r.Review].filter(Boolean).join(' ')));
}
function art(r, fallback=true){
  const p=r.Poster||r.PosterURL||r.Artwork||'';
  if(!fallback && !/^data:image\//i.test(p))return '';
  return `<div class="artwork">${/^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=\s]+$/i.test(p)?`<img loading="lazy" src="${esc(p)}" alt="">`:`<i aria-hidden="true">${esc(Array.from(A.title(r))[0])}</i>`}</div>`;
}
function tile(r,artwork=false,event=null){
  return `<button class="tile" data-title="${esc(r._key)}">${artwork?art(r,!event):''}<span class="legend">${event?esc(event.Kind)+' · '+date(event.Date):''}</span><h3>${esc(A.title(r))}</h3><span class="meta">${meta(r)}</span>${event&&r.Review?`<p class="review">${esc(String(r.Review).slice(0,140))}</p>`:''}</button>`;
}
function row(r,e){return `<button class="row" data-title="${esc(r._key)}"><span><strong>${esc(A.title(r))}</strong>${r.TitleKO&&r.TitleKO!==A.title(r)?`<small lang="ko">${esc(r.TitleKO)}</small>`:''}</span><span class="meta">${esc(A.format(r))} · ${esc(A.year(r))}</span><span class="meta">${e?esc(e.Kind)+' · ':''}${esc(score(e&&'Rating' in e?e:r))}</span></button>`;}
function highlights(){return data.records.filter(r=>A.format(r)==='Film'&&A.score(r)>=4).sort((a,b)=>A.score(b)-A.score(a)||A.title(a).localeCompare(A.title(b)));}
function home(){
  const rated=data.records.map(A.score).filter(v=>v!==null), fav=highlights().slice(0,3);
  const stats=[['Titles',rows.size],...['Film','Series','Documentary'].map((f,i)=>[['Films','Series','Documentaries'][i],data.records.filter(r=>A.format(r)===f).length]),['Rated',rated.length],['Average / 5',rated.length?(rated.reduce((a,b)=>a+b,0)/rated.length).toFixed(2):'—'],['Dated entries',events.length]];
  main.innerHTML=`<section class="hero"><img class="still" src="art/afterlight.webp" alt="Rows of oxblood velvet seats face a softly lit cinema screen."><div class="wrap heroInner"><span class="eyebrow">A personal cinema archive</span><h1>For the stories<br><em>that stay.</em></h1><p>A growing collection of films, stories and moments worth remembering.</p><div class="actions">${link('archive','Explore the archive','btn solid')}${link('timeline','Viewing timeline')}</div></div><span class="caption">Afterlight · Hanyee Labs</span></section><div class="programme"><div class="wrap content">${section('The viewing diary','Recent activity',events.length?`<div class="entrygrid">${events.slice(0,3).map(e=>tile(rows.get(e._key),true,e)).join('')}</div>`:empty('Import your viewing history to see your latest entries here.',btn('manage','Import your archive','textlink')),link('timeline','View timeline'))}</div></div><div class="wrap content">${section('At a glance','The archive in numbers',`<div class="stats">${stats.map(([k,v])=>`<div class="stat"><b>${v.toLocaleString('en-GB')}</b><small>${k}</small></div>`).join('')}</div>`)}${section('Personal highlights','The films that stayed',fav.length?`<div class="entrygrid">${fav.map(r=>tile(r,true)).join('')}</div>`:empty('Films you rate four stars or higher will appear here.'))}<p class="closing">Cinema, remembered.</p></div>`;
}
function archive(){
  const years=[...new Set(data.records.map(A.year).filter(Boolean))].sort().reverse();
  main.innerHTML=head('Catalogue','The Archive')+`<div class="wrap pagebody"><div class="sectionnav">${link('timeline','Viewing timeline')}</div><div class="filters"><label>Search the archive<input id="search" type="search" placeholder="Title, director or review" value="${esc(query.search)}"></label>${select('format','Format',formats,query.format)}${select('rating','Personal rating',[['','All ratings'],['unrated','Unrated'],...[5,4.5,4,3.5,3,2.5,2,1.5,1,.5].map(n=>[String(n),n+'+ stars'])],query.rating)}${select('year','Release year',[['','All years'],...years.map(v=>[v,v])],query.year)}<label>Activity date<input type="date" id="when" value="${esc(query.when)}"></label>${select('sort','Order',[['recent','Latest activity'],['added','Recently added'],['rated','Highest rated'],['alpha','Alphabetical']],query.sort)}</div><div class="pair"><span id="count" class="meta" aria-live="polite"></span><div>${['gallery','list'].map(v=>`<button class="chip" data-view="${v}" aria-pressed="${view===v}">${v==='gallery'?'Gallery':'List'}</button>`).join('')}</div></div><div id="results"></div></div>`;results();
}
function results(){
  const q=A.norm(query.search),filtered=data.records.filter(r=>(!q||terms.get(r._key).includes(q))&&(!query.format||A.format(r)===query.format)&&(!query.year||A.year(r)===query.year)&&(!query.when||history.get(r._key)?.some(e=>e.Date===query.when))&&(!query.rating||(query.rating==='unrated'?A.score(r)===null:A.score(r)!==null&&A.score(r)>=Number(query.rating))));
  if(query.sort==='added')filtered.reverse();
  else filtered.sort((a,b)=>query.sort==='alpha'?A.title(a).localeCompare(A.title(b)):query.sort==='rated'?(A.score(b)??-1)-(A.score(a)??-1):(latest.get(b._key)?.Date||'').localeCompare(latest.get(a._key)?.Date||''));
  const pages=Math.max(1,Math.ceil(filtered.length/36));page=Math.min(page,pages-1);
  document.querySelector('#count').textContent=filtered.length.toLocaleString()+' titles';
  document.querySelector('#results').innerHTML=filtered.length?`<div class="${view}">${filtered.slice(page*36,(page+1)*36).map(r=>view==='list'?row(r):tile(r,true)).join('')}</div>${pages>1?`<div class="pages"><button data-page="-1" ${page?'':'disabled'}>Previous</button> ${page+1} / ${pages} <button data-page="1" ${page+1<pages?'':'disabled'}>Next</button></div>`:''}`:empty(rows.size?'No titles match these filters.':'Your collection begins with a local import.',rows.size?btn('reset','Clear filters','textlink'):btn('manage','Import archive','textlink'));
}
function timeline(){
  const years=[...new Set(events.map(e=>e.Date.slice(0,4)))], months=[...new Set(events.filter(e=>!time.year||e.Date.startsWith(time.year)).map(e=>e.Date.slice(5,7)))].sort();
  const matches=events.filter(e=>(!time.year||e.Date.startsWith(time.year))&&(!time.month||e.Date.slice(5,7)===time.month)&&(!time.format||A.format(rows.get(e._key))===time.format));
  let day='';main.innerHTML=head('Viewing diary','Timeline','Watcha export and calendar dates are shown as logged. Confirmed viewing dates are labelled “Watched”.')+`<div class="wrap pagebody"><div class="filters">${select('tYear','Year',[['','All years'],...years.map(v=>[v,v])],time.year)}${select('tMonth','Month',[['','All months'],...months.map(v=>[v,new Date('2000-'+v+'-15').toLocaleString('en',{month:'long'})])],time.month)}${select('tFormat','Format',formats,time.format)}</div>${matches.slice(0,timelineLimit).map(e=>{const heading=day!==e.Date?`<h3 class="day">${date(e.Date)}</h3>`:'';day=e.Date;return heading+row(rows.get(e._key),e)}).join('')||empty('No dated activity for this selection.')}${matches.length>timelineLimit?btn('more','Show more dates'):''}</div>`;
}
function journal(){const entries=data.records.filter(r=>String(r.Review||'').trim()).sort((a,b)=>(latest.get(b._key)?.Date||'').localeCompare(latest.get(a._key)?.Date||''));main.innerHTML=head('Personal writing','Journal','Notes and reflections from the archive.')+`<div class="wrap pagebody"><div class="prose">${entries.slice(0,journalLimit).map(r=>`<article class="textcard"><h3><button class="tile" data-title="${esc(r._key)}">${esc(A.title(r))}</button></h3><p class="review">${esc(r.Review)}</p></article>`).join('')||empty('Your imported personal reviews will appear here.')}${entries.length>journalLimit?btn('moreJournal','Read more entries'):''}</div></div>`;}
function collections(){main.innerHTML=head('Curated cinema','Collections','Keep the films you return to together.')+`<div class="wrap pagebody">${btn('newCollection','Create collection')}${data.collections.map(c=>`<section class="textcard"><div class="pair"><h2>${esc(c.name)}</h2><button class="textlink" data-edit="${esc(c.id)}">Edit collection</button></div><p class="description">${esc(c.description)}</p>${c.keys.map(k=>rows.has(k)?row(rows.get(k)):'').join('')||empty('Add titles from their archive details.')}</section>`).join('')||empty('Create your first collection, then add titles from the archive.')}</div>`;}
function about(){main.innerHTML=head('Hanyee Labs','About in frame.')+`<div class="wrap pagebody"><div class="prose"><h2>A personal cinema journal.</h2><p>A place for the stories I’ve watched, loved, questioned and carried with me.</p><h3>Your archive, on this device</h3><p>Imported titles, ratings, reviews and collections live in this tab’s memory. Closing or refreshing it clears the session. Export a backup to keep your changes.</p><p>Artwork travels with your data when supplied as an embedded image. Remote posters stay offline to keep your viewing history private.</p>${btn('manage','Manage archive')}</div></div>`;}
const screens={home,archive,timeline,journal,collections,about};
function render(){route=location.hash.slice(1);if(!Object.hasOwn(screens,route))route='home';screens[route]();document.querySelectorAll('nav a').forEach(a=>{if(a.hash==='#'+(route==='timeline'?'archive':route))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});}
function modal(html){inside.innerHTML=html;dialog.setAttribute('aria-labelledby','dialogTitle');if(!dialog.open)dialog.showModal();}
function detail(k){
  const r=rows.get(k);if(!r)return;
  const names=[...new Set([r.Title,r.TitleEN,r.TitleKO,r.OriginalTitle].filter(v=>v&&v!==A.title(r)))];
  modal(`<span class="eyebrow">Archive entry</span><h2 id="dialogTitle">${esc(A.title(r))}</h2><p>${names.map(esc).join(' · ')}</p><p class="meta">${meta(r)}</p>${/^(data:image)/i.test(r.Poster||r.PosterURL||r.Artwork||'')?art(r):''}${r.Directors||r.Director?`<p>Directed by ${esc(r.Directors||r.Director)}</p>`:''}${r.Tags?`<p>Tags · ${esc(r.Tags)}</p>`:''}${r.Review?`<h3>Personal review</h3><p class="review">${esc(r.Review)}</p>`:''}<h3>Viewing history</h3>${(history.get(k)||[]).map(e=>`<p>${esc(e.Kind)} · ${date(e.Date)}${e.Rating!=null&&e.Rating!==''?' · '+esc(score(e)):''}</p>`).join('')||'<p>No dated entries.</p>'}${data.collections.length?`<h3>Collections</h3>${data.collections.map(c=>`<button class="chip" data-member="${esc(c.id)}" data-key="${esc(k)}" aria-pressed="${c.keys.includes(k)}">${c.keys.includes(k)?'✓ ':''}${esc(c.name)}</button>`).join(' ')}`:''}`);
}
function collectionForm(id){const c=data.collections.find(c=>c.id===id);modal(`<span class="eyebrow">Curated cinema</span><h2 id="dialogTitle">${c?'Edit':'New'} collection</h2><form id="collectionForm" data-id="${esc(id||'')}"><label>Name<input required maxlength="120" name="name" value="${esc(c?.name)}"></label><label>Description<input maxlength="1500" name="description" value="${esc(c?.description)}"></label><div class="actions"><button class="btn solid">Save collection</button></div></form>`);}
function manage(message=''){modal(`<span class="eyebrow">Private archive</span><h2 id="dialogTitle">Archive settings</h2><p>Import a CINEFILE JSON backup or Watcha CSV. Each file merges into this tab’s archive. Export before refreshing or closing the tab.</p><label>Select a local archive<input type="file" id="file" accept=".json,.csv,application/json,text/csv"></label><p class="status" role="status" id="status">${esc(message)||rows.size+' titles in this session.'}</p><div class="actions">${btn('export','Export backup')}${btn('clear','Clear session','textlink')}</div>`);}
document.addEventListener('submit',e=>{if(e.target.id!=='collectionForm')return;e.preventDefault();const f=e.target, name=f.elements.name.value.trim();if(!name){f.elements.name.focus();return}let c=data.collections.find(c=>c.id===f.dataset.id);if(!c){c={id:crypto.randomUUID(),keys:[]};data.collections.push(c)}Object.assign(c,{name,description:f.elements.description.value.trim()});dialog.close();render();});
document.addEventListener('change',async e=>{
  const id=e.target.id;
  if(id==='file'){
    const file=e.target.files[0];if(!file)return; e.target.disabled=true;
    try{const input=A.parse(await file.text(),file.name);const merged=A.merge(data,input);data=merged;index();page=0;render();manage('Imported '+file.name+' · '+rows.size+' titles, '+events.length+' dated entries.');}
    catch(err){manage('Import failed. '+err.message+' Your open archive is intact.');}
  }else if(Object.hasOwn(query,id)){query[id]=e.target.value;page=0;results()}
  else if(['tMonth','tYear','tFormat'].includes(id)){time[{tMonth:'month',tYear:'year',tFormat:'format'}[id]]=e.target.value;if(id==='tYear')time.month='';timelineLimit=80;timeline();document.getElementById(id).focus()}
});
document.addEventListener('input',e=>{if(e.target.id==='search'){query.search=e.target.value;page=0;results()}});
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;const d=b.dataset;
  if(b.classList.contains('close')){dialog.close();return}
  if(d.title){detail(d.title);return}if(d.view){view=d.view;archive();document.querySelector('[data-view="'+view+'"]').focus();return}
  if(d.page){page+=Number(d.page);results();document.querySelector('#count').scrollIntoView();return}
  if(d.edit){collectionForm(d.edit);return}
  if(d.member){const c=data.collections.find(c=>c.id===d.member);c.keys=c.keys.includes(d.key)?c.keys.filter(k=>k!==d.key):[...c.keys,d.key];render();detail(d.key);return}
  switch(d.action){
    case 'search':location.hash='archive';setTimeout(()=>document.querySelector('#search')?.focus(),30);break;
    case 'manage':manage();break;
    case 'more':timelineLimit+=80;timeline();break;
    case 'moreJournal':journalLimit+=30;journal();break;
    case 'reset':query={search:'',format:'',rating:'',year:'',when:'',sort:'recent'};page=0;archive();break;
    case 'newCollection':collectionForm();break;
    case 'export':{const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='in-frame-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);break}
    case 'clear':modal(`<h2 id="dialogTitle">Clear this session?</h2><p>This removes the open archive and collections from this tab. Your original files stay on your device.</p><div class="actions">${btn('cancelClear','Keep archive')}${btn('confirmClear','Clear session')}</div>`);break;
    case 'cancelClear':manage();break;
    case 'confirmClear':data=A.blank();index();render();manage('Session cleared.');break;
  }
});
window.addEventListener('hashchange',()=>{if(dialog.open)dialog.close();render();window.scrollTo(0,0);main.focus({preventScroll:true})});
index();render();
