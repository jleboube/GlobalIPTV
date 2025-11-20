import { CountryData, GeoCountry, Channel } from '../types';
import { COUNTRY_COORDINATES } from '../constants';

const COUNTRIES_API_URL = 'https://iptv-org.github.io/api/countries.json';

export const fetchCountries = async (): Promise<GeoCountry[]> => {
  try {
    const response = await fetch(COUNTRIES_API_URL);
    if (!response.ok) {
      throw new Error('Failed to fetch countries');
    }
    const countries: CountryData[] = await response.json();

    // Map to GeoCountry by adding lat/lng from constants
    const geoCountries: GeoCountry[] = countries
      .filter((c) => COUNTRY_COORDINATES[c.code]) // Only keep ones we have coords for
      .map((c) => ({
        ...c,
        ...COUNTRY_COORDINATES[c.code],
        channelCount: Math.floor(Math.random() * 50) + 5, // Mock count for visualization density until clicked
      }));

    return geoCountries;
  } catch (error) {
    console.error('Error fetching countries:', error);
    return [];
  }
};

export const fetchChannelsForCountry = async (countryCode: string): Promise<Channel[]> => {
  // Convert to lowercase for the iptv-org URL structure
  const code = countryCode.toLowerCase();
  const url = `https://iptv-org.github.io/iptv/countries/${code}.m3u`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('No channels found for this country');
    const text = await res.text();
    return parseM3U(text);
  } catch (e) {
    console.warn(`Could not fetch channels for ${countryCode}:`, e);
    return [];
  }
};

export const testChannelUrl = async (url: string): Promise<boolean> => {
  try {
    // We abort quickly to avoid hanging the browser
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

    // Method HEAD is fastest, but some servers block it. 
    // However, if CORS is blocked, fetch throws an error regardless of method.
    // If this succeeds, it means the server is reachable AND allows CORS (or we are in a permissible mode).
    const response = await fetch(url, { 
      method: 'HEAD', 
      signal: controller.signal 
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    // If fetch throws, it's either a network error or a CORS error.
    // In either case, the web player will likely fail to play it.
    return false;
  }
};

const parseM3U = (content: string): Channel[] => {
  const lines = content.split('\n');
  const channels: Channel[] = [];
  const isHttps = window.location.protocol === 'https:';
  
  // Helper to extract attribute value safely
  const getAttr = (line: string, attr: string) => {
    // Try matching with quotes first
    let regex = new RegExp(`${attr}="([^"]*)"`, 'i');
    let match = line.match(regex);
    if (match) return match[1];
    
    // Try matching without quotes (rare but possible)
    regex = new RegExp(`${attr}=([^\\s,]*)`, 'i');
    match = line.match(regex);
    return match ? match[1] : undefined;
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (line.startsWith('#EXTINF:')) {
      // The next non-empty, non-comment line should be the URL
      let url = '';
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (nextLine && !nextLine.startsWith('#')) {
          url = nextLine;
          i = j; // Advance outer loop
          break;
        }
      }

      if (url) {
        // 1. PROTOCOL FILTER:
        // If we are on HTTPS, HTTP streams will fail due to Mixed Content security policies.
        if (isHttps && url.startsWith('http:')) {
          continue; 
        }

        // 2. FORMAT FILTER:
        // Web browsers generally only play .m3u8 (HLS) or .mp4.
        // .ts, .mkv, .rtmp will almost certainly fail in a standard web player without transcoding.
        const lowerUrl = url.toLowerCase();
        const isWebCompatible = lowerUrl.includes('.m3u8') || lowerUrl.includes('.mp4');

        if (!isWebCompatible) {
          continue;
        }

        const logo = getAttr(line, 'tvg-logo');
        const group = getAttr(line, 'group-title');
        
        // Name is everything after the last comma
        const nameParts = line.split(',');
        const rawName = nameParts.length > 1 ? nameParts[nameParts.length - 1].trim() : 'Unknown Channel';
        
        // Clean up name (remove brackets/parentheses sometimes found)
        const name = rawName.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();

        channels.push({
          id: Math.random().toString(36).substr(2, 9),
          name: name || rawName,
          streamUrl: url,
          logo: logo,
          categories: group ? [group] : [],
          status: 'unknown', // Default state
        });
      }
    }
  }
  return channels;
};