from flask import Flask, send_from_directory, jsonify

from server.data import langs
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


@app.route('/search/<string:term>')
def search(term):
    term = term.lower()

    word_results = []
    lang_results = set()

    for lang in langs_for(term):
        word_results.append(dict(title=term, description=lang, id='{}:{}'.format(lang, term), type='word'))
        lang_results.add(lang)

    lang_results.update([l for l in langs if l.startswith(term)])
    lang_results = [dict(title=l, description='', id=l, type='lang') for l in lang_results]

    ret = dict(
        results=dict(
            langs=dict(
                name='langs',
                results=lang_results
            ),
            words=dict(
                name='words',
                results=word_results
            )
        ),
        success=True,
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

