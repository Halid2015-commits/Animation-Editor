(()=>{
  const fileInput = document.getElementById('fileInput');
  const addFromFiles = document.getElementById('addFromFiles');
  const timeline = document.getElementById('timeline');
  const preview = document.getElementById('preview');
  const ctx = preview.getContext('2d');
  const playBtn = document.getElementById('play');
  const pauseBtn = document.getElementById('pause');
  const fpsRange = document.getElementById('fps');
  const fpsValue = document.getElementById('fpsValue');
  const exportBtn = document.getElementById('exportSpritesheet');
  const drawModeBtn = document.getElementById('drawMode');
  const drawPanel = document.getElementById('drawPanel');
  const drawCanvas = document.getElementById('drawCanvas');
  const drawCtx = drawCanvas.getContext('2d');
  const undoDrawBtn = document.getElementById('undoDraw');
  const toolButtons = document.querySelectorAll('.tool');
  const drawColor = document.getElementById('drawColor');
  const drawSize = document.getElementById('drawSize');
  const clearDraw = document.getElementById('clearDraw');
  const saveDraw = document.getElementById('saveDraw');
  const addBlank = document.getElementById('addBlank');

  let frames = [];
  let current = 0;
  let timer = null;

  function renderPreview(){
    ctx.clearRect(0,0,preview.width,preview.height);
    if(!frames.length) return;
    const img = frames[current].img;
    const iw = img.width, ih = img.height;
    const cw = preview.width, ch = preview.height;
    const scale = Math.min(cw/iw, ch/ih);
    const w = iw*scale, h = ih*scale;
    ctx.drawImage(img, (cw-w)/2, (ch-h)/2, w, h);
  }

  function renderTimeline(){
    timeline.innerHTML = '';
    frames.forEach((f, i)=>{
      const d = document.createElement('div');
      d.className = 'thumb';
      d.draggable = true;
      d.dataset.index = i;
      const im = document.createElement('img');
      im.src = f.src;
      d.appendChild(im);
      const rm = document.createElement('button');
      rm.className = 'remove';
      rm.textContent = '×';
      rm.title = 'Remove frame';
      rm.addEventListener('click', ()=>{ frames.splice(i,1); if(current>=frames.length) current=0; renderTimeline(); renderPreview(); });
      d.appendChild(rm);

      d.addEventListener('click', ()=>{ current = i; renderPreview(); });

      d.addEventListener('dragstart', (e)=>{ d.classList.add('dragging'); e.dataTransfer.setData('text/plain', i); });
      d.addEventListener('dragend', ()=>d.classList.remove('dragging'));

      d.addEventListener('dragover', (e)=>{ e.preventDefault(); });
      d.addEventListener('drop', (e)=>{
        e.preventDefault();
        const from = Number(e.dataTransfer.getData('text/plain'));
        const to = i;
        if(from===to) return;
        const item = frames.splice(from,1)[0];
        frames.splice(to,0,item);
        renderTimeline(); renderPreview();
      });

      timeline.appendChild(d);
    });
  }

  // Drawing helpers
  let drawing = false;
  let currentTool = 'pencil';
  const undoStack = [];
  const maxUndo = 20;
  function resizeDrawCanvas(){
    drawCanvas.width = preview.width;
    drawCanvas.height = preview.height;
  }
  function setDrawStyle(){
    drawCtx.lineJoin = 'round';
    drawCtx.lineCap = 'round';
    drawCtx.strokeStyle = drawColor.value;
    drawCtx.lineWidth = Number(drawSize.value);
  }

  function startDraw(e){
    // push snapshot for undo
    try{ if(undoStack.length>=maxUndo) undoStack.shift(); undoStack.push(drawCtx.getImageData(0,0,drawCanvas.width,drawCanvas.height)); }catch(e){ }
    drawing = true; drawCtx.beginPath();
    const r = drawCanvas.getBoundingClientRect();
    const scaleX = drawCanvas.width / r.width;
    const scaleY = drawCanvas.height / r.height;
    const x = ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) * scaleX;
    const y = ((e.touches ? e.touches[0].clientY : e.clientY) - r.top) * scaleY;
    drawCtx.moveTo(x,y);
    setDrawStyle();
  }
  function drawMove(e){
    if(!drawing) return;
    const r = drawCanvas.getBoundingClientRect();
    const scaleX = drawCanvas.width / r.width;
    const scaleY = drawCanvas.height / r.height;
    const x = ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) * scaleX;
    const y = ((e.touches ? e.touches[0].clientY : e.clientY) - r.top) * scaleY;
    if(currentTool==='pencil' || currentTool==='eraser'){
      drawCtx.lineTo(x,y); drawCtx.stroke();
    } else {
      // shape preview: restore snapshot and draw shape
      if(!drawingSnapshot) return;
      drawCtx.putImageData(drawingSnapshot,0,0);
      drawCtx.beginPath();
      const dx = x - startX, dy = y - startY;
      if(currentTool==='line'){
        drawCtx.moveTo(startX,startY); drawCtx.lineTo(x,y);
        drawCtx.stroke();
      } else if(currentTool==='rect'){
        drawCtx.strokeRect(startX, startY, dx, dy);
      } else if(currentTool==='ellipse'){
        drawEllipse(drawCtx, startX, startY, dx, dy);
      }
    }
  }
  function endDraw(){ drawing = false; }

  // shape helpers
  let startX=0, startY=0, drawingSnapshot=null;
  function beginShape(e){
    const r = drawCanvas.getBoundingClientRect();
    const scaleX = drawCanvas.width / r.width;
    const scaleY = drawCanvas.height / r.height;
    startX = ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) * scaleX;
    startY = ((e.touches ? e.touches[0].clientY : e.clientY) - r.top) * scaleY;
    drawingSnapshot = drawCtx.getImageData(0,0,drawCanvas.width,drawCanvas.height);
  }
  function drawEllipse(ctx, x, y, w, h){
    ctx.save(); ctx.beginPath();
    ctx.translate(x + w/2, y + h/2);
    ctx.scale(Math.abs(w)/2, Math.abs(h)/2);
    ctx.arc(0,0,1,0,Math.PI*2);
    ctx.restore(); ctx.stroke();
  }

  drawCanvas.addEventListener('mousedown', (e)=>{
    if(currentTool==='line' || currentTool==='rect' || currentTool==='ellipse'){
      // start shape
      beginShape(e); drawing=true; setDrawStyle();
    } else if(currentTool==='fill'){
      doFloodFill(e);
    } else { startDraw(e); }
  });
  drawCanvas.addEventListener('touchstart', (e)=>{ e.preventDefault(); if(currentTool==='line' || currentTool==='rect' || currentTool==='ellipse'){ beginShape(e); drawing=true; setDrawStyle(); } else if(currentTool==='fill'){ doFloodFill(e); } else startDraw(e); });
  window.addEventListener('mousemove', drawMove);
  window.addEventListener('touchmove', drawMove, {passive:false});
  window.addEventListener('mouseup', (e)=>{ if(drawing && (currentTool==='line' || currentTool==='rect' || currentTool==='ellipse')){ // commit final shape
      drawMove(e); drawing=false; drawingSnapshot=null; }
    endDraw(); });
  window.addEventListener('touchend', (e)=>{ if(drawing && (currentTool==='line' || currentTool==='rect' || currentTool==='ellipse')){ drawing=false; drawingSnapshot=null; } endDraw(); });

  clearDraw.addEventListener('click', ()=>{ drawCtx.clearRect(0,0,drawCanvas.width,drawCanvas.height); });

  undoDrawBtn.addEventListener('click', ()=>{
    if(!undoStack.length) return;
    const imgd = undoStack.pop();
    drawCtx.putImageData(imgd,0,0);
  });

  saveDraw.addEventListener('click', ()=>{
    const data = drawCanvas.toDataURL('image/png');
    const img = new Image();
    img.onload = ()=>{ frames.push({img,src:data}); renderTimeline(); renderPreview(); drawPanel.hidden=true; };
    img.src = data;
  });

  drawModeBtn.addEventListener('click', ()=>{
    const show = drawPanel.hidden;
    if(show){ resizeDrawCanvas(); drawPanel.hidden = false; document.getElementById('drawPreview').hidden=false; undoStack.length=0;
      drawCtx.clearRect(0,0,drawCanvas.width,drawCanvas.height);
      if(frames[current]) drawCtx.drawImage(frames[current].img, (drawCanvas.width-frames[current].img.width)/2, (drawCanvas.height-frames[current].img.height)/2);
      updateDrawPreview();
    } else {
      drawPanel.hidden = true; document.getElementById('drawPreview').hidden=true;
    }
  });

  // tool UI
  toolButtons.forEach(b=>b.addEventListener('click', ()=>{
    toolButtons.forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    currentTool = b.dataset.tool;
  }));
  // default active
  document.getElementById('toolPencil').classList.add('active');
  currentTool = 'pencil';

  // set draw style to include alpha
  function setDrawStyle(){
    drawCtx.lineJoin = 'round';
    drawCtx.lineCap = 'round';
    drawCtx.globalCompositeOperation = (currentTool==='eraser') ? 'destination-out' : 'source-over';
    drawCtx.strokeStyle = drawColor.value;
    drawCtx.globalAlpha = Number(document.getElementById('drawAlpha').value);
    drawCtx.lineWidth = Number(drawSize.value);
  }

  // flood fill implementation
  function doFloodFill(e){
    const r = drawCanvas.getBoundingClientRect();
    const scaleX = drawCanvas.width / r.width;
    const scaleY = drawCanvas.height / r.height;
    const x = Math.floor(((e.touches ? e.touches[0].clientX : e.clientX) - r.left) * scaleX);
    const y = Math.floor(((e.touches ? e.touches[0].clientY : e.clientY) - r.top) * scaleY);
    if(x<0||y<0||x>=drawCanvas.width||y>=drawCanvas.height) return;
    try{ if(undoStack.length>=maxUndo) undoStack.shift(); undoStack.push(drawCtx.getImageData(0,0,drawCanvas.width,drawCanvas.height)); }catch(err){}
    const img = drawCtx.getImageData(0,0,drawCanvas.width,drawCanvas.height);
    const targetOffset = (y*img.width + x)*4;
    const targetR = img.data[targetOffset], targetG = img.data[targetOffset+1], targetB = img.data[targetOffset+2], targetA = img.data[targetOffset+3];
    const fillColor = hexToRgba(drawColor.value, Number(document.getElementById('drawAlpha').value));
    if(targetR===fillColor.r && targetG===fillColor.g && targetB===fillColor.b && targetA===Math.round(fillColor.a*255)) return;
    const stack = [[x,y]];
    const w = img.width, h = img.height;
    while(stack.length){
      const [cx,cy] = stack.pop();
      let nx = cx;
      // move left
      while(nx>=0 && matchPixel(img, nx, cy, targetR, targetG, targetB, targetA)) nx--;
      nx++;
      let spanUp=false, spanDown=false;
      while(nx<w && matchPixel(img, nx, cy, targetR, targetG, targetB, targetA)){
        const off = (cy*w + nx)*4;
        img.data[off]=fillColor.r; img.data[off+1]=fillColor.g; img.data[off+2]=fillColor.b; img.data[off+3]=Math.round(fillColor.a*255);
        if(!spanUp && cy>0 && matchPixel(img, nx, cy-1, targetR, targetG, targetB, targetA)){ stack.push([nx, cy-1]); spanUp=true; }
        else if(spanUp && cy>0 && !matchPixel(img, nx, cy-1, targetR, targetG, targetB, targetA)) spanUp=false;
        if(!spanDown && cy<h-1 && matchPixel(img, nx, cy+1, targetR, targetG, targetB, targetA)){ stack.push([nx, cy+1]); spanDown=true; }
        else if(spanDown && cy<h-1 && !matchPixel(img, nx, cy+1, targetR, targetG, targetB, targetA)) spanDown=false;
        nx++;
      }
    }
    drawCtx.putImageData(img,0,0);
  }

  function matchPixel(img, x, y, r,g,b,a){
    const off = (y*img.width + x)*4;
    return img.data[off]===r && img.data[off+1]===g && img.data[off+2]===b && img.data[off+3]===a;
  }
  function hexToRgba(hex, alpha){
    const n = parseInt(hex.replace('#',''),16);
    return {r:(n>>16)&255, g:(n>>8)&255, b:n&255, a:alpha};
  }

  // update preview canvas on right panel
  function updateDrawPreview(){
    const prevCanvas = document.getElementById('previewDrawing');
    const prevCtx = prevCanvas.getContext('2d');
    prevCtx.clearRect(0,0,prevCanvas.width,prevCanvas.height);
    prevCtx.drawImage(drawCanvas, 0, 0, drawCanvas.width, drawCanvas.height, 0, 0, prevCanvas.width, prevCanvas.height);
  }
  
  // redraw preview on drawing changes
  setInterval(()=>{ if(drawing && !drawPanel.hidden) updateDrawPreview(); }, 100);

  addBlank.addEventListener('click', ()=>{
    const c = document.createElement('canvas');
    c.width = preview.width; c.height = preview.height;
    // leave transparent background
    const data = c.toDataURL('image/png');
    const img = new Image();
    img.onload = ()=>{ frames.push({img,src:data}); renderTimeline(); renderPreview(); };
    img.src = data;
  });


  function addFiles(files){
    Array.from(files).forEach(file=>{
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = ()=>{ frames.push({img,src:url}); renderTimeline(); renderPreview(); };
      img.src = url;
    });
  }

  addFromFiles.addEventListener('click', ()=> addFiles(fileInput.files));

  fpsRange.addEventListener('input', ()=>{ fpsValue.textContent = fpsRange.value; if(timer){ clearInterval(timer); startTimer(); } });

  function startTimer(){
    if(timer) clearInterval(timer);
    const fps = Math.max(1, Number(fpsRange.value));
    timer = setInterval(()=>{ current = (current+1)%frames.length; renderPreview(); }, 1000/fps);
  }

  playBtn.addEventListener('click', ()=>{ if(!frames.length) return; startTimer(); });
  pauseBtn.addEventListener('click', ()=>{ if(timer) clearInterval(timer); timer = null; });

  exportBtn.addEventListener('click', ()=>{
    if(!frames.length) return alert('No frames to export');
    // create spritesheet horizontally
    const totalW = frames.reduce((s,f)=>s+f.img.width,0);
    const h = Math.max(...frames.map(f=>f.img.height));
    const c = document.createElement('canvas');
    c.width = totalW; c.height = h;
    const cctx = c.getContext('2d');
    let x = 0;
    const meta = {frames:[]};
    frames.forEach((f,i)=>{
      cctx.drawImage(f.img, x, 0);
      meta.frames.push({index:i,x,y:0,w:f.img.width,h:f.img.height});
      x += f.img.width;
    });
    // download image
    c.toBlob((blob)=>{
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'spritesheet.png';
      a.click();
    });
    // download JSON
    const j = new Blob([JSON.stringify({...meta,fps: Number(fpsRange.value)},null,2)],{type:'application/json'});
    const aj = document.createElement('a');
    aj.href = URL.createObjectURL(j);
    aj.download = 'animation.json';
    aj.click();
  });

  // allow drag & drop into window
  window.addEventListener('dragover',(e)=>e.preventDefault());
  window.addEventListener('drop',(e)=>{ e.preventDefault(); if(e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });

  // initial empty render
  renderPreview(); renderTimeline();
})();
