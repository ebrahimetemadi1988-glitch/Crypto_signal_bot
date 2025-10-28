// ✅ Crypto Futures Signal Bot FINAL VERSION
// No setup needed. Just run and receive real signals on Telegram.
// Developer: GPT-5 Assistant
// Source: Binance Futures Public API

const express = require("express");
const axios = require("axios");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 3000;

// 🔐 Telegram info (inserted directly for simplicity)
const BOT_TOKEN = "8470102772:AAEPXziOuK-xGvGIUuaJP7R4dsbR6G5t8Ik";
const CHAT_ID = "5298327656";

// 🔍 Settings
const WATCH = ["BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","XRPUSDT"];
const TIMEFRAMES = ["15m","1h"];
const INTERVAL = 90; // seconds between checks
const EMA_FAST = 9, EMA_SLOW = 21;
const ATR_PERIOD = 14;
const RR = 2;

// 🧠 Utility
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
async function getKlines(symbol, tf, limit=300){
  const url=`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${tf}&limit=${limit}`;
  const {data}=await axios.get(url,{timeout:10000});
  return data.map(x=>({open:+x[1],high:+x[2],low:+x[3],close:+x[4]}));
}
function ema(values, period){
  const k=2/(period+1); const ema=[values[0]];
  for(let i=1;i<values.length;i++) ema.push(values[i]*k+ema[i-1]*(1-k));
  return ema;
}
function atr(kl, p=14){
  const trs=[];for(let i=1;i<kl.length;i++){
    const h=kl[i].high,l=kl[i].low,pc=kl[i-1].close;
    trs.push(Math.max(h-l,Math.abs(h-pc),Math.abs(l-pc)));
  }
  const out=[...Array(p).fill(null)];
  for(let i=p;i<trs.length;i++){
    const slice=trs.slice(i-p,i);out.push(slice.reduce((a,b)=>a+b,0)/p);
  }
  return out;
}
function detectPattern(prev,cur){
  const o=cur.open,c=cur.close,h=cur.high,l=cur.low,body=Math.abs(c-o);
  const top=h-Math.max(c,o),bot=Math.min(c,o)-l;
  if(bot>1.3*body&&c>o) return "bull_pin";
  if(top>1.3*body&&c<o) return "bear_pin";
  if(prev){
    if(c>o&&prev.close<prev.open&&c>prev.open&&o<prev.close) return "bull_engulf";
    if(c<o&&prev.close>prev.open&&c<prev.open&&o>prev.close) return "bear_engulf";
  }
  return null;
}
async function sendTG(txt){
  try{
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,{
      chat_id:CHAT_ID,text:txt
    });
  }catch(e){console.log("TG error",e.message);}
}

// 💹 Signal logic
async function analyze(symbol){
  try{
    const res={};
    for(const tf of TIMEFRAMES){
      const kl=await getKlines(symbol,tf);
      const closes=kl.map(k=>k.close);
      const ef=ema(closes,EMA_FAST),es=ema(closes,EMA_SLOW);
      const cross=(ef.at(-2)<es.at(-2)&&ef.at(-1)>es.at(-1))?1:(ef.at(-2)>es.at(-2)&&ef.at(-1)<es.at(-1))?-1:0;
      const a=atr(kl,ATR_PERIOD).at(-1);
      const patt=detectPattern(kl.at(-2),kl.at(-1));
      res[tf]={cross,patt,a,last:kl.at(-1).close,prev:kl.at(-2).close};
    }
    let dir=null,reasons=[];
    const [a,b]=TIMEFRAMES.map(tf=>res[tf]);
    if(a.cross===1&&b.cross===1&&(a.patt?.includes("bull")||b.patt?.includes("bull"))) dir="BUY";
    if(a.cross===-1&&b.cross===-1&&(a.patt?.includes("bear")||b.patt?.includes("bear"))) dir="SELL";
    if(!dir) return;
    const entry=a.last,atrv=a.a||0.01;
    const sl=dir==="BUY"?entry-atrv*1.5:entry+atrv*1.5;
    const tp=dir==="BUY"?entry+(entry-sl)*RR:entry-(sl-entry)*RR;
    const msg=`✅ ${dir} ${symbol}\nEntry: ${entry}\nSL: ${sl}\nTP: ${tp}\nTF: ${TIMEFRAMES.join(", ")}\nTime: ${new Date().toISOString().slice(0,19)} UTC`;
    await sendTG(msg);
    console.log("Signal sent:",symbol,dir);
  }catch(e){console.log(symbol,"error",e.message);}
}

// 🔁 Loop
async function loop(){
  console.log("Bot started on",WATCH.join(", "));
  await sendTG("🤖 Crypto Futures Signal Bot started.\nWatching: "+WATCH.join(", "));
  while(true){
    for(const s of WATCH){ await analyze(s); await sleep(500); }
    await sleep(INTERVAL*1000);
  }
}

// 🌐 Server (to keep alive)
app.get("/",(req,res)=>res.send("Bot running OK"));
app.listen(PORT,()=>{console.log("Server on",PORT);loop();});
