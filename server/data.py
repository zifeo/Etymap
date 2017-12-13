import json
import os

current_dir = os.path.dirname(__file__)


def open_data(name):
    return open(os.path.join(current_dir, '../data/out.{}'.format(name)), 'r', encoding='utf-8')


with open_data('word_langs.json') as f:
    word_langs_idx = json.load(f)

with open_data('word_meanings.json') as f:
    word_meanings_idx = json.load(f)

with open_data('word_parents.json') as f:
    word_parents_idx = json.load(f)

