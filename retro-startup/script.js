// Full script: loads apps.json, populates Start menu & desktop, and implements app windows including a preset-site browser
(function(){
  document.addEventListener('DOMContentLoaded', () => {
    // existing elements
    const startMenu = document.getElementById('start-menu');
    const desktopIconsContainer = document.querySelector('.desktop-icons');

    // load apps manifest and populate UI
    function loadAppsManifest(){
      fetch('apps.json').then(r => r.json()).then(apps => {
        populateStartMenu(apps);
        populateDesktopIcons(apps);
        // store apps for later lookup
        window.__retro_apps = apps.reduce((acc,a)=>{acc[a.id]=a;return acc},{})
      }).catch(err => {
        console.error('Failed to load apps.json', err);
      });
    }

    function populateStartMenu(apps){
      const ul = startMenu.querySelector('ul');
      ul.innerHTML = apps.map(a=>`<li data-app="${a.id}"><img src="${a.icon}" alt=""> ${a.title}</li>`).join('');
    }

    function populateDesktopIcons(apps){
      // remove existing except those added statically earlier
      const existing = Array.from(desktopIconsContainer.querySelectorAll('.desktop-icon'));
      existing.forEach(e=> e.remove());
      apps.filter(a=>a.desktop).forEach(a=>{
        const div = document.createElement('div');
        div.className = 'desktop-icon';
        div.dataset.app = a.id;
        div.title = a.title;
        div.innerHTML = `<img src="${a.icon}" alt="${a.title}"><div>${a.title}</div>`;
        desktopIconsContainer.appendChild(div);
        div.addEventListener('click', ()=>{ document.querySelectorAll('.desktop-icon.selected').forEach(s=>s.classList.remove('selected')); div.classList.add('selected'); });
        div.addEventListener('dblclick', ()=> openApp(a.id));
      });
    }

    // openApp dispatches based on app type
    function openApp(id){
      const app = (window.__retro_apps || {})[id];
      if (!app) return alert('App not found: ' + id);
      const type = app.type || 'app';
      if (type === 'browser') return openBrowserApp(app);
      if (type === 'terminal') return openTerminalApp(app);
      if (type === 'app') return openGenericApp(app);
      // fallback
      return openGenericApp(app);
    }

    // generic placeholder windows for many apps
    function openGenericApp(app){
      const content = `<div style="padding:12px"><h3>${app.title}</h3><p>This is a placeholder for the ${app.title} application.</p></div>`;
      createWindow(app.title, content, 560, 360, app.icon);
    }

    // terminal app (simple interactive REPL for a few commands)
    function openTerminalApp(app){
      const content = `
        <div style="display:flex;flex-direction:column;height:100%">
          <div class="console" id="term-console-${Date.now()}">Welcome to Retro Terminal\nType 'help' for commands.\n</div>
          <div style="padding:6px;background:#eee;border-top:1px solid #ccc;display:flex;gap:8px;align-items:center;">
            <input id="term-input-${Date.now()}" style="flex:1;padding:6px;font-family:monospace" placeholder="type command and press Enter">
            <button class="btn-run">Run</button>
          </div>
        </div>
      `;
      const win = createWindow(app.title, content, 640, 420, app.icon);
      const consoleEl = win.querySelector('.console');
      const input = win.querySelector('input');
      const btn = win.querySelector('.btn-run');

      function printLine(t){ consoleEl.textContent += t + '\n'; consoleEl.scrollTop = consoleEl.scrollHeight; }
      function handleCmd(cmd){
        const parts = cmd.trim().split(' ');
        const c = parts[0].toLowerCase();
        const arg = parts.slice(1).join(' ');
        if (!c) return;
        if (c === 'help') { printLine('Commands: help, echo, calc, ping, sysinfo'); return; }
        if (c === 'echo') { printLine(arg); return; }
        if (c === 'calc') { try{ const res = eval(arg); printLine(arg + ' = ' + res); }catch(e){ printLine('calc error'); } return; }
        if (c === 'ping') { printLine('Pinging ' + (arg||'127.0.0.1') + '...\nReply from 127.0.0.1: bytes=32 time<1ms TTL=64'); return; }
        if (c === 'sysinfo') { printLine('CPU: Intel i486 Compatible'); printLine('Memory: 65536K'); return; }
        printLine('Unknown command: ' + c);
      }

      btn.addEventListener('click', ()=>{ handleCmd(input.value); input.value=''; input.focus(); });
      input.addEventListener('keydown', (e)=>{ if (e.key === 'Enter'){ handleCmd(input.value); input.value=''; } });
    }

    // Browser app that loads preset local sites from 'preset-sites/'
    function openBrowserApp(app){
      const sites = app.sites || [];
      const content = `
        <div style="display:flex;flex-direction:column;height:100%">
          <div style="padding:6px;background:#eee;border-bottom:1px solid #ccc;display:flex;gap:8px;align-items:center;">
            <select id="browser-site-select">${sites.map(s=>`<option value="${s.path}">${s.title}</option>`).join('')}</select>
            <button id="browser-go">Go</button>
          </div>
          <div id="browser-content" style="flex:1;overflow:auto;padding:12px;background:#fff"></div>
        </div>
      `;
      const win = createWindow(app.title, content, 820, 560, app.icon);
      const select = win.querySelector('#browser-site-select');
      const go = win.querySelector('#browser-go');
      const display = win.querySelector('#browser-content');

      function loadSite(path){
        fetch(path).then(r=>r.text()).then(html=>{ display.innerHTML = html; }).catch(err=>{ display.innerHTML = '<p>Error loading site</p>'; });
      }
      go.addEventListener('click', ()=> loadSite(select.value));
      // load first
      if (sites.length) loadSite(sites[0].path);
    }

    // Reuse createWindow & taskbar logic from main script (assume functions exist globally)
    // If not, create a minimal implementation that matches repo's createWindow
    if (typeof createWindow === 'undefined'){
      // minimal createWindow implementation (copied from main script behavior)
      window.createWindow = function(title, innerHtml, width=480, height=320, iconPath='reference/logos/my_computer.svg'){
        const windowsRoot = document.getElementById('windows');
        const taskbarWindows = document.getElementById('taskbar-windows');
        const id = 'auto-' + Date.now() + '-' + Math.floor(Math.random()*1000);
        const win = document.createElement('div');
        win.className = 'os-window';
        win.dataset.winId = id;
        win.style.width = width + 'px';
        win.style.height = height + 'px';
        win.style.left = (60 + Math.floor(Math.random()*40)) + 'px';
        win.style.top = (60 + Math.floor(Math.random()*40)) + 'px';
        win.style.zIndex = 9999;
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
        const tb = document.createElement('button');
        tb.className = 'taskbar-btn';
        tb.dataset.winId = id;
        tb.innerHTML = `<img src="${iconPath}" class="tb-icon"><span class="label">${title}</span>`;
        taskbarWindows.appendChild(tb);

        win.querySelector('.btn.close').addEventListener('click', ()=>{ win.remove(); tb.remove(); });
        win.querySelector('.btn.min').addEventListener('click', ()=>{ win.style.display='none'; tb.classList.add('minimized'); });
        win.querySelector('.btn.max').addEventListener('click', ()=>{
          if (win.dataset.max === '1'){ win.style.width='480px'; win.style.height='320px'; win.dataset.max='0'; } else { win.style.width='100%'; win.style.height='calc(100% - 40px)'; win.dataset.max='1'; }
        });
        tb.addEventListener('click', ()=>{ if (win.style.display === 'none'){ win.style.display='flex'; tb.classList.remove('minimized'); } else { win.style.display='none'; tb.classList.add('minimized'); } });
        return win;
      };
    }

    // initial load
    loadAppsManifest();

  });
})();
