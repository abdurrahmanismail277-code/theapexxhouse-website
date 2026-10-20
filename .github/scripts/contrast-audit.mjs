import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn, execFileSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const chromePath = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const requested = [
  ["index.html", "Homepage"], ["services.html", "Services"],
  ["home.html#process", "How it works"], ["home.html#about", "About"],
  ["home.html#contact", "Contact"], ["book.html", "Booking"],
  ["privacy-policy.html", "Privacy policy"], ["terms.html", "Terms"],
];
const routes = requested.filter(([route]) => fs.existsSync(path.join(root, route.split("#")[0])));
const missing = requested.filter(([route]) => !fs.existsSync(path.join(root, route.split("#")[0])));
const mime = { ".html":"text/html", ".css":"text/css", ".js":"text/javascript", ".mjs":"text/javascript", ".svg":"image/svg+xml", ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".webp":"image/webp", ".woff2":"font/woff2" };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const target = path.resolve(root, `.${pathname}`);
  if (!target.startsWith(root + path.sep) && target !== root) { res.writeHead(403).end(); return; }
  let file = target;
  try { if (fs.statSync(file).isDirectory()) file = path.join(file, "index.html"); }
  catch { res.writeHead(404).end("Not found"); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end("Not found"); return; }
    res.writeHead(200, { "Content-Type": `${mime[path.extname(file)] || "application/octet-stream"}; charset=utf-8`, "Cache-Control":"no-store" }).end(data);
  });
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "apex-contrast-chrome-"));
const chrome = spawn(chromePath, ["--headless=new", "--no-sandbox", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore", windowsHide: true });
let cdpPort;
for (let i = 0; i < 100; i++) {
  try { cdpPort = Number(fs.readFileSync(path.join(profile, "DevToolsActivePort"), "utf8").split(/\r?\n/)[0]); break; }
  catch { await delay(100); }
}
if (!cdpPort) throw new Error("Chrome DevTools did not start. Set CHROME_PATH to a Chrome executable.");
const targets = await fetch(`http://127.0.0.1:${cdpPort}/json/list`).then(r => r.json());
const page = targets.find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let id = 0;
const pending = new Map();
ws.onmessage = event => {
  const data = JSON.parse(event.data);
  if (!data.id) return;
  const item = pending.get(data.id); if (!item) return;
  pending.delete(data.id); data.error ? item.reject(new Error(data.error.message)) : item.resolve(data.result);
};
function cdp(method, params = {}) {
  const callId = ++id;
  return new Promise((resolve, reject) => { pending.set(callId, { resolve, reject }); ws.send(JSON.stringify({ id:callId, method, params })); });
}
async function evaluate(expression, awaitPromise = false) {
  const response = await cdp("Runtime.evaluate", { expression, returnByValue:true, awaitPromise, timeout:30000 });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || "Evaluation failed");
  return response.result?.value;
}
const auditExpression = `(() => {
 const root=document.documentElement;
 const toRGBA=s=>{s=String(s||'').trim();if(s==='transparent')return [0,0,0,0];let m=s.match(/^#([\\da-f]{3,8})$/i);if(m){let h=m[1];if(h.length===3||h.length===4)h=[...h].map(x=>x+x).join('');if(h.length===6||h.length===8)return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16),h.length===8?parseInt(h.slice(6,8),16)/255:1]}m=s.match(/rgba?\\(\\s*([\\d.]+)[, ]+([\\d.]+)[, ]+([\\d.]+)(?:\\s*[,/]\\s*([\\d.]+%?))?\\s*\\)/i);if(m)return [+m[1],+m[2],+m[3],m[4]?(m[4].endsWith('%')?parseFloat(m[4])/100:+m[4]):1];return null};
 const composite=(fg,bg)=>{let a=fg[3],outA=a+bg[3]*(1-a);if(!outA)return [0,0,0,0];return [0,1,2].map(i=>(fg[i]*a+bg[i]*bg[3]*(1-a))/outA).concat(outA)};
 const lum=c=>{let v=c.slice(0,3).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2]};
 const ratio=(a,b)=>{let x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
 const fmt=c=>'#'+c.slice(0,3).map(x=>Math.round(x).toString(16).padStart(2,'0')).join('');
 const isVisible=e=>{let r=e.getBoundingClientRect();if(!r.width||!r.height||e.closest('[hidden],[aria-hidden="true"]'))return false;for(let n=e;n&&n!==document.documentElement;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)<.95)return false}return true};
 const bgSamples=e=>{let chain=[];for(let n=e;n&&n.nodeType===1;n=n.parentElement)chain.unshift(n);let samples=[[255,255,255,1]];for(const n of chain){const st=getComputedStyle(n),bc=toRGBA(st.backgroundColor);if(bc&&bc[3]>=.99)samples=[bc];else if(bc&&bc[3]>0)samples=samples.map(bg=>composite(bc,bg));const image=st.backgroundImage||'';if(image!=='none'){const parts=image.match(/rgba?\\([^)]*\\)|#[\\da-f]{3,8}/ig)||[];const colors=parts.map(toRGBA).filter(c=>c&&c[3]>0);if(colors.length){const bases=samples;samples=colors.flatMap(c=>bases.map(bg=>composite(c,bg)))}}}return samples};
 const textEls=[...document.body.querySelectorAll('*')].filter(e=>isVisible(e)&&[...e.childNodes].some(n=>n.nodeType===3&&n.nodeValue.trim()));
 const failures=[];let checked=0;
 for(const e of textEls){let text=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.nodeValue).join(' ').replace(/\\s+/g,' ').trim();if(!text)continue;const s=getComputedStyle(e),fg=toRGBA(s.color);if(!fg)continue;const opacity=Number(s.opacity);let parentOpacity=1;for(let p=e.parentElement;p&&p!==document.documentElement;p=p.parentElement)parentOpacity*=Number(getComputedStyle(p).opacity);const effective=fg.slice();effective[3]*=opacity*parentOpacity;const bgs=bgSamples(e);const worst=bgs.map(bg=>({bg,ratio:ratio(composite(effective,bg),bg)})).sort((a,b)=>a.ratio-b.ratio)[0];const size=parseFloat(s.fontSize),weight=parseInt(s.fontWeight)||400,large=size>=24||(size>=19&&weight>=700),min=large?3:4.5;checked++;let reasons=[];if(worst.ratio<min)reasons.push('contrast');if(opacity*parentOpacity<.95)reasons.push('opacity');if(parseFloat(getComputedStyle(e).filter.match(/blur\\(([^)]+)\\)/)?.[1]||'0')>0)reasons.push('blur');if(reasons.length)failures.push({selector:e.id?("#"+e.id):e.className&&typeof e.className==='string'?(e.tagName.toLowerCase()+"."+e.className.trim().split(/\\s+/).join('.')):e.tagName.toLowerCase(),text:text.slice(0,90),fg:fmt(fg),bg:fmt(worst.bg),ratio:+worst.ratio.toFixed(2),required:min,reasons,backgroundSamples:bgs.map(fmt)})}

 const focusTargets=['#services-title','#pricing-tab-communication','#pricing-tab-consulting','#pricing-tab-media'];
 const targets=focusTargets.map(selector=>{const e=document.querySelector(selector);if(!e)return {selector,missing:true};const s=getComputedStyle(e),fg=toRGBA(s.color),bg=bgSamples(e).map(x=>({bg:x,ratio:ratio(composite(fg,x),x)})).sort((a,b)=>a.ratio-b.ratio)[0];return {selector,fg:fmt(fg),bg:fmt(bg.bg),ratio:+bg.ratio.toFixed(2),text:(e.innerText||'').trim(),outline:s.outlineColor,border:s.borderColor}});
 for(const e of document.querySelectorAll('input[placeholder],textarea[placeholder]')){if(!isVisible(e))continue;const s=getComputedStyle(e),fg=toRGBA(s.color),bg=bgSamples(e).map(x=>({bg:x,ratio:ratio(composite(fg,x),x)})).sort((a,b)=>a.ratio-b.ratio)[0];if(bg&&bg.ratio<4.5)failures.push({selector:e.id?('#'+e.id):e.tagName.toLowerCase(),text:'placeholder: '+e.placeholder,fg:fmt(fg),bg:fmt(bg.bg),ratio:+bg.ratio.toFixed(2),required:4.5,reasons:['placeholder contrast'],backgroundSamples:bg?[fmt(bg.bg)]:[]})}
 return {page:location.pathname+location.hash,theme:root.dataset.theme||'light',width:innerWidth,checked,failures,targets};
})()`;
const results=[];
try {
  await cdp("Page.enable"); await cdp("Runtime.enable");
  for (const [route,label] of routes) {
    const viewports = label === "Homepage" ? [[375,844],[768,1024],[1280,900]] : [[375,844],[1280,900]];
    for (const [width,height] of viewports) {
      await cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor:1, mobile:width<600 });
      for (const theme of ["light","dark"]) {
        await cdp("Page.addScriptToEvaluateOnNewDocument", { source:`try{localStorage.setItem('apex-theme',${JSON.stringify(theme)})}catch{};` });
        await cdp("Page.navigate", { url:`http://127.0.0.1:${port}/${route}` });
        for(let n=0;n<100;n++){await delay(100);if(await evaluate("document.readyState==='complete'").catch(()=>false))break;}
        await delay(500);
        await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)};`);
        await evaluate(`(()=>{const b=document.querySelector('.theme-toggle');if(b&&document.documentElement.dataset.theme!==${JSON.stringify(theme)})b.click()})()`);
        await evaluate(`(async()=>{document.querySelectorAll('.fade-up').forEach(e=>e.classList.add('visible'));const end=Math.max(0,document.documentElement.scrollHeight-innerHeight);for(let y=0;y<=end;y+=Math.max(250,innerHeight*.75)){scrollTo(0,y);await new Promise(r=>setTimeout(r,45))}scrollTo(0,0);await new Promise(r=>setTimeout(r,1000))})()`,true);
        const result=await evaluate(auditExpression); result.label=label; results.push(result);
      }
    }
  }
  console.log(JSON.stringify({results,missing:missing.map(([route,label])=>({route,label}))},null,2));
} finally {
  ws.close();
  try { execFileSync("taskkill", ["/PID", String(chrome.pid), "/T", "/F"], { stdio:"ignore" }); } catch { chrome.kill(); }
  server.close();
  try { fs.rmSync(profile,{recursive:true,force:true}); } catch { /* Chrome may release its profile after process exit. */ }
}




