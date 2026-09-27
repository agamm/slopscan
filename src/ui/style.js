export function overlayCSS(NS) {
  return `
@keyframes ss-focus{from{opacity:0;transform:scale(1.015)}to{opacity:1;transform:none}}
@keyframes ss-lock{0%{opacity:0;inset:-16px}40%{opacity:1;inset:-4px}100%{opacity:0;inset:-1px}}
@property --ss-a{syntax:'<angle>';inherits:false;initial-value:0deg}
@keyframes ss-orbit{to{--ss-a:360deg}}
@keyframes ss-fade{from{opacity:0}to{opacity:1}}
@keyframes ss-popin{from{opacity:0;transform:translateY(-4px) scale(.98)}to{opacity:1;transform:none}}
@keyframes ss-tagin{from{opacity:0;transform:translateX(-5px) scale(.96)}to{opacity:1;transform:none}}
@keyframes ss-sweep{from{transform:translateY(-132px)}to{transform:translateY(100vh)}}
@keyframes ss-hud{from{opacity:0;transform:translateY(16px) scale(.985)}to{opacity:1;transform:none}}
@keyframes ss-rowin{from{opacity:0;transform:translateX(-7px)}to{opacity:1;transform:none}}
.ss-box{position:absolute;pointer-events:none;box-sizing:border-box;border-radius:3px;
  animation:ss-focus .4s cubic-bezier(.16,.84,.32,1) calc(var(--d) + .12s) both;
  background-image:repeating-linear-gradient(90deg,var(--c) 0 6px,transparent 6px 10px),
                   repeating-linear-gradient(90deg,var(--c) 0 6px,transparent 6px 10px),
                   repeating-linear-gradient(0deg,var(--c) 0 6px,transparent 6px 10px),
                   repeating-linear-gradient(0deg,var(--c) 0 6px,transparent 6px 10px);
  background-size:100% 1.5px,100% 1.5px,1.5px 100%,1.5px 100%;background-repeat:no-repeat;
  background-position:0 0,0 100%,0 0,100% 0}
.ss-box.tint{background-color:color-mix(in srgb,var(--c) 6%,transparent)}
/* Motion is reserved for P0: one light orbiting the outline. Everything else
   settles still so the page stops twitching once the scan is done. */
.ss-box.p0::after{content:'';position:absolute;inset:-1px;border-radius:4px;padding:2px;pointer-events:none;
  background:conic-gradient(from var(--ss-a),transparent 0 70%,var(--c) 90%,#fff 94%,transparent 97%);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  -webkit-mask-composite:xor;mask-composite:exclude;
  animation:ss-orbit 3.2s linear calc(var(--d) * -4) infinite,ss-fade .6s ease calc(var(--d) + .5s) both}
/* corner brackets close in on the element, then fade: the scanner locking on */
.ss-box::before{content:'';position:absolute;inset:-1px;pointer-events:none;opacity:0;
  --b:linear-gradient(var(--c),var(--c));background-repeat:no-repeat;
  background:var(--b) 0 0/12px 2px,var(--b) 0 0/2px 12px,var(--b) 100% 0/12px 2px,
    var(--b) 100% 0/2px 12px,var(--b) 0 100%/12px 2px,var(--b) 0 100%/2px 12px,
    var(--b) 100% 100%/12px 2px,var(--b) 100% 100%/2px 12px;background-repeat:no-repeat;
  animation:ss-lock .6s cubic-bezier(.16,.84,.32,1) var(--d) both}
.ss-tag{position:absolute;pointer-events:auto;cursor:pointer;
  font:600 10px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.02em;
  color:#08080c;background:var(--c);padding:1px 6px;border-radius:3px;white-space:nowrap;
  max-width:210px;overflow:hidden;text-overflow:ellipsis;box-shadow:0 2px 8px rgba(0,0,0,.35);
  animation:ss-tagin .34s cubic-bezier(.16,.84,.32,1) calc(var(--d) + .14s) both}
.ss-tag:hover{filter:brightness(1.15);z-index:9}
.ss-pop{position:absolute;z-index:10;pointer-events:auto;width:300px;box-sizing:border-box;
  background:rgba(12,12,18,.97);color:#e8e8ef;border:1px solid rgba(255,255,255,.12);border-radius:9px;
  padding:11px 13px 10px;box-shadow:0 14px 40px rgba(0,0,0,.5);text-align:left;
  font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;text-transform:none;letter-spacing:normal;
  animation:ss-popin .16s cubic-bezier(.16,.84,.32,1) both}
.ss-pop-head{display:flex;gap:8px;align-items:center;margin-bottom:7px}
.ss-pop-sev{background:var(--c);color:#08080c;font-weight:700;font-size:10px;padding:0 6px;border-radius:3px}
.ss-pop-desc{color:#8b8b9b;font-size:11px}
.ss-pop-title{font-size:14px;font-weight:700;color:#fff;margin-bottom:4px}
.ss-pop-why{margin:0 0 9px;color:#c4c4d0;font:13px/1.5 system-ui,-apple-system,sans-serif}
.ss-pop-found{display:flex;gap:8px;padding:6px 8px;margin-bottom:9px;border-radius:5px;
  background:rgba(255,255,255,.05);overflow-wrap:anywhere}
.ss-pop-found span:first-child{color:var(--c);flex:none}
.ss-pop-foot{display:flex;justify-content:space-between;align-items:center;gap:8px;color:#6e6e7e;font-size:10.5px}
.ss-pop-foot code{font:inherit;color:inherit;background:none;padding:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ss-pop button{all:unset;cursor:pointer;flex:none;color:#8b8b9b;font:11px ui-monospace,Menlo,monospace;
  padding:2px 7px;border:1px solid rgba(255,255,255,.14);border-radius:5px}
.ss-pop button:hover{color:#fff;border-color:rgba(255,255,255,.35)}
#${NS}sweep{position:fixed;left:0;right:0;top:0;height:132px;z-index:2147483646;pointer-events:none;
  background:linear-gradient(to bottom,transparent 0,rgba(56,189,248,.08) 40%,
             rgba(56,189,248,.26) 82%,rgba(125,211,252,.55) 96%,transparent 100%);
  animation:ss-sweep .82s cubic-bezier(.33,.02,.28,1) both}
#${NS}sweep::after{content:'';position:absolute;left:0;right:0;bottom:0;height:2px;background:#e0f2fe;
  box-shadow:0 0 6px 1px #7dd3fc,0 0 28px 8px rgba(56,189,248,.6)}
#${NS}hud{position:fixed;right:16px;bottom:16px;z-index:2147483647;width:308px;max-height:78vh;
  overflow:auto;background:rgba(9,9,14,.94);backdrop-filter:blur(14px);color:#e8e8ef;
  border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:13px 14px;
  font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;
  box-shadow:0 18px 50px rgba(0,0,0,.55);animation:ss-hud .46s .48s cubic-bezier(.16,.84,.32,1) both}
#${NS}hud h4{margin:0 0 9px;font-size:11px;letter-spacing:.09em;text-transform:uppercase;
  color:#8b8b9b;font-weight:600}
#${NS}hud .sc{font:700 30px/1 ui-monospace,Menlo,monospace;letter-spacing:-.02em;
  font-variant-numeric:tabular-nums}
#${NS}hud .row{display:flex;justify-content:space-between;gap:9px;padding:3px 5px;border-radius:4px;
  cursor:pointer;animation:ss-rowin .3s calc(.62s + var(--i)*26ms) both;transition:background .12s}
#${NS}hud .row:hover{background:rgba(255,255,255,.07)}
#${NS}hud .row.off{opacity:.32}
#${NS}hud .m{display:flex;justify-content:space-between;gap:8px;color:#9a9aab;padding:1px 5px}
#${NS}hud .m b{color:#d4d4e0;font-weight:600}
#${NS}hud .sep{height:1px;background:rgba(255,255,255,.1);margin:9px 0}
#${NS}hud button{all:unset;cursor:pointer;color:#8b8b9b;font:11px ui-monospace,Menlo,monospace;
  padding:3px 7px;border:1px solid rgba(255,255,255,.14);border-radius:5px;
  transition:color .12s,border-color .12s}
#${NS}hud button:hover{color:#fff;border-color:rgba(255,255,255,.35)}
@media (prefers-reduced-motion:reduce){
  .ss-box,.ss-box.p0,.ss-tag,#${NS}hud,#${NS}hud .row{animation:none!important}
  .ss-box::before,.ss-box.p0::after{display:none}
  #${NS}sweep{display:none}}`;
}
