export function overlayCSS(NS) {
  return `
@keyframes ss-focus{from{opacity:0;transform:scale(1.045);filter:blur(1.5px)}
                    to{opacity:1;transform:none;filter:blur(0)}}
@keyframes ss-ants{to{background-position:36px 0,-36px 0,0 -36px,0 36px}}
@keyframes ss-breathe{0%,100%{opacity:.6}50%{opacity:1}}
@keyframes ss-tagin{from{opacity:0;transform:translateX(-5px) scale(.96)}to{opacity:1;transform:none}}
@keyframes ss-sweep{from{transform:translateY(-132px)}to{transform:translateY(100vh)}}
@keyframes ss-hud{from{opacity:0;transform:translateY(16px) scale(.985)}to{opacity:1;transform:none}}
@keyframes ss-rowin{from{opacity:0;transform:translateX(-7px)}to{opacity:1;transform:none}}
.ss-box{position:absolute;pointer-events:none;box-sizing:border-box;border-radius:3px;
  animation:ss-focus .42s cubic-bezier(.16,.84,.32,1) var(--d) both;
  background-image:repeating-linear-gradient(90deg,var(--c) 0 9px,transparent 9px 18px),
                   repeating-linear-gradient(90deg,var(--c) 0 9px,transparent 9px 18px),
                   repeating-linear-gradient(0deg,var(--c) 0 9px,transparent 9px 18px),
                   repeating-linear-gradient(0deg,var(--c) 0 9px,transparent 9px 18px);
  background-size:100% 2px,100% 2px,2px 100%,2px 100%;background-repeat:no-repeat;
  background-position:0 0,0 100%,0 0,100% 0}
/* Motion is reserved for P0. Everything else settles still so the page stops
   twitching once the scan is done. */
.ss-box.p0{animation:ss-focus .42s cubic-bezier(.16,.84,.32,1) var(--d) both,
                     ss-ants 2.4s linear var(--d) infinite,
                     ss-breathe 3.6s ease-in-out calc(var(--d) + .5s) infinite}
.ss-box.tint::after{content:'';position:absolute;inset:0;background:var(--c);opacity:.05;border-radius:inherit}
.ss-tag{position:absolute;pointer-events:auto;cursor:pointer;
  font:600 10px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.02em;
  color:#08080c;background:var(--c);padding:1px 6px;border-radius:3px;white-space:nowrap;
  max-width:210px;overflow:hidden;text-overflow:ellipsis;box-shadow:0 2px 8px rgba(0,0,0,.35);
  animation:ss-tagin .34s cubic-bezier(.16,.84,.32,1) calc(var(--d) + .14s) both}
.ss-tag:hover{filter:brightness(1.15);z-index:9}
#${NS}sweep{position:fixed;left:0;right:0;top:0;height:132px;z-index:2147483646;pointer-events:none;
  background:linear-gradient(to bottom,transparent 0,rgba(56,189,248,.05) 52%,
             rgba(56,189,248,.2) 86%,rgba(125,211,252,.7) 97%,#e0f2fe 100%);
  animation:ss-sweep .82s cubic-bezier(.33,.02,.28,1) both}
#${NS}sweep::after{content:'';position:absolute;left:0;right:0;bottom:0;height:1px;background:#fff;
  box-shadow:0 0 20px 4px rgba(56,189,248,.65)}
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
  #${NS}sweep{display:none}}`;
}
