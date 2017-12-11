import json
import os

current_dir = os.path.dirname(__file__)


def open_data(name):
    return open(os.path.join(current_dir, '../data', name), 'r', encoding='utf-8')


with open_data('word_lang.json') as f:
    word_lang_idx = json.load(f)

with open_data('network_from.json') as f:
    network_from_idx = json.load(f)

with open_data('network_to.json') as f:
    network_to_idx = json.load(f)

with open_data('syns.json') as f:
    synonyms_idx = json.load(f)

with open_data('parents.json') as f:
    parents_idx = json.load(f)

