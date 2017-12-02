from flask import Flask, send_from_directory, jsonify
from .data import word_lang_idx

app = Flask(__name__)

@app.route('/')
def index():
    return send_from_directory('../build', 'index.html')

@app.route('/process-book')
def process_book():
    return send_from_directory('../build', 'process-book.html')

@app.route('/word/<string:word>')
def word_info(word):
    res = []
    word = word.lower()
    if word in word_lang_idx:
        res = [dict(word=word, lang=lang) for lang in word_lang_idx[word]]
    return jsonify(dict(results=res))

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('../build', path)

