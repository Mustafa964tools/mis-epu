import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  collection,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { INITIAL_NEWS, INITIAL_STAFF } from './seedData.js';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const ADMIN_EMAIL = 'mustafanahroomar@gmail.com';

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();

export async function isCurrentUserAdmin(user) {
  if (!user || !user.emailVerified) return false;
  if (user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return true;
  }
  const path = `admins/${user.uid}`;
  try {
    const snap = await getDoc(doc(db, 'admins', user.uid));
    return snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return false;
  }
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export async function signOutFirebase() {
  await signOut(auth);
}

export { onAuthStateChanged, onSnapshot, collection, doc, serverTimestamp };

/**
 * Seed initial department news and staff into Firestore if collections are empty
 * when an authorized admin signs in.
 */
export async function ensureFirestoreSeeded() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const newsSnap = await getDocs(collection(db, 'news'));
    if (newsSnap.empty) {
      for (const item of INITIAL_NEWS) {
        const docId = String(item.id).replace(/[^a-zA-Z0-9_-]/g, '_');
        await setDoc(doc(db, 'news', docId), {
          category: item.category,
          image_key: item.image_key || 'seminar',
          image_url: item.image_url || '',
          published_at: item.published_at,
          title_ku: item.title_ku,
          title_ar: item.title_ar,
          title_en: item.title_en,
          body_ku: item.body_ku,
          body_ar: item.body_ar,
          body_en: item.body_en,
          authorId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'news');
  }

  try {
    const staffSnap = await getDocs(collection(db, 'staff'));
    if (staffSnap.empty) {
      for (const member of INITIAL_STAFF) {
        const docId = String(member.id).replace(/[^a-zA-Z0-9_-]/g, '_');
        await setDoc(doc(db, 'staff', docId), {
          name: member.name_ku || member.name,
          name_ku: member.name_ku || member.name,
          name_ar: member.name_ar || member.name,
          name_en: member.name_en || member.name,
          role_key: member.role_key || 'lecturer',
          academic_email: member.academic_email || member.email,
          photo_url: member.photo_url || '',
          display_order: Number(member.display_order) || 1,
          authorId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'staff');
  }
}

export async function saveFirestoreNews(editId, payload) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated with Firebase');

  const docId = editId
    ? String(editId).replace(/[^a-zA-Z0-9_-]/g, '_')
    : `news_${Date.now()}`;
  const path = `news/${docId}`;

  const cleanData = {
    category: ['announcement', 'event', 'notice', 'Announcement', 'Academic', 'Seminar', 'Activity'].includes(payload.category)
      ? payload.category
      : 'announcement',
    image_key: ['seminar', 'lab', 'campus', 'hero'].includes(payload.image_key)
      ? payload.image_key
      : 'seminar',
    image_url: String(payload.image_url || '').slice(0, 850000),
    published_at: /^\d{4}-\d{2}-\d{2}$/.test(String(payload.published_at || ''))
      ? String(payload.published_at)
      : new Date().toISOString().slice(0, 10),
    title_ku: String(payload.title_ku || '').trim().slice(0, 300),
    title_ar: String(payload.title_ar || '').trim().slice(0, 300),
    title_en: String(payload.title_en || '').trim().slice(0, 300),
    body_ku: String(payload.body_ku || '').trim().slice(0, 8000),
    body_ar: String(payload.body_ar || '').trim().slice(0, 8000),
    body_en: String(payload.body_en || '').trim().slice(0, 8000),
  };

  try {
    if (editId) {
      await updateDoc(doc(db, 'news', docId), {
        ...cleanData,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'news', docId), {
        ...cleanData,
        authorId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, editId ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteFirestoreNews(docId) {
  const cleanId = String(docId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const path = `news/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'news', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveFirestoreStaff(editId, payload, nextOrderFallback = 1) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated with Firebase');

  const docId = editId
    ? String(editId).replace(/[^a-zA-Z0-9_-]/g, '_')
    : `staff_${Date.now()}`;
  const path = `staff/${docId}`;

  const orderNum = Number(payload.display_order);
  const displayOrder = Number.isFinite(orderNum) && orderNum >= 1 && orderNum <= 1000
    ? Math.round(orderNum)
    : Math.min(Math.max(Number(nextOrderFallback) || 1, 1), 1000);

  const nameKu = String(payload.name_ku || '').trim().slice(0, 160);
  const nameAr = String(payload.name_ar || '').trim().slice(0, 160);
  const nameEn = String(payload.name_en || '').trim().slice(0, 160);

  const cleanData = {
    name: nameKu || nameEn || 'Staff Member',
    name_ku: nameKu,
    name_ar: nameAr,
    name_en: nameEn,
    role_key: ['head', 'doctor', 'lecturer'].includes(payload.role_key)
      ? payload.role_key
      : 'lecturer',
    academic_email: String(payload.email || payload.academic_email || '').trim().slice(0, 160),
    photo_url: String(payload.photo_url || '').slice(0, 850000),
    display_order: displayOrder,
  };

  try {
    if (editId) {
      await updateDoc(doc(db, 'staff', docId), {
        ...cleanData,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'staff', docId), {
        ...cleanData,
        authorId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, editId ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteFirestoreStaff(docId) {
  const cleanId = String(docId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const path = `staff/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'staff', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createFirestoreContactMessage(payload) {
  const docId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const path = `messages/${docId}`;
  const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

  const cleanData = {
    name: String(payload.name || '').trim().slice(0, 120),
    senderEmail: String(payload.email || '').trim().slice(0, 160),
    subject: String(payload.subject || '').trim().slice(0, 200),
    message: String(payload.message || '').trim().slice(0, 4000),
    status: 'unread',
    created_at: nowStr,
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'messages', docId), cleanData);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteFirestoreContactMessage(docId) {
  const cleanId = String(docId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const path = `messages/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'messages', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Compress an uploaded image in-browser so it fits comfortably in a Firestore document (< 350 KB)
 * and persists permanently even on static Netlify hosting without a backend file server.
 */
export function compressImageToDataUrl(file, maxDimension = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result || ''));
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}
