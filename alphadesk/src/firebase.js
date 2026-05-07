// ╔══════════════════════════════════════════════════════════╗
// ║  請將下面的設定換成你自己的 Firebase 專案設定            ║
// ║  取得方式：Firebase 控制台 → 專案設定 → 您的應用程式    ║
// ╚══════════════════════════════════════════════════════════╝

import { initializeApp } from 'firebase/app'
import { getDatabase, ref, onValue, set, get } from 'firebase/database'

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
}

const app = initializeApp(firebaseConfig)
const db = getDatabase(app)

export async function loadPortfolios() {
  const snap = await get(ref(db, 'portfolios'))
  return snap.exists() ? snap.val() : []
}

export function subscribePortfolios(callback) {
  return onValue(ref(db, 'portfolios'), (snap) => {
    callback(snap.exists() ? snap.val() : [])
  })
}

export async function savePortfolios(portfolios) {
  await set(ref(db, 'portfolios'), portfolios)
}
