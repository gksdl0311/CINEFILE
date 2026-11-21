/* Shared by the browser and the import regression checks. */
const Archive = (() => {
  const blank = () => ({records: [], activity: [], imports: [], collections: []});
  const str = v => String(v ?? '').trim();
  const norm = v => str(v).normalize('NFC').toLowerCase();
  const title = r => str(r.DisplayTitle) || [r.TitleEN || r.Title || r.TitleKO || r.OriginalTitle, r.Season && 'Season ' + r.Season].filter(Boolean).join(' — ');
  const format = r => /documentary/i.test([r.Category,r.Type,r.Genre].join(' ')) ? 'Documentary' : ({MOVIE:'Film',FILM:'Film',TV:'Series',SERIES:'Series'}[str(r.Type).toUpperCase()] || str(r.Type) || 'Unknown format');
  const score = r => str(r.Rating) === '' ? null : Number(r.Rating);
  const aliases = r => [...new Set([r.Title,r.TitleEN,r.TitleKO,r.OriginalTitle,r.DisplayTitle].map(norm).filter(Boolean))];
  const year = r => str(r.Year || r.ReleaseYear);
  const keys = r => aliases(r).map(a => JSON.stringify([a,year(r),norm(r.Type),str(r.Season)]));
  const identity = r => str(r.ID) && JSON.stringify([str(r.ID),str(r.Season)]);
  const defined = o => Object.fromEntries(Object.entries(o).filter(([,v])=>v !== null && v !== undefined && v !== ''));
  const dateKind = r => r.Kind === 'Watched' || r.ConfirmedWatchedAt || /^confirmed (viewing|watch) date$/i.test(str(r.DateBasis)) ? 'Watched' : 'Logged';

  function csv(text) {
    const rows = []; let row = [], field = '', quoted = false, closed = false;
    for (let i=0;i<text.length;i++) {
      const c=text[i];
      if (quoted) {
        if (c !== '"') field += c;
        else if (text[i+1] === '"') { field += '"'; i++; }
        else { quoted=false; closed=true; }
      } else if (c === ',' || c === '\n' || c === '\r') {
        row.push(field); field=''; closed=false;
        if(c !== ',') { if(row.some(v=>v.trim())) rows.push(row); row=[]; if(c==='\r' && text[i+1]==='\n') i++; }
      } else if(c==='"' && !field && !closed) quoted=true;
      else if(closed || c==='"') throw Error('Unexpected character in a quoted CSV field.');
      else field+=c;
    }
    if(quoted) throw Error('Unclosed quotation mark in CSV.');
    row.push(field); if(row.some(v=>v.trim())) rows.push(row);
    const header=rows.shift()?.map(str);
    if(!header?.some(k=>['Title','TitleEN','TitleKO','DisplayTitle','OriginalTitle'].includes(k)) || new Set(header).size!==header.length) throw Error('Expected unique Watcha column names including a title.');
    return rows.map((r,i)=>{if(r.length!==header.length) throw Error('Column count differs on record '+(i+1)+'.'); return Object.fromEntries(header.map((k,j)=>[k,r[j]]));});
  }
  function parse(text,name) {
    text=text.replace(/^\uFEFF/,'');
    if(/\.csv$/i.test(name)) {
      const rows=csv(text); return rows[0] && 'Date' in rows[0] && !('WatchedAt' in rows[0]) ? {records:[],activity:rows} : {records:rows,activity:[]};
    }
    const d=JSON.parse(text);
    if(!Array.isArray(d?.records)||!Array.isArray(d.activity)) throw Error('Expected CINEFILE records and activity arrays.');
    return d;
  }
  function merge(base,input) {
    const out=structuredClone(base), byId=new Map(), byKey=new Map(), byUid=new Map();
    const index = r => {
      if(identity(r)) byId.set(identity(r),r);
      byUid.set(r._key,r);
      for(const k of keys(r)) { if(!byKey.has(k)) byKey.set(k,new Set()); byKey.get(k).add(r); }
    };
    out.records.forEach(index);
    const validate = r => {
      if(!r || typeof r!=='object' || !title(r)) throw Error('A record is missing its title.');
      if(score(r)!==null && (!Number.isFinite(score(r))||score(r)<0||score(r)>5)) throw Error('A rating is outside the 0–5 scale.');
    };
    const pending = [], incomingKeys=new Map();
    function resolve(row, update) {
      validate(row);
      let found=identity(row) && byId.get(identity(row));
      if(!found) {
        const matches=new Set(keys(row).flatMap(k=>[...(byKey.get(k)||[])]).filter(r=>!identity(row)||!identity(r)||identity(r)===identity(row)));
        if(matches.size===1) found=[...matches][0];
      }
      if(!found) {
        found={...row,_key:crypto.randomUUID()}; out.records.push(found); index(found);
      } else if(update) {
        const oldKey=found._key, previousDate=str(found.WatchedAt);
        // Older imports may fill gaps, but should not replace a newer rating or date.
        const older=previousDate && str(row.WatchedAt) && str(row.WatchedAt)<previousDate;
        Object.assign(found,older ? {...defined(row),...defined(found)} : defined(row),{_key:oldKey}); index(found);
      }
      if(row._key) incomingKeys.set(row._key,found._key);
      return found;
    }
    function event(row,r,date,implicit) {
      if(!date) return;
      const day=str(date).slice(0,10);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day))||new Date(day).toISOString().slice(0,10)!==day) throw Error('Invalid activity date.');
      pending.push({row:{...row,_key:r._key,Date:day,Kind:dateKind(row)},implicit});
    }
    for(const row of input.records) {
      const r=resolve(row,true);
      event(row,r,row.ConfirmedWatchedAt||row.WatchedAt||row.LoggedAt,true);
    }
    for(const row of input.activity) {
      const r=byUid.get(incomingKeys.get(row._key))||resolve(row,false);
      event(row,r,row.Date||row.ConfirmedWatchedAt||row.WatchedAt,false);
    }
    const signature=e=>JSON.stringify([e._key,e.Date,e.Kind]);
    const explicit=new Set(pending.filter(e=>!e.implicit).map(e=>signature(e.row)));
    const grouped=new Map(), used=new Map();
    for(const e of out.activity){const k=signature(e);if(!grouped.has(k))grouped.set(k,[]);grouped.get(k).push(e);}
    for(const {row,implicit} of pending) {
      const k=signature(row); if(implicit && explicit.has(k))continue;
      const n=used.get(k)||0; used.set(k,n+1);
      const prior=grouped.get(k)?.[n];
      if(!prior)out.activity.push(row);
      else if(!implicit)Object.assign(prior,defined(row));
    }
    if(input.collections!==undefined && !Array.isArray(input.collections))throw Error('Invalid collections.');
    for(const c of input.collections||[]) {
      if(!str(c?.name)||!Array.isArray(c.keys)||!str(c.id))throw Error('Invalid collection entry.');
      const entry={id:str(c.id),name:str(c.name),description:str(c.description),keys:[...new Set(c.keys.map(k=>incomingKeys.get(k)).filter(Boolean))]};
      const prior=out.collections.find(x=>x.id===entry.id);
      if(prior)Object.assign(prior,entry);else out.collections.push(entry);
    }
    const meta=Object.fromEntries(Object.entries(input).filter(([k])=>!['records','activity','imports','collections'].includes(k)));
    for(const v of [...(Array.isArray(input.imports)?input.imports:[]),meta]) if(Object.keys(v).length&&!out.imports.some(m=>JSON.stringify(m)===JSON.stringify(v)))out.imports.push(v);
    return out;
  }
  return {blank,parse,merge,title,format,score,year,norm};
})();
if(typeof module!=='undefined')module.exports=Archive;
