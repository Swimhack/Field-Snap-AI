/**
 * Field Snap AI - Lead Scoring Provider
 * 
 * This module handles lead scoring and qualification based on
 * extracted and enriched business data.
 */

import type { Lead, ScoringResult } from '@/core/types';
import { db } from './db';

export class ScoringProvider {
  private defaultRules = {
    phone_number: 25,
    email: 20,
    website: 15,
    social_media: 10,
    business_hours: 5,
    reviews_count: 15,
    reviews_rating: 10,
  };

  /**
   * Score a lead based on available data
   */
  async scoreLead(lead: Lead): Promise<ScoringResult> {
    // Get scoring rules from system configuration
    const config = await db.getConfig('lead_scoring_rules');
    const rules = config?.value || this.defaultRules;

    const breakdown = {
      phoneNumber: this.scorePhoneNumber(lead.phone_number, rules.phone_number),
      email: this.scoreEmail(lead.email, rules.email),
      website: this.scoreWebsite(lead.website, rules.website),
      socialMedia: this.scoreSocialMedia(lead.social_media, rules.social_media),
      businessHours: this.scoreBusinessHours(lead.business_hours, rules.business_hours),
      reviewsCount: this.scoreReviewsCount(lead.reviews, rules.reviews_count),
      reviewsRating: this.scoreReviewsRating(lead.reviews, rules.reviews_rating),
    };

    const totalScore = Object.values(breakdown).reduce((sum, score) => sum + score, 0);
    
    // Determine qualification
    const qualificationThreshold = parseInt(process.env.QUALIFICATION_THRESHOLD || '50');
    const qualification = totalScore >= qualificationThreshold ? 'qualified' : 'unqualified';
    
    const qualificationReason = this.generateQualificationReason(breakdown, totalScore, qualificationThreshold);

    return {
      totalScore,
      breakdown,
      qualification,
      qualificationReason,
    };
  }

  /**
   * Score phone number presence and validity
   */
  private scorePhoneNumber(phone: string | undefined, maxPoints: number): number {
    if (!phone) return 0;
    
    // Basic phone number validation
    const phoneRegex = /^\+?[\d\s\-\(\)\.]{10,}$/;
    if (phoneRegex.test(phone)) {
      return maxPoints;
    }
    
    // Partial credit for phone-like strings
    return Math.floor(maxPoints * 0.5);
  }

  /**
   * Score email presence and validity
   */
  private scoreEmail(email: string | undefined, maxPoints: number): number {
    if (!email) return 0;
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(email)) {
      return maxPoints;
    }
    
    return 0;
  }

  /**
   * Score website presence
   */
  private scoreWebsite(website: string | undefined, maxPoints: number): number {
    if (!website) return 0;
    
    try {
      new URL(website);
      return maxPoints;
    } catch {
      return 0;
    }
  }

  /**
   * Score social media presence
   */
  private scoreSocialMedia(socialMedia: any, maxPoints: number): number {
    if (!socialMedia || typeof socialMedia !== 'object') return 0;
    
    const platforms = Object.keys(socialMedia).filter(key => socialMedia[key]);
    const platformCount = platforms.length;
    
    if (platformCount === 0) return 0;
    if (platformCount >= 3) return maxPoints;
    if (platformCount >= 2) return Math.floor(maxPoints * 0.7);
    return Math.floor(maxPoints * 0.4);
  }

  /**
   * Score business hours availability
   */
  private scoreBusinessHours(businessHours: any, maxPoints: number): number {
    if (!businessHours || typeof businessHours !== 'object') return 0;
    
    const days = Object.keys(businessHours).filter(key => 
      key !== 'timezone' && businessHours[key] && businessHours[key].trim() !== ''
    );
    
    if (days.length >= 5) return maxPoints;
    if (days.length >= 3) return Math.floor(maxPoints * 0.7);
    if (days.length >= 1) return Math.floor(maxPoints * 0.4);
    return 0;
  }

  /**
   * Score based on number of reviews
   */
  private scoreReviewsCount(reviews: any, maxPoints: number): number {
    if (!reviews || typeof reviews !== 'object') return 0;
    
    let totalReviews = 0;
    
    if (reviews.google?.total_reviews) {
      totalReviews += reviews.google.total_reviews;
    }
    
    if (reviews.yelp?.total_reviews) {
      totalReviews += reviews.yelp.total_reviews;
    }
    
    if (totalReviews >= 50) return maxPoints;
    if (totalReviews >= 20) return Math.floor(maxPoints * 0.8);
    if (totalReviews >= 5) return Math.floor(maxPoints * 0.5);
    if (totalReviews >= 1) return Math.floor(maxPoints * 0.3);
    return 0;
  }

  /**
   * Score based on review ratings
   */
  private scoreReviewsRating(reviews: any, maxPoints: number): number {
    if (!reviews || typeof reviews !== 'object') return 0;
    
    const ratings = [];
    
    if (reviews.google?.rating) {
      ratings.push(reviews.google.rating);
    }
    
    if (reviews.yelp?.rating) {
      ratings.push(reviews.yelp.rating);
    }
    
    if (ratings.length === 0) return 0;
    
    const avgRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    
    if (avgRating >= 4.5) return maxPoints;
    if (avgRating >= 4.0) return Math.floor(maxPoints * 0.8);
    if (avgRating >= 3.5) return Math.floor(maxPoints * 0.6);
    if (avgRating >= 3.0) return Math.floor(maxPoints * 0.4);
    return Math.floor(maxPoints * 0.2);
  }

  /**
   * Generate human-readable qualification reason
   */
  private generateQualificationReason(
    breakdown: Record<string, number>,
    totalScore: number,
    threshold: number
  ): string {
    if (totalScore >= threshold) {
      const strongPoints = Object.entries(breakdown)
        .filter(([, score]) => score > 0)
        .map(([key, score]) => `${this.formatScoreLabel(key)} (${score} pts)`)
        .slice(0, 3);
      
      return `Qualified with ${totalScore} points. Strong indicators: ${strongPoints.join(', ')}.`;
    } else {
      const missingPoints = threshold - totalScore;
      const weakPoints = Object.entries(breakdown)
        .filter(([, score]) => score === 0)
        .map(([key]) => this.formatScoreLabel(key))
        .slice(0, 3);
      
      return `Not qualified (${totalScore}/${threshold} points). Missing ${missingPoints} points. Consider adding: ${weakPoints.join(', ')}.`;
    }
  }

  /**
   * Format score label for display
   */
  private formatScoreLabel(key: string): string {
    const labels: Record<string, string> = {
      phoneNumber: 'Phone Number',
      email: 'Email Address',
      website: 'Website',
      socialMedia: 'Social Media',
      businessHours: 'Business Hours',
      reviewsCount: 'Customer Reviews',
      reviewsRating: 'Review Rating',
    };
    
    return labels[key] || key;
  }

  /**
   * Update scoring rules
   */
  async updateScoringRules(rules: Record<string, number>): Promise<void> {
    await db.setConfig('lead_scoring_rules', rules, 'Lead scoring point allocation', 'scoring');
  }

  /**
   * Get current scoring rules
   */
  async getScoringRules(): Promise<Record<string, number>> {
    const config = await db.getConfig('lead_scoring_rules');
    return config?.value || this.defaultRules;
  }
}

export const scoring = new ScoringProvider();
