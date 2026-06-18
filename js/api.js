/**
 * L&J's Planet - Cloud API 客户端
 * 与 DB (IndexedDB) 接口完全一致，可无缝替换
 */
const API = (() => {
  let token = localStorage.getItem('lj_token') || null;
  let currentUser = null;

  const BASE = '';

  function headers() {
    const h = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = 'Bearer ' + token;
    return h;
  }

  function handleResponse(res) {
    if (res.status === 401) {
      token = null;
      localStorage.removeItem('lj_token');
      currentUser = null;
      throw new Error('登录已过期');
    }
    if (!res.ok) throw new Error('请求失败');
    return res.json();
  }

  // === Auth ===
  async function login(username, password) {
    const res = await fetch(BASE + '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || '登录失败'); }
    const data = await res.json();
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('lj_token', token);
    localStorage.setItem('lj_user', JSON.stringify(currentUser));
    return currentUser;
  }

  function logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('lj_token');
    localStorage.removeItem('lj_user');
  }

  function isLoggedIn() { return !!token; }
  function getUser() { return currentUser || JSON.parse(localStorage.getItem('lj_user') || 'null'); }

  // === Generic API call ===
  async function get(path) { const r = await fetch(BASE + path, { headers: headers() }); return handleResponse(r); }
  async function post(path, data) { const r = await fetch(BASE + path, { method: 'POST', headers: headers(), body: JSON.stringify(data) }); return handleResponse(r); }
  async function put(path, data) { const r = await fetch(BASE + path, { method: 'PUT', headers: headers(), body: JSON.stringify(data) }); return handleResponse(r); }
  async function del(path) { const r = await fetch(BASE + path, { method: 'DELETE', headers: headers() }); return handleResponse(r); }

  // === Settings ===
  async function getSettings() { return get('/api/settings'); }
  async function saveSetting(key, value) { await put('/api/settings', { [key]: value }); }

  // === Anniversaries ===
  async function getAllAnniversaries() { return get('/api/anniversaries'); }
  async function addAnniversary(data) { return post('/api/anniversaries', data); }
  async function updateAnniversary(id, data) { return put('/api/anniversaries/' + id, data); }
  async function deleteAnniversary(id) { return del('/api/anniversaries/' + id); }

  // === Places ===
  async function getAllPlaces() { return get('/api/places'); }
  async function addPlace(data) { return post('/api/places', data); }
  async function updatePlace(id, data) { return put('/api/places/' + id, data); }
  async function deletePlace(id) { return del('/api/places/' + id); }

  // === Notes ===
  async function getAllNotes() { return get('/api/notes'); }
  async function addNote(data) { return post('/api/notes', data); }
  async function updateNote(id, data) { return put('/api/notes/' + id, data); }
  async function deleteNote(id) { return del('/api/notes/' + id); }

  // === Story ===
  async function getAllStoryNodes() { return get('/api/story_nodes'); }
  async function addStoryNode(data) { return post('/api/story_nodes', data); }
  async function updateStoryNode(id, data) { return put('/api/story_nodes/' + id, data); }
  async function deleteStoryNode(id) { return del('/api/story_nodes/' + id); }

  // === Wishes ===
  async function getAllWishes() { return get('/api/wishes'); }
  async function addWish(data) { return post('/api/wishes', data); }
  async function updateWish(id, data) { return put('/api/wishes/' + id, data); }
  async function toggleWish(id, completed, completedDate) { return put('/api/wishes/' + id + '/toggle', { completed, completed_date: completedDate }); }
  async function deleteWish(id) { return del('/api/wishes/' + id); }

  // === Export / Import ===
  async function exportAllData() { return get('/api/export'); }
  async function importAllData(data) { return post('/api/import', data); }

  return {
    login, logout, isLoggedIn, getUser,
    getSettings, saveSetting,
    getAllAnniversaries, addAnniversary, updateAnniversary, deleteAnniversary,
    getAllPlaces, addPlace, updatePlace, deletePlace,
    getAllNotes, addNote, updateNote, deleteNote,
    getAllStoryNodes, addStoryNode, updateStoryNode, deleteStoryNode,
    getAllWishes, addWish, updateWish, deleteWish, toggleWish,
    exportAllData, importAllData
  };
})();