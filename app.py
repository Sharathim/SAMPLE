from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_file
import json
import os
from werkzeug.utils import secure_filename
from werkzeug.security import check_password_hash, generate_password_hash
import uuid
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'  # Change this to a secure secret key

# Configuration
UPLOAD_FOLDER = 'storage'
ALLOWED_EXTENSIONS = {'pdf', 'pptx', 'docx', 'txt', 'doc'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Admin credentials (you should move this to a secure config file)
ADMIN_CREDENTIALS = {
    'year_1': {
        'username': 'admin1',
        'password': generate_password_hash('password1')  # Change these passwords
    },
    'year_2': {
        'username': 'admin2', 
        'password': generate_password_hash('password2')
    },
    'year_3': {
        'username': 'admin3',
        'password': generate_password_hash('password3')
    }
}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_data_path(year, semester):
    """Get the path to the data.json file for given year and semester"""
    return os.path.join(UPLOAD_FOLDER, f'year_{year}', f'{semester}sem', 'data.json')

def ensure_directory_exists(path):
    """Create directory if it doesn't exist"""
    os.makedirs(path, exist_ok=True)

def load_data(year, semester):
    """Load data from JSON file"""
    data_path = get_data_path(year, semester)
    
    if not os.path.exists(data_path):
        # Create default structure if file doesn't exist
        ensure_directory_exists(os.path.dirname(data_path))
        default_data = {
            "subjects": [],
            "stats": {
                "total_subjects": 0,
                "total_files": 0,
                "total_visits": 0,
                "total_downloads": 0,
                "storage_used": "0 MB",
                "last_updated": datetime.now().isoformat()
            }
        }
        save_data(year, semester, default_data)
        return default_data
    
    try:
        with open(data_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return {"subjects": [], "stats": {"total_subjects": 0, "total_files": 0, "total_visits": 0, "total_downloads": 0, "storage_used": "0 MB"}}

def save_data(year, semester, data):
    """Save data to JSON file"""
    data_path = get_data_path(year, semester)
    ensure_directory_exists(os.path.dirname(data_path))
    
    # Update stats
    if 'stats' in data:
        data['stats']['last_updated'] = datetime.now().isoformat()
        data['stats']['total_subjects'] = len(data.get('subjects', []))
        total_files = sum(len(subject.get('units', [])) for subject in data.get('subjects', []))
        data['stats']['total_files'] = total_files
    
    with open(data_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

@app.route('/')
def index():
    """Main index page where users select department, year, and semester"""
    return render_template('index.html')

@app.route('/subjects')
def subjects():
    """Subject selection page - shows subjects based on user selection"""
    department = request.args.get('department')
    year = request.args.get('year')
    semester = request.args.get('semester')
    
    if not all([department, year, semester]):
        return redirect(url_for('index'))
    
    # Store user selection in session
    session['department'] = department
    session['year'] = year
    session['semester'] = semester
    
    # Load data for the selected year and semester
    data = load_data(year, semester)
    
    # Increment visit count
    data['stats']['total_visits'] = data['stats'].get('total_visits', 0) + 1
    save_data(year, semester, data)
    
    return render_template('subject.html', 
                         subjects=data['subjects'], 
                         department=department,
                         year=year,
                         semester=semester)

@app.route('/admin/login', methods=['POST'])
def admin_login():
    """Handle admin login"""
    username = request.json.get('username')
    password = request.json.get('password')
    
    # Get year from session (user must have selected it on index page)
    year = session.get('year')
    if not year:
        return jsonify({'success': False, 'message': 'Please select year first'})
    
    admin_key = f'year_{year}'
    if admin_key in ADMIN_CREDENTIALS:
        admin_creds = ADMIN_CREDENTIALS[admin_key]
        if username == admin_creds['username'] and check_password_hash(admin_creds['password'], password):
            session['admin_logged_in'] = True
            session['admin_year'] = year
            return jsonify({'success': True})
    
    return jsonify({'success': False, 'message': 'Invalid credentials'})

@app.route('/admin')
def admin_panel():
    """Admin panel - requires admin login"""
    if not session.get('admin_logged_in'):
        return redirect(url_for('subjects'))
    
    year = session.get('admin_year') or session.get('year')
    semester = session.get('semester')
    
    if not all([year, semester]):
        return redirect(url_for('index'))
    
    data = load_data(year, semester)
    return render_template('admin.html', subjects=data['subjects'],stats=data['stats'],year=year, semester=semester)

@app.route('/admin/add_subject', methods=['POST'])
def add_subject():
    """Add new subject"""
    if not session.get('admin_logged_in'):
        return jsonify({'success': False, 'message': 'Not authorized'})
    
    year = session.get('admin_year') or session.get('year')
    semester = session.get('semester')
    
    subject_name = request.json.get('subject_name')
    subject_icon = request.json.get('subject_icon', 'fas fa-book')
    
    data = load_data(year, semester)
    
    # Check if subject already exists
    if any(s['name'].lower() == subject_name.lower() for s in data['subjects']):
        return jsonify({'success': False, 'message': 'Subject already exists'})
    
    new_subject = {
        'id': str(uuid.uuid4()),
        'name': subject_name,
        'icon': subject_icon,
        'units': [],
        'created_at': datetime.now().isoformat()
    }
    
    data['subjects'].append(new_subject)
    save_data(year, semester, data)
    
    return jsonify({'success': True, 'subject': new_subject})

@app.route('/admin/add_unit', methods=['POST'])
def add_unit():
    """Add unit to subject"""
    if not session.get('admin_logged_in'):
        return jsonify({'success': False, 'message': 'Not authorized'})
    
    year = session.get('admin_year') or session.get('year')
    semester = session.get('semester')
    
    subject_id = request.form.get('subject_id')
    # Add this protection for unit_number too:
    unit_number_str = request.form.get('unit_number', '1')
    unit_number = int(unit_number_str) if unit_number_str and unit_number_str.isdigit() else 1
    unit_title = request.form.get('unit_title')
    unit_description = request.form.get('unit_description')
    topics = request.form.get('topics')
    # Replace the pages_count line with:
    pages_count_str = request.form.get('pages_count', '0')
    pages_count = int(pages_count_str) if pages_count_str and pages_count_str.isdigit() else 0
    
    # Handle file upload
    uploaded_file = request.files.get('file')
    filename = None
    
    if uploaded_file and uploaded_file.filename and allowed_file(uploaded_file.filename):
        filename = secure_filename(uploaded_file.filename)
        file_path = os.path.join(UPLOAD_FOLDER, f'year_{year}', f'{semester}sem', filename)
        ensure_directory_exists(os.path.dirname(file_path))
        uploaded_file.save(file_path)
    
    data = load_data(year, semester)
    
    # Find subject and add unit
    for subject in data['subjects']:
        if subject['id'] == subject_id:
            new_unit = {
                'id': str(uuid.uuid4()),
                'number': int(unit_number),
                'title': unit_title,
                'description': unit_description,
                'topics': topics,
                'pages_count': int(pages_count),
                'filename': filename,
                'icon': 'fas fa-file-alt',
                'created_at': datetime.now().isoformat()
            }
            subject['units'].append(new_unit)
            break
    
    save_data(year, semester, data)
    return jsonify({'success': True})

@app.route('/download/<filename>')
def download_file(filename):
    """Download file"""
    year = session.get('year')
    semester = session.get('semester')
    
    if not all([year, semester]):
        return "Invalid session", 400
    
    file_path = os.path.join(UPLOAD_FOLDER, f'year_{year}', f'{semester}sem', filename)
    
    if os.path.exists(file_path):
        # Increment download count
        data = load_data(year, semester)
        data['stats']['total_downloads'] = data['stats'].get('total_downloads', 0) + 1
        save_data(year, semester, data)
        
        return send_file(file_path, as_attachment=True)
    
    return "File not found", 404

@app.route('/admin/delete_subject/<subject_id>', methods=['DELETE'])
def delete_subject(subject_id):
    """Delete subject and its files"""
    if not session.get('admin_logged_in'):
        return jsonify({'success': False, 'message': 'Not authorized'})
    
    year = session.get('admin_year') or session.get('year')
    semester = session.get('semester')
    
    data = load_data(year, semester)
    
    # Find and remove subject
    subject_to_remove = None
    for i, subject in enumerate(data['subjects']):
        if subject['id'] == subject_id:
            subject_to_remove = data['subjects'].pop(i)
            break
    
    if subject_to_remove:
        # Delete associated files
        for unit in subject_to_remove.get('units', []):
            if unit.get('filename'):
                file_path = os.path.join(UPLOAD_FOLDER, f'year_{year}', f'{semester}sem', unit['filename'])
                if os.path.exists(file_path):
                    os.remove(file_path)
        
        save_data(year, semester, data)
        return jsonify({'success': True})
    
    return jsonify({'success': False, 'message': 'Subject not found'})

@app.route('/admin/logout')
def admin_logout():
    """Admin logout"""
    session.pop('admin_logged_in', None)
    session.pop('admin_year', None)
    return redirect(url_for('subjects'))

if __name__ == '__main__':
    app.run(debug=True, port=5003)
