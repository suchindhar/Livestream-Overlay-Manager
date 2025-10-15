from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin 
from tinydb import TinyDB, Query
import uuid
from datetime import datetime
import json
import os

app = Flask(__name__)

# --- HYPER-PERMISSIVE CORS CONFIGURATION ---
CORS(app, 
     resources={r"/api/*": {"origins": "*"}},
     supports_credentials=True,
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization', 'X-Requested-With']
) 

DB_FILE = 'overlays.json'

# --- Database Initialization ---
db = None
overlays_table = None

def init_db():
    global db, overlays_table
    try:
        db = TinyDB(DB_FILE)
        overlays_table = db.table('overlays')
        print(f"✅ TinyDB initialized and connected to {DB_FILE}")
    except json.JSONDecodeError:
        print(f"❌ ERROR: Database file {DB_FILE} is corrupted. Backing up and restarting database.")
        try:
            if os.path.exists(DB_FILE):
                os.rename(DB_FILE, f"{DB_FILE}.corrupted.{datetime.now().strftime('%Y%m%d%H%M%S')}")
            db = TinyDB(DB_FILE)
            overlays_table = db.table('overlays')
            print(f"✅ New, clean TinyDB created at {DB_FILE}")
        except Exception as e:
            print(f"❌ FATAL: Could not create new database file. {e}")
            db = None
            overlays_table = None
    except Exception as e:
        print(f"❌ FATAL ERROR: TinyDB initialization failed. {e}")
        db = None
        overlays_table = None

init_db()


# --- API Routes (CRUD) ---

@app.route('/', methods=['GET'])
def home():
    return jsonify({'message': '✅ Livestream Overlay API is LIVE!', 'status': 'success'})

@app.route('/api/overlays', methods=['POST'])
def create_overlay():
    if overlays_table is None:
        return jsonify({'error': 'Database not available. Check server logs.'}), 503
    try:
        data = request.json
        overlay = {
            'id': str(uuid.uuid4()),
            'content': data.get('content', ''),
            'imageUrl': data.get('imageUrl', ''),
            'type': data.get('type', 'text'),
            'position': data.get('position', {'x': 250, 'y': 150}), 
            'size': data.get('size', {'width': 200, 'height': 60}),
            'style': data.get('style', {}),
            'created_at': datetime.utcnow().isoformat()
        }
        overlays_table.insert(overlay)
        print(f"✅ Created overlay: {overlay['id']}")
        return jsonify({'message': 'Overlay created!', 'overlay': overlay}), 201
    except Exception as e:
        print(f"❌ ERROR in POST /api/overlays: {e}")
        return jsonify({'error': 'Failed to create overlay.', 'details': str(e)}), 500

@app.route('/api/overlays', methods=['GET'])
def get_all_overlays():
    if overlays_table is None:
        return jsonify({'error': 'Database not available. Check server logs.'}), 503
    try:
        overlays = overlays_table.all()
        return jsonify({'overlays': overlays}), 200
    except Exception as e:
        print(f"❌ ERROR in GET /api/overlays: {e}")
        return jsonify({'error': 'Internal server error fetching data.', 'details': str(e)}), 500

@app.route('/api/overlays/<overlay_id>', methods=['PUT'])
def update_overlay(overlay_id):
    if overlays_table is None:
        return jsonify({'error': 'Database not available. Check server logs.'}), 503
    try:
        data = request.get_json() 
        if data is None:
            print("❌ PUT request received no JSON data.")
            return jsonify({'error': 'Invalid JSON data received.'}), 400
            
        print(f"🔄 Server received PUT for ID: {overlay_id} with data: {data}")
        
        Overlay = Query()
        update_data = {k: v for k, v in data.items() if k in ['content', 'type', 'position', 'size', 'style', 'imageUrl']}

        result = overlays_table.update(update_data, Overlay.id == overlay_id)
        
        if not result:
            if overlays_table.get(Overlay.id == overlay_id):
                updated = overlays_table.get(Overlay.id == overlay_id)
                print(f"✅ Update successful, but data was identical. ID: {overlay_id}")
                return jsonify({'message': 'No change needed.', 'overlay': updated}), 200
            else:
                print(f"❌ Overlay ID not found: {overlay_id}")
                return jsonify({'error': 'Overlay not found'}), 404

        updated = overlays_table.get(Overlay.id == overlay_id)
        print(f"✅ Update successful for ID: {overlay_id}. New position: {updated.get('position')}")
        return jsonify({'message': 'Overlay updated!', 'overlay': updated}), 200
    except Exception as e:
        print(f"❌ FATAL ERROR in PUT /api/overlays/{overlay_id}: {e}")
        return jsonify({'error': 'Failed to update overlay.', 'details': str(e)}), 500

@app.route('/api/overlays/<overlay_id>', methods=['DELETE'])
def delete_overlay(overlay_id):
    if overlays_table is None:
        return jsonify({'error': 'Database not available. Check server logs.'}), 503
    try:
        Overlay = Query()
        result = overlays_table.remove(Overlay.id == overlay_id)
        if not result:
            return jsonify({'error': 'Overlay not found'}), 404
        print(f"✅ Deleted overlay: {overlay_id}")
        return jsonify({'message': 'Deleted', 'deleted_id': overlay_id}), 200
    except Exception as e:
        print(f"❌ ERROR in DELETE /api/overlays/{overlay_id}: {e}")
        return jsonify({'error': 'Failed to delete overlay.', 'details': str(e)}), 500

if __name__ == '__main__':
    print("\n" + "="*40)
    print("🚀 Starting Flask + TinyDB Server...")
    print("="*40 + "\n")
    app.run(debug=True, port=5000)