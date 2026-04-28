"""
AI Image Processing Microservice
Handles image enhancement, background removal, and other image operations
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import uuid
from PIL import Image, ImageEnhance, ImageFilter
import io
import base64
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = 'uploads'
PROCESSED_FOLDER = 'processed'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['PROCESSED_FOLDER'] = PROCESSED_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def enhance_image(image_path, operations):
    """
    Apply image enhancement operations
    operations: list of strings ['enhance', 'sharpen', 'brightness', 'contrast']
    """
    try:
        img = Image.open(image_path)
        
        for operation in operations:
            if operation == 'enhance':
                enhancer = ImageEnhance.Sharpness(img)
                img = enhancer.enhance(1.5)
            elif operation == 'sharpen':
                img = img.filter(ImageFilter.SHARPEN)
            elif operation == 'brightness':
                enhancer = ImageEnhance.Brightness(img)
                img = enhancer.enhance(1.2)
            elif operation == 'contrast':
                enhancer = ImageEnhance.Contrast(img)
                img = enhancer.enhance(1.2)
            elif operation == 'color':
                enhancer = ImageEnhance.Color(img)
                img = enhancer.enhance(1.2)
        
        return img
    except Exception as e:
        raise Exception(f"Image enhancement failed: {str(e)}")


def remove_background(image_path):
    """
    Remove background from image
    Note: This is a simplified version. For production, use libraries like rembg or AI models
    """
    try:
        img = Image.open(image_path)
        
        # Convert to RGBA if not already
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # Simple background removal based on white background
        # In production, use ML-based background removal
        datas = img.getdata()
        new_data = []
        
        for item in datas:
            # If pixel is white or near-white, make it transparent
            if item[0] > 240 and item[1] > 240 and item[2] > 240:
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append(item)
        
        img.putdata(new_data)
        return img
    except Exception as e:
        raise Exception(f"Background removal failed: {str(e)}")


def resize_image(image_path, width=None, height=None, maintain_aspect=True):
    """
    Resize image to specified dimensions
    """
    try:
        img = Image.open(image_path)
        original_width, original_height = img.size
        
        if width and height:
            if maintain_aspect:
                # Calculate aspect ratio
                ratio = min(width / original_width, height / original_height)
                new_width = int(original_width * ratio)
                new_height = int(original_height * ratio)
            else:
                new_width = width
                new_height = height
        elif width:
            ratio = width / original_width
            new_width = width
            new_height = int(original_height * ratio)
        elif height:
            ratio = height / original_height
            new_height = height
            new_width = int(original_width * ratio)
        else:
            return img
        
        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        return img
    except Exception as e:
        raise Exception(f"Image resize failed: {str(e)}")


@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'image-processor'})


@app.route('/process', methods=['POST'])
def process_image():
    """
    Process image with specified operations
    Request body: {
        'image': base64 encoded image or file upload,
        'operations': ['enhance', 'background-removal', 'resize'],
        'width': optional width for resize,
        'height': optional height for resize
    }
    """
    try:
        data = request.json
        operations = data.get('operations', [])
        width = data.get('width')
        height = data.get('height')
        
        # Handle base64 image
        if 'image' in data:
            image_data = base64.b64decode(data['image'])
            img = Image.open(io.BytesIO(image_data))
            
            # Save temporarily
            temp_filename = f"temp_{uuid.uuid4().hex}.png"
            temp_path = os.path.join(app.config['UPLOAD_FOLDER'], temp_filename)
            img.save(temp_path)
        else:
            return jsonify({'error': 'No image provided'}), 400
        
        # Apply operations
        processed_img = img
        for operation in operations:
            if operation == 'background-removal':
                processed_img = remove_background(temp_path)
            elif operation == 'resize':
                processed_img = resize_image(temp_path, width, height)
            elif operation in ['enhance', 'sharpen', 'brightness', 'contrast', 'color']:
                processed_img = enhance_image(temp_path, [operation])
        
        # Save processed image
        processed_filename = f"processed_{uuid.uuid4().hex}.png"
        processed_path = os.path.join(app.config['PROCESSED_FOLDER'], processed_filename)
        processed_img.save(processed_path, 'PNG')
        
        # Convert to base64 for response
        with open(processed_path, 'rb') as f:
            processed_base64 = base64.b64encode(f.read()).decode('utf-8')
        
        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        return jsonify({
            'success': True,
            'processed_image': processed_base64,
            'filename': processed_filename,
            'operations_applied': operations
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/enhance', methods=['POST'])
def enhance():
    """Quick enhance endpoint"""
    return process_image()


@app.route('/remove-background', methods=['POST'])
def remove_bg():
    """Remove background endpoint"""
    data = request.json
    data['operations'] = ['background-removal']
    return process_image()


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
