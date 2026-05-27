const DB_NAME = 'FosmarDB';
const DB_VERSION = 1;
const STORE_NAME = 'records';

export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      reject('Error opening IndexedDB: ' + event.target.errorCode);
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('fecha', 'fecha', { unique: false });
        store.createIndex('tipo', 'tipo', { unique: false });
        store.createIndex('campo', 'campo', { unique: false });
      }
    };
  });
}

export function getAllRecords() {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = (event) => {
        reject('Error fetching records: ' + event.target.errorCode);
      };
    });
  });
}

export function addRecord(record) {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(record);

      request.onsuccess = () => {
        resolve(record);
      };

      request.onerror = (event) => {
        reject('Error adding record: ' + event.target.errorCode);
      };
    });
  });
}

export function deleteRecord(id) {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve(id);
      };

      request.onerror = (event) => {
        reject('Error deleting record: ' + event.target.errorCode);
      };
    });
  });
}

export function clearAllRecords() {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        reject('Error clearing database: ' + event.target.errorCode);
      };
    });
  });
}

export function bulkAddRecords(records) {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = (event) => {
        reject('Error in bulk transaction: ' + event.target.errorCode);
      };

      records.forEach((record) => {
        store.put(record);
      });
    });
  });
}
