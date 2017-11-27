from flask import Flask, send_from_directory

app = Flask(__name__)

@app.route('/')
def index():
    return send_from_directory('../build', 'index.html')

@app.route('/process-book')
def process_book():
    return send_from_directory('../build', 'process-book.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('../build', path)

