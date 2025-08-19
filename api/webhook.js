// ECPay Webhook 代理服務 - Vercel Serverless Function
// 用途：接收 ECPay 的 application/x-www-form-urlencoded 回調
// 轉換為 JSON 格式後轉發給 Zoho Creator

export default async function handler(req, res) {
    // 設定 CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // 記錄開始時間
    const startTime = new Date().toISOString();
    console.log(`[${startTime}] ECPay Webhook Proxy 啟動`);
    
    try {
        // 檢查請求方法
        if (req.method !== 'POST') {
            console.log(`[${startTime}] 錯誤：非 POST 請求`);
            return res.status(405).send('0|Method Not Allowed');
        }
        
        // 獲取 ECPay 發送的原始資料
        let rawBody = '';
        
        // Vercel 會自動解析 body，但我們需要原始格式
        if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
            // 如果是 form-urlencoded，req.body 已經被解析了
            const parsedData = req.body;
            console.log(`[${startTime}] 自動解析的資料:`, parsedData);
            
            // 驗證必要欄位
            const requiredFields = ['MerchantTradeNo', 'RtnCode', 'CheckMacValue'];
            for (const field of requiredFields) {
                if (!parsedData[field]) {
                    console.log(`[${startTime}] 錯誤：缺少必要欄位 ${field}`);
                    return res.status(400).send(`0|Missing required field: ${field}`);
                }
            }
            
            // 準備要發送給 Zoho Creator 的 JSON 資料
            const jsonPayload = {
                // 交易基本資訊
                MerchantID: parsedData.MerchantID || '',
                MerchantTradeNo: parsedData.MerchantTradeNo,
                TradeNo: parsedData.TradeNo || '',
                
                // 付款資訊
                RtnCode: parsedData.RtnCode,
                RtnMsg: parsedData.RtnMsg || '',
                PaymentType: parsedData.PaymentType || '',
                PaymentDate: parsedData.PaymentDate || '',
                TradeAmt: parsedData.TradeAmt || '0',
                PaymentTypeChargeFee: parsedData.PaymentTypeChargeFee || '0',
                
                // 驗證碼
                CheckMacValue: parsedData.CheckMacValue,
                
                // 自訂欄位
                CustomField1: parsedData.CustomField1 || '',
                CustomField2: parsedData.CustomField2 || '',
                CustomField3: parsedData.CustomField3 || '',
                CustomField4: parsedData.CustomField4 || '',
                
                // 其他欄位
                StoreID: parsedData.StoreID || '',
                SimulatePaid: parsedData.SimulatePaid || '0',
                TradeDate: parsedData.TradeDate || '',
                
                // 處理資訊
                ProcessedAt: new Date().toISOString(),
                OriginalContentType: 'application/x-www-form-urlencoded',
                ProxyVersion: '1.0',
                ProxyHost: req.headers.host
            };
            
            console.log(`[${startTime}] 準備發送的 JSON:`, JSON.stringify(jsonPayload, null, 2));
            
            // 發送到 Zoho Creator
            const zohoApiUrl = 'https://www.zohoapis.com/creator/custom/uneedwind/handle_ecpay_return?publickey=W6nH8Tnw5SwYT4O3pQX01RSNy';
            
            try {
                const zohoResponse = await fetch(zohoApiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'ECPay-Webhook-Proxy-Vercel/1.0'
                    },
                    body: JSON.stringify(jsonPayload)
                });
                
                const responseText = await zohoResponse.text();
                console.log(`[${startTime}] Zoho Creator 回應碼:`, zohoResponse.status);
                console.log(`[${startTime}] Zoho Creator 回應內容:`, responseText);
                
                // 根據 Zoho Creator 的回應決定回傳給 ECPay 的內容
                if (zohoResponse.ok) {
                    console.log(`[${startTime}] ✅ 成功處理 ECPay Webhook`);
                    return res.status(200).send('1|OK');
                } else {
                    console.log(`[${startTime}] ❌ Zoho Creator 處理失敗`);
                    return res.status(500).send('0|Zoho Processing Error');
                }
                
            } catch (fetchError) {
                console.error(`[${startTime}] ❌ 呼叫 Zoho Creator 失敗:`, fetchError);
                return res.status(500).send('0|Internal Server Error');
            }
            
        } else {
            console.log(`[${startTime}] 錯誤：不支援的 Content-Type`);
            return res.status(400).send('0|Unsupported Content-Type');
        }
        
    } catch (error) {
        console.error(`[${startTime}] ❌ 系統錯誤:`, error);
        return res.status(500).send('0|System Error');
    }
}
