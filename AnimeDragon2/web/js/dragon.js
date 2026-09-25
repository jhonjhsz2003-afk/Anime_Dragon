// Full-color celestial artwork animated without GIF palette reduction.
export function livingDragon(){return `<div class="celestial-scene">
<div class="celestial-halo" aria-hidden="true"></div>
<div class="celestial-parallax"><svg class="celestial-dragon" viewBox="0 0 1024 1536" role="img" aria-labelledby="celestial-title">
<title id="celestial-title">Dragão celestial azul com corpo serpentino, chifres e escamas luminosas</title>
<defs><filter id="celestial-flow" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency=".006 .009" numOctaves="1" seed="8" result="flow"><animate attributeName="baseFrequency" values=".006 .009;.008 .012;.006 .009" dur="12s" repeatCount="indefinite"/></feTurbulence>
<feDisplacementMap in="SourceGraphic" in2="flow" scale="9" xChannelSelector="R" yChannelSelector="G"><animate attributeName="scale" values="5;13;5" dur="7s" repeatCount="indefinite"/></feDisplacementMap>
</filter></defs><image class="celestial-art" href="/assets/dragon-celestial.png" width="1024" height="1536" preserveAspectRatio="xMidYMid meet" filter="url(#celestial-flow)"/></svg></div>
<div class="celestial-motes" aria-hidden="true">${Array.from({length:12},(_,i)=>`<i style="--mote:${i}"></i>`).join('')}</div>
<span class="celestial-caption" aria-hidden="true">蒼龍 <span>GUARDIÃO CELESTIAL</span></span>
<button class="dragon-motion" type="button" aria-label="Pausar animação do dragão" aria-pressed="false">Ⅱ Pausar animação</button></div>`}
export function bindDragon(root=document){
 const host=root.querySelector('.auth-world'),scene=host?.querySelector('.celestial-scene');if(!scene)return;
 const svg=scene.querySelector('svg'),button=scene.querySelector('.dragon-motion');
 let paused=!!(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches||root.documentElement?.classList.contains('reduce-motion'));
 const sync=()=>{scene.classList.toggle('is-paused',paused);if(paused)svg.pauseAnimations?.();else svg.unpauseAnimations?.();button.textContent=paused?'▷ Animar dragão':'Ⅱ Pausar animação';button.setAttribute('aria-label',paused?'Animar dragão':'Pausar animação do dragão');button.setAttribute('aria-pressed',String(paused));host.style.setProperty('--dragon-x','0px');host.style.setProperty('--dragon-y','0px')};sync();
 button.onclick=()=>{paused=!paused;sync()};
 host.onpointermove=e=>{if(paused||e.pointerType==='touch')return;const box=host.getBoundingClientRect();host.style.setProperty('--dragon-x',`${((e.clientX-box.left)/box.width-.5)*12}px`);host.style.setProperty('--dragon-y',`${((e.clientY-box.top)/box.height-.5)*8}px`)};
 host.onpointerleave=()=>{host.style.setProperty('--dragon-x','0px');host.style.setProperty('--dragon-y','0px')};
}
