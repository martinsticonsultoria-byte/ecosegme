const DB_NAME = 'ecosegme-offline'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = e => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('pending_sheets'))
        db.createObjectStore('pending_sheets',
          { keyPath: 'localId', autoIncrement: true })
      if (!db.objectStoreNames.contains('cache'))
        db.createObjectStore('cache', { keyPath: 'key' })
    }
    req.onsuccess = e => resolve(e.target.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveOfflineSheet(data) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_sheets', 'readwrite')
    const req = tx.objectStore('pending_sheets').add({
      ...data, savedAt: new Date().toISOString(), synced: false
    })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getPendingSheets() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_sheets', 'readonly')
    const req = tx.objectStore('pending_sheets').getAll()
    req.onsuccess = () =>
      resolve(req.result.filter(s => !s.synced))
    req.onerror = () => reject(req.error)
  })
}

export async function markSynced(localId) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_sheets', 'readwrite')
    const store = tx.objectStore('pending_sheets')
    const get = store.get(localId)
    get.onsuccess = () => {
      store.put({ ...get.result, synced: true })
      resolve()
    }
    get.onerror = () => reject(get.error)
  })
}

export async function saveOfflineCache(key, data) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cache', 'readwrite')
    tx.objectStore('cache').put({ key, data })
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
}

export async function getOfflineCache(key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cache', 'readonly')
    const req = tx.objectStore('cache').get(key)
    req.onsuccess = () => resolve(req.result?.data || null)
    req.onerror = () => reject(req.error)
  })
}
