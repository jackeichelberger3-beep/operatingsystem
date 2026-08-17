// BIOS + Boot animation + simple mock OS with executable runner
document.addEventListener('DOMContentLoaded', () => {
  const bios = document.getElementById('bios');
  const postLog = document.getElementById('post-log');
  const boot = document.getElementById('boot');
  const bootText = document.getElementById('boot-text');
  const bar = document.getElementById('bar');
  const desk = document.getElementById('desktop');
  const windowsRoot = document.getElementById('windows');

  // BIOS POST messages
  const postMessages = [
    'PhoenixBIOS 4.0 Release 6.0',
    'CPU: Intel(R) i486 Compatible @ 33MHz',
    'Memory Test: 65536K OK',
    'Primary Master: ST-506 20MB',
    'Primary Slave: None',
    'Detecting PCI devices... done',
    'Keyboard detected',
    'System CMOS checksum is OK',
    'Booting from hard disk...'
  ];

  // Show BIOS, then boot screen, then desktop
  function runBIOS() {
    bios.classList.remove('hidden');
    postLog.textContent = '';
    let idx = 0;
    const t = setInterval(() => {
      if (idx < postMessages.length) {
        postLog.textContent += postMessages[idx] + '\n';
        postLog.scrollTop = postLog.scrollHeight;
        idx++;
      } else {
        clearInterval(t);
        // short delay then show boot screen
        setTimeout(() => {
          bios.classList.add('hidden');
          startBoot();
        }, 900);
      }
    }, 500);
  }

  // Boot animation
  function startBoot() {
    boot.classList.remove('hidden');
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
          desk.focus();
        }, 700);
      }
    }, 120);

    // Attempt to play startup sound if available
    const audio = new Audio('reference/sounds/startup.wav');
    audio.play().catch(()=>{});
  }

  runBIOS();

  // Desktop icon handling
  document.body.addEventListener('click', (e) => {
    const icon = e.target.closest('.desktop-icon');
    if (!icon) return;
    const app = icon.dataset.app;
    if (app === 'my-computer') openFileExplorer();
    if (app === 'notepad') openNotepad();
    if (app === 'browser') openBrowser();
    if (app === 'recycle') openRecycle();
    if (app === 'executables') openExecutables();
  });

  // Utility to create a draggable window
  let zIndexCounter = 10;
  function createWindow(title, innerHtml, width = 480, height = 320) {
    const win = document.createElement('div');
    win.className = 'os-window';
    win.style.width = width + 'px';
    win.style.height = height + 'px';
    win.style.left = (60 + Math.floor(Math.random()*40)) + 'px';
    win.style.top = (60 + Math.floor(Math.random()*40)) + 'px';
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

  // Application implementations
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

  // Executables app: lists .exe placeholders and runs them
  const sampleExecutables = ['hello_world.exe','cool_app.exe'];
  function openExecutables() {
    let listHtml = '<div style="padding:8px"><p><strong>Executables</strong></p><ul>';
    sampleExecutables.forEach(name => {
      listHtml += `<li><button class="run-exe" data-exe="${name}">${name}</button></li>`;
    });
    listHtml += '</ul><p>Executables are simple text placeholders; running one will show its output.</p></div>';
    const w = createWindow('Executables', listHtml, 420, 300);
    w.querySelectorAll('.run-exe').forEach(btn => btn.addEventListener('click', (e)=> {
      const exe = e.currentTarget.dataset.exe;
      runExecutable(exe);
    }));
  }

  // Executor: fetch .exe text and simulate running in a console window
  function runExecutable(filename) {
    const runner = createWindow(`Running ${filename}`, `<div class="console" id="console-${Date.now()}" style="background:#000;color:#0f0;padding:8px;height:100%;overflow:auto;font-family:monospace;font-size:12px"></div>`, 560, 360);
    const consoleEl = runner.querySelector('.console');
    fetch('reference/executables/' + filename).then(r => {
      if (!r.ok) throw new Error('Executable not found');
      return r.text();
    }).then(txt => {
      // simulate streaming output
      const lines = txt.split(/\r?\n/);
      let i = 0;
      const t = setInterval(()=>{
        if (i < lines.length) {
          consoleEl.textContent += lines[i] + '\n';
          consoleEl.scrollTop = consoleEl.scrollHeight;
          i++;
        } else {
          clearInterval(t);
          consoleEl.textContent += '\n[Process exited with code 0]';
          consoleEl.scrollTop = consoleEl.scrollHeight;
        }
      }, 250);
    }).catch(err => {
      consoleEl.textContent += 'Error: ' + err.message;
    });
  }

  // Keyboard shortcut: Ctrl+N to open Notepad
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'n') { e.preventDefault(); openNotepad(); }
  });
});
