import { Job } from '../types';
import { createJob } from '../lib/api';

const DB_NAME = 'motologa_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'offline_jobs_queue';

interface QueuedJob {
  id?: number; 
  job: Partial<Job>;
  assignedMechanic: string;
  garageId: string;
  timestamp: number;
}

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      console.error('IndexedDB error:', event);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

export const saveToOfflineQueue = async (job: Partial<Job>, assignedMechanic: string, garageId: string): Promise<void> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const payload: QueuedJob = {
        job,
        assignedMechanic,
        garageId,
        timestamp: Date.now()
      };

      const request = store.add(payload);

      request.onsuccess = () => resolve();
      request.onerror = (e) => reject((e.target as IDBRequest).error);
    });
  } catch (err) {
    console.error('Failed to save to offline queue', err);
  }
};

export const syncOfflineQueue = async (): Promise<void> => {
  if (!navigator.onLine) return;

  try {
    const db = await initDB();
    const queuedJobs = await new Promise<QueuedJob[]>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject((e.target as IDBRequest).error);
    });

    if (queuedJobs.length === 0) return;
    
    console.log(`Attempting to sync ${queuedJobs.length} offline jobs...`);

    for (const qJob of queuedJobs) {
      if (!qJob.id) continue;
      
      try {
        await createJob(qJob.job, qJob.garageId, qJob.assignedMechanic);
        
        await new Promise<void>((resolve, reject) => {
           const deleteTx = db.transaction(STORE_NAME, 'readwrite');
           const deleteStore = deleteTx.objectStore(STORE_NAME);
           const deleteReq = deleteStore.delete(qJob.id!);
           deleteReq.onsuccess = () => resolve();
           deleteReq.onerror = (e) => reject((e.target as IDBRequest).error);
        });
      } catch (err) {
        console.error(`Failed to sync queued job ${qJob.id}:`, err);
      }
    }
  } catch (err) {
    console.error('Offline sync process failed', err);
  }
};
