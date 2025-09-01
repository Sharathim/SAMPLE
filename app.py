import os
import json
from flask import Flask, render_template, request, jsonify, send_file, redirect, url_for
from werkzeug.utils import secure_filename
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size

# Storage paths
STORAGE_DIR = 'storage'
JSON_FILE = os.path.join(STORAGE_DIR, 'notesData.json')
UPLOADS_DIR = STORAGE_DIR  # Files stored directly in storage/
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt'}

# Ensure storage directory exists
os.makedirs(STORAGE_DIR, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def load_notes_data():
    """Load notes data from JSON file"""
    if not os.path.exists(JSON_FILE):
        return {}
    
    try:
        with open(JSON_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return {}

def save_notes_data(data):
    """Save notes data to JSON file"""
    try:
        with open(JSON_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error saving data: {e}")
        return False

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/subject')
def subject():
    return render_template('subject.html')

@app.route('/admin')
def admin():
    return render_template('admin.html')

# API Routes

@app.route('/api/subjects', methods=['GET'])
def get_subjects():
    """Get all subjects data"""
    data = load_notes_data()
    return jsonify(data)

@app.route('/api/subjects', methods=['POST'])
def save_subjects():
    """Save subjects data"""
    try:
        data = request.get_json()
        if save_notes_data(data):
            return jsonify({'success': True, 'message': 'Data saved successfully'})
        else:
            return jsonify({'success': False, 'message': 'Failed to save data'}), 500
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Handle file uploads"""
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No file selected'}), 400
    
    if file and allowed_file(file.filename):
        # Generate unique filename to avoid conflicts
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = secure_filename(file.filename)
        name, ext = os.path.splitext(filename)
        unique_filename = f"{name}_{timestamp}{ext}"
        
        file_path = os.path.join(UPLOADS_DIR, unique_filename)
        
        try:
            file.save(file_path)
            return jsonify({
                'success': True,
                'filename': unique_filename,
                'original_filename': filename,
                'size': os.path.getsize(file_path)
            })
        except Exception as e:
            return jsonify({'success': False, 'message': f'Upload failed: {str(e)}'}), 500
    
    return jsonify({'success': False, 'message': 'Invalid file type'}), 400

@app.route('/api/unit', methods=['POST'])
def create_unit():
    """Create a new unit with file upload"""
    try:
        # Get form data
        subject_key = request.form.get('subject')
        subject_display = request.form.get('subjectDisplay')
        unit_number = request.form.get('unitNumber')
        unit_title = request.form.get('unitTitle')
        unit_description = request.form.get('unitDescription')
        unit_topics = request.form.get('unitTopics')
        unit_icon = request.form.get('unitIcon', 'fas fa-book')
        pages_count = int(request.form.get('pagesCount', 0))
        
        # Handle file upload if present
        filename = None
        file_size = 0
        
        if 'file' in request.files:
            file = request.files['file']
            if file.filename and allowed_file(file.filename):
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                secure_name = secure_filename(file.filename)
                name, ext = os.path.splitext(secure_name)
                filename = f"{name}_{timestamp}{ext}"
                
                file_path = os.path.join(UPLOADS_DIR, filename)
                file.save(file_path)
                file_size = os.path.getsize(file_path)
        
        # Load existing data
        notes_data = load_notes_data()
        
        # Initialize subject if doesn't exist
        if subject_key not in notes_data:
            notes_data[subject_key] = {
                'displayName': subject_display,
                'description': f'Study materials for {subject_display}',
                'units': []
            }
        
        # Create unit object
        topics_list = [topic.strip() for topic in unit_topics.split(',') if topic.strip()]
        unit = {
            'id': int(datetime.now().timestamp() * 1000),  # Unique ID
            'number': int(unit_number) if unit_number else len(notes_data[subject_key]['units']) + 1,
            'icon': unit_icon,
            'title': unit_title,
            'description': unit_description,
            'topics': unit_topics,
            'topicsCount': len(topics_list),
            'pagesCount': pages_count,
            'fileName': filename,
            'fileSize': file_size,
            'createdAt': datetime.now().isoformat()
        }
        
        # Add unit to subject
        notes_data[subject_key]['units'].append(unit)
        
        # Sort units by number
        notes_data[subject_key]['units'].sort(key=lambda x: int(x['number']))
        
        # Save data
        if save_notes_data(notes_data):
            return jsonify({
                'success': True,
                'message': f'Unit "{unit_title}" created successfully',
                'unit': unit
            })
        else:
            return jsonify({'success': False, 'message': 'Failed to save unit data'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/download/<filename>')
def download_file(filename):
    """Download files from storage directory"""
    try:
        file_path = os.path.join(UPLOADS_DIR, filename)
        if os.path.exists(file_path):
            return send_file(file_path, as_attachment=True)
        else:
            return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/unit/<subject_key>/<int:unit_id>', methods=['DELETE'])
def delete_unit(subject_key, unit_id):
    """Delete a unit and its associated file"""
    try:
        notes_data = load_notes_data()
        
        if subject_key not in notes_data:
            return jsonify({'success': False, 'message': 'Subject not found'}), 404
        
        units = notes_data[subject_key]['units']
        unit_to_delete = None
        
        # Find and remove unit
        for i, unit in enumerate(units):
            if unit['id'] == unit_id:
                unit_to_delete = units.pop(i)
                break
        
        if not unit_to_delete:
            return jsonify({'success': False, 'message': 'Unit not found'}), 404
        
        # Delete associated file if exists
        if unit_to_delete.get('fileName'):
            file_path = os.path.join(UPLOADS_DIR, unit_to_delete['fileName'])
            if os.path.exists(file_path):
                os.remove(file_path)
        
        # Remove subject if no units left
        if len(notes_data[subject_key]['units']) == 0:
            del notes_data[subject_key]
        
        # Save updated data
        if save_notes_data(notes_data):
            return jsonify({'success': True, 'message': 'Unit deleted successfully'})
        else:
            return jsonify({'success': False, 'message': 'Failed to save changes'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/stats')
def get_stats():
    """Get platform statistics"""
    try:
        notes_data = load_notes_data()
        
        total_subjects = len(notes_data)
        total_units = sum(len(subject['units']) for subject in notes_data.values())
        total_files = 0
        total_size = 0
        
        # Calculate file stats
        for subject in notes_data.values():
            for unit in subject['units']:
                if unit.get('fileName'):
                    file_path = os.path.join(UPLOADS_DIR, unit['fileName'])
                    if os.path.exists(file_path):
                        total_files += 1
                        total_size += os.path.getsize(file_path)
        
        return jsonify({
            'totalSubjects': total_subjects,
            'totalUnits': total_units,
            'totalFiles': total_files,
            'totalSize': total_size,
            'lastUpdated': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5001)