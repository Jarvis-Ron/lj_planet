/**
 * Data source: 云端登录时用 API，离线时用 IndexedDB
 */
const Data = {};
const METHODS = [
  'getSettings','saveSetting',
  'getAllAnniversaries','addAnniversary','updateAnniversary','deleteAnniversary',
  'getAllPlaces','addPlace','updatePlace','deletePlace',
  'getAllNotes','addNote','updateNote','deleteNote',
  'getAllStoryNodes','addStoryNode','updateStoryNode','deleteStoryNode',
  'getAllWishes','addWish','updateWish','deleteWish','toggleWish',
  'exportAllData','importAllData'
];
for (const m of METHODS) {
  Data[m] = function(...args) {
    const source = (typeof API !== 'undefined' && API.isLoggedIn()) ? API : DB;
    return source[m](...args);
  };
}