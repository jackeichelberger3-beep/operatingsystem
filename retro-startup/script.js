// Enhanced BIOS + Boot animation + mock OS with executable runner, double-click, taskbar & window controls
(function(){
  document.addEventListener('DOMContentLoaded', () => {
    const bios = document.getElementById('bios');
    const postLog = document.getElementById('post-log');
    const boot = document.getElementById('boot');
    const bootText = document.getElementById('boot-text');
    const bar = document.getElementById('bar');
    const desk = document.getElementById('desktop');
    const windowsRoot = document.getElementById('windows');
    const taskbarWindows = document.getElementById('taskbar-windows');
    const biosSetup = document.getElementById('bios-setup');
    const bootMenu = document.getElementById('boot-menu');

    // POST messages
    const postMessages = [
      'PhoenixBIOS 4.0 Release 6.0',
      'CPU: Intel(R) i486 Compatible @ 33MHz',
      'Memory Test: 65536K OK',
      'Primary Master: ST-506 20MB',
      'Primary Slave: None',
      'Detecting PCI devices... done',
      'Keyboard detected',
      'System CMOS checksum is OK',
      'Press F2 for Setup, F8 for Boot Menu',
      'Booting from hard disk...'
    ];

    // allow user to press F2/F8 during BIOS to open overlays
    let biosActive = false;
    function runBIOS() {
      biosActive = true;
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
          biosActive = false;
          setTimeout(() => {
            bios.classList.add('hidden');
            startBoot();
          }, 700);
        }
      }, 450);

      // temporary key handler while BIOS active
      function onKey(e) {
        if (!biosActive) return;
        if (e.key === 'F2') showBIOSSetup();
        if (e.key === 'F8') showBootMenu();
      }
      document.addEventListener('keydown', onKey);
      // remove listener after BIOS ends
      setTimeout(()=> document.removeEventListener('keydown', onKey), postMessages.length*450 + 1000);
    }

    // Show BIOS setup modal
    function showBIOSSetup() {
      biosSetup.classList.remove('hidden');
      // simple handlers
      document.getElementById('bios-save').onclick = () => {
        const device = document.getElementById('setup-boot-device').value;
        bootText.textContent = `Booting from ${device}...`;
        biosSetup.classList.add('hidden');
      };
      document.getElementById('bios-exit').onclick = () => biosSetup.classList.add('hidden');
    }

    function showBootMenu() {
      bootMenu.classList.remove('hidden');
      bootMenu.querySelectorAll('.boot-choice').forEach(li => {
        li.onclick = () => {
          const choice = li.dataset.choice;
          bootMenu.classList.add('hidden');
          // adjust boot text and continue fast
          bootText.textContent = `Booting from ${choice}...`;
          // simulate faster boot
          boot.classList.remove('hidden');
          desk.classList.add('hidden');
          fastBoot();
        };
      });
      document.getElementById('bootmenu-cancel').onclick = () => bootMenu.classList.add('hidden');
    }

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
          }, 500);
        }
      }, 120);

      const audio = new Audio('reference/sounds/startup.wav');
      audio.play().catch(()=>{});
    }

    function fastBoot(){
      let pct = 75;
      bar.style.width = pct + '%';
      const interval = setInterval(()=>{
        pct += Math.floor(Math.random()*12) + 10;
        if (pct > 100) pct = 100;
        bar.style.width = pct + '%';
        if (pct === 100) {
          clearInterval(interval);
          setTimeout(()=> {
            boot.classList.add('hidden');
            desk.classList.remove('hidden');
            desk.focus();
          }, 300);
        }
      }, 90);
    }

    runBIOS();

    // Desktop icon behavior: single-click selects, double-click opens
    document.querySelectorAll('.desktop-icon').forEach(icon => {
      icon.addEventListener('click', (e) => {
        document.querySelectorAll('.desktop-icon.selected').forEach(s=>s.classList.remove('selected'));
        icon.classList.add('selected');
      });
      icon.addEventListener('dblclick', (e) => {
        const app = icon.dataset.app;
        openApp(app);
      });
    });

    function openApp(app){
      if (app === 'my-computer') openFileExplorer();
      if (app === 'notepad') openNotepad();
      if (app === 'browser') openBrowser();
      if (app === 'recycle') openRecycle();
      if (app === 'executables') openExecutables();
    }

    // Window management with minimize/maximize and taskbar buttons
    let zIndexCounter = 10;
    let winCounter = 0;
    function createWindow(title, innerHtml, width = 480, height = 320) {
      const id = 'win-' + (++winCounter) + '-' + Date.now();
      const win = document.createElement('div');
      win.className = 'os-window';
      win.dataset.winId = id;
      win.style.width = width + 'px';
      win.style.height = height + 'px';
      win.style.left = (60 + Math.floor(Math.random()*40)) + 'px';
      win.style.top = (60 + Math.floor(Math.random()*40)) + 'px';
      win.style.zIndex = ++zIndexCounter;

      win.innerHTML = `
        <div class="titlebar">
          <div class="title">${title}</div>
          <div class="controls">
            <button class="btn min">▁</button>
            <button class="btn max">▢</button>
            <button class="btn close">✕</button>
          </div>
        </div>
        <div class="window-content">${innerHtml}</div>
      `;
      windowsRoot.appendChild(win);

      // taskbar button
      const tb = document.createElement('button');
      tb.className = 'taskbar-btn';
      tb.textContent = title;
      tb.dataset.winId = id;
      taskbarWindows.appendChild(tb);

      // interactions
      win.addEventListener('mousedown', ()=> win.style.zIndex = ++zIndexCounter);

      // close button
      win.querySelector('.btn.close').addEventListener('click', () => {
        win.remove();
        tb.remove();
      });

      // minimize
      win.querySelector('.btn.min').addEventListener('click', ()=>{
        win.style.display = 'none';
        tb.classList.add('minimized');
      });

      // maximize/restore
      win.querySelector('.btn.max').addEventListener('click', (e)=>{
        const isMax = win.dataset.max === '1';
        if (!isMax) {
          // save current
          win.dataset._left = win.style.left || '60px';
          win.dataset._top = win.style.top || '60px';
          win.dataset._width = win.style.width;
          win.dataset._height = win.style.height;
          // fill
          win.style.left = '0px'; win.style.top = '0px'; win.style.width = '100%'; win.style.height = 'calc(100% - 40px)';
          win.dataset.max = '1';
        } else {
          win.style.left = win.dataset._left;
          win.style.top = win.dataset._top;
          win.style.width = win.dataset._width;
          win.style.height = win.dataset._height;
          win.dataset.max = '0';
        }
      });

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
        if (win.dataset.max === '1') return; // don't drag when maximized
        win.style.left = (ev.clientX - offsetX) + 'px';
        win.style.top = (ev.clientY - offsetY) + 'px';
      });
      titlebar.addEventListener('pointerup', (ev) => {
        dragging = false;
        try { titlebar.releasePointerCapture(ev.pointerId); } catch {}
      });

      // taskbar button click toggles minimize/restore
      tb.addEventListener('click', ()=>{
        if (win.style.display === 'none') {
          win.style.display = 'flex';
          win.style.zIndex = ++zIndexCounter;
          tb.classList.remove('minimized');
        } else {
          win.style.display = 'none';
          tb.classList.add('minimized');
        }
      });

      return win;
    }

    // Apps
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

    // Executables: fetch manifest to auto-discover
    function openExecutables() {
      fetch('reference/executables/manifest.json').then(r=>r.json()).then(list=>{
        let listHtml = '<div style="padding:8px"><p><strong>Executables</strong></p><ul>';
        list.forEach(name => { listHtml += `<li><button class="run-exe" data-exe="${name}">${name}</button></li>`; });
        listHtml += '</ul><p>Executables are simple text placeholders; running one will show its output.</p></div>';
        const w = createWindow('Executables', listHtml, 420, 300);
        w.querySelectorAll('.run-exe').forEach(btn => btn.addEventListener('click', (e)=> {
          const exe = e.currentTarget.dataset.exe;
          runExecutable(exe);
        }));
      }).catch(()=>{
        // fallback to hardcoded
        const sampleExecutables = ['hello_world.exe','cool_app.exe'];
        let listHtml = '<div style="padding:8px"><p><strong>Executables</strong></p><ul>';
        sampleExecutables.forEach(name => { listHtml += `<li><button class="run-exe" data-exe="${name}">${name}</button></li>`; });
        listHtml += '</ul><p>Executables are simple text placeholders; running one will show its output.</p></div>';
        const w = createWindow('Executables', listHtml, 420, 300);
        w.querySelectorAll('.run-exe').forEach(btn => btn.addEventListener('click', (e)=> {
          const exe = e.currentTarget.dataset.exe;
          runExecutable(exe);
        }));
      });
    }

    function runExecutable(filename) {
      const runner = createWindow(`Running ${filename}`, `<div class="console" id="console-${Date.now()}"></div>`, 560, 360);
      const consoleEl = runner.querySelector('.console');
      fetch('reference/executables/' + filename).then(r => {
        if (!r.ok) throw new Error('Executable not found');
        return r.text();
      }).then(txt => {
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
        }, 200);
      }).catch(err => {
        consoleEl.textContent += 'Error: ' + err.message;
      });
    }

    // Keyboard shortcut: Ctrl+N to open Notepad
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'n') { e.preventDefault(); openNotepad(); }
    });

  });
})();
