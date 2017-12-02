import json
import os

current_dir = os.path.dirname(__file__)
word_lang_url = os.path.join(current_dir, '../data/word_lang.json')

with open(word_lang_url, 'r') as f:
    word_lang_idx = json.load(f)