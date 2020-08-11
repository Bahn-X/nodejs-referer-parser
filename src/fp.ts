import querystring from 'querystring';
import url from 'url';
import { buildLookup } from './lookup';
import { REFERERS } from './referers';
import { emptyReferer, Parse, ParsedReferer, RefererParams, SearchParameters } from './types';

const extractSearchParameters = (
  referer: RefererParams | null,
  refererURI: url.UrlWithStringQuery
): SearchParameters => {
  if (!referer || referer.medium !== 'search' || !referer.params) return { searchParameter: null, searchTerm: null };
  const pqs = querystring.parse(refererURI.query || '');
  const result = referer.params
    .map((d: string) => [d, pqs[d]])
    .filter(([, v]) => !!v)
    .reverse()[0];

  return {
    searchParameter: (result && result[0]) || null,
    searchTerm: (result && result[1]) || null,
  };
};

const checkInternal = (currentUrl: string | null, refererHost: string) => {
  const internal = url.parse(currentUrl || '').hostname;
  const isInternal = currentUrl && refererHost === internal;
  return isInternal ? 'internal' : null;
};

const extractKnown = (refererURI: url.UrlWithStringQuery) => ['http:', 'https:'].includes(refererURI.protocol || '');

const extractReferer = (referers) => {
  const lookupReferer = buildLookup(referers);
  return (refererHost: string, refererURI: url.UrlWithStringQuery): RefererParams | null =>
    lookupReferer(refererHost, refererURI.pathname || '', true) ||
    lookupReferer(refererHost, refererURI.pathname || '', false);
};
const parse: Parse = (referers = REFERERS) => {
  const lookup = extractReferer(referers);
  return (currentUrl: string | null = null) => {
    return (refererURL: string): ParsedReferer => {
      const refererURI = url.parse(refererURL);
      const refererHost = refererURI.hostname || '';
      const referer = lookup(refererHost, refererURI);

      return {
        ...emptyReferer,
        uri: refererURI,
        known: extractKnown(refererURI),
        medium: checkInternal(currentUrl, refererHost) || referer?.medium || 'unkown',
        referer: referer?.name || null,
        ...extractSearchParameters(referer, refererURI),
      };
    };
  };
};

export default parse;
