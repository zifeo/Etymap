from .data import word_langs_idx, word_meanings_idx, word_parents_idx
from typing import Dict, List, Tuple


def langs_for(word: str) -> List[Dict[str, str]]:
    return word_langs_idx.get(word, [])


def meanings_for(lang: str, word: str) -> List[Tuple[str, str]]:
    word_lang = '{}:{}'.format(lang, word)
    return [m.split(':') for m in word_meanings_idx.get(word_lang, [])]


def parents_for(lang: str, word: str) -> List[Tuple[str, ...]]:

    def recurse(lang_word):
        ps = word_parents_idx.get(lang_word, [])
        return [(p.split(':'), recurse(p)) for p in ps]

    word_lang = '{}:{}'.format(lang, word)
    return recurse(word_lang)
