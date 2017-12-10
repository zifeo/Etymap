from flask import Flask, send_from_directory, jsonify

from server.data import network_from_idx, network_to_idx
from .idx import langsFor, synsFor

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False


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
        syn=synsFor(word),
        hom=[],
        lang=langsFor(word)
    )
    return jsonify(ret)


@app.route('/network/from')
def network_from():
    return jsonify(network_from_idx)


@app.route('/network/to')
def network_to():
    return jsonify(network_to_idx)


@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('../build', path)

