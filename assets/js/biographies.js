(()=>{
  const page=document.querySelector('[data-biography]');
  if(!page)return;
  const paragraphs=[...page.querySelectorAll('.bio-copy p')];
  const skip=page.querySelector('[data-skip-animation]');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let timers=[];
  const showAll=()=>{
    timers.forEach(clearTimeout);timers=[];
    page.classList.remove('js-bio-ready');
    paragraphs.forEach(p=>{p.removeAttribute('data-animated');p.removeAttribute('aria-label');p.querySelectorAll('.bio-word').forEach(span=>span.replaceWith(document.createTextNode(span.textContent)));p.normalize();p.querySelectorAll('mark').forEach(mark=>mark.classList.remove('is-highlighted'))});
    skip.hidden=true;
  };
  if(reduced){skip.hidden=true;return;}
  const makeWords=(root)=>{
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{const parts=node.nodeValue.match(/\s+|\S+/g);if(!parts)return;const fragment=document.createDocumentFragment();parts.forEach(part=>{if(/^\s+$/.test(part)){fragment.append(document.createTextNode(part));return}const span=document.createElement('span');span.className='bio-word';span.setAttribute('aria-hidden','true');span.textContent=part;fragment.append(span)});node.replaceWith(fragment)});
  };
  paragraphs.forEach(p=>{p.setAttribute('aria-label',p.textContent);p.dataset.animated='true';makeWords(p)});
  page.classList.add('js-bio-ready');
  const reveal=()=>{
    if(page.dataset.started)return;
    page.dataset.started='true';let delay=0;
    paragraphs.forEach((p,index)=>{
      const words=[...p.querySelectorAll('.bio-word')];
      words.forEach((word,i)=>timers.push(setTimeout(()=>word.classList.add('is-visible'),delay+i*45)));
      const duration=Math.max(0,words.length-1)*45;
      p.querySelectorAll('mark').forEach(mark=>{const last=[...mark.querySelectorAll('.bio-word')].at(-1);if(last){timers.push(setTimeout(()=>mark.classList.add('is-highlighted'),delay+duration+280))}});
      delay+=duration+520;
    });
    timers.push(setTimeout(()=>{skip.hidden=true},delay+500));
  };
  skip.addEventListener('click',showAll);
  if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();reveal()}},{threshold:.08});observer.observe(page)}else reveal();
})();
