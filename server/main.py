from flask import Flask, send_from_directory, jsonify
from .idx import langsFor

app = Flask(__name__)

@app.route('/')
def index():
    return send_from_directory('../build', 'index.html')

@app.route('/process-book')
def process_book():
    return send_from_directory('../build', 'process-book.html')

@app.route('/search/word/<string:word>')
def word_search(word):
    word = word.lower()

    ret = dict(
        results=langsFor(word)
    )
    return jsonify(ret)

@app.route('/word/<string:word>')
def word_info(word):
    word = word.lower()

    ret = dict(
        syn=[],
        ant=[],
        hom=[],
        lang=langsFor(word)
    )
    return jsonify(ret)

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('../build', path)

