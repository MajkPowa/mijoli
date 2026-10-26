'use strict';
const $ = (q, root = document) => root.querySelector(q);
const $$ = (q, root = document) => [...root.querySelectorAll(q)];
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = value => new Intl.NumberFormat('cs-CZ', {style:'currency',currency:'CZK',maximumFractionDigits:0}).format(value);
const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
// Directional icons use inline paths so mobile font and sprite caches cannot affect them.
const directionalPaths = {
  "arrow-up-right": [
    "M6 18 18 6M7 6h11v11"
  ],
  "arrow-right": [
    "M3.8 12h16.4m-6.5-6.5 6.5 6.5-6.5 6.5"
  ],
  "arrow-left": [
    "M20.2 12H3.8m6.5-6.5L3.8 12l6.5 6.5"
  ],
  "arrow-down": [
    "M12 3.8v16.4m6.5-6.5L12 20.2l-6.5-6.5"
  ],
  "chevron-down": [
    "m5.5 8.8 6.5 6.4 6.5-6.4"
  ],
  "chevron-left": [
    "m15.2 5.5-6.4 6.5 6.4 6.5"
  ],
  "chevron-right": [
    "m8.8 5.5 6.4 6.5-6.4 6.5"
  ]
};
const icon = (name, className = "") => {
  const content = directionalPaths[name]
    ? directionalPaths[name].map(d => `<path d="${d}"/>`).join('')
    : `<use href="icons.svg?v=2.2.0#${name}"/>`;
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-icon="${name}" class="${className}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${content}</svg>`;
};
const labels = {capsules:'Kapsle & tobolky',elixirs:'Bylinné elixíry',superfoods:'Superpotraviny',other:'Další péče'};
const storage = {get(key, fallback){try{return JSON.parse(localStorage.getItem(key)) ?? fallback;}catch{return fallback;}},set(key,value){try{localStorage.setItem(key, JSON.stringify(value));}catch{/* The shop also works with session-only state. */}}};
let products = [], filter = 'all', visibleCount = 8, detailQty = 1, detailId = null, toastTimer;
let searchMatches = [], detailCollection = [];
let finder = {step:1, category:'all', preference:'stock'};
let stockOnly = false, catalogQuery = '', catalogSearchTimer, catalogView = storage.get('mijoli-view-v3', 'grid');
if(!['gallery','grid'].includes(catalogView)) catalogView = 'grid';
document.body.dataset.catalogView = catalogView;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const scrollBehavior = reducedMotion ? 'auto' : 'smooth';
let cart = storage.get('mijoli-cart-v1', []), favorites = storage.get('mijoli-favorites-v1', []);
if(!Array.isArray(cart)) cart=[];
if(!Array.isArray(favorites)) favorites=[];
let checkout = {step:1, fields:{country:'Česká republika'}, shipping:'address', payment:'transfer'};
const byId = id => products.find(p => p.id === Number(id));
const cartTotal = () => cart.reduce((sum,item) => sum + (byId(item.id)?.price || 0) * item.qty,0);
const cartCount = () => cart.reduce((sum,item) => sum + item.qty,0);
const productWord = count => count===1?'produkt':count>1&&count<5?'produkty':'produktů';
const searchableText = p => normalize([p.name,p.brand,p.package,labels[p.category],p.ingredients,p.shortDescription,p.description].join(' '));
function queryMatches(p,query){const words=normalize(query).trim().split(/\s+/).filter(Boolean);const text=searchableText(p);return words.every(word=>text.includes(word));}
function syncCatalogUrl(){
  const url=new URL(location.href);
  const values={q:catalogQuery.trim(),category:filter==='all'?'':filter,stock:stockOnly?'1':'',sort:$('#sort').value==='featured'?'':$('#sort').value};
  Object.entries(values).forEach(([key,value])=>value?url.searchParams.set(key,value):url.searchParams.delete(key));
  history.replaceState(null,'',url.pathname+url.search+url.hash);
}
function readCatalogUrl(){
  const params=new URLSearchParams(location.search),category=params.get('category'),sort=params.get('sort');
  filter=['all','capsules','elixirs','superfoods','other','favorites'].includes(category)?category:'all';
  stockOnly=params.get('stock')==='1';catalogQuery=(params.get('q')||'').slice(0,200);
  $('#sort').value=['featured','price-asc','price-desc','name'].includes(sort)?sort:'featured';
  if($('#catalog-search'))$('#catalog-search').value=catalogQuery;
}
function resetFilters(){catalogQuery='';filter='all';stockOnly=false;$('#sort').value='featured';visibleCount=8;renderProducts();}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2700);}
function openDialog(id){
  const dialog=document.getElementById(id), previous=$('dialog[open]');
  if(previous===dialog)return;
  dialog._opener=document.activeElement;
  if(id==='product-dialog'&&previous)dialog.dataset.returnTo=previous.id;
  else delete dialog.dataset.returnTo;
  $$('dialog[open]').forEach(d=>d.close());
  $('.header nav').classList.remove('open');
  $('.menu-button').setAttribute('aria-expanded','false');
  dialog.showModal();dialog.scrollTop=0;updateBottomNav();
}
function closeDialog(button){
  const dialog=button.closest('dialog');if(!dialog)return;
  const returnTo=dialog.dataset.returnTo;delete dialog.dataset.returnTo;dialog.close();
  if(returnTo){openDialog(returnTo);if(returnTo==='search-dialog')$('#search-input').focus();}
  else if(dialog._opener?.isConnected)dialog._opener.focus({preventScroll:true});
  updateBottomNav();
}
function persist(){storage.set('mijoli-cart-v1',cart);storage.set('mijoli-favorites-v1',favorites);updateCounters();}
function updateCounters(){
  const count=cartCount();$$('.cart-count').forEach(e=>{e.textContent=count;if(e.classList.contains('dock-badge'))e.hidden=!count;});
  $('.cart-button').setAttribute('aria-label',`Otevřít košík, ${count} položek`);
  $$('.favorite-count,.dock-favorites-count').forEach(e=>{e.textContent=favorites.length;e.hidden=!favorites.length;});
  $$('.favorite-toggle').forEach(b=>{const saved=favorites.includes(Number(b.dataset.id));b.classList.toggle('is-saved',saved);b.setAttribute('aria-pressed',String(saved));const p=byId(b.dataset.id);b.setAttribute('aria-label',`${saved?'Odebrat z oblíbených':'Uložit do oblíbených'}: ${p?.name||''}`);});
  updateBottomNav();
}
function saveFavorite(id){id=Number(id);favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];persist();if(filter==='favorites')renderProducts();toast(favorites.includes(id)?'Uloženo do vašeho výběru':'Produkt odebrán z oblíbených');}
function addToCart(id,qty=1){const p=byId(id);if(!p?.inStock)return;const existing=cart.find(i=>i.id===p.id);const requested=Math.max(1,Math.min(99,Number(qty)||1));if(existing)existing.qty=Math.min(99,existing.qty+requested);else cart.push({id:p.id,qty:requested});persist();renderCart();toast(`${p.name} je ve vašem košíku`);}
function mutateCartKeepingFocus(mutation){
  const active=document.activeElement, action=active?.dataset.action, id=active?.dataset.id;
  const index=$$('.cart-item').indexOf(active?.closest('.cart-item'));
  mutation();persist();renderCart();
  if(!$('#cart-dialog').open)return;
  const same=id?$(`[data-action="${action}"][data-id="${id}"]`,$('#cart-content')):null;
  const sameItem=id?$(`[data-action="cart-minus"][data-id="${id}"]`,$('#cart-content')):null;
  const rows=$$('.cart-item',$('#cart-content')), nextRow=rows[Math.min(Math.max(0,index),rows.length-1)];
  const next=same&&!same.disabled?same:sameItem||$('button',nextRow||$('#cart-content'))||$('#cart-title');
  next.tabIndex=next.tagName==='BUTTON'?next.tabIndex:-1;next.focus({preventScroll:true});
}
function changeQuantity(id,change){
  const item=cart.find(i=>i.id===Number(id));if(!item)return;
  mutateCartKeepingFocus(()=>{item.qty+=change;if(item.qty<1)cart=cart.filter(i=>i!==item);else item.qty=Math.min(99,item.qty);});
}
function removeCartItem(id){mutateCartKeepingFocus(()=>{cart=cart.filter(item=>item.id!==Number(id));});}
function updateDetailQuantity(){
  const active=document.activeElement;
  $$('.detail-qty').forEach(element=>element.textContent=detailQty);
  $$('[data-action="detail-minus"]').forEach(button=>button.disabled=detailQty<=1);
  $$('[data-action="detail-plus"]').forEach(button=>button.disabled=detailQty>=99);
  if(active?.disabled)$('button:not(:disabled)',active.closest('.quantity-control'))?.focus({preventScroll:true});
}
function card(p,index){
  return `<article class="product-card" aria-label="${esc(p.name)}"><div class="product-image-wrap"><span class="product-badge">${p.imageMissing?'Fotografie se připravuje':index===0&&filter==='all'?'NÁŠ TIP':esc(p.brand)}</span><button class="icon-button favorite-toggle ${favorites.includes(p.id)?'is-saved':''}" data-action="favorite" data-id="${p.id}" aria-label="Uložit do oblíbených: ${esc(p.name)}" aria-pressed="${favorites.includes(p.id)}">${icon('heart')}</button><button class="product-image-button" data-action="product" data-id="${p.id}" aria-label="Zobrazit ${esc(p.name)}"><img src="${esc(p.image)}" alt="${esc(p.fullName)}" loading="${index<2?'eager':'lazy'}" width="1024" height="1024" decoding="async"></button><button class="card-discover" data-action="product" data-id="${p.id}" aria-label="Prozkoumat ${esc(p.name)}">Prozkoumat ${icon('arrow-up-right')}</button></div><div class="product-card-info"><p class="product-category">${icon(p.category==='elixirs'?'flask':p.category==='superfoods'?'sprout':p.category==='other'?'drop':'capsule')}${esc(labels[p.category]||'Doplňky stravy')}</p><h3 class="product-title"><button data-action="product" data-id="${p.id}">${esc(p.name)}</button></h3><p class="product-package">${esc(p.package||p.brand)}</p><div class="product-bottom"><div><span class="product-price">${money(p.price)}</span><span class="product-availability ${p.inStock?'':'unavailable'}">${icon(p.inStock?'check':'info')}${p.inStock?'Skladem':'Nedostupné'}</span></div><button class="add-button" data-action="add" data-id="${p.id}" aria-label="Přidat ${esc(p.name)} do košíku" ${p.inStock?'':'disabled'}><span class="add-label">${p.inStock?'Přidat':'Nedostupné'}</span>${icon('bag')}</button></div></div></article>`;
}
function getFiltered(){
  let list=products.filter(p=>(filter==='all'||(filter==='favorites'?favorites.includes(p.id):p.category===filter))&&(!stockOnly||p.inStock)&&queryMatches(p,catalogQuery));
  const sort=$('#sort').value;
  if(sort==='price-asc')list.sort((a,b)=>a.price-b.price);
  if(sort==='price-desc')list.sort((a,b)=>b.price-a.price);
  if(sort==='name')list.sort((a,b)=>a.name.localeCompare(b.name,'cs'));
  return list;
}
function renderProducts(preservePosition=false){
  const list=getFiltered(), rail=$('#products-grid'), position=preservePosition?rail.scrollLeft:0;
  const focusedChip=document.activeElement?.closest('#filter-summary')?document.activeElement.dataset.action:null;
  const emptyFavorites=filter==='favorites'&&!favorites.length;
  const emptyHeading=emptyFavorites?'Zatím nemáte uložené produkty.':filter==='favorites'?'Uložené produkty těmto filtrům neodpovídají.':'Pro tento výběr jsme nic nenašli.';
  const emptyText=emptyFavorites?'Klepněte na srdíčko u produktu. Váš výběr tu počká i na příště.':'Zkuste odebrat některý z aktivních filtrů nebo upravit hledaný výraz.';
  const emptyAction=emptyFavorites?'clear-category':catalogQuery?'clear-query':stockOnly?'clear-stock':'reset-filters';
  const emptyLabel=emptyFavorites?'Prohlédnout nabídku':catalogQuery?'Zrušit hledání':stockOnly?'Zobrazit i nedostupné':'Vymazat filtry';
  rail.innerHTML=list.length?list.slice(0,visibleCount).map(card).join(''):`<div class="empty-state">${icon(filter==='favorites'?'heart':'leaf')}<h3>${emptyHeading}</h3><p>${emptyText}</p><button class="button button-outline" data-action="${emptyAction}">${emptyLabel} ${icon('arrow-right')}</button></div>`;
  rail.scrollTo({left:position,behavior:'auto'});
  $('#shown-count').textContent=`Zobrazeno ${Math.min(visibleCount,list.length)} z ${list.length} produktů`;
  $('#show-more').hidden=visibleCount>=list.length;if($('#total-count'))$('#total-count').textContent=products.length;
  $('#catalog-result').textContent=`${list.length} ${productWord(list.length)}${stockOnly?' skladem':''}`;
  $$('[data-category-count]').forEach(count=>{count.textContent=count.dataset.categoryCount==='all'?products.length:products.filter(p=>p.category===count.dataset.categoryCount).length;});
  $$('[data-filter]').forEach(b=>{b.classList.toggle('active',b.dataset.filter===filter);b.setAttribute('aria-pressed',String(b.dataset.filter===filter));});
  $('.favorites-tab').hidden=!favorites.length&&filter!=='favorites';
  const chips=[];
  const chip=(action,text)=>`<button class="filter-chip" data-action="${action}" aria-label="Zrušit filtr: ${esc(text)}">${esc(text)} ${icon('close')}</button>`;
  if(catalogQuery.trim())chips.push(chip('clear-query',`Hledání: ${catalogQuery.trim()}`));
  if(filter!=='all')chips.push(chip('clear-category',filter==='favorites'?'Uložené produkty':labels[filter]));
  if(stockOnly)chips.push(chip('clear-stock','Jen skladem'));
  if($('#sort').value!=='featured')chips.push(chip('clear-sort',$('#sort').selectedOptions[0].textContent));
  $('#filter-summary').hidden=!chips.length;
  $('#filter-summary').innerHTML=chips.join('')+(chips.length>1?'<button class="filter-reset" data-action="reset-filters">Vymazat vše</button>':'');
  $$('.filter-dot').forEach(dot=>dot.hidden=!chips.length);
  if($('#catalog-search')&&document.activeElement!==$('#catalog-search'))$('#catalog-search').value=catalogQuery;
  if($('#catalog-stock'))$('#catalog-stock').checked=stockOnly;
  $$('[data-action="catalog-clear"]').forEach(button=>button.hidden=!catalogQuery);
  $$('.view-switch button').forEach(b=>{const selected=b.dataset.action===`view-${catalogView}`;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});
  syncCatalogUrl();updateCounters();requestAnimationFrame(updateCarousel);
  if(focusedChip){const next=$(`[data-action="${focusedChip}"]`,$('#filter-summary'))||$('button',$('#filter-summary'))||$('#catalog-search');next?.focus({preventScroll:true});}
}
function setFilter(next){filter=['all','capsules','elixirs','superfoods','other','favorites'].includes(next)?next:'all';visibleCount=8;renderProducts();$('.category-tabs .active')?.scrollIntoView({behavior:scrollBehavior,block:'nearest',inline:'nearest'});}
function openProduct(id, collection=null){
  const p=byId(id);if(!p)return;
  const wasOpen=$('#product-dialog').open, pagerAction=wasOpen?document.activeElement?.dataset.action:null;
  if(collection)detailCollection=collection;
  else if(!wasOpen){const current=getFiltered();detailCollection=current.some(item=>item.id===p.id)?current:products;}
  if(!detailCollection.some(item=>item.id===p.id))detailCollection=[p,...detailCollection];
  detailId=p.id;detailQty=1;
  const list=detailCollection, index=list.findIndex(item=>item.id===p.id);
  $('#product-detail').innerHTML=`<button class="icon-button favorite-toggle detail-favorite" data-action="favorite" data-id="${p.id}" aria-label="Uložit do oblíbených: ${esc(p.name)}" aria-pressed="${favorites.includes(p.id)}">${icon('heart')}</button><div class="product-detail-layout"><div class="detail-image"><img src="${esc(p.image)}" alt="${esc(p.fullName)}"><div class="detail-pager"><button class="icon-button" data-action="detail-prev" aria-label="Předchozí produkt v detailu" ${index<=0?'disabled':''}>${icon('arrow-left')}</button><span>${String(Math.max(0,index)+1).padStart(2,'0')} / ${String(list.length||1).padStart(2,'0')}</span><button class="icon-button" data-action="detail-next" aria-label="Další produkt v detailu" ${index<0||index>=list.length-1?'disabled':''}>${icon('arrow-right')}</button></div></div><div class="detail-copy"><p class="eyebrow">${esc(p.brand)} / ${esc(labels[p.category]||'Další péče')}</p><h2 id="detail-title">${esc(p.name)}</h2><p class="detail-package">${esc(p.package)}</p><span class="product-availability ${p.inStock?'':'unavailable'}">${icon(p.inStock?'check':'info')}${p.inStock?'Skladem v obchodě Mijoli':'Momentálně nedostupné'}</span><p class="detail-description">${esc(p.shortDescription||p.description)}</p><div class="detail-facts"><div>${icon('flask')}<span>Úplné složení<small>V detailu níže</small></span></div><div>${icon('ritual')}<span>Vaše tempo<small>Jasné použití</small></span></div></div><p class="detail-price">${money(p.price)}</p><div class="detail-add-row"><div class="quantity-control" aria-label="Počet kusů"><button data-action="detail-minus" aria-label="Snížit množství" disabled>${icon('minus')}</button><span class="detail-qty" aria-live="polite">1</span><button data-action="detail-plus" aria-label="Zvýšit množství">${icon('plus')}</button></div><button class="button button-dark" data-action="detail-add" ${p.inStock?'':'disabled'}>${p.inStock?'Přidat do košíku':'Není skladem'} ${icon('bag')}</button></div><div class="detail-accordion"><details><summary>${icon('leaf')}O produktu ${icon('plus','accordion-icon')}</summary><p>${esc(p.description||p.shortDescription)}</p></details><details><summary>${icon('flask')}Složení ${icon('plus','accordion-icon')}</summary><p>${esc(p.ingredients||'Úplné složení najdete v aktuálním detailu produktu v obchodě Mijoli.')}</p></details><details><summary>${icon('ritual')}Doporučené užívání ${icon('plus','accordion-icon')}</summary><p>${esc(p.use||'Řiďte se dávkováním na obalu výrobku. Úplné informace najdete v obchodě Mijoli.')}</p></details><details><summary>${icon('info')}Upozornění a skladování ${icon('plus','accordion-icon')}</summary><p>${esc([p.warning,p.storage].filter(Boolean).join('\n\n')||'Před použitím si přečtěte informace na obalu.')}</p></details></div><a class="detail-source" href="${esc(p.url)}" target="_blank" rel="noopener">Úplné informace a skutečný nákup v obchodě Mijoli ${icon('arrow-up-right')}</a><small class="detail-source" style="text-decoration:none">${p.imageMissing?'Fotografie produktu zatím není ve zdrojovém katalogu. ':''}Ceny a dostupnost převzaty ze Shoptetu. Náhled neodesílá objednávky.</small></div></div><div class="detail-mobile-bar"><div><span class="detail-mobile-price">${money(p.price)}</span><span class="detail-mobile-price-note">Cena za balení</span></div><div class="quantity-control" aria-label="Počet kusů"><button data-action="detail-minus" aria-label="Snížit množství" disabled>${icon('minus')}</button><span class="detail-qty" aria-live="polite">1</span><button data-action="detail-plus" aria-label="Zvýšit množství">${icon('plus')}</button></div><button class="button button-dark" data-action="detail-add" ${p.inStock?'':'disabled'}>${icon('bag')}${p.inStock?'Přidat do košíku':'Momentálně nedostupné'}${icon('arrow-right')}</button></div>`;
  if(!$('#product-dialog').open)openDialog('product-dialog');
  $('.product-detail-layout').scrollTop=0;updateCounters();
  $('#detail-live').textContent=`${p.name}, ${money(p.price)}, ${index+1} z ${list.length}.`;
  if(wasOpen&&['detail-next','detail-prev'].includes(pagerAction)){const same=$(`[data-action="${pagerAction}"]`);(same&&!same.disabled?same:$('.detail-pager button:not(:disabled)'))?.focus({preventScroll:true});}
}
function renderCart(){const root=$('#cart-content');if(!products.length){root.innerHTML='<p class="search-prompt">Načítáme váš košík…</p>';return;}if(!cart.length){root.innerHTML=`<div class="empty-state">${icon('bag')}<h3>Prostor pro něco dobrého.</h3><p>Váš košík je zatím prázdný.<br>Najděte si svůj každodenní rituál.</p><button class="button button-dark" data-action="continue-shopping">Objevit produkty ${icon('arrow-up-right')}</button></div>`;return;}root.innerHTML=`<div class="cart-items">${cart.map(item=>{const p=byId(item.id);return `<article class="cart-item"><button class="cart-item-image" data-action="product" data-id="${p.id}" aria-label="Detail ${esc(p.name)}"><img src="${esc(p.image)}" alt="${esc(p.name)}"></button><div><h3>${esc(p.name)}</h3><small>${esc(p.package)}</small><div class="quantity-control"><button data-action="cart-minus" data-id="${p.id}" aria-label="Snížit počet ${esc(p.name)}">${icon('minus')}</button><span>${item.qty}</span><button data-action="cart-plus" data-id="${p.id}" aria-label="Zvýšit počet ${esc(p.name)}" ${item.qty>=99?'disabled':''}>${icon('plus')}</button></div></div><div class="cart-item-end"><span>${money(p.price*item.qty)}</span><button class="cart-remove" data-action="remove" data-id="${p.id}" aria-label="Odebrat ${esc(p.name)}">Odebrat</button></div></article>`;}).join('')}</div><div class="cart-summary"><div class="summary-row"><span>Produkty (${cartCount()} ks)</span><span>${money(cartTotal())}</span></div><div class="summary-row"><span>Doprava</span><span>V dalším kroku</span></div><div class="summary-row total"><strong>Mezisoučet</strong><strong>${money(cartTotal())}</strong></div><button class="button button-dark" data-action="checkout">Pokračovat k objednávce <span>${icon('arrow-up-right')}</span></button><p class="demo-note">Toto je náhled. Objednávku si můžete nezávazně vyzkoušet — nic se neodesílá a nic neplatíte.</p><button class="cart-continue" data-close>Ještě se porozhlédnout</button></div>`;}
function searchProducts(){
  const query=$('#search-input').value.trim();
  const matches=searchMatches=products.filter(p=>queryMatches(p,query));
  $('#search-results').innerHTML=query?(matches.length?`<p class="search-prompt">Nalezeno ${matches.length} ${productWord(matches.length)}${matches.length>8?' · rychlý náhled prvních 8':''}</p>`+matches.slice(0,8).map(p=>`<button class="search-result" data-action="product" data-id="${p.id}"><img src="${esc(p.image)}" alt=""><div><strong>${esc(p.name)}</strong><small>${esc(p.package)} · ${p.inStock?'Skladem':'Nedostupné'}</small></div><span>${money(p.price)} ${icon('arrow-up-right')}</span></button>`).join('')+(matches.length>8?`<button class="button button-outline full search-all" data-action="search-all">Zobrazit všech ${matches.length} výsledků ${icon('arrow-right')}</button>`:''):'<div class="empty-state"><h3>Tohle jsme nenašli.</h3><p>Zkuste kratší název, jinou bylinu nebo kategorii.</p></div>'):'<p class="search-prompt">Hledejte podle názvu, značky nebo složky. Například „Imunita“, „Vitamin“ nebo „elixír“.</p>';
}
function showAllSearchResults(){
  catalogQuery=$('#search-input').value.trim();filter='all';stockOnly=false;$('#sort').value='featured';visibleCount=Math.max(8,searchMatches.length);
  renderProducts();$$('dialog[open]').forEach(dialog=>dialog.close());$('#produkty').scrollIntoView({behavior:scrollBehavior});
  $('#catalog-search')?.focus({preventScroll:true});
}
function checkoutProgress(){return `<div class="checkout-progress"><span class="${checkout.step===1?'active':''}">01 · Vaše údaje</span><span class="${checkout.step===2?'active':''}">02 · Doprava & platba</span><span class="${checkout.step===3?'active':''}">03 · Souhrn</span></div>`;}
function focusCheckout(){const heading=$('#checkout-title');heading.tabIndex=-1;heading.focus({preventScroll:true});}
function shippingCost(){return checkout.shipping==='address'?99:0;}
function renderCheckout(){const root=$('#checkout-content');$('#checkout-title').textContent='Už jen malý krok.';const note='<p class="demo-note">Zkušební objednávka. Žádná data se neodesílají, nevzniká objednávka ani platba. Pro vyzkoušení použijte smyšlené údaje.</p>';let body='';if(checkout.step===1){const fields=[['firstName','Jméno','text','given-name'],['lastName','Příjmení','text','family-name'],['email','E-mail','email','email'],['phone','Telefon','tel','tel'],['street','Ulice a číslo domu','text','street-address'],['city','Město','text','address-level2'],['zip','PSČ','text','postal-code']];body=`${note}<form id="checkout-form" class="checkout-form">${fields.map(([key,label,type,auto])=>`<label class="${key==='street'?'full':''}">${label} *<input name="${key}" type="${type}" autocomplete="${auto}" value="${esc(checkout.fields[key]||'')}" required maxlength="${key==='email'?120:80}" ${key==='phone'?'title="Zadejte telefon včetně alespoň 9 číslic"':''} ${key==='zip'?'pattern="[0-9]{3} ?[0-9]{2}" inputmode="numeric" title="Zadejte PSČ ve formátu 123 45"':''}></label>`).join('')}<label>Země<select name="country"><option>Česká republika</option></select></label><button class="button button-dark full" type="submit">Doprava a platba <span>${icon('arrow-right')}</span></button></form>`;}else if(checkout.step===2){body=`${note}<h3 class="checkout-subtitle">Jak by to k vám putovalo?</h3><div class="checkout-options"><label><input type="radio" name="shipping" value="address" ${checkout.shipping==='address'?'checked':''}><span>Kurýr na adresu<small>Ukázková doprava · doručení na zadanou adresu</small></span><b>99 Kč</b></label><label><input type="radio" name="shipping" value="pickup" ${checkout.shipping==='pickup'?'checked':''}><span>Osobní odběr<small>Ukázková možnost · místo se zatím nevybírá</small></span><b>Zdarma</b></label></div><h3 class="checkout-subtitle">Způsob platby</h3><div class="checkout-options"><label><input type="radio" name="payment" value="transfer" ${checkout.payment==='transfer'?'checked':''}><span>Bankovní převod<small>V náhledu nevznikají platební údaje</small></span><b>Zdarma</b></label><label><input type="radio" name="payment" value="card" ${checkout.payment==='card'?'checked':''}><span>Platba kartou<small>Ukázka výběru · žádná karta se nezadává</small></span><b>Zdarma</b></label></div><div class="checkout-actions"><button class="text-link" data-action="checkout-back">${icon('arrow-left')} Vaše údaje</button><button class="button button-dark" data-action="checkout-next">Zkontrolovat objednávku <span>${icon('arrow-right')}</span></button></div>`;}else{const f=checkout.fields;body=`${note}<div class="review-address"><strong>${esc(f.firstName)} ${esc(f.lastName)}</strong><br>${esc(f.street)}, ${esc(f.zip)} ${esc(f.city)}<br>${esc(f.email)} · ${esc(f.phone)}<br><br>${checkout.shipping==='address'?'Kurýr na adresu':'Osobní odběr (ukázka)'} · ${checkout.payment==='card'?'Platba kartou (ukázka)':'Bankovní převod (ukázka)'}</div><div class="review-items">${cart.map(i=>`<div class="summary-row"><span>${i.qty} × ${esc(byId(i.id).name)}</span><span>${money(byId(i.id).price*i.qty)}</span></div>`).join('')}</div><div class="summary-row"><span>Doprava (ukázková cena)</span><span>${money(shippingCost())}</span></div><div class="summary-row total"><strong>Celkem v náhledu</strong><strong>${money(cartTotal()+shippingCost())}</strong></div><div class="checkout-actions"><button class="text-link" data-action="checkout-back">${icon('arrow-left')} Doprava a platba</button><button class="button button-dark" data-action="checkout-finish">Dokončit ukázku <span>${icon('check')}</span></button></div>`;}root.innerHTML=checkoutProgress()+body;$('#checkout-dialog').scrollTop=0;if($('#checkout-dialog').open)focusCheckout();}
function finishCheckout(){if(!cart.length)return;$('#checkout-title').textContent='Váš rituál je připravený.';$('#checkout-content').innerHTML=`<div class="checkout-success"><div class="success-icon">${icon('check')}</div><p class="eyebrow">UKÁZKA DOKONČENA</p><h3>Takto by začal<br>váš příběh s Mijoli.</h3><p>Prošli jste celou objednávkou.<br>Žádná objednávka nebyla odeslána a nic se neplatilo.<br>Košík jsme vám ponechali pro další prohlížení.</p><button class="button button-dark" data-action="continue-shopping">Zpátky k objevování <span>${icon('arrow-up-right')}</span></button></div>`;checkout={step:1,fields:{country:'Česká republika'},shipping:'address',payment:'transfer'};const heading=$('.checkout-success h3');heading.tabIndex=-1;heading.focus({preventScroll:true});}

function updateBottomNav(){
  const activeDialog=$('dialog[open]');
  const catalogBounds=$('#produkty').getBoundingClientRect();const inCatalog=catalogBounds.top<innerHeight*.55&&catalogBounds.bottom>innerHeight*.25;
  const active=activeDialog?.id==='cart-dialog'?'cart':inCatalog?(filter==='favorites'?'saved':'browse'):'home';
  $$('.mobile-dock [data-nav]').forEach(b=>{const selected=b.dataset.nav===active;b.classList.toggle('active',selected);if(selected)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
}
function updateCarousel(){
  const rail=$('#products-grid'), cards=$$('.product-card',rail);
  const index=cards.length?Math.max(0,Math.min(cards.length-1,Math.round(rail.scrollLeft/(cards[0].getBoundingClientRect().width+14)))):0;
  $('#carousel-progress').textContent=`${String(cards.length?index+1:0).padStart(2,'0')} / ${String(cards.length).padStart(2,'0')}`;
  $('[data-action="carousel-prev"]').disabled=!index;
  $('[data-action="carousel-next"]').disabled=index>=cards.length-1;
  $('.carousel-navigation').hidden=!cards.length;
}
function moveCarousel(direction){
  const rail=$('#products-grid'), card=$('.product-card',rail);if(!card)return;
  rail.scrollBy({left:direction*(card.getBoundingClientRect().width+14),behavior:scrollBehavior});
}
function showFilters(){
  const form=$('#filters-form');form.elements['catalog-category'].value=filter;
  form.elements['catalog-sort'].value=$('#sort').value;form.elements['stock-only'].checked=stockOnly;openDialog('filters-dialog');
}
function browseAll(){
  $$('dialog[open]').forEach(d=>d.close());
  $('#produkty').scrollIntoView({behavior:scrollBehavior});
}


const categoryCode = category => ({capsules:'KAPSLE',elixirs:'ELIXÍR',superfoods:'SUPERPOTRAVINA',other:'PÉČE'}[category]||'NÁŠ VÝBĚR');
function renderFeatured(){
  const selected=[129,81,78,96].map(byId).filter(Boolean);
  $('#featured-products').innerHTML=selected.map((p,index)=>`<article class="featured-card"><div class="featured-card-meta"><span class="product-code">${categoryCode(p.category)}</span><span class="featured-number">${String(index+1).padStart(2,'0')}</span></div><h3><button data-action="product" data-id="${p.id}">${esc(p.name)}</button></h3><p class="featured-package">${esc(p.package)}</p><span class="product-availability featured-availability ${p.inStock?'':'unavailable'}">${icon(p.inStock?'check':'info')}${p.inStock?'Skladem':'Nedostupné'}</span><button class="featured-product-image" data-action="product" data-id="${p.id}" aria-label="Prozkoumat ${esc(p.name)}"><img src="${esc(p.image)}" alt="${esc(p.fullName)}" loading="lazy" width="1024" height="1024" decoding="async"></button><div class="featured-card-bottom"><div><strong>${money(p.price)}</strong><small>CENA ZA BALENÍ</small></div><button class="button button-light" data-action="product" data-id="${p.id}">Prohlédnout ${icon('arrow-right')}</button></div></article>`).join('');
}
const approachCopy={
  composition:{title:'Vědět, co je uvnitř.',text:'Rostlinné extrakty, vitaminy i další složky. V detailu každého produktu najdete jejich seznam, doporučené užívání a důležitá upozornění.',link:'Prozkoumat produkty'},
  format:{title:'Forma, která vám vyhovuje.',text:'Kapsle pro jednoduché použití, tekuté bylinné elixíry nebo superpotraviny do vaší kuchyně. Vybírejte podle svého způsobu každodennosti.',link:'Objevit všechny formy'},
  routine:{title:'Vlastní rytmus. Malý okamžik.',text:'Rituál začíná pozorností k sobě. Najděte si čas, který vám vyhovuje, a vždy se řiďte doporučeným užíváním konkrétního výrobku.',link:'Najít svůj výběr'}
};
function setApproach(key,focus=false){
  const copy=approachCopy[key];if(!copy)return;
  $$('[data-approach]').forEach(button=>{const active=button.dataset.approach===key;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;if(active&&focus)button.focus();});
  $('#approach-content').setAttribute('aria-labelledby',`approach-${key}`);
  $('#approach-content').innerHTML=`<h3>${copy.title}</h3><p>${copy.text}</p><a href="#produkty" class="text-link">${copy.link} ${icon('arrow-right')}</a>`;
}
function openFinder(){
  if(!products.length){toast('Výběr se právě načítá. Zkuste to za okamžik.');return;}
  finder={step:1,category:'all',preference:'stock'};renderFinder();openDialog('finder-dialog');
}
function finderMatches(){return products.filter(p=>(finder.category==='all'||p.category===finder.category)&&(finder.preference!=='stock'||p.inStock));}
function renderFinder(){
  const progress=`<div class="finder-progress" aria-label="Krok ${finder.step} ze 3"><span class="${finder.step===1?'active':''}">01 / FORMA</span><span class="${finder.step===2?'active':''}">02 / VÝBĚR</span><span class="${finder.step===3?'active':''}">03 / VÁŠ RITUÁL</span></div>`;
  if(finder.step===1){
    const choices=[['all','mark','Nechám se překvapit','Prohlédnout všechny formy.'],['capsules','capsule','Kapsle & tobolky','Jednoduchá forma pro každý den.'],['elixirs','flask','Bylinné elixíry','Rostlinné receptury v tekuté podobě.'],['superfoods','sprout','Superpotraviny','Prostor pro váš vlastní způsob.']];
    $('#finder-content').innerHTML=progress+`<h3>Jaká forma vám sedí?</h3><p>Vyberte si podle toho, co se vám používá pohodlně.</p><form id="finder-form"><div class="finder-options">${choices.map(([value,symbol,title,text])=>`<label class="finder-option"><input type="radio" name="finder-category" value="${value}" ${finder.category===value?'checked':''}>${icon(symbol)}<span><strong>${title}</strong><small>${text}</small></span></label>`).join('')}</div><div class="finder-actions"><span>KRÁTKÝ PRŮVODCE VÝBĚREM</span><button type="submit" class="button button-dark">Pokračovat ${icon('arrow-right')}</button></div></form>`;
  }else if(finder.step===2){
    const choices=[['stock','box','Chci začít hned','Zobrazit produkty, které jsou skladem.'],['price','sliders','Vybírám podle ceny','Začít od nejnižší ceny.'],['all','grid','Chci vidět všechny možnosti','Prohlédnout celý dostupný katalog.']];
    $('#finder-content').innerHTML=progress+`<h3>Jak chcete vybírat?</h3><p>Zúžíme výběr podle toho, co je pro vás právě důležité.</p><form id="finder-form"><div class="finder-options">${choices.map(([value,symbol,title,text])=>`<label class="finder-option"><input type="radio" name="finder-preference" value="${value}" ${finder.preference===value?'checked':''}>${icon(symbol)}<span><strong>${title}</strong><small>${text}</small></span></label>`).join('')}</div><div class="finder-actions"><button type="button" class="text-link" data-action="finder-back">${icon('arrow-left')} Zpět</button><button type="submit" class="button button-dark">Připravit výběr ${icon('arrow-right')}</button></div></form>`;
  }else{
    const list=finderMatches();if(finder.preference==='price')list.sort((a,b)=>a.price-b.price);
    const emptyStock=!list.length&&finder.preference==='stock';
    $('#finder-content').innerHTML=progress+`<div class="finder-result">${icon('mark')}<span class="product-code">VÁŠ VÝBĚR JE PŘIPRAVENÝ</span><h3>Váš rituál.<br>Vaše vlastní forma.</h3><p>${finder.category==='all'?'Všechny formy':esc(labels[finder.category])} · ${list.length} ${list.length===1?'produkt':list.length>1&&list.length<5?'produkty':'produktů'}${finder.preference==='stock'?' skladem':''}</p>${emptyStock?'<p class="finder-empty">V této kategorii nyní nemáme produkty skladem. Můžete si prohlédnout celou kategorii nebo se vrátit k výběru formy.</p>':''}<div class="finder-preview">${list.slice(0,3).map(p=>`<span>${esc(p.name)}<small>${money(p.price)}</small></span>`).join('')}</div></div><div class="finder-actions"><button class="text-link" data-action="finder-back">${icon('arrow-left')} Zpět</button><button class="button button-dark" data-action="${emptyStock?'finder-show-all':'finder-apply'}">${emptyStock?'Zobrazit celou kategorii':'Prohlédnout výběr'} ${icon('arrow-right')}</button></div>`;
  }
  $('#finder-dialog').scrollTop=0;
  const heading=$('#finder-content h3');heading.tabIndex=-1;if($('#finder-dialog').open)heading.focus({preventScroll:true});
}
function applyFinder(){
  catalogQuery='';stockOnly=finder.preference==='stock';$('#sort').value=finder.preference==='price'?'price-asc':'featured';setFilter(finder.category);closeDialog($('#finder-dialog'));$('#produkty').scrollIntoView({behavior:scrollBehavior});
}
document.addEventListener('keydown',event=>{
  const tab=event.target.closest('[data-approach]');if(!tab)return;
  const keys=Object.keys(approachCopy),index=keys.indexOf(tab.dataset.approach);
  let next=null;if(event.key==='ArrowRight')next=keys[(index+1)%keys.length];if(event.key==='ArrowLeft')next=keys[(index+keys.length-1)%keys.length];if(event.key==='Home')next=keys[0];if(event.key==='End')next=keys.at(-1);
  if(next){event.preventDefault();setApproach(next,true);}
});

document.addEventListener('click',event=>{const target=event.target.closest('button,a');if(!target)return;if(target.matches('.header nav a')){$('.header nav').classList.remove('open');$('.menu-button').setAttribute('aria-expanded','false');}if(target.dataset.approach){setApproach(target.dataset.approach);return;}if(target.hasAttribute('data-close')){closeDialog(target);return;}if(target.dataset.filter){setFilter(target.dataset.filter);return;}if(target.dataset.category){setFilter(target.dataset.category);$('.header nav').classList.remove('open');$('.menu-button').setAttribute('aria-expanded','false');return;}const action=target.dataset.action,id=target.dataset.id;if(!action)return;switch(action){case'finder':openFinder();break;case'finder-back':finder.step=Math.max(1,finder.step-1);renderFinder();break;case'finder-apply':applyFinder();break;case'finder-show-all':finder.preference='all';renderFinder();break;case'home':$$('dialog[open]').forEach(d=>d.close());history.replaceState(null,'',location.pathname+location.search);window.scrollTo({top:0,behavior:scrollBehavior});break;case'browse':browseAll();break;case'search-all':showAllSearchResults();break;case'catalog-clear':case'clear-query':catalogQuery='';if($('#catalog-search'))$('#catalog-search').value='';visibleCount=8;renderProducts();if(action==='catalog-clear')$('#catalog-search')?.focus({preventScroll:true});break;case'clear-category':setFilter('all');break;case'clear-stock':stockOnly=false;visibleCount=8;renderProducts();break;case'clear-sort':$('#sort').value='featured';visibleCount=8;renderProducts();break;case'reset-filters':resetFilters();break;case'view-gallery':case'view-grid':catalogView=action==='view-grid'?'grid':'gallery';storage.set('mijoli-view-v3',catalogView);document.body.dataset.catalogView=catalogView;renderProducts();break;case'filters':showFilters();break;case'filters-reset':$('#filters-form').reset();$('#filters-form').elements['catalog-category'].value='all';$('#filters-form').elements['catalog-sort'].value='featured';break;case'carousel-prev':moveCarousel(-1);break;case'carousel-next':moveCarousel(1);break;case'detail-prev':case'detail-next':{const list=detailCollection,index=list.findIndex(p=>p.id===detailId),next=list[index+(action==='detail-next'?1:-1)];if(next)openProduct(next.id);break;}case'menu':{const nav=$('.header nav');nav.classList.toggle('open');target.setAttribute('aria-expanded',String(nav.classList.contains('open')));break;}case'search':openDialog('search-dialog');$('#search-input').value='';searchProducts();$('#search-input').focus();break;case'favorites':setFilter('favorites');$('#produkty').scrollIntoView({behavior:scrollBehavior});break;case'favorite':saveFavorite(id);break;case'product':openProduct(id,target.closest('#featured-products')?[129,81,78,96].map(byId).filter(Boolean):target.closest('#search-results')?searchMatches:target.closest('#cart-content')?cart.map(item=>byId(item.id)).filter(Boolean):null);break;case'add':addToCart(id);break;case'cart':renderCart();openDialog('cart-dialog');break;case'cart-minus':changeQuantity(id,-1);break;case'cart-plus':changeQuantity(id,1);break;case'remove':removeCartItem(id);break;case'detail-minus':detailQty=Math.max(1,detailQty-1);updateDetailQuantity();break;case'detail-plus':detailQty=Math.min(99,detailQty+1);updateDetailQuantity();break;case'detail-add':addToCart(detailId,detailQty);$('#product-dialog').close();openDialog('cart-dialog');break;case'continue-shopping':$$('dialog[open]').forEach(d=>d.close());$('#produkty').scrollIntoView({behavior:scrollBehavior});break;case'checkout':if(cart.length){checkout.step=1;renderCheckout();openDialog('checkout-dialog');focusCheckout();}break;case'checkout-back':checkout.step=Math.max(1,checkout.step-1);renderCheckout();break;case'checkout-next':checkout.shipping=$('input[name=shipping]:checked').value;checkout.payment=$('input[name=payment]:checked').value;checkout.step=3;renderCheckout();break;case'checkout-finish':finishCheckout();break;case'privacy':openDialog('info-dialog');break;case'clear-data':cart=[];favorites=[];persist();renderProducts();renderCart();toast('Košík i oblíbené jsou vymazané.');break;}});
document.addEventListener('submit',event=>{if(event.target.id==='finder-form'){event.preventDefault();const data=new FormData(event.target);if(finder.step===1)finder.category=data.get('finder-category')||'all';else finder.preference=data.get('finder-preference')||'stock';finder.step=Math.min(3,finder.step+1);renderFinder();return;}if(event.target.id==='filters-form'){event.preventDefault();const data=new FormData(event.target);stockOnly=data.has('stock-only');$('#sort').value=data.get('catalog-sort');setFilter(data.get('catalog-category'));closeDialog(event.target);$('#produkty').scrollIntoView({behavior:scrollBehavior});return;}if(event.target.id!=='checkout-form')return;event.preventDefault();const data=Object.fromEntries(new FormData(event.target));const empty=$$('input[required]',event.target).find(i=>!i.value.trim());if(empty){empty.setCustomValidity('Vyplňte prosím toto pole.');empty.reportValidity();empty.addEventListener('input',()=>empty.setCustomValidity(''),{once:true});return;}if(!/^\+?[\d\s()-]{9,20}$/.test(data.phone)||(data.phone.match(/\d/g)||[]).length<9){const phone=$('input[name=phone]',event.target);phone.setCustomValidity('Telefon musí obsahovat alespoň 9 číslic.');phone.reportValidity();phone.addEventListener('input',()=>phone.setCustomValidity(''),{once:true});return;}checkout.fields=data;checkout.step=2;renderCheckout();});
document.addEventListener('change',event=>{if(event.target.name==='shipping')checkout.shipping=event.target.value;if(event.target.name==='payment')checkout.payment=event.target.value;});
let railFrame,navFrame;
$('#products-grid').addEventListener('scroll',()=>{cancelAnimationFrame(railFrame);railFrame=requestAnimationFrame(updateCarousel);},{passive:true});
window.addEventListener('scroll',()=>{cancelAnimationFrame(navFrame);navFrame=requestAnimationFrame(updateBottomNav);},{passive:true});
window.addEventListener('resize',()=>requestAnimationFrame(updateCarousel));
$('#search-input').addEventListener('input',searchProducts);
$('#search-input').addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.value.trim()){event.preventDefault();showAllSearchResults();}});
$('#catalog-search')?.addEventListener('input',event=>{catalogQuery=event.target.value.slice(0,200);clearTimeout(catalogSearchTimer);catalogSearchTimer=setTimeout(()=>{visibleCount=8;renderProducts();},150);});
$('#catalog-stock')?.addEventListener('change',event=>{stockOnly=event.target.checked;visibleCount=8;renderProducts();});
$('#sort').addEventListener('change',()=>{visibleCount=8;renderProducts();});
$('#show-more').addEventListener('click',()=>{visibleCount+=8;renderProducts(true);});
$$('dialog').forEach(dialog=>{dialog.addEventListener('click',e=>{if(e.target===dialog){const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)closeDialog(dialog);}});dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog(dialog);});dialog.addEventListener('close',updateBottomNav);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('.header nav').classList.remove('open');$('.menu-button').setAttribute('aria-expanded','false');}});
if('IntersectionObserver'in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.classList.add('js-motion');const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}}),{threshold:.08});$$('.reveal').forEach(el=>observer.observe(el));}
async function init(){try{const response=await fetch('products.json?v=2.2.0');if(!response.ok)throw new Error('Catalog unavailable');products=await response.json();cart=cart.filter(i=>byId(i.id)?.inStock&&Number.isFinite(i.qty)&&i.qty>0).map(i=>({id:Number(i.id),qty:Math.min(99,Math.floor(i.qty))}));favorites=[...new Set(favorites.map(Number).filter(id=>byId(id)))];persist();readCatalogUrl();renderFeatured();renderProducts();renderCart();if(['#produkty','#pribeh','#ritual'].includes(location.hash))requestAnimationFrame(()=>$(location.hash)?.scrollIntoView({behavior:'instant'}));}catch(error){$('#products-grid').innerHTML=`<div class="empty-state"><h3>Katalog se nepodařilo načíst.</h3><p>Zkuste obnovit stránku. Produkty najdete také ve stávajícím obchodě.</p><a class="button button-outline" href="https://784006.myshoptet.com/" target="_blank" rel="noopener">Otevřít Mijoli ${icon('arrow-up-right')}</a></div>`;$('#show-more').hidden=true;console.error('Mijoli: katalog nelze načíst.');}}
init();
