"""
GCP App Engine Python應用程式主入口點
"""
import os
import logging
from flask import Flask, request, jsonify
from google.cloud import logging as cloud_logging

# 設置Google Cloud Logging
if os.getenv('GAE_ENV', '').startswith('standard'):
    # 在App Engine上運行時使用Cloud Logging
    client = cloud_logging.Client()
    client.setup_logging()
else:
    # 本地開發時使用標準logging
    logging.basicConfig(level=logging.INFO)

app = Flask(__name__)

@app.route('/')
def hello():
    """健康檢查端點"""
    return jsonify({
        'status': 'healthy',
        'message': 'Python App is running on GCP',
        'version': '1.0.0'
    })

@app.route('/api/webhook', methods=['POST'])
def webhook():
    """Webhook處理端點"""
    try:
        # 獲取請求數據
        if request.content_type == 'application/json':
            data = request.get_json()
        else:
            data = request.form.to_dict()
        
        logging.info(f"Received webhook data: {data}")
        
        # 在這裡添加您的業務邏輯
        # 例如：處理ECPay回調、與N8n集成等
        
        return jsonify({
            'status': 'success',
            'message': 'Webhook processed successfully',
            'received_data': data
        })
    
    except Exception as e:
        logging.error(f"Webhook processing error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/health')
def health_check():
    """詳細健康檢查"""
    return jsonify({
        'status': 'healthy',
        'timestamp': os.environ.get('GAE_DEPLOYMENT_ID', 'local'),
        'service': os.environ.get('GAE_SERVICE', 'default'),
        'version': os.environ.get('GAE_VERSION', '1.0.0')
    })

if __name__ == '__main__':
    # 本地開發時使用
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=True)