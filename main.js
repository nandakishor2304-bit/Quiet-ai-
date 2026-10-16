import './style.css';
import { pipeline, env } from '@huggingface/transformers';
import { marked } from 'marked';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
env.allowLocalModels = false;
env.useBrowserCache = true;

const $ = (s) => document.querySelector(s);
const app = $('#app');
const state = {
  messages: [],
  files: [],
  generator: null,
  loadingModel: false,
  busy: false,
  modelReady: false,
  modelName: 'Qwen2.5 0.5B Instruct',
  history: [],
  chatTitle: 'New conversation'
};

const icon = (name, size=18) => {
  const paths = {
    plus:'<path d="M12 5v14M5 12h14"/>',
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    paperclip:'<path d="m21.4 11.6-8.5 8.5a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/>',
    send:'<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    trash:'<path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/>',
    book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.8 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.8-1l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.8-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.8 1l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z"/>',
    close:'<path d="m18 6-12 12M6 6l12 12"/>',
    file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
    sparkle:'<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3Z"/><path d="m19 14 1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14Z"/>'
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||''}</svg>`;
};

function renderShell() {
  app.innerHTML = `
    <aside class="sidebar" id="sidebar">
      <div class="brand"><div class="brand-mark">q.</div><span>Quiet AI</span><button class="icon-btn mobile-only" id="closeSidebar" aria-label="Close menu">${icon('close')}</button></div>
      <button class="new-chat" id="newChat">${icon('plus',17)} <span>New chat</span><kbd>⌘ K</kbd></button>
      <div class="side-label">YOUR SPACE</div>
      <button class="side-item active" id="chatNav">${icon('sparkle')} Chat</button>
      <button class="side-item" id="studyNav">${icon('book')} Study helper</button>
      <div class="side-label recent-label">RECENT</div>
      <div id="recentChats" class="recent-list"><div class="empty-recent">Your conversations appear here.</div></div>
      <div class="sidebar-bottom">
        <div class="privacy-card"><div class="privacy-icon">${icon('settings',17)}</div><div><strong>Private by design</strong><p>Replies run on this device.</p></div><span class="status-dot"></span></div>
        <button class="side-item" id="settingsBtn">${icon('settings')} Settings & storage</button>
      </div>
    </aside>
    <div class="sidebar-shade" id="shade"></div>
    <main class="main">
      <header class="topbar"><button class="icon-btn menu-btn" id="openSidebar" aria-label="Open menu">${icon('menu')}</button><div class="top-title" id="topTitle">New conversation</div><div class="top-actions"><span class="local-pill"><span class="status-dot"></span> On-device</span><button class="icon-btn" id="clearChat" title="Clear conversation">${icon('trash')}</button></div></header>
      <section class="chat-area" id="chatArea">
        <div class="welcome" id="welcome">
          <div class="welcome-mark">${icon('sparkle',25)}</div>
          <p class="eyebrow">YOUR PERSONAL AI</p>
          <h1>A little more clarity.<br><span>For anything.</span></h1>
          <p class="welcome-copy">Ask questions, understand difficult topics, or turn your files into something you can learn from. Your chats stay on this device.</p>
          <div class="suggestions">
            <button class="suggestion" data-prompt="Explain a difficult topic to me like I'm a beginner, then give me an example."><span class="suggestion-icon">${icon('book')}</span><span><b>Learn something</b><small>Clear explanations, step by step</small></span><span class="arrow">↗</span></button>
            <button class="suggestion" data-prompt="Create a study plan for me with daily goals, revision, and practice questions."><span class="suggestion-icon">${icon('settings')}</span><span><b>Make a study plan</b><small>Organize learning and revision</small></span><span class="arrow">↗</span></button>
            <button class="suggestion" data-prompt="Compare these ideas in a clear Markdown table, with pros, cons, and a short conclusion."><span class="suggestion-icon">${icon('file')}</span><span><b>Compare ideas</b><small>Tables, summaries, and decisions</small></span><span class="arrow">↗</span></button>
          </div>
          <div class="model-note" id="modelNote"><span class="tiny-spinner"></span><span>Local AI model loads only when you start chatting.</span></div>
        </div>
        <div class="messages" id="messages"></div>
      </section>
      <div class="composer-wrap">
        <div id="fileChips" class="file-chips"></div>
        <form class="composer" id="composer">
          <textarea id="prompt" rows="1" placeholder="Message Quiet AI..." aria-label="Message Quiet AI"></textarea>
          <div class="composer-tools"><div class="left-tools"><label class="attach-btn" title="Attach files">${icon('paperclip')}<span>Add files</span><input type="file" id="fileInput" multiple accept="image/*,.pdf,.txt,.md,.csv,.json,.html,.xml,.js,.py,.ts,.tsx,.jsx,.css,.java,.c,.cpp,.h,.log,.yaml,.yml,.docx"/></label><span class="tool-divider"></span><span class="composer-hint">Local-first · No account</span></div><button class="send-btn" id="sendBtn" type="submit" aria-label="Send message">${icon('send',17)}</button></div>
        </form>
        <p class="disclaimer">AI can make mistakes. Verify important information.</p>
      </div>
    </main>
    <dialog id="settingsDialog" class="settings-dialog"><div class="dialog-head"><div><p class="eyebrow">PREFERENCES</p><h2>Settings & storage</h2></div><button class="icon-btn" id="closeSettings">${icon('close')}</button></div><div class="setting-row"><div><strong>Local model</strong><p>Qwen2.5 0.5B Instruct · runs in your browser</p></div><span class="setting-value" id="modelStatus">Not loaded</span></div><div class="setting-row"><div><strong>Model storage</strong><p>Model weights are cached by your browser after first download.</p></div><button class="outline-btn" id="loadModelBtn">Load model</button></div><div class="setting-row"><div><strong>Conversation history</strong><p>Saved in this browser on this device.</p></div><button class="outline-btn" id="exportBtn">Export chats</button></div><div class="setting-row"><div><strong>Clear local history</strong><p>Remove saved conversations from this browser.</p></div><button class="outline-btn danger" id="clearHistoryBtn">Clear history</button></div><div class="notice"><b>Important</b><p>The first model download needs internet and can be several hundred MB. After it is cached, offline use depends on browser storage and device support. This is not Ollama; a web page cannot silently install Ollama or bundle a full model in this small source ZIP.</p></div></dialog>
    <div id="toast" class="toast" role="status"></div>
  `;
}
renderShell();

const messagesEl = $('#messages');
const chatArea = $('#chatArea');
const promptEl = $('#prompt');
const fileInput = $('#fileInput');
const toastEl = $('#toast');

function toast(message) {
  toastEl.textContent = message; toastEl.classList.add('show');
  clearTimeout(toast._timer); toast._timer = setTimeout(()=>toastEl.classList.remove('show'), 3200);
}
function escapeHTML(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function saveHistory() {
  try {
    const history = JSON.parse(localStorage.getItem('quiet-ai-history') || '[]');
    const item = { id: state.chatId || crypto.randomUUID(), title: state.chatTitle, messages: state.messages, updated: Date.now() };
    const next = [item, ...history.filter(x=>x.id!==item.id)].slice(0,30);
    localStorage.setItem('quiet-ai-history', JSON.stringify(next));
  } catch(e) { console.warn('History storage is full or unavailable', e); }
  renderRecent();
}
function renderRecent() {
  const el=$('#recentChats'); let history=[];
  try { history=JSON.parse(localStorage.getItem('quiet-ai-history')||'[]'); } catch {}
  el.innerHTML = history.length ? history.map(h=>`<button class="recent-item ${h.id===state.chatId?'selected':''}" data-chat="${escapeHTML(h.id)}">${icon('file',15)}<span>${escapeHTML(h.title||'Conversation')}</span></button>`).join('') : '<div class="empty-recent">Your conversations appear here.</div>';
}
function startNewChat() {
  state.chatId=crypto.randomUUID(); state.messages=[]; state.files=[]; state.chatTitle='New conversation';
  $('#topTitle').textContent=state.chatTitle; messagesEl.innerHTML=''; $('#welcome').classList.remove('hidden');
  renderFileChips(); renderRecent(); promptEl.value=''; promptEl.focus();
  closeSidebar();
}
function renderMessages() {
  $('#welcome').classList.toggle('hidden', state.messages.length>0);
  messagesEl.innerHTML=state.messages.map((m,i)=>{
    const isUser=m.role==='user';
    return `<article class="message ${isUser?'user-message':'assistant-message'}"><div class="avatar ${isUser?'user-avatar':'ai-avatar'}">${isUser?'Y':icon('sparkle',16)}</div><div class="message-body"><div class="message-author">${isUser?'You':'Quiet AI'}<span>${isUser?'':'· local model'}</span></div><div class="message-content">${isUser?escapeHTML(m.content).replace(/\n/g,'<br>'):marked.parse(m.content||'')}</div>${!isUser?`<div class="message-actions"><button class="mini-action copy-btn" data-index="${i}">Copy</button></div>`:''}</div></article>`;
  }).join('');
  chatArea.scrollTop=chatArea.scrollHeight;
}
function renderFileChips() {
  $('#fileChips').innerHTML=state.files.map((f,i)=>`<div class="file-chip">${icon('file',15)}<span>${escapeHTML(f.name)}</span><button type="button" data-remove-file="${i}" aria-label="Remove ${escapeHTML(f.name)}">${icon('close',13)}</button></div>`).join('');
}
function setBusy(b) { state.busy=b; $('#sendBtn').disabled=b; $('#sendBtn').innerHTML=b?'<span class="button-spinner"></span>':icon('send',17); promptEl.disabled=b; }
function titleFrom(s) { return s.trim().split(/\s+/).slice(0,7).join(' ').slice(0,48) || 'Conversation'; }

async function ensureModel() {
  if(state.generator) return state.generator;
  if(state.loadingModel) {
    while(state.loadingModel && !state.generator) await new Promise(r=>setTimeout(r,250));
    if(state.generator) return state.generator;
  }
  state.loadingModel=true;
  $('#modelNote').innerHTML='<span class="tiny-spinner"></span><span>Preparing the local model… first use downloads model files.</span>';
  $('#modelStatus').textContent='Loading…';
  toast('Preparing local AI. First load may take a while.');
  try {
    // Small quantized text model for practical browser/phone use. No inference API/server.
    state.generator = await pipeline('text-generation', 'onnx-community/Qwen2.5-0.5B-Instruct', {
      dtype: 'q4',
      device: 'wasm',
      progress_callback: (p) => {
        if(p.status==='progress' && p.total) {
          const pct=Math.round(p.loaded/p.total*100);
          $('#modelNote').innerHTML=`<span class="tiny-spinner"></span><span>Downloading local model… ${pct}%</span>`;
          $('#modelStatus').textContent=`${pct}%`;
        } else if(p.status==='initiate') {
          $('#modelNote').innerHTML='<span class="tiny-spinner"></span><span>Downloading model files for local use…</span>';
        }
      }
    });
    state.modelReady=true;
    $('#modelStatus').textContent='Ready';
    $('#modelNote').innerHTML='<span class="status-dot"></span><span>Local model ready. Replies are generated on this device.</span>';
    return state.generator;
  } catch(err) {
    state.generator=null;
    $('#modelStatus').textContent='Unavailable';
    $('#modelNote').innerHTML='<span class="warning-dot"></span><span>Could not load the model. Check connection, browser support, and available storage.</span>';
    throw err;
  } finally { state.loadingModel=false; }
}

async function readFile(file) {
  const ext=file.name.split('.').pop().toLowerCase();
  const item={name:file.name,type:file.type||ext,size:file.size,text:'',url:null};
  if(file.type.startsWith('image/')) {
    item.url=URL.createObjectURL(file);
    try {
      const { default: Tesseract } = await import('tesseract.js');
      const result=await Tesseract.recognize(file,'eng');
      item.text=`[Image attachment: ${file.name}. OCR text found in image:]\n${result.data.text}`;
    } catch { item.text=`[Image attachment: ${file.name}. This lightweight text model cannot directly interpret image pixels. If the image contains text, type or paste it here, or use a device OCR tool.]`; }
  } else if(ext==='pdf' || file.type==='application/pdf') {
    const data=new Uint8Array(await file.arrayBuffer());
    const pdf=await pdfjsLib.getDocument({data}).promise;
    const pages=[];
    for(let n=1;n<=Math.min(pdf.numPages,60);n++){
      const page=await pdf.getPage(n); const content=await page.getTextContent();
      pages.push(`\n[Page ${n}]\n`+content.items.map(x=>x.str).join(' '));
    }
    item.text=`[PDF: ${file.name}; ${pdf.numPages} pages. Text extracted from up to 60 pages]\n${pages.join('\n').slice(0,50000)}`;
  } else if(['txt','md','csv','json','html','xml','js','py','ts','tsx','jsx','css','java','c','cpp','h','log','yaml','yml'].includes(ext) || file.type.startsWith('text/')) {
    item.text=`[File: ${file.name}]\n${(await file.text()).slice(0,50000)}`;
  } else if(ext==='docx') {
    item.text=`[DOCX file: ${file.name}. Direct DOCX extraction is not included in this build. Export it as PDF or TXT and attach that version.]`;
  } else {
    item.text=`[File attached: ${file.name} (${file.type||'unknown type'}, ${Math.round(file.size/1024)} KB). This file type is not directly readable in this build.]`;
  }
  return item;
}

async function sendMessage(text) {
  text=text.trim();
  if((!text && !state.files.length) || state.busy) return;
  if(!state.chatId) state.chatId=crypto.randomUUID();
  const attached=state.files.slice();
  const attachmentText=attached.map(f=>f.text).filter(Boolean).join('\n\n').slice(0,65000);
  const userContent=text+(attached.length?'\n\nAttachments: '+attached.map(f=>f.name).join(', '):'');
  state.messages.push({role:'user',content:userContent});
  if(state.messages.length===1) { state.chatTitle=titleFrom(text||attached[0]?.name||'File chat'); $('#topTitle').textContent=state.chatTitle; }
  state.files=[]; renderFileChips(); renderMessages(); promptEl.value=''; promptEl.style.height='auto'; setBusy(true);
  const waitId='wait-'+Date.now();
  messagesEl.insertAdjacentHTML('beforeend',`<article class="message assistant-message" id="${waitId}"><div class="avatar ai-avatar">${icon('sparkle',16)}</div><div class="message-body"><div class="message-author">Quiet AI<span>· local model</span></div><div class="thinking"><span></span><span></span><span></span> Thinking on this device…</div></div></article>`);
  chatArea.scrollTop=chatArea.scrollHeight;
  try {
    const gen=await ensureModel();
    const system = `You are Quiet AI, a helpful, thoughtful, accurate personal assistant and study tutor. Explain clearly and naturally. Adapt depth to the user's request. For study questions, define terms, explain step-by-step, use examples, and finish with a concise recap when useful. Use Markdown headings, numbered steps, bullet lists, and valid Markdown tables when helpful. For tables, keep cells concise. Be honest about uncertainty; never invent citations, facts, or file contents. If user provides attachment text, answer grounded in it and distinguish document facts from your own general knowledge. Do not claim live internet access.`;
    const recent=state.messages.slice(-10).map(m=>({role:m.role,content:m.content+(m.role==='user' && attachmentText && m===state.messages[state.messages.length-1]?'\n\n'+attachmentText:'')}));
    const messages=[{role:'system',content:system},...recent];
    const output=await gen(messages,{max_new_tokens:700, do_sample:true, temperature:0.65, top_p:0.9, repetition_penalty:1.08});
    let answer=output?.[0]?.generated_text;
    if(Array.isArray(answer)) answer=answer.slice(messages.length).map(x=>x.content||'').join('');
    else if(typeof answer==='string') {
      const marker='assistant';
      const idx=answer.lastIndexOf(marker);
      if(idx>=0) answer=answer.slice(idx+marker.length).replace(/^[\s\n:]+/,'');
    }
    answer=(answer||'I could not produce a response. Please try again.').trim();
    $('#'+waitId)?.remove();
    state.messages.push({role:'assistant',content:answer});
    renderMessages(); saveHistory();
  } catch(err) {
    $('#'+waitId)?.remove();
    const msg=String(err?.message||err);
    state.messages.push({role:'assistant',content:`**I couldn't start the local model.**\n\n${msg.includes('fetch')||msg.includes('network')?'The model files may not have downloaded yet. Connect to the internet once, try again, and keep this page open while the model downloads.': 'Try refreshing the app, freeing device storage, or using a supported browser. This model can be demanding on some phones.'}\n\nNo chat request was sent to an AI server. The model files are fetched for local inference and cached by your browser.`});
    renderMessages(); saveHistory();
  } finally { setBusy(false); promptEl.focus(); }
}

$('#composer').addEventListener('submit',e=>{e.preventDefault();sendMessage(promptEl.value);});
promptEl.addEventListener('input',()=>{promptEl.style.height='auto';promptEl.style.height=Math.min(promptEl.scrollHeight,160)+'px';});
promptEl.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('#composer').requestSubmit();}});
fileInput.addEventListener('change',async()=>{
  const files=[...fileInput.files]; fileInput.value='';
  if(!files.length)return;
  toast(`Reading ${files.length} file${files.length>1?'s':''}…`);
  for(const f of files) {
    try { state.files.push(await readFile(f)); }
    catch(e) { state.files.push({name:f.name,text:`[Could not read ${f.name}: ${e.message}]`}); }
  }
  renderFileChips(); toast('Files ready to use in your next message.');
});
$('#fileChips').addEventListener('click',e=>{const b=e.target.closest('[data-remove-file]');if(b){const i=Number(b.dataset.removeFile);state.files.splice(i,1);renderFileChips();}});
document.addEventListener('click',e=>{
  const sug=e.target.closest('[data-prompt]');
  if(sug){promptEl.value=sug.dataset.prompt;promptEl.focus();promptEl.dispatchEvent(new Event('input'));return;}
  const copy=e.target.closest('.copy-btn');
  if(copy){navigator.clipboard?.writeText(state.messages[Number(copy.dataset.index)]?.content||'').then(()=>toast('Copied to clipboard')).catch(()=>toast('Clipboard permission unavailable'));return;}
  const recent=e.target.closest('[data-chat]');
  if(recent){loadChat(recent.dataset.chat);}
});
function loadChat(id){
  try{
    const item=JSON.parse(localStorage.getItem('quiet-ai-history')||'[]').find(x=>x.id===id);
    if(!item)return;state.chatId=item.id;state.chatTitle=item.title;state.messages=item.messages||[];state.files=[];
    $('#topTitle').textContent=state.chatTitle;renderMessages();renderFileChips();renderRecent();closeSidebar();
  }catch{}
}
$('#newChat').addEventListener('click',startNewChat);
$('#clearChat').addEventListener('click',()=>{if(!state.messages.length)return;startNewChat();toast('Started a fresh conversation.');});
$('#studyNav').addEventListener('click',()=>{promptEl.value='Help me study a topic. Ask what subject and level I am studying, then teach me with clear explanations, examples, and quiz questions.';promptEl.focus();closeSidebar();});
$('#chatNav').addEventListener('click',()=>{closeSidebar();promptEl.focus();});
$('#settingsBtn').addEventListener('click',()=>$('#settingsDialog').showModal());
$('#closeSettings').addEventListener('click',()=>$('#settingsDialog').close());
$('#loadModelBtn').addEventListener('click',async()=>{try{await ensureModel();toast('Local model is ready.');}catch{toast('Could not load model. See the model status.');}});
$('#exportBtn').addEventListener('click',()=>{
  const data=localStorage.getItem('quiet-ai-history')||'[]';
  const blob=new Blob([data],{type:'application/json'});const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='quiet-ai-chats.json';a.click();URL.revokeObjectURL(url);
});
$('#clearHistoryBtn').addEventListener('click',()=>{if(confirm('Delete all saved conversations from this browser?')){localStorage.removeItem('quiet-ai-history');renderRecent();toast('Local history cleared.');}});
function openSidebar(){$('#sidebar').classList.add('open');$('#shade').classList.add('visible');}
function closeSidebar(){$('#sidebar').classList.remove('open');$('#shade').classList.remove('visible');}
$('#openSidebar').addEventListener('click',openSidebar);$('#closeSidebar').addEventListener('click',closeSidebar);$('#shade').addEventListener('click',closeSidebar);
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();startNewChat();}});
if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('/sw.js').catch(()=>{});
renderRecent();
if(!state.chatId)state.chatId=crypto.randomUUID();
