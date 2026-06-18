/**
 * L&J's Planet - IndexedDB 数据层
 * 管理所有本地存储的纪念日、足迹、随笔、故事、愿望清单等数据
 */
const DB = (() => {
  const DB_NAME = 'LJPlanet';
  const DB_VERSION = 1;

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('anniversaries')) {
          const store = db.createObjectStore('anniversaries', { keyPath: 'id', autoIncrement: true });
          store.createIndex('date', 'date', { unique: false });
        }
        if (!db.objectStoreNames.contains('places')) {
          const store = db.createObjectStore('places', { keyPath: 'id', autoIncrement: true });
          store.createIndex('date', 'date', { unique: false });
        }
        if (!db.objectStoreNames.contains('notes')) {
          const store = db.createObjectStore('notes', { keyPath: 'id', autoIncrement: true });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
        if (!db.objectStoreNames.contains('story')) {
          const store = db.createObjectStore('story', { keyPath: 'id', autoIncrement: true });
          store.createIndex('date', 'date', { unique: false });
        }
        if (!db.objectStoreNames.contains('wishes')) {
          const store = db.createObjectStore('wishes', { keyPath: 'id', autoIncrement: true });
          store.createIndex('completed', 'completed', { unique: false });
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  function getStore(db, storeName, mode) {
    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  // === Settings ===
  async function getSettings() {
    const db = await openDB();
    const store = getStore(db, 'settings', 'readonly');
    return new Promise((resolve) => {
      const data = {};
      const cursor = store.openCursor();
      cursor.onsuccess = (e) => {
        const cur = e.target.result;
        if (cur) { data[cur.key] = cur.value; cur.continue(); } else resolve(data);
      };
      cursor.onerror = () => resolve(data);
    });
  }

  async function saveSetting(key, value) {
    const db = await openDB();
    const store = getStore(db, 'settings', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put({ key, value });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // === Anniversaries ===
  async function getAllAnniversaries() {
    const db = await openDB(); const store = getStore(db, 'anniversaries', 'readonly');
    return new Promise((resolve) => { const r = []; const c = store.openCursor(); c.onsuccess = (e) => { const cur = e.target.result; if (cur) { r.push(cur.value); cur.continue(); } else resolve(r); }; });
  }
  async function addAnniversary(data) {
    const db = await openDB(); const store = getStore(db, 'anniversaries', 'readwrite');
    return new Promise((resolve, reject) => { data.createdAt = new Date().toISOString(); const req = store.add(data); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
  }
  async function updateAnniversary(id, data) {
    const db = await openDB(); const store = getStore(db, 'anniversaries', 'readwrite');
    return new Promise((resolve, reject) => { data.id = id; const req = store.put(data); req.onsuccess = () => resolve(); req.onerror = () => reject(req.error); });
  }
  async function deleteAnniversary(id) {
    const db = await openDB(); const store = getStore(db, 'anniversaries', 'readwrite');
    return new Promise((resolve, reject) => { const req = store.delete(id); req.onsuccess = () => resolve(); req.onerror = () => reject(req.error); });
  }

  // === Places ===
  async function getAllPlaces() {
    const db = await openDB(); const store = getStore(db, 'places', 'readonly');
    return new Promise((resolve) => { const r = []; const c = store.openCursor(); c.onsuccess = (e) => { const cur = e.target.result; if (cur) { r.push(cur.value); cur.continue(); } else resolve(r); }; });
  }
  async function addPlace(data) {
    const db = await openDB(); const store = getStore(db, 'places', 'readwrite');
    return new Promise((resolve, reject) => { data.createdAt = new Date().toISOString(); const req = store.add(data); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
  }
  async function updatePlace(id, data) {
    const db = await openDB(); const store = getStore(db, 'places', 'readwrite');
    return new Promise((resolve, reject) => { data.id = id; const req = store.put(data); req.onsuccess = () => resolve(); req.onerror = () => reject(req.error); });
  }
  async function deletePlace(id) {
    const db = await openDB(); const store = getStore(db, 'places', 'readwrite');
    return new Promise((resolve, reject) => { const req = store.delete(id); req.onsuccess = () => resolve(); req.onerror = () => reject(req.error); });
  }

  // === Notes ===
  async function getAllNotes() {
    const db = await openDB(); const store = getStore(db, 'notes', 'readonly'); const idx = store.index('createdAt');
    return new Promise((resolve) => { const r = []; const c = idx.openCursor(null, 'prev'); c.onsuccess = (e) => { const cur = e.target.result; if (cur) { r.push(cur.value); cur.continue(); } else resolve(r); }; });
  }
  async function addNote(data) {
    const db = await openDB(); const store = getStore(db, 'notes', 'readwrite');
    return new Promise((resolve, reject) => { data.createdAt = new Date().toISOString(); const req = store.add(data); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
  }
  async function deleteNote(id) {
    const db = await openDB(); const store = getStore(db, 'notes', 'readwrite');
    return new Promise((resolve, reject) => { const req = store.delete(id); req.onsuccess = () => resolve(); req.onerror = () => reject(req.error); });
  }

  async function updateNote(id, data) {
    const db = await openDB(); const store = getStore(db, "notes", "readwrite");
    return new Promise((resolve, reject) => { data.id = id; const req = store.put(data); req.onsuccess = () => resolve(); req.onerror = () => reject(req.error); });
  }

  // === Story ===
  async function getAllStoryNodes() {
    const db = await openDB(); const store = getStore(db, 'story', 'readonly'); const idx = store.index('date');
    return new Promise((resolve) => { const r = []; const c = idx.openCursor(null, 'prev'); c.onsuccess = (e) => { const cur = e.target.result; if (cur) { r.push(cur.value); cur.continue(); } else resolve(r); }; });
  }
  async function addStoryNode(data) {
    const db = await openDB(); const store = getStore(db, 'story', 'readwrite');
    return new Promise((resolve, reject) => { data.createdAt = new Date().toISOString(); const req = store.add(data); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
  }
  async function updateStoryNode(id, data) {
    const db = await openDB(); const store = getStore(db, 'story', 'readwrite');
    return new Promise((resolve, reject) => { data.id = id; const req = store.put(data); req.onsuccess = () => resolve(); req.onerror = () => reject(req.error); });
  }
  async function deleteStoryNode(id) {
    const db = await openDB(); const store = getStore(db, 'story', 'readwrite');
    return new Promise((resolve, reject) => { const req = store.delete(id); req.onsuccess = () => resolve(); req.onerror = () => reject(req.error); });
  }

  // === Wishes ===
  async function getAllWishes() {
    const db = await openDB(); const store = getStore(db, 'wishes', 'readonly');
    return new Promise((resolve) => { const r = []; const c = store.openCursor(); c.onsuccess = (e) => { const cur = e.target.result; if (cur) { r.push(cur.value); cur.continue(); } else resolve(r); }; });
  }
  async function addWish(data) {
    const db = await openDB(); const store = getStore(db, 'wishes', 'readwrite');
    return new Promise((resolve, reject) => { data.createdAt = new Date().toISOString(); data.completed = false; const req = store.add(data); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
  }
  async function toggleWish(id, completed, completedDate) {
    const db = await openDB(); const store = getStore(db, 'wishes', 'readwrite');
    return new Promise((resolve, reject) => {
      const g = store.get(id); g.onsuccess = (e) => { const d = e.target.result; d.completed = completed; d.completedDate = completedDate || null; store.put(d); resolve(); }; g.onerror = () => reject(g.error);
    });
  }
  async function deleteWish(id) {
    const db = await openDB(); const store = getStore(db, 'wishes', 'readwrite');
    return new Promise((resolve, reject) => { const req = store.delete(id); req.onsuccess = () => resolve(); req.onerror = () => reject(req.error); });
  }

  async function updateWish(id, data) {
    const db = await openDB(); const store = getStore(db, "wishes", "readwrite");
    return new Promise((resolve, reject) => { data.id = id; const req = store.put(data); req.onsuccess = () => resolve(); req.onerror = () => reject(req.error); });
  }

  // === Export / Import ===
  async function exportAllData() {
    const db = await openDB();
    const stores = ['settings', 'anniversaries', 'places', 'notes', 'story', 'wishes'];
    const result = {};
    for (const name of stores) {
      const store = getStore(db, name, 'readonly');
      result[name] = await new Promise((resolve) => {
        const items = []; const cursor = store.openCursor();
        cursor.onsuccess = (e) => { const cur = e.target.result; if (cur) { items.push(cur.value); cur.continue(); } else resolve(items); };
      });
    }
    return result;
  }

  async function importAllData(data) {
    const db = await openDB();
    const stores = ['settings', 'anniversaries', 'places', 'notes', 'story', 'wishes'];
    for (const name of stores) {
      if (!data[name]) continue;
      const store = getStore(db, name, 'readwrite');
      const clearReq = store.clear();
      await new Promise((resolve) => { clearReq.onsuccess = () => resolve(); });
      for (const item of data[name]) { store.add(item); }
    }
  }

  return {
    getSettings, saveSetting,
    getAllAnniversaries, addAnniversary, updateAnniversary, deleteAnniversary,
    getAllPlaces, addPlace, updatePlace, deletePlace,
    getAllNotes, addNote, deleteNote, updateNote,
    getAllStoryNodes, addStoryNode, updateStoryNode, deleteStoryNode,
    getAllWishes, addWish, toggleWish, deleteWish, updateWish,
    exportAllData, importAllData
  };
})();
