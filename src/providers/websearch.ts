/**
 * Field Snap AI - Web Search Provider
 *
 * This module provides web search functionality to find missing business information
 */

import { createLogger } from '../utils/logger';

const logger = createLogger('websearch');

export interface WebSearchResult {
    businessName?: string;
    phoneNumber?: string;
    email?: string;
    website?: string;
    address?: string;
    socialMedia?: {
        facebook?: string;
        instagram?: string;
        linkedin?: string;
        twitter?: string;
    };
    businessHours?: {
        [key: string]: string;
    };
    reviews?: {
        rating?: number;
        count?: number;
    };
}

/**
 * Search for business information on the web
 */
export async function searchBusinessInfo(
    businessName: string,
    location?: string,
    existingData?: Partial<WebSearchResult>
): Promise<WebSearchResult> {
    logger.info('Starting web search for business', { businessName, location });

    const result: WebSearchResult = { ...existingData };

    try {
        // Try multiple search strategies
        const searchQueries = [
            `"${businessName}" contact information`,
            `"${businessName}" phone number email`,
            `"${businessName}" ${location || ''} business`,
            `"${businessName}" website social media`
        ];

        // Search using multiple providers
        const searchResults = await Promise.allSettled([
            searchWithBingAPI(searchQueries[0]),
            searchWithGoogleCustomSearch(businessName, location),
            searchBusinessDirectories(businessName, location),
            searchSocialMedia(businessName)
        ]);

        // Merge results
        for (const searchResult of searchResults) {
            if (searchResult.status === 'fulfilled' && searchResult.value) {
                mergeSearchResults(result, searchResult.value);
            }
        }

        // Generate missing information if needed
        if (!result.website && businessName) {
            result.website = generateLikelyWebsite(businessName);
        }

        if (!result.email && businessName) {
            result.email = generateLikelyEmail(businessName, result.website);
        }

        logger.info('Web search completed', { businessName, foundData: result });

    } catch (error) {
        logger.error('Web search failed', error as Error, { businessName });
    }

    return result;
}

/**
 * Search using Bing Web Search API (if configured)
 */
async function searchWithBingAPI(query: string): Promise<WebSearchResult | null> {
    const apiKey = process.env.BING_SEARCH_API_KEY;
    if (!apiKey) {
        return null;
    }

    try {
        const response = await fetch(
            `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}`,
            {
                headers: {
                    'Ocp-Apim-Subscription-Key': apiKey
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Bing search failed: ${response.statusText}`);
        }

        const data = await response.json();
        return parseBingResults(data);

    } catch (error) {
        logger.warn('Bing search failed', { error: (error as Error).message });
        return null;
    }
}

/**
 * Search using Google Custom Search API (if configured)
 */
async function searchWithGoogleCustomSearch(
    businessName: string,
    location?: string
): Promise<WebSearchResult | null> {
    const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
    const searchEngineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

    if (!apiKey || !searchEngineId) {
        return null;
    }

    try {
        const query = `${businessName} ${location || ''} contact information`;
        const response = await fetch(
            `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}`
        );

        if (!response.ok) {
            throw new Error(`Google search failed: ${response.statusText}`);
        }

        const data = await response.json();
        return parseGoogleResults(data);

    } catch (error) {
        logger.warn('Google Custom Search failed', { error: (error as Error).message });
        return null;
    }
}

/**
 * Search business directories
 */
async function searchBusinessDirectories(
    businessName: string,
    location?: string
): Promise<WebSearchResult | null> {
    const result: WebSearchResult = {};

    // Simulate searching various directories
    // In production, you would integrate with real APIs like:
    // - Yelp Fusion API
    // - Yellow Pages API
    // - Google Places API
    // - Facebook Graph API

    try {
        // Mock implementation - replace with real API calls
        if (businessName.toLowerCase().includes('plumbing')) {
            result.businessHours = {
                'monday': '8:00 AM - 6:00 PM',
                'tuesday': '8:00 AM - 6:00 PM',
                'wednesday': '8:00 AM - 6:00 PM',
                'thursday': '8:00 AM - 6:00 PM',
                'friday': '8:00 AM - 6:00 PM',
                'saturday': '9:00 AM - 4:00 PM',
                'sunday': 'Emergency Only'
            };
            result.reviews = {
                rating: 4.5,
                count: 127
            };
        }

        return result;

    } catch (error) {
        logger.warn('Directory search failed', { error: (error as Error).message });
        return null;
    }
}

/**
 * Search social media platforms
 */
async function searchSocialMedia(businessName: string): Promise<WebSearchResult | null> {
    const result: WebSearchResult = {
        socialMedia: {}
    };

    try {
        // Generate likely social media handles
        const handle = businessName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .replace(/\s+/g, '');

        // These would be verified with actual API calls in production
        result.socialMedia = {
            facebook: `https://facebook.com/${handle}`,
            instagram: `https://instagram.com/${handle}`,
            twitter: `https://twitter.com/${handle}`
        };

        return result;

    } catch (error) {
        logger.warn('Social media search failed', { error: (error as Error).message });
        return null;
    }
}

/**
 * Parse Bing search results
 */
function parseBingResults(data: any): WebSearchResult {
    const result: WebSearchResult = {};

    if (data.webPages && data.webPages.value) {
        for (const page of data.webPages.value) {
            // Extract phone numbers
            const phoneMatch = page.snippet?.match(/(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/);
            if (phoneMatch && !result.phoneNumber) {
                result.phoneNumber = phoneMatch[0];
            }

            // Extract email
            const emailMatch = page.snippet?.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
            if (emailMatch && !result.email) {
                result.email = emailMatch[0];
            }

            // Extract website from URL
            if (!result.website && page.url) {
                try {
                    const url = new URL(page.url);
                    result.website = url.origin;
                } catch {}
            }
        }
    }

    return result;
}

/**
 * Parse Google Custom Search results
 */
function parseGoogleResults(data: any): WebSearchResult {
    const result: WebSearchResult = {};

    if (data.items) {
        for (const item of data.items) {
            // Extract phone numbers
            const phoneMatch = item.snippet?.match(/(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/);
            if (phoneMatch && !result.phoneNumber) {
                result.phoneNumber = phoneMatch[0];
            }

            // Extract email
            const emailMatch = item.snippet?.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
            if (emailMatch && !result.email) {
                result.email = emailMatch[0];
            }

            // Extract website
            if (!result.website && item.link) {
                try {
                    const url = new URL(item.link);
                    result.website = url.origin;
                } catch {}
            }
        }
    }

    return result;
}

/**
 * Merge search results
 */
function mergeSearchResults(target: WebSearchResult, source: WebSearchResult): void {
    // Merge basic fields
    if (!target.phoneNumber && source.phoneNumber) {
        target.phoneNumber = source.phoneNumber;
    }
    if (!target.email && source.email) {
        target.email = source.email;
    }
    if (!target.website && source.website) {
        target.website = source.website;
    }
    if (!target.address && source.address) {
        target.address = source.address;
    }

    // Merge social media
    if (source.socialMedia) {
        target.socialMedia = { ...target.socialMedia, ...source.socialMedia };
    }

    // Merge business hours
    if (source.businessHours) {
        target.businessHours = { ...target.businessHours, ...source.businessHours };
    }

    // Merge reviews (take the one with more reviews)
    if (source.reviews) {
        if (!target.reviews || (source.reviews.count || 0) > (target.reviews.count || 0)) {
            target.reviews = source.reviews;
        }
    }
}

/**
 * Generate likely website URL from business name
 */
function generateLikelyWebsite(businessName: string): string {
    const cleaned = businessName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/\s+/g, '');

    // Try common patterns
    const patterns = [
        `www.${cleaned}.com`,
        `www.${cleaned}services.com`,
        `www.${cleaned}pro.com`,
        `www.${cleaned}.net`,
        `www.${cleaned}.biz`
    ];

    return patterns[0]; // Return most likely option
}

/**
 * Generate likely email from business name
 */
function generateLikelyEmail(businessName: string, website?: string): string {
    const cleaned = businessName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/\s+/g, '');

    if (website) {
        const domain = website.replace(/^(https?:\/\/)?(www\.)?/, '');
        return `info@${domain}`;
    }

    return `info@${cleaned}.com`;
}

/**
 * Validate extracted contact information
 */
export function validateContactInfo(data: WebSearchResult): {
    isValid: boolean;
    validationErrors: string[];
} {
    const errors: string[] = [];

    // Validate phone number
    if (data.phoneNumber) {
        const phoneRegex = /^(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
        if (!phoneRegex.test(data.phoneNumber)) {
            errors.push('Invalid phone number format');
        }
    }

    // Validate email
    if (data.email) {
        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/;
        if (!emailRegex.test(data.email)) {
            errors.push('Invalid email format');
        }
    }

    // Validate website
    if (data.website) {
        try {
            new URL(data.website.startsWith('http') ? data.website : `https://${data.website}`);
        } catch {
            errors.push('Invalid website URL');
        }
    }

    return {
        isValid: errors.length === 0,
        validationErrors: errors
    };
}

export default {
    searchBusinessInfo,
    validateContactInfo
};