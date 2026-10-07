(function(root){
  'use strict';
  const INTENTS=Object.freeze({daily:'today',three:'general',relationship:'love',career:'work',decision:'decision',celtic:'general'});
  const EVENTS=new Set(['reading_start','reading_complete','guide_reading_click']);
  const allowed=value=>typeof value==='string'&&Object.prototype.hasOwnProperty.call(INTENTS,value);
  function readEntry(search){
    if(typeof search!=='string'||search.length>2048)return null;
    const values=new URLSearchParams(search).getAll('acilim');
    if(values.length!==1||!allowed(values[0]))return null;
    return {spreadId:values[0],intentId:INTENTS[values[0]]};
  }
  function analyticsEvent(name,props){
    if(!EVENTS.has(name)||!allowed(props?.spreadId))return null;
    return {name,params:{spread_id:props.spreadId}};
  }
  const api={readEntry,analyticsEvent};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.TAROT_DISCOVERY=api;
  if(typeof document!=='undefined')document.addEventListener('click',event=>{
    const target=event.target.closest?.('[data-reading-link]');
    const safe=target&&analyticsEvent('guide_reading_click',{spreadId:target.dataset.readingLink});
    if(safe&&typeof root.gtag==='function'){try{root.gtag('event',safe.name,safe.params);}catch{}}
  });
})(typeof window!=='undefined'?window:globalThis);
