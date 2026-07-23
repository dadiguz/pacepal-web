const GS = 24;
const C = {
  empty:0, body:1, outline:2, face:3, eyePupil:4, eyeShine:5,
  mouth:6, cheek:7, shade:8, nose:9, tear:10, gold:11,
  speedLine:12, gray:13, accent1:14, accent2:15, lightning:16
};

const DNA = {
  bodyCx:12, bodyCy:11, bodyRx:6, bodyRy:7,
  earTopY:4, earSp:3, armStyle:1, eyeSp:3, mouthStyle:1,
  hasCheeks:true, hasMuzzle:false, hasNose:false,
  hasMarking:false, hasBow:false, hasTail:false, tailOffset:0,
  palette:{
    body:'#002159', shade:'#2186EB', face:'#B6E0FE',
    eyeP:'#002159', cheek:'#F191C1', accent1:'#AFF75C', accent2:'#62F4EB'
  }
};

// real palettes from the app (PetPalette.swift) — body/shade/face/eyeP/cheek
const PALS = {
  sapphire:  DNA.palette,
  turquesa:  { body:'#0A7878', shade:'#109898', face:'#F0806A', eyeP:'#053C3C', cheek:'#F8B0A0', accent1:'#F35627', accent2:'#FADB5F' },
  cereza:    { body:'#4A0820', shade:'#700C30', face:'#F0C0C8', eyeP:'#200410', cheek:'#E8A0B0', accent1:'#F35627', accent2:'#FADB5F' },
  oliva_oro: { body:'#4A5A22', shade:'#6B8030', face:'#D4A835', eyeP:'#252E0F', cheek:'#E8CC6A', accent1:'#F35627', accent2:'#FADB5F' },
  berenjena: { body:'#3A1860', shade:'#5A2890', face:'#D0C8D8', eyeP:'#1C0C30', cheek:'#B0A8C0', accent1:'#F35627', accent2:'#FADB5F' },
  bordo:     { body:'#5A0818', shade:'#880C24', face:'#D4A830', eyeP:'#2D0408', cheek:'#E8CC70', accent1:'#F35627', accent2:'#FADB5F' }
};

/* ADN activo del sprite que se está dibujando. El motor original solo pintaba
   un cuerpo; las tarjetas necesitan especies distintas, así que buildGrid y
   cellColor leen de aquí en vez de la constante DNA. */
let ACTIVE = DNA;

/* Especies portadas de PetGridBuilder.swift (orejas sobre el mismo cuerpo). */
function makeDNA(species, palName, extra){
  return Object.assign({}, DNA, { species: species || 'smooth', palette: PALS[palName] || DNA.palette }, extra || {});
}

const makeGrid = () => Array.from({length:GS},()=>new Array(GS).fill(C.empty));
const pset = (g,x,y,c) => { if(x>=0&&x<GS&&y>=0&&y<GS) g[y][x]=c; };
const pget = (g,x,y) => (x>=0&&x<GS&&y>=0&&y<GS)?g[y][x]:null;

function fillEllipse(g,cx,cy,rx,ry,c){
  if(rx<=0||ry<=0)return;
  for(let y=Math.floor(cy-ry);y<=Math.ceil(cy+ry);y++)
    for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++){
      const dx=(x-cx)/rx,dy=(y-cy)/ry;
      if(dx*dx+dy*dy<=1)pset(g,x,y,c);
    }
}

function addOutline(g){
  const dirs=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
  const edges=[];
  for(let y=0;y<GS;y++)for(let x=0;x<GS;x++){
    if(g[y][x]!==C.body)continue;
    for(const[dx,dy]of dirs)if(pget(g,x+dx,y+dy)===C.empty){edges.push([x,y]);break;}
  }
  for(const[x,y]of edges)g[y][x]=C.outline;
}

/* ═════════ Poses de tarjeta ═════════
   Portadas de PacePal/Engine/PetGridBuilder.swift. En la app cada tarjeta
   coleccionable fija la pose de su casilla del catálogo; aquí se usan las
   mismas para que las tarjetas de la web se vean como las de verdad. */

function drawLine(g,x0,y0,x1,y1,cell){
  cell = cell===undefined ? C.body : cell;
  let dx=Math.abs(x1-x0), dy=Math.abs(y1-y0);
  const sx=x0<x1?1:-1, sy=y0<y1?1:-1;
  let err=dx-dy;
  for(let i=0;i<64;i++){
    pset(g,x0,y0,cell);
    if(x0===x1&&y0===y1)break;
    const e2=2*err;
    if(e2>-dy){err-=dy;x0+=sx;}
    if(e2< dx){err+=dx;y0+=sy;}
  }
}

function sparkle(g,x,y,cell){
  cell = cell===undefined ? C.gold : cell;
  pset(g,x,y-1,cell);pset(g,x-1,y,cell);pset(g,x,y,cell);pset(g,x+1,y,cell);pset(g,x,y+1,cell);
}

/* Orejas por especie (PetGridBuilder.swift → switch dna.animalType) */
function drawEars(g,d){
  const lE=d.bodyCx-d.earSp, rE=d.bodyCx+d.earSp, t=Math.trunc(d.earTopY);
  switch(d.species){
    case 'bunny':
      fillEllipse(g,lE,d.earTopY-4,1.5,4,C.body);
      fillEllipse(g,rE,d.earTopY-4,1.5,4,C.body);
      break;
    case 'cat':
      pset(g,Math.trunc(lE),t,C.body);pset(g,Math.trunc(lE),t-1,C.body);pset(g,Math.trunc(lE)-1,t-2,C.body);
      pset(g,Math.trunc(rE),t,C.body);pset(g,Math.trunc(rE),t-1,C.body);pset(g,Math.trunc(rE)+1,t-2,C.body);
      break;
    case 'bear':
      fillEllipse(g,lE,d.earTopY,2,2,C.body);
      fillEllipse(g,rE,d.earTopY,2,2,C.body);
      break;
    case 'fox':
      [[Math.trunc(lE),-1],[Math.trunc(rE),1]].forEach(function(e){
        const x=e[0], o=e[1];
        pset(g,x,t,C.body);pset(g,x+o,t,C.body);
        pset(g,x,t-1,C.body);pset(g,x+o,t-1,C.body);
        pset(g,x,Math.max(0,t-2),C.body);pset(g,x,Math.max(0,t-3),C.body);
      });
      break;
    case 'dog':
      fillEllipse(g,lE-1.5,d.earTopY+2.5,1.8,2.8,C.body);
      fillEllipse(g,rE+1.5,d.earTopY+2.5,1.8,2.8,C.body);
      break;
    case 'mouse':
      fillEllipse(g,lE-1,d.earTopY+1,2.3,2.3,C.body);
      fillEllipse(g,rE+1,d.earTopY+1,2.3,2.3,C.body);
      break;
    default: break;   // smooth / pou / domo: sin orejas
  }
}

/* Brazos: (grid, lX, rX, aY, frame, bodyCx) */
const CARD_ARMS = {
  cheer: function(g,lX,rX,aY,f){
    const hi=f%2===0;
    pset(g,hi?lX-1:lX,aY-3,C.body);pset(g,hi?lX-1:lX,aY-2,C.body);
    pset(g,hi?rX+1:rX,aY-3,C.body);pset(g,hi?rX+1:rX,aY-2,C.body);
  },
  victory: function(g,lX,rX,aY,f){
    const alt=f%2===0;
    pset(g,alt?lX-2:lX-1,aY-3,C.body);pset(g,alt?lX-1:lX,aY-2,C.body);
    pset(g,alt?rX+2:rX+1,aY-3,C.body);pset(g,alt?rX+1:rX,aY-2,C.body);
  },
  flex: function(g,lX,rX,aY,f){
    switch(f){
      case 0: pset(g,lX,aY-2,C.body);pset(g,lX,aY-1,C.body);pset(g,rX,aY-2,C.body);pset(g,rX,aY-1,C.body);break;
      case 1: pset(g,lX-2,aY-1,C.body);pset(g,lX-1,aY-2,C.body);pset(g,rX+1,aY-2,C.body);pset(g,rX+2,aY-1,C.body);break;
      case 2: pset(g,lX-1,aY-3,C.body);pset(g,lX-1,aY-2,C.body);pset(g,rX+1,aY-3,C.body);pset(g,rX+1,aY-2,C.body);break;
      default:pset(g,lX,aY-2,C.body);pset(g,lX-1,aY-1,C.body);pset(g,rX,aY-2,C.body);pset(g,rX+1,aY-1,C.body);
    }
  },
  star: function(g,lX,rX,aY,f){
    const sp=f%2===0?2:1;
    pset(g,lX-sp,aY-2,C.body);pset(g,lX-sp+1,aY-1,C.body);
    pset(g,rX+sp,aY-2,C.body);pset(g,rX+sp-1,aY-1,C.body);
  },
  sprint: function(g,lX,rX,aY,f){
    switch(f){
      case 0: drawLine(g,lX,aY+1,lX-2,aY+4);drawLine(g,rX,aY-1,rX+2,aY-4);break;
      case 1: drawLine(g,lX,aY,lX-1,aY+2);drawLine(g,rX,aY-1,rX+1,aY-2);break;
      case 2: drawLine(g,lX,aY-1,lX-2,aY-4);drawLine(g,rX,aY+1,rX+2,aY+4);break;
      default:drawLine(g,lX,aY-1,lX-1,aY-2);drawLine(g,rX,aY,rX+1,aY+2);
    }
  },
  trophyRaise: function(g,lX,rX,aY,f,bCx){
    const tHand=3+(f%2);
    drawLine(g,lX,aY-1,bCx-3,tHand-1);
    drawLine(g,rX,aY-1,bCx+3,tHand-1);
  },
  thumbsUp: function(g,lX,rX,aY,f){
    const up=f%2;
    pset(g,lX,aY,C.body);pset(g,lX,aY+1,C.body);
    pset(g,rX,aY-1+up,C.body);pset(g,rX+1,aY-1+up,C.body);
    pset(g,rX+1,aY-2+up,C.body);pset(g,rX+1,aY-3+up,C.body);
  },
  podium: function(g,lX,rX,aY,f){
    const hi=f%2===0;
    pset(g,lX,hi?aY-2:aY-1,C.body);pset(g,lX,hi?aY-1:aY,C.body);
    pset(g,rX+1,aY-3,C.body);pset(g,rX,aY-2,C.body);
  },
  meditate: function(g,lX,rX,aY){
    pset(g,lX,aY+1,C.body);pset(g,lX-1,aY+2,C.body);
    pset(g,rX,aY+1,C.body);pset(g,rX+1,aY+2,C.body);
  },
  warmup: function(g,lX,rX,aY,f){
    const hi=f<2;
    pset(g,lX,hi?aY-1:aY+1,C.body);pset(g,lX,hi?aY:aY+2,C.body);
    pset(g,rX,hi?aY+1:aY-1,C.body);pset(g,rX,hi?aY+2:aY,C.body);
  }
};

/* Pies: (grid, frame, lX, rX) — filas 19-21 ya vienen limpias */
function stand(g,x,y){ pset(g,x,y,C.body);pset(g,x+2,y,C.body);pset(g,x,y+1,C.body);pset(g,x+2,y+1,C.body);pset(g,x+1,y+2,C.body); }

const CARD_FEET = {
  flex:        function(g){ stand(g,7,19); stand(g,15,19); },
  trophyRaise: function(g){ stand(g,7,19); stand(g,15,19); },
  star: function(g,f){
    if(f%2===0){ stand(g,6,19); stand(g,16,19); } else { stand(g,7,19); stand(g,15,19); }
  },
  podium: function(g){ stand(g,9,19); stand(g,13,19); },
  sprint: function(g,f){
    switch(f){
      case 0: stand(g,6,16); stand(g,15,19); break;
      case 1: stand(g,7,17); stand(g,14,18); break;
      case 2: stand(g,7,19); stand(g,16,16); break;
      default:stand(g,8,18); stand(g,15,17);
    }
  },
  warmup: function(g,f){
    if(f<2){ const l=f===0?0:1; stand(g,8,16+l); stand(g,14,19); }
    else   { const l=f===2?0:1; stand(g,8,19);   stand(g,14,16+l); }
  },
  meditate: function(g){
    for(let x=7;x<=16;x++) pset(g,x,19,C.body);
    for(let x=8;x<=15;x++) pset(g,x,20,C.body);
    pset(g,11,18,C.body); pset(g,12,18,C.body);
  }
};

/* Ojos: celebración = pupilas grandes con brillo; meditar = ojos cerrados */
function eyesWide(g,lx,rx,y){
  pset(g,lx-1,y,C.eyePupil);pset(g,lx,y,C.eyePupil);
  pset(g,lx-1,y+1,C.eyePupil);pset(g,lx,y+1,C.eyePupil);pset(g,lx-1,y-1,C.eyeShine);
  pset(g,rx,y,C.eyePupil);pset(g,rx+1,y,C.eyePupil);
  pset(g,rx,y+1,C.eyePupil);pset(g,rx+1,y+1,C.eyePupil);pset(g,rx,y-1,C.eyeShine);
}
const CARD_EYES = {
  meditate: function(g,lx,rx,y){
    pset(g,lx-1,y,C.eyePupil);pset(g,lx,y,C.eyePupil);
    pset(g,rx,y,C.eyePupil);pset(g,rx+1,y,C.eyePupil);
  },
  sprint: function(g,lx,rx,y){
    pset(g,lx-1,y,C.eyePupil);pset(g,lx,y+1,C.eyePupil);
    pset(g,rx,y+1,C.eyePupil);pset(g,rx+1,y,C.eyePupil);
  },
  cheer: eyesWide, victory: eyesWide, flex: eyesWide, star: eyesWide,
  trophyRaise: eyesWide, thumbsUp: eyesWide, podium: eyesWide, warmup: eyesWide
};

/* Boca: sonrisa abierta en las poses de celebración */
function mouthOpen(g,cx,y,f){
  if(f%2===0){
    pset(g,cx-3,y,C.mouth);pset(g,cx-2,y+1,C.mouth);pset(g,cx-1,y+1,C.mouth);
    pset(g,cx,y+1,C.mouth);pset(g,cx+1,y+1,C.mouth);pset(g,cx+2,y+1,C.mouth);pset(g,cx+3,y,C.mouth);
  }else{
    pset(g,cx-2,y,C.mouth);pset(g,cx-1,y+1,C.mouth);pset(g,cx,y,C.mouth);
    pset(g,cx+1,y+1,C.mouth);pset(g,cx+2,y,C.mouth);
  }
}
const CARD_MOUTH = {
  cheer: mouthOpen, victory: mouthOpen, flex: mouthOpen, star: mouthOpen,
  trophyRaise: mouthOpen, podium: mouthOpen, thumbsUp: mouthOpen, warmup: mouthOpen,
  sprint: function(g,cx,y){ pset(g,cx-1,y,C.mouth);pset(g,cx,y,C.mouth);pset(g,cx+1,y,C.mouth); },
  meditate: function(g,cx,y){ pset(g,cx,y,C.mouth);pset(g,cx-1,y+1,C.mouth);pset(g,cx+1,y+1,C.mouth); }
};

/* Utilería: trofeo, podio, destellos */
const CARD_PROPS = {
  trophyRaise: function(g,lX,rX,aY,f,bCx){
    const top=2+(f%2);
    for(let x=bCx-2;x<=bCx+2;x++) pset(g,x,top,C.gold);
    for(let x=bCx-2;x<=bCx+2;x++) pset(g,x,top+1,C.gold);
    pset(g,bCx-3,top,C.gold); pset(g,bCx+3,top,C.gold);
    pset(g,bCx,top+2,C.gold); pset(g,bCx-1,top+3,C.gold); pset(g,bCx,top+3,C.gold); pset(g,bCx+1,top+3,C.gold);
    sparkle(g,bCx-4,top-1,C.accent2); sparkle(g,bCx+4,top-1,C.accent2);
  },
  podium: function(g,lX,rX,aY,f,bCx){
    for(let x=8;x<=15;x++){ pset(g,x,22,C.gold); pset(g,x,23,C.shade); }
    pset(g,11,21,C.gold); pset(g,12,21,C.gold);
  },
  cheer: function(g,lX,rX,aY,f,bCx,bCy,eLX,eRX,eY){
    const s=[[rX+2,aY-4],[lX-2,aY-3],[rX+3,eY],[lX-3,eY+1]];
    sparkle(g,s[f][0],s[f][1]);
  },
  victory: function(g,lX,rX,aY,f,bCx,bCy,eLX,eRX,eY){
    sparkle(g,f%2?rX+3:lX-3,aY-5);
    sparkle(g,f%2?lX-2:rX+2,eY-3,C.accent2);
  },
  star: function(g,lX,rX,aY,f){
    sparkle(g,lX-4,aY-4,C.accent2); sparkle(g,rX+4,aY-4,C.accent2);
  },
  meditate: function(g,lX,rX,aY,f,bCx,bCy){
    const y=3+((f+1)%2);
    pset(g,bCx-4,y,C.accent2); pset(g,bCx+4,y+1,C.accent2); pset(g,bCx,y-1,C.accent2);
  },
  sprint: function(g,lX,rX,aY,f,bCx,bCy){
    const lens=[[4,2,3],[2,4,1],[3,1,4],[1,3,2]][f];
    [bCy-2,bCy,bCy+2].forEach(function(y,i){
      for(let d=0;d<lens[i];d++) pset(g,rX+1+(f%2)+d,y,C.speedLine);
    });
  }
};

function buildGrid(pose,frame,dna){
  ACTIVE = dna || DNA;
  const g=makeGrid();
  const{bodyCx:bCx,bodyCy:bCy,bodyRx:bRx,bodyRy:bRy}=ACTIVE;
  fillEllipse(g,bCx,bCy,bRx,bRy,C.body);
  drawEars(g,ACTIVE);

  const aY=Math.round(bCy+bRy*0.1);
  const lX=Math.round(bCx-bRx)-1;
  const rX=Math.round(bCx+bRx);

  if(CARD_ARMS[pose]){
    CARD_ARMS[pose](g,lX,rX,aY,frame%4,Math.trunc(bCx));
  }else if(pose==='running'){
    switch(frame){
      case 0: pset(g,lX-1,aY+2,C.body);pset(g,lX,aY+3,C.body);pset(g,rX,aY-3,C.body);pset(g,rX,aY-2,C.body);break;
      case 1: pset(g,lX,aY+1,C.body);pset(g,lX,aY+2,C.body);pset(g,rX,aY-1,C.body);pset(g,rX,aY,C.body);break;
      case 2: pset(g,lX,aY-3,C.body);pset(g,lX,aY-2,C.body);pset(g,rX+1,aY+2,C.body);pset(g,rX,aY+3,C.body);break;
      default:pset(g,lX,aY-1,C.body);pset(g,lX,aY,C.body);pset(g,rX,aY+1,C.body);pset(g,rX,aY+2,C.body);
    }
  }else if(pose==='happy'){
    const hi=frame%2===0;
    pset(g,lX,hi?aY-2:aY-1,C.body);pset(g,lX,hi?aY-1:aY,C.body);
    pset(g,rX,hi?aY-2:aY-1,C.body);pset(g,rX,hi?aY-1:aY,C.body);
  }else if(pose==='sad'){
    const dr=frame<=1?1:2;
    pset(g,lX,aY+dr,C.body);pset(g,lX,aY+dr+1,C.body);
    if(frame===3){pset(g,rX,aY-1,C.body);pset(g,rX,aY,C.body);}
    else{pset(g,rX,aY+dr,C.body);pset(g,rX,aY+dr+1,C.body);}
  }else if(pose==='angry'){
    const hi=frame%2===0;
    pset(g,hi?lX:lX-1,aY-1,C.body);pset(g,hi?lX:lX-1,aY,C.body);
    const rt=hi?aY-3:aY-2;
    pset(g,hi?rX:rX+1,rt,C.body);pset(g,hi?rX:rX+1,rt+1,C.body);
  }else if(pose==='sign'){
    const bob=frame%2===0;
    // Left arm raised excited
    pset(g,lX-1,bob?aY-3:aY-2,C.body);pset(g,lX-1,bob?aY-2:aY-1,C.body);
    // Right arm holds sign
    const sTop=bob?aY-3:aY-2;
    pset(g,bob?rX:rX+1,sTop,C.body);pset(g,bob?rX:rX+1,sTop+1,C.body);
  }else if(pose==='dead'){
    pset(g,lX-1,aY,C.body);pset(g,lX,aY,C.body);pset(g,lX,aY+1,C.body);
    pset(g,rX+1,aY,C.body);pset(g,rX,aY,C.body);pset(g,rX,aY+1,C.body);
  }else{
    pset(g,lX,aY-1,C.body);pset(g,lX,aY,C.body);
    pset(g,rX,aY,C.body);pset(g,rX,aY+1,C.body);
  }

  for(let y=19;y<=21;y++)for(let x=0;x<GS;x++)if(g[y][x]===C.body)g[y][x]=C.empty;
  if(CARD_FEET[pose]){
    CARD_FEET[pose](g,frame%4,lX,rX);
  }else if(pose==='running'){
    switch(frame){
      case 0: pset(g,8,17,C.body);pset(g,10,17,C.body);pset(g,8,18,C.body);pset(g,10,18,C.body);pset(g,9,19,C.body);break;
      case 1: pset(g,8,18,C.body);pset(g,10,18,C.body);pset(g,8,19,C.body);pset(g,10,19,C.body);pset(g,9,20,C.body);break;
      default:pset(g,8,19,C.body);pset(g,10,19,C.body);pset(g,8,20,C.body);pset(g,10,20,C.body);pset(g,9,21,C.body);
    }
    switch(frame){
      case 2: pset(g,14,17,C.body);pset(g,16,17,C.body);pset(g,14,18,C.body);pset(g,16,18,C.body);pset(g,15,19,C.body);break;
      case 3: pset(g,14,18,C.body);pset(g,16,18,C.body);pset(g,14,19,C.body);pset(g,16,19,C.body);pset(g,15,20,C.body);break;
      default:pset(g,14,19,C.body);pset(g,16,19,C.body);pset(g,14,20,C.body);pset(g,16,20,C.body);pset(g,15,21,C.body);
    }
  }else if(pose!=='dead'){
    pset(g,8,19,C.body);pset(g,10,19,C.body);pset(g,8,20,C.body);pset(g,10,20,C.body);pset(g,9,21,C.body);
    pset(g,14,19,C.body);pset(g,16,19,C.body);pset(g,14,20,C.body);pset(g,16,20,C.body);pset(g,15,21,C.body);
  }

  addOutline(g);

  const fCx=bCx-1,eyeY=bCy-Math.round(bRy*0.15),mthY=bCy+Math.round(bRy*0.35);
  const fpCy=Math.round((eyeY+mthY)/2);
  const fRy=(mthY-eyeY)/2+1;
  const fRx=Math.max(fRy*0.65,Math.min(bRx*0.52,fRy*0.9));
  fillEllipse(g,fCx,fpCy,fRx,fRy,C.face);

  const esp=Math.min(Math.trunc(ACTIVE.eyeSp),Math.max(1,Math.trunc(fRx-0.3)));
  const eLX=Math.trunc(fCx)-esp,eRX=Math.trunc(fCx)+esp,eY=Math.trunc(eyeY);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    if(pget(g,eLX+dx,eY+dy)!==C.empty)pset(g,eLX+dx,eY+dy,C.face);
    if(pget(g,eRX+dx,eY+dy)!==C.empty)pset(g,eRX+dx,eY+dy,C.face);
  }

  if(CARD_EYES[pose]){
    CARD_EYES[pose](g,eLX,eRX,eY,frame%4);
  }else if(pose==='running'){
    pset(g,eLX-1,eY,C.eyePupil);pset(g,eLX,eY,C.eyePupil);
    pset(g,eLX-1,eY+1,C.eyePupil);pset(g,eLX,eY+1,C.eyePupil);
    pset(g,eRX,eY,C.eyePupil);pset(g,eRX+1,eY,C.eyePupil);
    pset(g,eRX,eY+1,C.eyePupil);pset(g,eRX+1,eY+1,C.eyePupil);
  }else if(pose==='happy'){
    pset(g,eLX-1,eY,C.eyePupil);pset(g,eLX,eY,C.eyePupil);
    pset(g,eLX-1,eY+1,C.eyePupil);pset(g,eLX,eY+1,C.eyePupil);
    pset(g,eLX-1,eY-1,C.eyeShine);
    pset(g,eRX,eY,C.eyePupil);pset(g,eRX+1,eY,C.eyePupil);
    pset(g,eRX,eY+1,C.eyePupil);pset(g,eRX+1,eY+1,C.eyePupil);
    pset(g,eRX,eY-1,C.eyeShine);
  }else if(pose==='sign'){
    // Big happy eyes with shine
    pset(g,eLX-1,eY,C.eyePupil);pset(g,eLX,eY,C.eyePupil);
    pset(g,eLX-1,eY+1,C.eyePupil);pset(g,eLX,eY+1,C.eyePupil);
    pset(g,eLX-1,eY-1,C.eyeShine);
    pset(g,eRX,eY,C.eyePupil);pset(g,eRX+1,eY,C.eyePupil);
    pset(g,eRX,eY+1,C.eyePupil);pset(g,eRX+1,eY+1,C.eyePupil);
    pset(g,eRX,eY-1,C.eyeShine);
  }else if(pose==='sad'){
    pset(g,eLX-1,eY,C.eyePupil);pset(g,eLX,eY,C.eyePupil);
    pset(g,eLX-1,eY+1,C.eyePupil);pset(g,eLX,eY+1,C.eyePupil);
    pset(g,eRX,eY,C.eyePupil);pset(g,eRX+1,eY,C.eyePupil);
    pset(g,eRX,eY+1,C.eyePupil);pset(g,eRX+1,eY+1,C.eyePupil);
    if(frame===3){pset(g,eLX,eY,C.eyePupil);pset(g,eRX,eY,C.eyePupil);}
  }else if(pose==='angry'){
    pset(g,eLX-1,eY,C.eyePupil);pset(g,eLX,eY+1,C.eyePupil);
    pset(g,eRX,eY,C.eyePupil);pset(g,eRX+1,eY+1,C.eyePupil);
  }else if(pose==='dead'){
    for(const[ex,ey]of[[eLX,eY],[eRX,eY]]){
      pset(g,ex-1,ey-1,C.eyePupil);pset(g,ex+1,ey-1,C.eyePupil);
      pset(g,ex,ey,C.eyePupil);
      pset(g,ex-1,ey+1,C.eyePupil);pset(g,ex+1,ey+1,C.eyePupil);
    }
  }else{
    if(frame===6){
      pset(g,eLX-1,eY+1,C.eyePupil);pset(g,eLX,eY+1,C.eyePupil);
      pset(g,eRX,eY+1,C.eyePupil);pset(g,eRX+1,eY+1,C.eyePupil);
    }else{
      pset(g,eLX-1,eY,C.eyePupil);pset(g,eLX,eY,C.eyePupil);
      pset(g,eLX-1,eY+1,C.eyePupil);pset(g,eLX,eY+1,C.eyePupil);
      pset(g,eLX-1,eY-1,C.eyeShine);
      pset(g,eRX,eY,C.eyePupil);pset(g,eRX+1,eY,C.eyePupil);
      pset(g,eRX,eY+1,C.eyePupil);pset(g,eRX+1,eY+1,C.eyePupil);
      pset(g,eRX,eY-1,C.eyeShine);
    }
  }

  const mY=Math.trunc(bCy+Math.round(bRy*0.35)),mCx=Math.trunc(fCx);
  if(CARD_MOUTH[pose]){
    CARD_MOUTH[pose](g,mCx,mY,frame%4);
  }else if(pose==='running'){
    pset(g,mCx-1,mY,C.mouth);pset(g,mCx,mY,C.mouth);pset(g,mCx+1,mY,C.mouth);
  }else if(pose==='happy'){
    pset(g,mCx-2,mY,C.mouth);pset(g,mCx-1,mY+1,C.mouth);
    pset(g,mCx,mY,C.mouth);pset(g,mCx+1,mY+1,C.mouth);pset(g,mCx+2,mY,C.mouth);
  }else if(pose==='sign'){
    // Big open smile alternating
    if(frame%2===0){
      pset(g,mCx-3,mY,C.mouth);pset(g,mCx-2,mY+1,C.mouth);
      pset(g,mCx-1,mY+1,C.mouth);pset(g,mCx,mY+1,C.mouth);
      pset(g,mCx+1,mY+1,C.mouth);pset(g,mCx+2,mY+1,C.mouth);
      pset(g,mCx+3,mY,C.mouth);
    }else{
      pset(g,mCx-2,mY,C.mouth);pset(g,mCx-1,mY+1,C.mouth);
      pset(g,mCx,mY,C.mouth);pset(g,mCx+1,mY+1,C.mouth);
      pset(g,mCx+2,mY,C.mouth);
    }
  }else if(pose==='sad'){
    pset(g,mCx-1,mY+1,C.mouth);pset(g,mCx,mY,C.mouth);pset(g,mCx+1,mY+1,C.mouth);
  }else if(pose==='angry'){
    pset(g,mCx-2,mY,C.mouth);pset(g,mCx-1,mY,C.mouth);
    pset(g,mCx,mY,C.mouth);pset(g,mCx+1,mY,C.mouth);
  }else if(pose!=='dead'){
    pset(g,mCx,mY,C.mouth);
    pset(g,mCx-1,mY+1,C.mouth);pset(g,mCx+1,mY+1,C.mouth);
  }

  if(pose!=='dead'){
    const ckY=eY+1,ckLX=Math.trunc(fCx-bRx*0.58),ckRX=Math.trunc(fCx+bRx*0.58);
    pset(g,ckLX-1,ckY,C.cheek);pset(g,ckLX,ckY,C.cheek);
    pset(g,ckRX,ckY,C.cheek);pset(g,ckRX+1,ckY,C.cheek);
  }

  if(pose==='happy'){
    const ss=[[[eRX+2,eY-2],[lX-1,aY-2]],[[mCx+4,Math.trunc(bCy)],[eLX-2,eY-1]],[[eRX+3,Math.trunc(bCy)-1],[mCx-1,5]],[[eLX-1,eY-3],[rX+1,aY-2]]];
    for(const[sx,sy]of ss[frame%4]){pset(g,sx,sy-1,C.gold);pset(g,sx-1,sy,C.gold);pset(g,sx,sy,C.gold);pset(g,sx+1,sy,C.gold);pset(g,sx,sy+1,C.gold);}
  }
  if(CARD_PROPS[pose]){
    CARD_PROPS[pose](g,lX,rX,aY,frame%4,Math.trunc(bCx),Math.trunc(bCy),eLX,eRX,eY);
  }
  if(pose==='running'){
    const lineYs=[Math.trunc(ACTIVE.bodyCy)-2,Math.trunc(ACTIVE.bodyCy),Math.trunc(ACTIVE.bodyCy)+2,Math.trunc(ACTIVE.bodyCy)+4];
    const lenT=[[4,1,3,1],[2,3,1,2],[3,1,4,1],[1,2,2,3]];
    const xs=frame%2;
    for(let i=0;i<lineYs.length;i++)for(let dx=0;dx<lenT[frame][i];dx++)pset(g,rX+1+xs+dx,lineYs[i],C.speedLine);
    if(frame===0){pset(g,13,22,C.shade);pset(g,14,22,C.shade);pset(g,15,22,C.shade);pset(g,16,22,C.shade);pset(g,12,21,C.shade);pset(g,17,21,C.shade);}
    if(frame===2){pset(g,7,22,C.shade);pset(g,8,22,C.shade);pset(g,9,22,C.shade);pset(g,10,22,C.shade);pset(g,6,21,C.shade);pset(g,11,21,C.shade);}
  }
  if(pose==='sad'){
    const tx=frame<2?eLX:eRX,ty=eY+1+(frame%2)*2;
    pset(g,tx,ty,C.tear);pset(g,tx,ty+1,C.tear);
  }
  if(pose==='angry'){
    const hi=frame%2===0,stX=hi?rX:rX+1,pnY=hi?aY-3:aY-2;
    for(let d=1;d<=3;d++)pset(g,stX,pnY-d,C.body);
    const sx1=Math.max(0,stX-2),sx2=Math.min(GS-1,stX+2),sy1=pnY-6;
    if(sy1>=0){for(let sx=sx1;sx<=sx2;sx++){pset(g,sx,sy1,C.gray);if(sy1+2<GS)pset(g,sx,sy1+2,C.gray);}pset(g,sx1,sy1+1,C.gray);pset(g,sx2,sy1+1,C.gray);pset(g,stX,sy1+1,C.speedLine);}
    if(!hi){const vX=eLX-3,vY=eY-2;pset(g,vX+1,vY,C.speedLine);pset(g,vX+2,vY,C.speedLine);pset(g,vX+1,vY+1,C.speedLine);pset(g,vX,vY+2,C.speedLine);pset(g,vX+1,vY+2,C.speedLine);}
  }
  if(pose==='sign'){
    const bob=frame%2===0;
    const stX=bob?rX:rX+1;
    const pnY=bob?aY-3:aY-2;
    // Stick
    for(let d=1;d<=3;d++)pset(g,stX,pnY-d,C.body);
    // Sign frame (accent1 border)
    const sX1=Math.max(0,stX-2),sX2=Math.min(GS-1,stX+2);
    const sY2=pnY-4,sY1=Math.max(0,sY2-3);
    for(let x=sX1;x<=sX2;x++){pset(g,x,sY1,C.accent1);pset(g,x,sY2,C.accent1);}
    for(let y=sY1;y<=sY2;y++){pset(g,sX1,y,C.accent1);pset(g,sX2,y,C.accent1);}
    // Fill interior
    if(sX1+1<=sX2-1&&sY1+1<=sY2-1){
      for(let y=sY1+1;y<=sY2-1;y++)for(let x=sX1+1;x<=sX2-1;x++)pset(g,x,y,C.face);
    }
    // Bell icon inside
    const signCx=Math.floor((sX1+sX2)/2);
    if(sY1+1<sY2){pset(g,signCx-1,sY1+1,bob?C.accent1:C.gold);pset(g,signCx,sY1+1,bob?C.accent1:C.gold);pset(g,signCx+1,sY1+1,bob?C.accent1:C.gold);}
    if(sY2-1>sY1){pset(g,signCx,sY2-1,bob?C.gold:C.accent1);}
  }
  return g;
}

function hexRgb(h){const n=parseInt(h.replace('#',''),16);return[(n>>16)&255,(n>>8)&255,n&255];}
function tone(r,g,b,a){const cl=v=>Math.max(0,Math.min(255,Math.round(v+a)));return`rgb(${cl(r)},${cl(g)},${cl(b)})`;}

function cellColor(cell,gx,gy,pal){
  const p=pal||ACTIVE.palette||DNA.palette;
  if(cell===C.empty)return null;
  if(cell===C.outline){const[r,g,b]=hexRgb(p.body);return tone(r,g,b,-70);}
  if(cell===C.body||cell===C.accent1||cell===C.accent2){
    const h=cell===C.accent1?p.accent1:cell===C.accent2?p.accent2:p.body;
    const[r,g,b]=hexRgb(h);
    const dx=(gx-ACTIVE.bodyCx)/Math.max(1,ACTIVE.bodyRx),dy=(gy-ACTIVE.bodyCy)/Math.max(1,ACTIVE.bodyRy);
    const l=dx-dy,ck=(gx+gy)%2;
    if(l>0.65)return tone(r,g,b,90);
    if(l>0.50)return tone(r,g,b,ck?42:90);
    if(l>0.25)return tone(r,g,b,42);
    if(l>0.10)return tone(r,g,b,ck?0:42);
    if(l>-0.15)return tone(r,g,b,0);
    if(l>-0.30)return tone(r,g,b,ck?-55:0);
    return tone(r,g,b,-55);
  }
  if(cell===C.face){
    const[r,g,b]=hexRgb(p.face);
    const dx=(gx-ACTIVE.bodyCx)/Math.max(1,ACTIVE.bodyRx),dy=(gy-ACTIVE.bodyCy)/Math.max(1,ACTIVE.bodyRy);
    const l=dx-dy,ck=(gx+gy)%2;
    if(l>0.25)return tone(r,g,b,ck?-15:-40);
    if(l>-0.10)return tone(r,g,b,-40);
    return tone(r,g,b,ck?-40:-60);
  }
  return({[C.eyePupil]:p.eyeP,[C.eyeShine]:'#e0eeff',[C.mouth]:p.eyeP,[C.cheek]:p.cheek,[C.shade]:p.shade,[C.nose]:p.eyeP,[C.tear]:'#5599ff',[C.gold]:'#ffcc00',[C.speedLine]:'#ff7700',[C.gray]:'#888',[C.lightning]:'#00cfff'})[cell]||null;
}

function renderPet(canvas,pose,frame,px,pal,dna){
  if(!canvas) return;
  const sz=GS*px;canvas.width=sz;canvas.height=sz;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,sz,sz);
  const grid=buildGrid(pose,frame,dna);
  for(let y=0;y<GS;y++)for(let x=0;x<GS;x++){
    const c=cellColor(grid[y][x],x,y,pal);
    if(c){ctx.fillStyle=c;ctx.fillRect(x*px,y*px,px,px);}
  }
}

/* Presets de mascota para las tarjetas: especie + paleta reales de la app. */
const PET_PRESETS = {
  nube:    makeDNA('bunny', 'sapphire'),
  chili:   makeDNA('fox',   'turquesa'),
  bruno:   makeDNA('bear',  'oliva_oro'),
  mora:    makeDNA('cat',   'berenjena'),
  cereza:  makeDNA('mouse', 'cereza'),
  tinto:   makeDNA('dog',   'bordo')
};
