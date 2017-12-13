from flask import Flask, send_from_directory, jsonify

from .idx import langs_for, meanings_for, parents_for

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
    for lang in langs_for(word):
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
        langs=langs_for(word),
    )
    return jsonify(ret)


@app.route('/word/<string:word>/<string:lang>')
def word_lang_info(word, lang):
    word = word.lower()
    lang = lang.lower()

    langs = langs_for(word)

    if lang not in langs:
        return jsonify({}), 404

    meanings = meanings_for(lang, word)
    translations = [[l, w] for l, w in meanings if l != lang]
    synonyms = [[l, w] for l, w in meanings if l == lang]

    ret = dict(
        word=word,
        lang=lang,
        synonyms=synonyms,
        translations=translations,
        langs=langs,
        parents=parents_for(lang, word),
    )
    return jsonify(ret)


# Static files


@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('../build', path)

