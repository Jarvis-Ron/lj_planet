const APP = (() => {
  let state = { currentPage: 'home', noteFilter: 'all', annivFilter: 'all', settings: {} };
  let currentModalType = null;
  let currentEditId = null;
  let calendarViewDate = new Date();
  let pendingImages = [];

  async function init() {
    const settings = await Data.getSettings();
      document.getElementById('header-user').textContent = '登录';
    // Check for existing cloud login
    if (typeof API !== 'undefined' && API.isLoggedIn()) {
      const user = API.getUser();
      document.getElementById('header-user').textContent = user.username + ' 在线';
      document.getElementById('header-user').style.color = 'var(--gold)';
    }
    if (settings.name1 && settings.name2) {
      state.settings = settings;
      document.getElementById('onboarding-overlay').classList.add('hidden');
      renderAll();
    } else {
      document.getElementById('onboarding-overlay').classList.remove('hidden');
      document.getElementById('setup-name1').value = 'Lyra';
      document.getElementById('setup-name2').value = 'Jarvis';
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('setup-startdate').value = today;
    }

  async function setupPlanet() {
    const name1 = document.getElementById('setup-name1').value.trim();
    const name2 = document.getElementById('setup-name2').value.trim();
    const startDate = document.getElementById('setup-startdate').value;
    if (!name1 || !name2) { toast('请填上你们的名字哦'); return; }
    if (!startDate) { toast('请选择在一起的日子'); return; }
    await Data.saveSetting('name1', name1);
    await Data.saveSetting('name2', name2);
    await Data.saveSetting('startDate', startDate);
    state.settings = { name1, name2, startDate };
    document.getElementById('onboarding-overlay').classList.add('hidden');
    renderAll();
    toast("欢迎来到 L&J's Planet!");
  }

  function toggleSettings() {
    const panel = document.getElementById('settings-panel');
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
      document.getElementById('settings-name1').value = state.settings.name1 || '';
      document.getElementById('settings-name2').value = state.settings.name2 || '';
      document.getElementById('settings-startdate').value = state.settings.startDate || '';
    }
  }

  async function saveSettings() {
    const name1 = document.getElementById('settings-name1').value.trim();
    const name2 = document.getElementById('settings-name2').value.trim();
    const startDate = document.getElementById('settings-startdate').value;
    if (!name1 || !name2) { toast('请填上你们的名字'); return; }
    if (!startDate) { toast('请选择在一起的日子'); return; }
    await Data.saveSetting('name1', name1);
    await Data.saveSetting('name2', name2);
    await Data.saveSetting('startDate', startDate);
    state.settings = { name1, name2, startDate };
    toggleSettings();
    renderAll();
    toast('设置已保存');
  }

  function navigate(page) {
    state.currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.nav-btn[data-page="' + page + '"]').classList.add('active');
    renderPage(page);
  }

  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.add('hidden'), 2000);
  }

  async function renderAll() {
    const settings = await Data.getSettings();
    state.settings = settings;
    document.getElementById('home-name1').textContent = state.settings.name1 || '?';
    document.getElementById('home-name2').textContent = state.settings.name2 || '?';
    renderPage(state.currentPage);

  async function renderPage(page) {
    switch (page) {
      case 'home': await renderHome(); break;
      case 'calendar': await renderCalendar(); break;
      case 'places': await renderPlaces(); break;
      case 'notes': await renderNotes(state.noteFilter); break;
      case 'story': await renderStory(); break;
      case 'wishes': await renderWishes(); break;
    }
  }

  async function renderHome() {
    const s = state.settings;
    if (!s.startDate) return;
    const start = new Date(s.startDate);
    const now = new Date();
    const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    document.getElementById('home-daycount').textContent = diff;
    document.getElementById('header-days').textContent = 'Day ' + diff;

    const annivs = await Data.getAllAnniversaries();
    const places = await Data.getAllPlaces();
    const notes = await Data.getAllNotes();
    const storyNodes = await Data.getAllStoryNodes();
    const wishes = await Data.getAllWishes();

    document.getElementById('home-stat-anniv').textContent = annivs.length + ' 个';
    document.getElementById('home-stat-places').textContent = places.length + ' 个';
    document.getElementById('home-stat-notes').textContent = notes.length + ' 条';
    document.getElementById('home-stat-story').textContent = storyNodes.length + ' 章';
    const done = wishes.filter(w => w.completed).length;
    document.getElementById('home-wish-progress').textContent = wishes.length > 0 ? done + '/' + wishes.length : '0/0';

    const nextAnniv = findNextAnniversary(annivs, s.startDate);
    if (nextAnniv) {
      document.getElementById('home-countdown').textContent = nextAnniv.days + ' 天后';
      document.getElementById('home-next-name').textContent = nextAnniv.title;
      document.getElementById('home-next-anniv').style.display = 'block';
    } else {
      document.getElementById('home-next-anniv').style.display = 'none';
    }

    if (notes.length > 0) {
      const randomNote = notes[Math.floor(Math.random() * notes.length)];
      document.getElementById('home-random-content').textContent = randomNote.content;
      document.getElementById('home-random-note').style.display = 'block';
    } else {
      document.getElementById('home-random-note').style.display = 'none';
    }
  }

  function findNextAnniversary(annivs, startDate) {
    const now = new Date();
    let closest = null;
    for (const a of annivs) {
      const d = new Date(a.date);
      const thisYear = new Date(now.getFullYear(), d.getMonth(), d.getDate());
      if (thisYear < now) thisYear.setFullYear(now.getFullYear() + 1);
      const days = Math.ceil((thisYear - now) / (1000 * 60 * 60 * 24));
      if (!closest || days < closest.days) { closest = { ...a, days: days }; }
    }
    const start = new Date(startDate);
    let startThisYear = new Date(now.getFullYear(), start.getMonth(), start.getDate());
    if (startThisYear < now) startThisYear.setFullYear(now.getFullYear() + 1);
    const startDays = Math.ceil((startThisYear - now) / (1000 * 60 * 60 * 24));
    if (!closest || startDays < closest.days) {
      closest = { title: '在一起纪念日', date: startThisYear.toISOString(), days: startDays };
    }
    return closest;
  }

  function calendarMonth(delta) {
    calendarViewDate.setMonth(calendarViewDate.getMonth() + delta);
    renderCalendar();
  }

  async function renderCalendar() {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    document.getElementById('calendar-label').textContent = year + '年 ' + (month + 1) + '月';
    const annivs = await Data.getAllAnniversaries();
    const eventsByDate = {};
    for (const a of annivs) {
      const d = new Date(a.date);
      const key = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
      if (!eventsByDate[key]) eventsByDate[key] = [];
      eventsByDate[key].push(a);
    }
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const now = new Date();
    let html = '';
    for (let i = firstDay - 1; i >= 0; i--) {
      html += '<div class="calendar-day other-month">' + (prevMonthDays - i) + '</div>';
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const key = year + '-' + (month + 1) + '-' + d;
      const events = eventsByDate[key] || [];
      const isToday = year === now.getFullYear() && month === now.getMonth() && d === now.getDate();
      let cls = 'calendar-day';
      if (isToday) cls += ' today';
      if (events.length > 0) cls += ' has-event';
      let dayHtml = '<div class="' + cls + '" onclick="APP.showDayEvents(\'' + key + '\')">';
      dayHtml += '<span class="day-num">' + d + '</span>';
      if (events.length > 0) {
        dayHtml += '<div class="day-events">';
        for (const ev of events.slice(0, 2)) {
          dayHtml += '<span class="day-event-label">' + escHtml(ev.title) + '</span>';
        }
        if (events.length > 2) dayHtml += '<span class="day-event-label more">+' + (events.length - 2) + '</span>';
        dayHtml += '</div>';
      }
      dayHtml += '</div>';
      html += dayHtml;
    }
    const totalCells = firstDay + daysInMonth;
    const remaining = (7 - totalCells % 7) % 7;
    for (let d = 1; d <= remaining; d++) {
      html += '<div class="calendar-day other-month">' + d + '</div>';
    }
    document.getElementById('calendar-grid').innerHTML = html;

    // Tag filter
    let tags = [...new Set(annivs.filter(a => a.tags).map(a => a.tags))];
    let filterHtml = '<div class="anniv-filter">';
    filterHtml += '<button class="filter-btn ' + (state.annivFilter === 'all' ? 'active' : '') + '" onclick="APP.filterAnniv(\'all\')">全部</button>';
    for (const t of tags) {
      filterHtml += '<button class="filter-btn ' + (state.annivFilter === t ? 'active' : '') + '" onclick="APP.filterAnniv(\'' + escHtml(t) + '\')">' + escHtml(t) + '</button>';
    }
    filterHtml += '</div>';
    document.getElementById('anniv-filter-area').innerHTML = filterHtml;

    const filtered = state.annivFilter === 'all' ? annivs : annivs.filter(a => a.tags === state.annivFilter);
    let listHtml = '';
    for (const a of filtered) {
      const d = new Date(a.date);
      listHtml += '<div class="anniv-card" onclick="APP.showAnnivDetail(' + a.id + ')"><div class="anniv-card-main">';
      if (a.images && a.images.length) {
        listHtml += '<div class="anniv-card-thumb"><img src="' + a.images[0] + '"></div>';
      }
      listHtml += '<div class="anniv-card-info"><div class="anniv-card-title">' + escHtml(a.title) + '</div>';
      listHtml += '<div class="anniv-card-date">' + d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日</div>';
      if (a.tags) listHtml += '<span class="anniv-card-tag">' + escHtml(a.tags) + '</span>';
      listHtml += '</div></div>';
      listHtml += '<div class="anniv-card-actions">';
      listHtml += '<button onclick="event.stopPropagation();APP.editAnniv(' + a.id + ')" title="编辑">&#9998;</button>';
      listHtml += '<button onclick="event.stopPropagation();APP.deleteAnniv(' + a.id + ')" title="删除">&#128465;</button>';
      listHtml += '</div></div>';
    }
    document.getElementById('anniv-items').innerHTML = listHtml || '<p style="color:var(--text-muted);text-align:center;padding:20px">还没有纪念日</p>';
  }

  function filterAnniv(tag) {
    state.annivFilter = tag;
    renderCalendar();
  }

  function showDayEvents(key) {
    Data.getAllAnniversaries().then(annivs => {
      const events = annivs.filter(a => {
        const d = new Date(a.date);
        return (d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()) === key;
      });
      if (events.length === 0) return;
      let html = '';
      for (const e of events) {
        html += '<div style="margin-bottom:12px;border-bottom:1px solid var(--rose-light);padding-bottom:8px">';
        html += '<strong>' + escHtml(e.title) + '</strong>';
        if (e.tags) html += ' <span class="anniv-card-tag">' + escHtml(e.tags) + '</span>';
        if (e.text) html += '<br><small>' + escHtml(e.text) + '</small>';
        if (e.images && e.images.length) {
          html += '<br><img src="' + e.images[0] + '" style="max-width:100%;border-radius:6px;margin-top:4px;max-height:200px">';
        }
        html += '</div>';
      }
      showCustomModal('这一天', html);
    });
  }

  function showAnnivDetail(id) {
    Data.getAllAnniversaries().then(annivs => {
      const a = annivs.find(x => x.id === id);
      if (!a) return;
      let html = '<p><strong>' + escHtml(a.title) + '</strong></p>';
      html += '<p style="font-size:13px;color:var(--text-secondary)">' + a.date + '</p>';
      if (a.text) html += '<p style="margin-top:8px">' + escHtml(a.text) + '</p>';
      if (a.tags) html += '<p style="margin-top:4px"><span class="anniv-card-tag">' + escHtml(a.tags) + '</span></p>';
      if (a.images && a.images.length) {
        for (const img of a.images) html += '<img src="' + img + '" style="max-width:100%;border-radius:8px;margin-top:8px">';
      }
      showCustomModal('纪念日详情', html);
    });
  }

  function showModal(type, editId) {
    pendingImages = [];
    currentModalType = type;
    currentEditId = editId || null;
    const overlay = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    const labels = { anniversary: '纪念日', place: '足迹', note: '随笔', story: '故事节点', wish: '愿望' };
    title.textContent = (editId ? '编辑' : '添加') + labels[type];
    body.innerHTML = buildForm(type, editId);
    overlay.classList.remove('hidden');
    if (editId) loadEditData(type, editId);
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    currentModalType = null;
    currentEditId = null;
    pendingImages = [];
    const preview = document.getElementById('form-images-preview');
    if (preview) preview.innerHTML = '';
  }

  function showCustomModal(title, content) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = content;
    document.getElementById('modal-overlay').classList.remove('hidden');
  }

  function buildForm(type, editId) {
    let html = '';
    switch (type) {
      case 'anniversary':
        html = '<div class="form-group"><label>标题</label><input type="text" id="form-title" placeholder="给它取个名字" maxlength="100"></div>';
        html += '<div class="form-group"><label>日期</label><input type="date" id="form-date"></div>';
        html += '<div class="form-group"><label>标签（可选）</label><input type="text" id="form-tags" placeholder="如：周年、第一次" maxlength="30"></div>';
        html += '<div class="form-group"><label>文字记录</label><textarea id="form-text" rows="3" placeholder="写下这一天的心情..."></textarea></div>';
        html += '<div class="form-group"><label>图片</label><div class="image-upload-btn" onclick="document.getElementById(\'form-images-input\').click()">+ 添加图片</div><input type="file" id="form-images-input" accept="image/*" multiple style="display:none" onchange="APP.previewImages(event)"><div class="image-preview-container" id="form-images-preview"></div></div>';
        html += '<div class="sync-group"><label><input type="checkbox" id="form-sync-place"> 同步添加到足迹</label></div>';
        html += '<button class="btn-primary" onclick="APP.saveForm()">保存</button>';
        break;
      case 'place':
        html = '<div class="form-group"><label>地点名称</label><input type="text" id="form-name" placeholder="比如：故宫" maxlength="100"></div>';
        html += '<div class="form-group"><label>去的日期</label><input type="date" id="form-date"></div>';
        html += '<div class="form-group"><label>回忆</label><textarea id="form-text" rows="3" placeholder="在这里发生了什么..."></textarea></div>';
        html += '<div class="form-group"><label>图片</label><div class="image-upload-btn" onclick="document.getElementById(\'form-images-input\').click()">+ 添加图片</div><input type="file" id="form-images-input" accept="image/*" multiple style="display:none" onchange="APP.previewImages(event)"><div class="image-preview-container" id="form-images-preview"></div></div>';
        html += '<div class="sync-group"><label><input type="checkbox" id="form-sync-anniv"> 同步添加到纪念日</label></div>';
        html += '<button class="btn-primary" onclick="APP.saveForm()">保存</button>';
        break;
      case 'note':
        html = '<div class="form-group"><label>分类</label><select id="form-category" onchange="APP.toggleCustomCategory()">';
        html += '<option value="日常">日常</option><option value="感动">感动</option><option value="玩笑">玩笑</option><option value="惊喜">惊喜</option><option value="__other__">其他</option></select></div>';
        html += '<div class="form-group" id="form-custom-cat-group" style="display:none"><label>自定义分类</label><input type="text" id="form-custom-category" placeholder="输入分类名称" maxlength="20"></div>';
        html += '<div class="form-group"><label>内容</label><textarea id="form-text" rows="4" placeholder="随便写点什么..."></textarea></div>';
        html += '<div class="form-group"><label>图片（可选）</label><div class="image-upload-btn" onclick="document.getElementById(\'form-images-input\').click()">+ 添加图片</div><input type="file" id="form-images-input" accept="image/*" style="display:none" onchange="APP.previewImages(event)"><div class="image-preview-container" id="form-images-preview"></div></div>';
        html += '<button class="btn-primary" onclick="APP.saveForm()">保存</button>';
        break;
      case 'story':
        html = '<div class="form-group"><label>标题</label><input type="text" id="form-title" placeholder="如：第一次约会" maxlength="100"></div>';
        html += '<div class="form-group"><label>日期</label><input type="date" id="form-date"></div>';
        html += '<div class="form-group"><label>类型</label><select id="form-type"><option value="milestone">里程碑</option><option value="memory">回忆</option><option value="event">事件</option><option value="__other__">其他</option></select></div>';
        html += '<div class="form-group" id="form-custom-type-group" style="display:none"><label>自定义类型</label><input type="text" id="form-custom-type" placeholder="输入类型名称" maxlength="20"></div>';
        html += '<div class="form-group"><label>故事内容</label><textarea id="form-text" rows="4" placeholder="写下这个故事..."></textarea></div>';
        html += '<div class="form-group"><label>图片</label><div class="image-upload-btn" onclick="document.getElementById(\'form-images-input\').click()">+ 添加图片</div><input type="file" id="form-images-input" accept="image/*" style="display:none" onchange="APP.previewImages(event)"><div class="image-preview-container" id="form-images-preview"></div></div>';
        html += '<button class="btn-primary" onclick="APP.saveForm()">保存</button>';
        break;
      case 'wish':
        html = '<div class="form-group"><label>愿望</label><input type="text" id="form-title" placeholder="想和你一起做的事" maxlength="200"></div>';
        html += '<div class="form-group"><label>分类</label><select id="form-category" onchange="APP.toggleCustomWishCat()">';
        html += '<option value="近期">近期</option><option value="梦想">梦想</option><option value="美食">美食</option><option value="旅行">旅行</option><option value="日常">日常</option><option value="__other__">其他</option></select></div>';
        html += '<div class="form-group" id="form-wish-custom-group" style="display:none"><label>自定义分类</label><input type="text" id="form-wish-custom-cat" placeholder="输入分类名称" maxlength="20"></div>';
        html += '<button class="btn-primary" onclick="APP.saveForm()">保存</button>';
        break;
    }
    return html;
  }

  function toggleCustomCategory() {
    document.getElementById('form-custom-cat-group').style.display =
      document.getElementById('form-category').value === '__other__' ? 'block' : 'none';
  }
  function toggleCustomWishCat() {
    document.getElementById('form-wish-custom-group').style.display =
      document.getElementById('form-category').value === '__other__' ? 'block' : 'none';
  }  async function loadEditData(type, id) {
    let items;
    switch (type) {
      case 'anniversary': items = await Data.getAllAnniversaries(); break;
      case 'place': items = await Data.getAllPlaces(); break;
      case 'note': items = await Data.getAllNotes(); break;
      case 'story': items = await Data.getAllStoryNodes(); break;
      case 'wish': items = await Data.getAllWishes(); break;
      default: return;
    }
    const item = items.find(x => x.id === id);
    if (!item) return;
    const titleEl = document.getElementById('form-title');
    const dateEl = document.getElementById('form-date');
    const textEl = document.getElementById('form-text');
    if (titleEl) titleEl.value = item.title || '';
    if (dateEl) dateEl.value = item.date || '';
    if (textEl) textEl.value = item.text || item.content || '';
    const tagsEl = document.getElementById('form-tags');
    if (tagsEl) tagsEl.value = item.tags || '';
    const catEl = document.getElementById('form-category');
    if (catEl) {
      const preset = ['日常','感动','玩笑','惊喜','近期','梦想','美食','旅行'];
      if (preset.includes(item.category)) { catEl.value = item.category; }
      else if (item.category) {
        catEl.value = '__other__';
        const cust = document.getElementById('form-custom-category') || document.getElementById('form-wish-custom-cat');
        if (cust) { cust.value = item.category; cust.parentElement.style.display = 'block'; }
      }
    }
    const typeEl = document.getElementById('form-type');
    if (typeEl) {
      if (['milestone','memory','event'].includes(item.type)) { typeEl.value = item.type; }
      else if (item.type) {
        typeEl.value = '__other__';
        const cust = document.getElementById('form-custom-type');
        if (cust) { cust.value = item.type; cust.parentElement.style.display = 'block'; }
      }
    }
    const nameEl = document.getElementById('form-name');
    if (nameEl) nameEl.value = item.name || '';
  }

  function previewImages(event) {
    const files = event.target.files;
    const container = document.getElementById('form-images-preview');
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (e) => {
        pendingImages.push(e.target.result);
        const img = document.createElement('img');
        img.src = e.target.result;
        container.appendChild(img);
      };
      reader.readAsDataURL(file);
    }
  }

  async function saveForm() {
    const type = currentModalType;
    const editId = currentEditId;
    const images = [...pendingImages];
    pendingImages = [];
    let data = {};
    switch (type) {
      case 'anniversary': {
        const title = document.getElementById('form-title').value.trim();
        const date = document.getElementById('form-date').value;
        const text = document.getElementById('form-text').value.trim();
        const tags = document.getElementById('form-tags').value.trim();
        const syncPlace = document.getElementById('form-sync-place').checked;
        if (!title) { toast('请填标题'); return; } if (!date) { toast('请选日期'); return; }
        data = { title, date, text, tags, images };
        if (editId) { await Data.updateAnniversary(editId, data); toast('已更新'); }
        else { await Data.addAnniversary(data); toast('纪念日已添加'); }
        if (syncPlace && !editId) {
          try {
          await Data.addPlace({ name: title + '（纪念日）', date, text, images });
            toast(title + ' 已同步到足迹');
          } catch(e) { toast('同步到足迹失败'); }
        }
        break;
      }
      case 'place': {
        const name = document.getElementById('form-name').value.trim();
        const date = document.getElementById('form-date').value;
        const text = document.getElementById('form-text').value.trim();
        const syncAnniv = document.getElementById('form-sync-anniv').checked;
        if (!name) { toast('请填地点名称'); return; }
        data = { name, date, text, images };
        if (editId) { await Data.updatePlace(editId, data); toast('已更新'); }
        else { await Data.addPlace(data); toast('足迹已添加'); }
        if (syncAnniv && !editId) {
          try {
          await Data.addAnniversary({ title: name, date, text, tags: '足迹', images });
            toast(name + ' 已同步到纪念日');
          } catch(e) { toast('同步到纪念日失败'); }
        }
        break;
      }
      case 'note': {
        let category = document.getElementById('form-category').value;
        if (category === '__other__') category = document.getElementById('form-custom-category').value.trim() || '其他';
        const text = document.getElementById('form-text').value.trim();
        if (!text) { toast('写点什么吧'); return; }
        data = { content: text, category, images };
        if (editId) { data.id = editId; await Data.updateNote(editId, data); toast('已更新'); }
        else { await Data.addNote(data); toast('随笔已记录'); }
        break;
      }
      case 'story': {
        let stype = document.getElementById('form-type').value;
        if (stype === '__other__') stype = document.getElementById('form-custom-type').value.trim() || '其他';
        const title = document.getElementById('form-title').value.trim();
        const date = document.getElementById('form-date').value;
        const text = document.getElementById('form-text').value.trim();
        if (!title) { toast('请填标题'); return; }
        data = { title, date, text, type: stype, images };
        if (editId) { await Data.updateStoryNode(editId, data); toast('已更新'); }
        else { await Data.addStoryNode(data); toast('故事节点已添加'); }
        break;
      }
      case 'wish': {
        let category = document.getElementById('form-category').value;
        if (category === '__other__') category = document.getElementById('form-wish-custom-cat').value.trim() || '其他';
        const title = document.getElementById('form-title').value.trim();
        if (!title) { toast('写个愿望吧'); return; }
        data = { title, category };
        if (editId) { await Data.updateWish(editId, data); toast('已更新'); }
        else { await Data.addWish(data); toast('愿望已添加'); }
        break;
      }
    }
    closeModal();
    renderAll();
  }

  async function editAnniv(id) { showModal('anniversary', id); }
  async function deleteAnniv(id) { if (confirm('确定删除这个纪念日吗？')) { await Data.deleteAnniversary(id); renderAll(); toast('已删除'); } }

  async function renderPlaces() {
    const places = await Data.getAllPlaces();
    const grid = document.getElementById('places-grid');
    if (places.length === 0) {
      grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px 20px;grid-column:1/-1">还没有足迹，一起去了哪里呢？</p>';
      return;
    }
    let html = '';
    for (const p of places) {
      const hasImg = p.images && p.images.length > 0;
      html += '<div class="place-card">';
      html += '<div class="place-card-image">' + (hasImg ? '<img src="' + p.images[0] + '" alt="">' : '&#127759;') + '</div>';
      html += '<div class="place-card-body">';
      html += '<div class="place-card-name">' + escHtml(p.name) + '</div>';
      html += '<div class="place-card-date">' + (p.date || '') + '</div>';
      if (p.text) html += '<div class="place-card-text">' + escHtml(p.text) + '</div>';
      html += '<div class="timeline-node-actions" style="margin-top:8px">';
      html += '<button onclick="APP.editPlace(' + p.id + ')">&#9998; 编辑</button>';
      html += '<button onclick="APP.deletePlace(' + p.id + ')">&#128465; 删除</button>';
      html += '</div></div></div>';
    }
    grid.innerHTML = html;
  }

  async function editPlace(id) { showModal('place', id); }
  async function deletePlace(id) { if (confirm('确定删除这个足迹吗？')) { await Data.deletePlace(id); renderAll(); toast('已删除'); } }

  function filterNotes(cat) {
    state.noteFilter = cat;
    document.querySelectorAll('.notes-filter .filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === cat));
    renderNotes(cat);
  }

  async function renderNotes(cat) {
    const notes = await Data.getAllNotes();
    const filtered = cat === 'all' ? notes : notes.filter(n => n.category === cat);
    const wall = document.getElementById('notes-wall');
    if (filtered.length === 0) { wall.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px 20px">还没有随笔哦</p>'; return; }
    let html = '';
    for (const n of filtered) {
      const d = new Date(n.createdAt);
      const ds = d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
      html += '<div class="note-card"><div style="display:flex;justify-content:space-between;align-items:flex-start">';
      html += '<div class="note-card-category">' + escHtml(n.category || '日常') + '</div>';
      html += '<div><button class="note-card-delete" onclick="APP.editNote(' + n.id + ')" title="编辑">&#9998;</button>';
      html += '<button class="note-card-delete" onclick="APP.deleteNoteConfirm(' + n.id + ')" title="删除">&#128465;</button></div></div>';
      html += '<div class="note-card-content">' + escHtml(n.content) + '</div>';
      if (n.images && n.images.length) html += '<img class="note-card-image" src="' + n.images[0] + '">';
      html += '<div class="note-card-date">' + ds + '</div></div>';
    }
    wall.innerHTML = html;
  }

  async function editNote(id) { showModal('note', id); }
  async function deleteNoteConfirm(id) {
    if (confirm('确定删除这条随笔吗？')) { await Data.deleteNote(id); renderNotes(state.noteFilter); toast('已删除'); }
  }

  async function renderStory() {
    const nodes = await Data.getAllStoryNodes();
    const c = document.getElementById('timeline');
    if (nodes.length === 0) { c.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px 20px">你们的故事还没开始记录呢</p>'; return; }
    let html = '';
    for (const n of nodes) {
      const typeLabel = n.type && !['milestone','memory','event'].includes(n.type) ? n.type : ({ milestone:'里程碑', memory:'回忆', event:'事件' })[n.type] || n.type || '';
      html += '<div class="timeline-node"><div class="timeline-node-content">';
      html += '<div class="timeline-node-title">' + escHtml(n.title) + '</div>';
      html += '<div class="timeline-node-date">' + (n.date || '') + (typeLabel ? ' &middot; ' + escHtml(typeLabel) : '') + '</div>';
      if (n.text) html += '<div class="timeline-node-text">' + escHtml(n.text) + '</div>';
      if (n.images && n.images.length) html += '<img class="timeline-node-image" src="' + n.images[0] + '">';
      html += '<div class="timeline-node-actions">';
      html += '<button onclick="APP.editStoryNode(' + n.id + ')">&#9998; 编辑</button>';
      html += '<button onclick="APP.deleteStoryNode(' + n.id + ')">&#128465; 删除</button>';
      html += '</div></div></div>';
    }
    c.innerHTML = html;
  }

  async function editStoryNode(id) { showModal('story', id); }
  async function deleteStoryNode(id) { if (confirm('确定删除吗？')) { await Data.deleteStoryNode(id); renderStory(); toast('已删除'); } }

  async function renderWishes() {
    const wishes = await Data.getAllWishes();
    const list = document.getElementById('wishes-list');
    const done = wishes.filter(w => w.completed).length;
    const total = wishes.length;
    const pct = total > 0 ? Math.round(done / total * 100) : 0;
    document.getElementById('wish-progress-fill').style.width = pct + '%';
    document.getElementById('wish-progress-text').textContent = pct + '% 已完成 (' + done + '/' + total + ')';
    if (total === 0) { list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px 20px">还没有愿望，一起许个愿吧</p>'; return; }
    let html = '';
    for (const w of wishes) {
      html += '<div class="wish-item ' + (w.completed ? 'completed' : '') + '">';
      html += '<div class="wish-checkbox ' + (w.completed ? 'checked' : '') + '" onclick="APP.toggleWish(' + w.id + ', ' + (!w.completed) + ')"></div>';
      html += '<div class="wish-info"><div class="wish-title">' + escHtml(w.title) + '</div>';
      html += '<div class="wish-category">' + escHtml(w.category || '') + (w.completedDate ? ' &middot; ' + new Date(w.completedDate).toLocaleDateString() : '') + '</div></div>';
      html += '<button class="wish-delete" onclick="APP.editWish(' + w.id + ')" title="编辑">&#9998;</button>';
      html += '<button class="wish-delete" onclick="APP.deleteWishConfirm(' + w.id + ')" title="删除">&#128465;</button></div>';
    }
    list.innerHTML = html;
  }

  async function toggleWish(id, completed) {
    const date = completed ? new Date().toISOString() : null;
    await Data.toggleWish(id, completed, date);
    renderWishes(); renderAll();
  }

  async function editWish(id) { showModal('wish', id); }
  async function deleteWishConfirm(id) { if (confirm('确定删除这个愿望吗？')) { await Data.deleteWish(id); renderWishes(); toast('已删除'); } }

  async function exportData() {
    const data = await Data.exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'LJPlanet-backup-' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    toast('数据已导出');
  }

  async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    try { const text = await file.text(); const data = JSON.parse(text); await Data.importAllData(data); toast('数据已导入'); renderAll(); }
    catch (e) { toast('导入失败，请检查文件格式'); }
  }

  function escHtml(s) { if (!s) return ''; return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  // === Auth ===
  async function login(user, pwd) {
    try {
      const u = await API.login(user, pwd);
      toast('欢迎回来，' + u.display_name);
      renderAll();
      return u;
    } catch(e) { toast(e.message); throw e; }
  }
  function logout() { API.logout(); renderAll(); toast('已退出'); }
  function currentUser() { return API.getUser(); }
  function isLoggedIn() { return API.isLoggedIn(); }
  function isLoggedIn() { return API.isLoggedIn(); }
  let loginSelectedUser = null;
  function selectUser(user) {
    loginSelectedUser = user;
    document.getElementById('login-pwd-group').style.display = 'block';
    document.getElementById('login-btn').style.display = 'block';
    document.getElementById('login-pwd').focus();
  }
  async function doLogin() {
    const pwd = document.getElementById('login-pwd').value;
    if (!pwd) { toast('请输入密码'); return; }
    try {
      await login(loginSelectedUser, pwd);
      document.getElementById('login-overlay').classList.add('hidden');
      document.getElementById('header-user').textContent = loginSelectedUser + ' 在线';
      document.getElementById('header-user').style.color = 'var(--gold)';
      document.getElementById('login-pwd').value = '';
      const cloudSettings = await Data.getSettings();
      state.settings = cloudSettings;
      renderAll();
    } catch(e) { toast('登录失败: ' + e.message); }
  }
  function closeLogin() {
    document.getElementById('login-overlay').classList.add('hidden');
    document.getElementById('login-pwd').value = '';
    document.getElementById('login-pwd-group').style.display = 'none';
    document.getElementById('login-btn').style.display = 'none';
    loginSelectedUser = null;
  }
  function toggleLogin() {
    if (API.isLoggedIn()) {
      if (confirm('退出登录？')) { logout(); document.getElementById('header-user').textContent = '离线模式'; document.getElementById('header-user').style.color = 'var(--text-muted)'; }
    } else {
      document.getElementById('login-overlay').classList.remove('hidden');
    }
  }
  return {
    init, navigate, setupPlanet, login, logout, currentUser, isLoggedIn, selectUser, doLogin, closeLogin, toggleLogin, toggleSettings, saveSettings,
    calendarMonth, showModal, closeModal, showCustomModal, previewImages, saveForm,
    showDayEvents, showAnnivDetail, editAnniv, deleteAnniv, filterAnniv,
    editPlace, deletePlace, filterNotes, editNote, deleteNoteConfirm,
    editStoryNode, deleteStoryNode, toggleWish, editWish, deleteWishConfirm,
    toggleCustomCategory, toggleCustomWishCat, exportData, importData
  };
})();
document.addEventListener('DOMContentLoaded', function() { APP.init(); });
