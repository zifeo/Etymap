# Etymap

## Getting started

Install Livereload [extension](http://livereload.com/extensions/).

```shell
pip3 install -r requirements.txt
yarn
yarn start dev
```

Go to [localhost:5000](http://localhost:5000).

## Proposal

We are planning to build an interactive map which illustrates the etymology of words. Etymology is a subject which spans across time and space, and therefore creates a challenging and interesting problem to visualize.

In short, the main feature will allow the user to pick a word (or a group of words) and see its etymology as an insight (paths, directions, ancestors, periods, etc.) on the map. There are other interesting opportunities, for example, we could show words with different meanings which share a part of their etymology or other relations with them (synonyms, antonyms, homonyms).

The target audience would be linguists, historians and more generally anyone curious about the words we use everyday. 

Some similar work can be found on the "etymology maps" subreddit (https://www.reddit.com/r/etymologymaps/). However most the vizualisation are not interactive and only project one aspect of the data.

## Datasets

http://www1.icsi.berkeley.edu/~demelo/etymwn/

This dataset describes the relations between words: derivations (from or to), etymological relations and variations. We will also use other ISO datasets to get the mappings between language codes to their actual name.

## References

http://www1.icsi.berkeley.edu/~demelo/etymwn/
https://www.wiktionary.org/
