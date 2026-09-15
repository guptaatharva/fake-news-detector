import { describe, it, expect } from 'vitest';
import {
  getPublisherEntity,
  countIndependentPublishers,
  hasLowPublisherDiversity,
  normalizeDomain,
} from './mediaOwnership';

describe('mediaOwnership', () => {
  describe('normalizeDomain', () => {
    it('strips protocol, www, and ports', () => {
      expect(normalizeDomain('https://www.reuters.com/world/')).toBe('reuters.com');
      expect(normalizeDomain('http://economictimes.indiatimes.com:8080')).toBe('economictimes.indiatimes.com');
    });
  });

  describe('getPublisherEntity', () => {
    it('maps known conglomerates accurately', () => {
      expect(getPublisherEntity('moneycontrol.com')).toBe('network18');
      expect(getPublisherEntity('news18.com')).toBe('network18');
      expect(getPublisherEntity('firstpost.com')).toBe('network18');

      expect(getPublisherEntity('timesofindia.indiatimes.com')).toBe('times-group');
      expect(getPublisherEntity('economictimes.indiatimes.com')).toBe('times-group');

      expect(getPublisherEntity('wsj.com')).toBe('news-corp');
      expect(getPublisherEntity('nypost.com')).toBe('news-corp');

      expect(getPublisherEntity('hindustantimes.com')).toBe('ht-media');
      expect(getPublisherEntity('livemint.com')).toBe('ht-media');

      expect(getPublisherEntity('cnbc.com')).toBe('nbcuniversal');
      expect(getPublisherEntity('nbcnews.com')).toBe('nbcuniversal');
    });

    it('falls back to root domain for unregistered independent domains', () => {
      expect(getPublisherEntity('reuters.com')).toBe('reuters.com');
      expect(getPublisherEntity('apnews.com')).toBe('apnews.com');
      expect(getPublisherEntity('subdomain.theguardian.com')).toBe('theguardian.com');
      expect(getPublisherEntity('bbc.co.uk')).toBe('bbc.co.uk');
    });
  });

  describe('countIndependentPublishers & hasLowPublisherDiversity', () => {
    it('treats domains from the same conglomerate as 1 independent publisher', () => {
      const sameConglomerate = ['moneycontrol.com', 'news18.com', 'firstpost.com'];
      expect(countIndependentPublishers(sameConglomerate)).toBe(1);
      expect(hasLowPublisherDiversity(sameConglomerate)).toBe(true);

      const timesGroup = ['timesofindia.indiatimes.com', 'economictimes.indiatimes.com'];
      expect(countIndependentPublishers(timesGroup)).toBe(1);
      expect(hasLowPublisherDiversity(timesGroup)).toBe(true);
    });

    it('treats domains from different organizations as independent publishers', () => {
      const differentOrgs = ['reuters.com', 'apnews.com', 'bbc.com'];
      expect(countIndependentPublishers(differentOrgs)).toBe(3);
      expect(hasLowPublisherDiversity(differentOrgs)).toBe(false);

      const crossConglomerate = ['moneycontrol.com', 'livemint.com'];
      expect(countIndependentPublishers(crossConglomerate)).toBe(2);
      expect(hasLowPublisherDiversity(crossConglomerate)).toBe(false);
    });
  });
});
