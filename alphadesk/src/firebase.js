// ╔══════════════════════════════════════════════════════════╗
// ║  請將下面的設定換成你自己的 Firebase 專案設定            ║
// ║  取得方式：Firebase 控制台 → 專案設定 → 您的應用程式    ║
// ╚══════════════════════════════════════════════════════════╝

import { initializeApp } from 'firebase/app'
import { getDatabase, ref, onValue, set, get } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyD0VSNKb_FLT-lIBPpLMPNpJTVW7SaOiJo",
  authDomain: "stock-list-willy.firebaseapp.com",
  databaseURL: "https://stock-list-willy-default-rtdb.firebaseio.com/",
  projectId: "stock-list-willy",
  storageBucket: "stock-list-willy.firebasestorage.app",
  messagingSenderId: "624798870632",
  appId: "1:624798870632:web:e2467b1d22b5a0f32ddfdd"
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
