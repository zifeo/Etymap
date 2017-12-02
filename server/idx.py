from .data import word_lang_idx
from typing import Dict, List


def langsFor(word: str) -> List[Dict[str, str]]:
    res = []

    if word in word_lang_idx:
        res = [dict(word=word, lang=lang) for lang in word_lang_idx[word]]

    return res