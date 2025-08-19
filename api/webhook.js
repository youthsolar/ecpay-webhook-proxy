// ECPay Webhook 代理服務 - Vercel Serverless Function
// 用途：接收 ECPay 的 application/x-www-form-urlencoded 回調
// 轉換為 JSON 格式後轉發給 Zoho Creator

const querystring = require('querystring');
const https = require('https');

module.exports = async (req, res) => {
    // 設定 CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // 記錄開始時間
    const startTime = new Date().toISOString();
    console.log(`[${startTime}] 🔥 ECPay Webhook Proxy 啟動`);
    
    // 檢查請求方法
    if (req.method !== 'POST') {
        console.log(`[${startTime}] ❌ 錯誤：非 POST 請求，方法：${req.method}`);
        return res.status(405).send('0|Method Not Allowed');
    }
    
    let body = '';
    
    // 接收資料
    req.on('data', (chunk) => {
        body += chunk.toString();
    });
    
    req.on('end', async () => {
        try {
            console.log(`[${startTime}] 🔍 ECPay 原始資料:`, body);
            console.log(`[${startTime}] 📋 Content-Type:`, req.headers['content-type']);
            
            // 解析 form-urlencoded 資料
            const parsedData = querystring.parse(body);
            console.log(`[${startTime}] 📦 解析後資料:`, parsedData);
            
            // 驗證必要欄位
            const requiredFields = ['MerchantTradeNo', 'RtnCode', 'CheckMacValue'];
            const missingFields = requiredFields.filter(field => !parsedData[field]);
            
            if (missingFields.length > 0) {
                console.error(`[${startTime}] ❌ 缺少必要欄位:`, missingFields);
                return res.status(400).send('0|Missing required fields');
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
                OriginalContentType: 'application/x-www-form-urlencoded'
            };
            
            console.log(`[${startTime}] 🚀 準備 JSON Payload:`, JSON.stringify(jsonPayload, null, 2));
            
            // Zoho Creator Custom API URL with Public Key from app variables (using fixed version)
            const zohoApiUrl = 'https://www.zohoapis.com/creator/custom/uneedwind/handle_ecpay_return_fixed?publickey=W6nH8Tnw5SwYT4O3pQX01RSNy';
            
            const postData = JSON.stringify(jsonPayload);
            
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'User-Agent': 'ECPay-Webhook-Proxy/1.0'
                }
            };
            
            const zohoReq = https.request(zohoApiUrl, options, (zohoRes) => {
                let responseData = '';
                zohoRes.on('data', (chunk) => {
                    responseData += chunk;
                });
                zohoRes.on('end', () => {
                    console.log(`[${startTime}] ✅ Zoho Creator 回應:`, responseData);
                    console.log(`[${startTime}] 📊 狀態碼:`, zohoRes.statusCode);
                    
                    if (zohoRes.statusCode === 200) {
                        res.status(200).send('1|OK');
                        console.log(`[${startTime}] 🎉 成功處理 ECPay Webhook`);
                    } else {
                        console.error(`[${startTime}] ❌ Zoho Creator 處理失敗:`, responseData);
                        res.status(500).send('0|Zoho Processing Error');
                    }
                });
            });
            
            zohoReq.on('error', (error) => {
                console.error(`[${startTime}] ❌ 發送到 Zoho Creator 失敗:`, error);
                res.status(500).send('0|Internal Server Error');
            });
            
            zohoReq.write(postData);
            zohoReq.end();
            
        } catch (parseError) {
            console.error(`[${startTime}] ❌ 資料解析錯誤:`, parseError);
            res.status(400).send('0|Parse Error');
        }
    });
    
    req.on('error', (error) => {
        console.error(`[${startTime}] ❌ 請求錯誤:`, error);
        res.status(500).send('0|Request Error');
    });
};