from flask import Flask, send_from_directory, jsonify

from server.data import network_from_idx, network_to_idx
from .idx import langsFor, synonymsFor, parentsFor

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False


# Static pages


@app.route('/')
def index():
    return send_from_directory('../build', 'index.html')


@app.route('/process-book')
def process_book():
    return send_from_directory('../build', 'process-book.html')


@app.route('/story')
def story():
    return send_from_directory('../build', 'story.html')


# Viz api


@app.route('/search/word/<string:word>')
def word_search(word):
    word = word.lower()

    results = []
    for lang in langsFor(word):
        results.append(dict(word=word, lang=lang))

    ret = dict(
        results=results
    )
    return jsonify(ret)


@app.route('/word/<string:word>')
def word_info(word):
    word = word.lower()

    ret = dict(
        word=word,
        langs=langsFor(word),
    )
    return jsonify(ret)


@app.route('/word/<string:word>/<string:lang>')
def word_lang_info(word, lang):
    word = word.lower()
    lang = lang.lower()

    ret = dict(
        word=word,
        lang=lang,
        synonyms=synonymsFor(word),
        langs=langsFor(word),
        parents=parentsFor(lang, word),
    )
    return jsonify(ret)


# Static files


@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('../build', path)

