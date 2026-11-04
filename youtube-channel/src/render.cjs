const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();
for (const [f,w,h,o] of [['profile.html',800,800,'../profile_800x800.png'],['banner.html',2560,1440,'../banner_2560x1440.png']]){
 const p=await b.newPage({viewport:{width:w,height:h}});await p.goto('file://'+__dirname+'/'+f);await p.waitForLoadState('networkidle');
 await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:__dirname+'/'+o});}
await b.close();})();
