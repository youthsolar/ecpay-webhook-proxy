"""
Main Flask application for GCP deployment
"""
import os
import logging
from flask import Flask, jsonify, request
from dotenv import load_dotenv
from google.cloud import logging as cloud_logging

# Load environment variables
load_dotenv()

# Configure logging
if os.getenv('GAE_ENV', '').startswith('standard'):
    # Running on Google App Engine
    client = cloud_logging.Client()
    client.setup_logging()
else:
    # Local development
    logging.basicConfig(level=logging.INFO)

logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)

@app.route('/')
def index():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'python-app',
        'version': '1.0.0'
    })

@app.route('/api/webhook', methods=['POST'])
def webhook():
    """Example webhook endpoint"""
    try:
        data = request.get_json(force=True)
        logger.info(f"Received webhook data: {data}")
        
        # Process webhook data here
        
        return jsonify({
            'status': 'success',
            'message': 'Webhook processed successfully'
        }), 200
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/n8n-trigger', methods=['POST'])
def n8n_trigger():
    """Endpoint to trigger N8n workflows"""
    try:
        data = request.get_json(force=True)
        workflow_id = data.get('workflow_id')
        
        # Here you would implement logic to trigger N8n workflows
        logger.info(f"Triggering N8n workflow: {workflow_id}")
        
        return jsonify({
            'status': 'success',
            'workflow_id': workflow_id,
            'message': 'Workflow triggered'
        }), 200
    except Exception as e:
        logger.error(f"Error triggering N8n workflow: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=True)