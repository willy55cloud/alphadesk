# ALPHADESK 股票庫存追蹤系統

## 部署步驟（純網頁操作，免安裝任何東西）

### 第一步：設定 Firebase
1. 開啟 firebase.google.com，登入 Google 帳號
2. 建立新專案 → 啟用 Realtime Database（測試模式）
3. 取得 firebaseConfig 設定碼

### 第二步：修改設定
打開 `src/firebase.js`，將 firebaseConfig 換成你自己的設定：
```js
const firebaseConfig = {
  apiKey: "你的 apiKey",
  authDomain: "你的專案.firebaseapp.com",
  databaseURL: "https://你的專案-default-rtdb.firebaseio.com",
  projectId: "你的專案ID",
  storageBucket: "你的專案.appspot.com",
  messagingSenderId: "你的 ID",
  appId: "你的 appId"
}
```

### 第三步：部署到 Vercel
1. 開啟 github.com，建立新 Repository（上傳這整個資料夾）
2. 開啟 vercel.com，Import 那個 Repository
3. 直接點 Deploy，等待完成
4. 取得網址，分享給任何人即可使用

## 功能
- 建立多個投資組合清單
- 新增/刪除股票（台股4碼、美股英文代號）
- 搜尋股票名稱自動填入
- 按「查現價」或「⟳」更新即時股價（Yahoo Finance）
- 損益金額與%即時計算
- Firebase 雲端同步，所有人開啟網址看到同樣資料
