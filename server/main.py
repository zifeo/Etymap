from flask import Flask, send_from_directory

app = Flask(__name__)

@app.route('/')
def index():
    return send_from_directory('../build', 'index.html')

@app.route('/processbook')
def index():
    return send_from_directory('../build', 'index.html')


@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('../build', path)

