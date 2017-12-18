from flask import Flask, send_from_directory, jsonify

from .idx import langs_for, meanings_for, parents_for, relation_samples_for, lang_samples_for, children_for

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


@app.route('/lang/<string:lang>')
def lang_info(lang):
    lang = lang.lower()

    ret = dict(
        lang=lang,
        samples=lang_samples_for(lang),
    )
    return jsonify(ret)


@app.route('/relation/<string:lang_src>/<string:lang_to>')
def relation_info(lang_src, lang_to):
    lang_src = lang_src.lower()
    lang_to = lang_to.lower()

    ret = dict(
        lang_src=lang_src,
        lang_to=lang_to,
        samples=relation_samples_for(lang_src, lang_to),
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
        children=children_for(lang, word),
    )
    return jsonify(ret)


# Static files


@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('../build', path)

