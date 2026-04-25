const DB_VERSION = 1;

async function initDB() {
    return await idb.openDB('FenestrationCRM', DB_VERSION, {
        upgrade(db) {
            ['projects', 'clients', 'rfqs', 'files'].forEach(store => {
                if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: 'id' });
            });
            if (!db.objectStoreNames.contains('sync_queue')) db.createObjectStore('sync_queue', { keyPath: 'queue_id', autoIncrement: true });
        }
    });
}

async function writeLocal(storeName, data) {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readwrite');
    await tx.store.put({ ...data, last_updated: new Date().getTime() });
    await tx.done;
}

async function queueSyncAction(action, payload) {
    const db = await initDB();
    await db.put('sync_queue', { action, payload, timestamp: new Date().getTime() });
    if (navigator.onLine) triggerSync();
}

async function triggerSync() {
    const db = await initDB();
    const queue = await db.getAll('sync_queue');
    for (let item of queue) {
        try {
            await apiPost(item.payload); // Assumes window.apiPost is defined in api.js
            await db.delete('sync_queue', item.queue_id);
        } catch (e) { console.error('Sync failed', e); break; }
    }
}
window.addEventListener('online', triggerSync);