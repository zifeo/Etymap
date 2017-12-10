from .data import word_lang_idx, syns_idx
from typing import Dict, List


def langsFor(word: str) -> List[Dict[str, str]]:
    res = []

    if word in word_lang_idx:
        res = [[lang, word] for lang in word_lang_idx[word]]

    return res


def synsFor(word: str) -> List[Dict[str, str]]:
    return syns_idx.get(word, [])