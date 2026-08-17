// Boot animation + simple mock OS with clickable desktop icons & windows
document.addEventListener('DOMContentLoaded', () => {
  const bar = document.getElementById('bar');
  const boot = document.getElementById('boot');
  const desk = document.getElementById('desktop');
  const windowsRoot = document.getElementById('windows');

  // Try to play startup sound if present
  const audio = new Audio('reference/sounds/startup.wav');
  audio.addEventListener('error', ()=>{/* no sound found or cannot play */});

  // Progress animation timeline
  let pct = 0;
  const interval = setInterval(()=>{
    pct += Math.floor(Math.random()*8) + 3;
    if (pct > 100) pct = 100;
    bar.style.width = pct + '%';
    if (pct === 100) {
      clearInterval(interval);
      setTimeout(()=> {
        boot.classList.add('hidden');
        desk.classList.remove('hidden');
        // focus the desktop for keyboard events
        desk.focus();
      }, 700);
    }
  }, 150);

  // Attempt to play sound (may be blocked without user gesture)
  audio.play().catch(()=>{/* blocked; OK */});

  // Desktop icon handling
  document.body.addEventListener('click', (e) => {
    const icon = e.target.closest('.desktop-icon');
    if (!icon) return;
    const app = icon.dataset.app;
    if (app === 'my-computer') openFileExplorer();
    if (app === 'notepad') openNotepad();
    if (app === 'browser') openBrowser();
    if (app === 'recycle') openRecycle();
  });

  // Utility to create a draggable window
  let zIndexCounter = 10;
  function createWindow(title, innerHtml, width = 480, height = 320) {
    const win = document.createElement('div');
    win.className = 'os-window';
    win.style.width = width + 'px';
    win.style.height = height + 'px';
    win.style.left = '60px';
    win.style.top = '60px';
    win.style.zIndex = ++zIndexCounter;

    win.innerHTML = `
      <div class="titlebar">
        <div class="title">${title}</div>
        <div class="controls">
          <button class="btn close">✕</button>
        </div>
      </div>
      <div class="window-content">${innerHtml}</div>
    `;
    windowsRoot.appendChild(win);

    // bring to front on mousedown
    win.addEventListener('mousedown', ()=> win.style.zIndex = ++zIndexCounter);

    // close button
    win.querySelector('.btn.close').addEventListener('click', () => win.remove());

    // simple drag
    const titlebar = win.querySelector('.titlebar');
    let dragging = false, offsetX=0, offsetY=0;
    titlebar.addEventListener('pointerdown', (ev) => {
      dragging = true;
      offsetX = ev.clientX - win.getBoundingClientRect().left;
      offsetY = ev.clientY - win.getBoundingClientRect().top;
      titlebar.setPointerCapture(ev.pointerId);
    });
    titlebar.addEventListener('pointermove', (ev) => {
      if (!dragging) return;
      win.style.left = (ev.clientX - offsetX) + 'px';
      win.style.top = (ev.clientY - offsetY) + 'px';
    });
    titlebar.addEventListener('pointerup', (ev) => {
      dragging = false;
      try { titlebar.releasePointerCapture(ev.pointerId); } catch {}
    });

    return win;
  }

  // Example apps
  function openFileExplorer() {
    const content = `
      <div class="explorer">
        <p><strong>My Computer</strong></p>
        <ul>
          <li>Local Disk (C:)</li>
          <li>Documents</li>
          <li>Program Files</li>
        </ul>
        <button id="open-notepad-from-explorer">Open Notepad</button>
      </div>
    `;
    const w = createWindow('My Computer', content, 420, 300);
    w.querySelector('#open-notepad-from-explorer').addEventListener('click', openNotepad);
  }

  function openNotepad() {
    const content = `<textarea style="width:100%;height:calc(100% - 8px);">Welcome to Retro Notepad</textarea>`;
    createWindow('Notepad', content, 500, 360);
  }

  function openBrowser() {
    const content = `
      <div style="display:flex;flex-direction:column;height:100%">
        <div style="padding:6px;background:#eee;border-bottom:1px solid #ccc;">
          <input style="width:100%;padding:6px" value="https://example.local/retro"/>
        </div>
        <div style="padding:12px;flex:1;overflow:auto;">
          <h3>Retro Browser</h3>
          <p>This is a fake browser window for the demo.</p>
        </div>
      </div>
    `;
    createWindow('Internet', content, 640, 420);
  }

  function openRecycle() {
    const content = `<div style="padding:12px"><p>Recycle Bin is empty.</p></div>`;
    createWindow('Recycle Bin', content, 360, 200);
  }

  // Keyboard shortcut: Ctrl+N to open Notepad
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'n') { e.preventDefault(); openNotepad(); }
  });
});
