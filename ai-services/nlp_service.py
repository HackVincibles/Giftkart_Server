"""
AI NLP Microservice
Handles natural language processing for sentiment analysis, text generation, and more
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import uuid
from textblob import TextBlob
import re
from collections import Counter

app = Flask(__name__)
CORS(app)


def analyze_sentiment(text):
    """
    Analyze sentiment of text
    Returns: polarity (-1 to 1), subjectivity (0 to 1)
    """
    try:
        blob = TextBlob(text)
        return {
            'polarity': blob.sentiment.polarity,
            'subjectivity': blob.sentiment.subjectivity,
            'sentiment': 'positive' if blob.sentiment.polarity > 0 else 'negative' if blob.sentiment.polarity < 0 else 'neutral'
        }
    except Exception as e:
        raise Exception(f"Sentiment analysis failed: {str(e)}")


def extract_keywords(text, num_keywords=5):
    """
    Extract important keywords from text
    """
    try:
        blob = TextBlob(text)
        # Get noun phrases as keywords
        noun_phrases = blob.noun_phrases
        # Get word frequencies
        words = [word.lower() for word in blob.words if len(word) > 3]
        word_freq = Counter(words)
        
        keywords = []
        for word, freq in word_freq.most_common(num_keywords):
            keywords.append({'word': word, 'frequency': freq})
        
        return {
            'keywords': keywords,
            'noun_phrases': list(noun_phrases)[:num_keywords]
        }
    except Exception as e:
        raise Exception(f"Keyword extraction failed: {str(e)}")


def detect_emotion(text):
    """
    Detect emotion from text using keyword matching
    """
    emotion_keywords = {
        'love': ['love', 'adore', 'cherish', 'romantic', 'heart', 'affection', 'passion'],
        'joy': ['happy', 'joy', 'excited', 'thrilled', 'delighted', 'cheerful', 'elated'],
        'gratitude': ['thank', 'grateful', 'appreciate', 'thankful', 'blessed', 'gracious'],
        'nostalgia': ['remember', 'memory', 'past', 'childhood', 'old', 'vintage', 'retro'],
        'admiration': ['admire', 'inspire', 'role model', 'look up to', 'respect', 'honor'],
        'sympathy': ['sorry', 'comfort', 'support', 'difficult', 'hard', 'struggle'],
        'excitement': ['excited', 'thrilled', 'pumped', 'can\'t wait', 'eager', 'anticipate'],
        'pride': ['proud', 'achievement', 'accomplished', 'success', 'proud of']
    }
    
    text_lower = text.lower()
    emotion_scores = {}
    
    for emotion, keywords in emotion_keywords.items():
        score = sum(1 for keyword in keywords if keyword in text_lower)
        if score > 0:
            emotion_scores[emotion] = score
    
    if not emotion_scores:
        return {'primary_emotion': 'neutral', 'all_emotions': []}
    
    primary_emotion = max(emotion_scores, key=emotion_scores.get)
    
    return {
        'primary_emotion': primary_emotion,
        'all_emotions': list(emotion_scores.keys()),
        'scores': emotion_scores
    }


def generate_message_template(recipient_name, relationship, occasion, tone):
    """
    Generate a message template based on inputs
    """
    templates = {
        'emotional': {
            'birthday': f"Dear {recipient_name},\n\nHappy Birthday! As your {relationship}, I wanted to take a moment to celebrate you and all the joy you bring into my life. May this year be filled with love, laughter, and all your heart desires.\n\nWith love,\n[Your Name]",
            'anniversary': f"Dear {recipient_name},\n\nHappy Anniversary! Celebrating another year together as {relationship}s brings so much happiness. You make every day special, and I'm grateful for every moment we share.\n\nWith love,\n[Your Name]"
        },
        'funny': {
            'birthday': f"Hey {recipient_name}!\n\nHappy Birthday! 🎉\n\nI was going to get you something serious, but then I remembered you're my {relationship} and you deserve something as awesome as you are!\n\nEnjoy this gift - it's almost as cool as you are (almost!)\n\nCheers!\n[Your Name]",
            'anniversary': f"Happy Anniversary, {recipient_name}!\n\nAnother year together and we haven't killed each other yet! That's worth celebrating, right?\n\nLove you, my amazing {relationship}!\n[Your Name]"
        },
        'romantic': {
            'birthday': f"My dearest {recipient_name},\n\nOn your special day, my heart is full of love for you. As my {relationship}, you've made every moment more beautiful and every memory more precious.\n\nHappy Birthday, my love.\nForever yours,\n[Your Name]",
            'anniversary': f"To my beloved {recipient_name},\n\nAnother year of love, laughter, and beautiful memories. You are my heart, my soul, my everything.\n\nHappy Anniversary, my love.\nForever yours,\n[Your Name]"
        }
    }
    
    if tone not in templates:
        tone = 'emotional'
    
    if occasion not in templates[tone]:
        occasion = 'birthday'
    
    return templates[tone][occasion]


@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'nlp-service'})


@app.route('/analyze-sentiment', methods=['POST'])
def analyze_sentiment_endpoint():
    """
    Analyze sentiment of text
    Request body: {'text': 'your text here'}
    """
    try:
        data = request.json
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        result = analyze_sentiment(text)
        return jsonify({'success': True, 'data': result})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/extract-keywords', methods=['POST'])
def extract_keywords_endpoint():
    """
    Extract keywords from text
    Request body: {'text': 'your text here', 'num_keywords': 5}
    """
    try:
        data = request.json
        text = data.get('text', '')
        num_keywords = data.get('num_keywords', 5)
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        result = extract_keywords(text, num_keywords)
        return jsonify({'success': True, 'data': result})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/detect-emotion', methods=['POST'])
def detect_emotion_endpoint():
    """
    Detect emotion from text
    Request body: {'text': 'your text here'}
    """
    try:
        data = request.json
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        result = detect_emotion(text)
        return jsonify({'success': True, 'data': result})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/generate-message', methods=['POST'])
def generate_message_endpoint():
    """
    Generate a message template
    Request body: {
        'recipient_name': 'John',
        'relationship': 'friend',
        'occasion': 'birthday',
        'tone': 'emotional'
    }
    """
    try:
        data = request.json
        recipient_name = data.get('recipient_name', 'Friend')
        relationship = data.get('relationship', 'friend')
        occasion = data.get('occasion', 'birthday')
        tone = data.get('tone', 'emotional')
        
        message = generate_message_template(recipient_name, relationship, occasion, tone)
        
        return jsonify({
            'success': True,
            'data': {
                'message': message,
                'recipient_name': recipient_name,
                'relationship': relationship,
                'occasion': occasion,
                'tone': tone
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/analyze-gift-query', methods=['POST'])
def analyze_gift_query():
    """
    Comprehensive analysis of gift query
    Request body: {'query': 'I need a gift for my mom who loves gardening'}
    """
    try:
        data = request.json
        query = data.get('query', '')
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400
        
        # Run all analyses
        sentiment = analyze_sentiment(query)
        keywords = extract_keywords(query, 10)
        emotion = detect_emotion(query)
        
        return jsonify({
            'success': True,
            'data': {
                'query': query,
                'sentiment': sentiment,
                'keywords': keywords,
                'emotion': emotion
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True)
