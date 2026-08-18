// Add: BIOS advanced boot-order editor, profiles, and help executable support
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
    const biosAdvanced = document.getElementById('bios-advanced');
    const bootMenu = document.getElementById('boot-menu');
    const startButton = document.getElementById('start-button');
    const startMenu = document.getElementById('start-menu');

    const CMOS_KEY = 'retro_cmos_v1';
    const PROFILES_KEY = 'retro_cmos_profiles_v1';

    // Default CMOS/settings
    const DEFAULT_CMOS = {
      bootDevice: 'Hard Disk',
      systemDate: '2026-08-17',
      baseMemoryKB: 65536,
      enableNetwork: true,
      enableFloppy: false,
      enableCdrom: true,
      bootOrder: ['Hard Disk','Floppy','CD-ROM','Network']
    };

    function loadCMOS(){
      try{
        const raw = localStorage.getItem(CMOS_KEY);
        if (!raw) return Object.assign({}, DEFAULT_CMOS);
        const parsed = JSON.parse(raw);
        return Object.assign({}, DEFAULT_CMOS, parsed);
      }catch(e){ return Object.assign({}, DEFAULT_CMOS); }
    }
    function saveCMOS(obj){
      localStorage.setItem(CMOS_KEY, JSON.stringify(obj));
    }
    function clearCMOS(){
      localStorage.removeItem(CMOS_KEY);
    }

    // Profiles helpers
    function loadProfiles(){
      try{ const raw = localStorage.getItem(PROFILES_KEY); return raw? JSON.parse(raw): {}; }catch(e){ return {}; }
    }
    function saveProfiles(profiles){ localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles)); }

    function buildPostMessages(cmos){
      return [
        'PhoenixBIOS 4.0 Release 6.0',
        'CPU: Intel(R) i486 Compatible @ 33MHz',
        `Memory Test: ${cmos.baseMemoryKB}K OK`,
        'Primary Master: ST-506 20MB',
        (cmos.enableFloppy? 'Primary Slave: Floppy Drive detected' : 'Primary Slave: None'),
        (cmos.enableCdrom? 'CD-ROM Drive: Present' : 'CD-ROM Drive: Not Present'),
        (cmos.enableNetwork? 'Network Adapter: Initialized' : 'Network Adapter: Disabled'),
        'Detecting PCI devices... done',
        'Keyboard detected',
        'System CMOS checksum is OK',
        `Booting from ${cmos.bootDevice}...`
      ];
    }

    function runBIOS() {
      const cmos = loadCMOS();
      bios.classList.remove('hidden');
      postLog.textContent = '';
      const postMessages = buildPostMessages(cmos);

      let idx = 0;
      const t = setInterval(() => {
        if (idx < postMessages.length) {
          postLog.textContent += postMessages[idx] + '\n';
          postLog.scrollTop = postLog.scrollHeight;
          idx++;
        } else {
          clearInterval(t);
          setTimeout(() => {
            bios.classList.add('hidden');
            startBoot();
          }, 700);
        }
      }, 450);

      function onKey(e) {
        if (e.key === 'F2') showBIOSSetup();
        if (e.key === 'F8') showBootMenu();
      }
      document.addEventListener('keydown', onKey);
      setTimeout(()=> document.removeEventListener('keydown', onKey), postMessages.length*450 + 1000);
    }

    // BIOS Setup UI
    function showBIOSSetup(){
      const cmos = loadCMOS();
      biosSetup.classList.remove('hidden');
      document.getElementById('setup-boot-device').value = cmos.bootDevice;
      document.getElementById('setup-date').value = cmos.systemDate;

      const profileSelect = document.getElementById('profile-select');
      const profileName = document.getElementById('profile-name');
      // populate profiles
      const profiles = loadProfiles();
      profileSelect.innerHTML = '<option value="">(none)</option>' + Object.keys(profiles).map(n=>`<option value="${n}">${n}</option>`).join('');

      document.getElementById('profile-save').onclick = ()=>{
        const name = profileName.value.trim();
        if (!name) { alert('Enter a profile name'); return; }
        const p = loadProfiles();
        const current = loadCMOS();
        current.bootDevice = document.getElementById('setup-boot-device').value;
        current.systemDate = document.getElementById('setup-date').value;
        p[name] = current;
        saveProfiles(p);
        profileSelect.innerHTML = '<option value="">(none)</option>' + Object.keys(p).map(n=>`<option value="${n}">${n}</option>`).join('');
        profileName.value = '';
        alert('Profile saved');
      };

      document.getElementById('profile-delete').onclick = ()=>{
        const sel = profileSelect.value;
        if (!sel) { alert('Select a profile to delete'); return; }
        const p = loadProfiles();
        delete p[sel];
        saveProfiles(p);
        profileSelect.innerHTML = '<option value="">(none)</option>' + Object.keys(p).map(n=>`<option value="${n}">${n}</option>`).join('');
        alert('Profile deleted');
      };

      profileSelect.onchange = ()=>{
        const sel = profileSelect.value;
        if (!sel) return;
        const p = loadProfiles();
        if (p[sel]){
          const obj = p[sel];
          document.getElementById('setup-boot-device').value = obj.bootDevice || DEFAULT_CMOS.bootDevice;
          document.getElementById('setup-date').value = obj.systemDate || DEFAULT_CMOS.systemDate;
        }
      };

      document.getElementById('bios-advanced-btn').onclick = ()=> showAdvanced();
      document.getElementById('bios-save').onclick = ()=>{
        const newCmos = loadCMOS();
        newCmos.bootDevice = document.getElementById('setup-boot-device').value;
        newCmos.systemDate = document.getElementById('setup-date').value;
        saveCMOS(newCmos);
        biosSetup.classList.add('hidden');
        alert('CMOS saved');
      };
      document.getElementById('bios-restore').onclick = ()=>{
        clearCMOS();
        document.getElementById('setup-boot-device').value = DEFAULT_CMOS.bootDevice;
        document.getElementById('setup-date').value = DEFAULT_CMOS.systemDate;
      };
      document.getElementById('bios-exit').onclick = ()=> biosSetup.classList.add('hidden');
    }

    // Advanced panel with boot order drag/drop
    function showAdvanced(){
      const cmos = loadCMOS();
      biosAdvanced.classList.remove('hidden');
      document.getElementById('adv-memory').value = cmos.baseMemoryKB;
      document.getElementById('adv-network').checked = !!cmos.enableNetwork;
      document.getElementById('adv-floppy').checked = !!cmos.enableFloppy;
      document.getElementById('adv-cdrom').checked = !!cmos.enableCdrom;

      const bootOrderList = document.getElementById('boot-order-list');
      bootOrderList.innerHTML = '';
      (cmos.bootOrder || DEFAULT_CMOS.bootOrder).forEach(dev => {
        const row = document.createElement('div');
        row.className = 'boot-order-row';
        row.innerHTML = `<span class="boot-dev">${dev}</span><div class="boot-order-controls"><button class="up">▲</button><button class="down">▼</button></div>`;
        bootOrderList.appendChild(row);
      });

      // wire up up/down
      bootOrderList.querySelectorAll('.boot-order-row').forEach((r,i,arr)=>{
        r.querySelector('.up').onclick = ()=>{
          const idx = Array.from(bootOrderList.children).indexOf(r);
          if (idx <= 0) return;
          bootOrderList.insertBefore(r, bootOrderList.children[idx-1]);
        };
        r.querySelector('.down').onclick = ()=>{
          const idx = Array.from(bootOrderList.children).indexOf(r);
          if (idx >= bootOrderList.children.length-1) return;
          bootOrderList.insertBefore(bootOrderList.children[idx+1], r);
        };
      });

      document.getElementById('adv-save').onclick = ()=>{
        const cur = loadCMOS();
        cur.baseMemoryKB = parseInt(document.getElementById('adv-memory').value,10) || cur.baseMemoryKB;
        cur.enableNetwork = document.getElementById('adv-network').checked;
        cur.enableFloppy = document.getElementById('adv-floppy').checked;
        cur.enableCdrom = document.getElementById('adv-cdrom').checked;
        cur.bootOrder = Array.from(bootOrderList.children).map(r=>r.querySelector('.boot-dev').textContent.trim());
        saveCMOS(cur);
        biosAdvanced.classList.add('hidden');
        biosSetup.classList.add('hidden');
        alert('Advanced settings saved to CMOS');
      };
      document.getElementById('adv-cancel').onclick = ()=> biosAdvanced.classList.add('hidden');
    }

    function showBootMenu() {
      bootMenu.classList.remove('hidden');
      bootMenu.querySelectorAll('.boot-choice').forEach(li => {
        li.onclick = () => {
          const choice = li.dataset.choice;
          bootMenu.classList.add('hidden');
          bootText.textContent = `Booting from ${choice}...`;
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

    // Start menu toggle
    startButton.addEventListener('click', (e) => {
      startMenu.classList.toggle('hidden');
      e.stopPropagation();
    });
    startMenu.addEventListener('click', (e) => {
      const item = e.target.closest('li[data-app]');
      if (item) {
        const app = item.dataset.app;
        openApp(app);
        startMenu.classList.add('hidden');
      }
    });
    document.addEventListener('click', (e) => {
      if (!startMenu.classList.contains('hidden')) startMenu.classList.add('hidden');
    });

    // Desktop icon behavior
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

    // Window management
    let zIndexCounter = 10;
    let winCounter = 0;
    function createWindow(title, innerHtml, width = 480, height = 320, iconPath = 'reference/logos/my_computer.svg') {
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
          <div class="title"><img src="${iconPath}" class="title-icon"> ${title}</div>
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
      tb.dataset.winId = id;
      tb.innerHTML = `<img src="${iconPath}" class="tb-icon"><span class="label">${title}</span>`;
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
          win.dataset._left = win.style.left || '60px';
          win.dataset._top = win.style.top || '60px';
          win.dataset._width = win.style.width;
          win.dataset._height = win.style.height;
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
      createWindow('My Computer', content, 420, 300, 'reference/logos/my_computer.svg');
    }

    function openNotepad() {
      const content = `<textarea style="width:100%;height:calc(100% - 8px);">Welcome to Retro Notepad</textarea>`;
      createWindow('Notepad', content, 500, 360, 'reference/logos/notepad.svg');
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
      createWindow('Internet', content, 640, 420, 'reference/logos/browser.svg');
    }

    function openRecycle() {
      const content = `<div style="padding:12px"><p>Recycle Bin is empty.</p></div>`;
      createWindow('Recycle Bin', content, 360, 200, 'reference/logos/recycle.svg');
    }

    // Executables: fetch manifest to auto-discover
    function openExecutables() {
      fetch('reference/executables/manifest.json').then(r=>r.json()).then(list=>{
        let listHtml = '<div style="padding:8px"><p><strong>Executables</strong></p><ul>';
        list.forEach(name => { listHtml += `<li><button class="run-exe" data-exe="${name}">${name}</button></li>`; });
        listHtml += '</ul><p>Executables are simple text placeholders; running one will show its output.</p></div>';
        const w = createWindow('Executables', listHtml, 420, 300, 'reference/logos/console.svg');
        w.querySelectorAll('.run-exe').forEach(btn => btn.addEventListener('click', (e)=> {
          const exe = e.currentTarget.dataset.exe;
          runExecutable(exe);
        }));
      }).catch(()=>{
        const sampleExecutables = ['hello_world.exe','cool_app.exe','sysinfo.exe','ping.exe','calc.exe','dirlist.exe','echo.exe','help.exe'];
        let listHtml = '<div style="padding:8px"><p><strong>Executables</strong></p><ul>';
        sampleExecutables.forEach(name => { listHtml += `<li><button class="run-exe" data-exe="${name}">${name}</button></li>`; });
        listHtml += '</ul><p>Executables are simple text placeholders; running one will show its output.</p></div>';
        const w = createWindow('Executables', listHtml, 420, 300, 'reference/logos/console.svg');
        w.querySelectorAll('.run-exe').forEach(btn => btn.addEventListener('click', (e)=> {
          const exe = e.currentTarget.dataset.exe;
          runExecutable(exe);
        }));
      });
    }

    function runExecutable(filename) {
      const runner = createWindow(`Running ${filename}`, `<div class="console" id="console-${Date.now()}"></div>`, 560, 360, 'reference/logos/console.svg');
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
