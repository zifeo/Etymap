from .data import word_langs_idx, word_meanings_idx, word_parents_idx, word_children_idx, lang_samples_idx, \
    relation_samples_idx
from typing import Dict, List, Tuple


def langs_for(word: str) -> List[Dict[str, str]]:
    return word_langs_idx.get(word, [])


def meanings_for(lang: str, word: str) -> List[Tuple[str, str]]:
    word_lang = '{}:{}'.format(lang, word)
    return [m.split(':') for m in word_meanings_idx.get(word_lang, [])]


def parents_for(lang: str, word: str) -> List[Tuple[str, ...]]:
    word_lang = '{}:{}'.format(lang, word)
    return recurse(word_lang, word_parents_idx)


def children_for(lang: str, word: str) -> List[Tuple[str, ...]]:
    word_lang = '{}:{}'.format(lang, word)
    return recurse(word_lang, word_children_idx)


def lang_samples_for(lang: str) -> List[str]:
    return lang_samples_idx.get(lang, [])


def relation_samples_for(lang_src: str, lang_to: str) -> List[str]:
    relation = '{}{}'.format(lang_src, lang_to)
    return relation_samples_idx.get(relation, [])


def recurse(lang_word, mapping, seen=None):
    if seen is None:
        seen = set()

    if lang_word in seen:
        return []

    seen.add(lang_word)
    ps = mapping.get(lang_word, [])
    return [(p.split(':'), recurse(p, mapping, seen.copy())) for p in ps]