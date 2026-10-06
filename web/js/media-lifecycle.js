// Cleanup must finish even if history persistence or an HLS callback throws.
export function disposeMedia(video,engine){
 const safely=fn=>{try{fn();}catch{}};
 safely(()=>{video.muted=true;video.autoplay=false;});
 safely(()=>video.pause());
 safely(()=>engine?.stopLoad());
 safely(()=>engine?.detachMedia());
 safely(()=>engine?.destroy());
 safely(()=>{video.srcObject=null;});
 safely(()=>video.removeAttribute('src'));
 safely(()=>video.querySelectorAll('source,track').forEach(node=>node.remove()));
 safely(()=>video.load());
}
