// Create a HiDPI-aware 2D context; only update backing size if needed to avoid layout loops
export function ctxFor(c: HTMLCanvasElement | null){
  if (!c) return null
  const pr = window.devicePixelRatio || 1
  const r = c.getBoundingClientRect()
  if (r.width<2 || r.height<2) return null
  const tw = Math.floor(r.width*pr)
  const th = Math.floor(r.height*pr)
  if (c.width !== tw) c.width = tw
  if (c.height !== th) c.height = th
  const ctx = c.getContext('2d')!
  ctx.setTransform(pr,0,0,pr,0,0)
  return ctx
}

export function hexToRgb(hex:string){ const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex||''); if(!m) return null; return {r:parseInt(m[1],16), g:parseInt(m[2],16), b:parseInt(m[3],16)} }
export function rgbToHex(r:number,g:number,b:number){ const c=(n:number)=>('0'+Math.max(0,Math.min(255,Math.round(n))).toString(16)).slice(-2); return '#'+c(r)+c(g)+c(b) }
export function tint(hex:string){ const rgb = hexToRgb(hex); if(!rgb) return hex; const dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; const f = dark ? 1.12 : 0.90; return rgbToHex(rgb.r*f, rgb.g*f, rgb.b*f) }
export function invert(hex:string){ const rgb=hexToRgb(hex); if(!rgb) return hex; return rgbToHex(255-rgb.r,255-rgb.g,255-rgb.b) }

// Blue → purple gradient for heatmap cells
export function heatColor(t:number){
  const clamp=(x:number)=> x<0?0:(x>1?1:x)
  const tt = Math.pow(clamp(t), 0.6)
  const c1 = hexToRgb('#e0f2fe')
  const c2 = hexToRgb('#7c3aed')
  if (!c1 || !c2) return '#7c3aed'
  const mix=(a:number,b:number,p:number)=> Math.round(a + (b-a)*p)
  const r = mix(c1.r, c2.r, tt)
  const g = mix(c1.g, c2.g, tt)
  const b = mix(c1.b, c2.b, tt)
  return `rgb(${r}, ${g}, ${b})`
}
