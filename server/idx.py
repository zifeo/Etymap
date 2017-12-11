from .data import word_lang_idx, synonyms_idx, parents_idx
from typing import Dict, List, Tuple


def langsFor(word: str) -> List[Dict[str, str]]:
    return word_lang_idx.get(word)


def synonymsFor(word: str) -> List[Tuple[str, str]]:
    return synonyms_idx.get(word, [])


def parentsFor(lang: str, word: str) -> List[Tuple[str, ...]]:

    def recurse(lang_word):
        ps = parents_idx.get(lang_word, [])
        return [(p.split(':'), recurse(p)) for p in ps]

    return recurse('{}:{}'.format(lang, word))
