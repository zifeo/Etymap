type WordInfo = {
  syn: Array<string>,
  ant: Array<string>,
  hom: Array<string>,
  lang: Array<string>,
};

const word_info_url = '/word';

const defaultConfig = {
  headers: {
    Accept: 'application/json',
    'Accept-Charset': 'utf-8',
    'Cache-Control': 'no-cache', // chrome don't support fetch cache yet
  },
  cache: 'no-store', // to avoid Navigator caching errors
  mode: 'cors', // allow cross-origin
  credentials: 'omit',
  compress: true,
};

class Api {
  static async getDummyDataFor(word): Promise<WordInfo> {
    const config = {
      ...defaultConfig,
      method: 'GET',
    };

    return fetch(`${word_info_url}/${word}`, config).then(res => res.json());
  }

  static async getWordData(word, lang): Promise<WordInfo> {
    const config = {
      ...defaultConfig,
      method: 'GET',
    };

    return fetch(`${word_info_url}/${word}/${lang}`, config).then(res => res.json());
  }
}

export default Api;
