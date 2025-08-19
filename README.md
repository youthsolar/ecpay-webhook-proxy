# ECPay Webhook Proxy Service

這是一個部署在 Vercel 上的 ECPay webhook 代理服務，用於解決 Zoho Creator 不支援 `application/x-www-form-urlencoded` 格式的問題。

## 功能

- 接收 ECPay 的 `application/x-www-form-urlencoded` 回調
- 轉換為 JSON 格式
- 轉發給 Zoho Creator API 端點
- 回傳正確的回應給 ECPay

## 部署

1. 將此專案上傳到 Vercel
2. Vercel 會自動部署
3. 獲得部署網址：`https://your-project.vercel.app`
4. 將 ECPay 的 ReturnURL 設定為：`https://your-project.vercel.app/api/webhook`

## 設定

記得修改 `api/webhook.js` 中的 Zoho Creator API 端點：

```javascript
const zohoApiUrl = 'https://www.zohoapis.com/creator/custom/uneedwind/handle_ecpay_return?publickey=YOUR_PUBLIC_KEY';
```

## 測試

```bash
curl -X POST "https://your-project.vercel.app/api/webhook" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "MerchantID=3002607&MerchantTradeNo=TEST123&RtnCode=1&CheckMacValue=ABCD1234"
```
