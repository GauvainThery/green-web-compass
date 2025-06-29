/**
 * Analysis Cache Service
 * Handles caching and retrieval of page analysis results
 */

import { PageAnalysisOptions, PageAnalysisResult } from '../../domain/models/page-analysis.js';
import { getConfig } from '../../config/index.js';
import { PageAnalysisRepository } from '../../infrastructure/database/repositories/page-analysis.repository.js';
import logger from '../../shared/logger.js';

export class AnalysisCacheService {
  private repository: PageAnalysisRepository;
  private cacheEnabled: boolean;
  private ttlHours: number;

  constructor() {
    this.repository = new PageAnalysisRepository();

    const cacheConfig = getConfig<{ analysisResults: boolean; ttlHours: number }>('cache');
    this.cacheEnabled = cacheConfig.analysisResults;
    this.ttlHours = cacheConfig.ttlHours;

    logger.info('Analysis cache service initialized', {
      enabled: this.cacheEnabled,
      ttlHours: this.ttlHours
    });
  }

  /**
   * Try to get cached analysis result
   */
  async getCachedAnalysis(
    url: string,
    options: PageAnalysisOptions
  ): Promise<PageAnalysisResult | null> {
    if (!this.cacheEnabled) {
      logger.debug('Cache disabled, skipping cache lookup', { url });
      return null;
    }

    try {
      const startTime = Date.now();
      const cachedResult = await this.repository.findCachedAnalysis(url, options, this.ttlHours);
      const duration = Date.now() - startTime;

      if (cachedResult) {
        logger.info('Cache hit - returning cached analysis', {
          url,
          cacheAge: Date.now() - new Date(cachedResult.timestamp).getTime(),
          lookupDuration: duration
        });

        // Update the timestamp to current time for the response
        return cachedResult;
      } else {
        logger.debug('Cache miss - no valid cached analysis found', {
          url,
          lookupDuration: duration
        });
        return null;
      }
    } catch (error) {
      logger.error('Error retrieving cached analysis', { error, url });
      return null;
    }
  }

  /**
   * Save analysis result to cache
   */
  async cacheAnalysis(result: PageAnalysisResult): Promise<void> {
    if (!this.cacheEnabled) {
      logger.debug('Cache disabled, skipping cache save', { url: result.url });
      return;
    }

    try {
      const startTime = Date.now();
      await this.repository.saveAnalysis(result, this.ttlHours);
      const duration = Date.now() - startTime;

      logger.info('Analysis result cached successfully', {
        url: result.url,
        duration: result.duration,
        saveDuration: duration,
        resourceCount: result.resources.resourceCount,
        ttlHours: this.ttlHours
      });
    } catch (error) {
      logger.error('Error caching analysis result', { error, url: result.url });
      // Don't throw - caching failures shouldn't break the analysis flow
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    enabled: boolean;
    ttlHours: number;
    totalAnalyses: number;
    uniqueUrls: number;
  }> {
    const dbStats = await this.repository.getAnalysisStats();

    return {
      enabled: this.cacheEnabled,
      ttlHours: this.ttlHours,
      ...dbStats
    };
  }

  /**
   * Clean up old cached analyses
   */
  async cleanupOldCache(olderThanDays: number = 30): Promise<number> {
    if (!this.cacheEnabled) {
      logger.debug('Cache disabled, skipping cleanup');
      return 0;
    }

    try {
      const deletedCount = await this.repository.cleanupOldAnalyses(olderThanDays);

      if (deletedCount > 0) {
        logger.info('Cache cleanup completed', { deletedCount, olderThanDays });
      }

      return deletedCount;
    } catch (error) {
      logger.error('Error during cache cleanup', { error, olderThanDays });
      return 0;
    }
  }

  /**
   * Clean up expired cache entries based on explicit expiration dates
   */
  async cleanupExpiredCache(): Promise<number> {
    if (!this.cacheEnabled) {
      logger.debug('Cache disabled, skipping expired cache cleanup');
      return 0;
    }

    try {
      const deletedCount = await this.repository.cleanupExpiredCache();

      if (deletedCount > 0) {
        logger.info('Expired cache cleanup completed', { deletedCount });
      }

      return deletedCount;
    } catch (error) {
      logger.error('Error during expired cache cleanup', { error });
      return 0;
    }
  }

  /**
   * Set custom expiration for specific analysis (useful for testing or special cases)
   */
  async setCacheExpiration(
    url: string,
    options: PageAnalysisOptions,
    expiresAt: Date
  ): Promise<boolean> {
    if (!this.cacheEnabled) {
      logger.debug('Cache disabled, cannot set expiration', { url });
      return false;
    }

    try {
      // This would require additional repository method - for now, log the intention
      logger.info('Custom cache expiration requested', {
        url,
        expiresAt: expiresAt.toISOString(),
        options: JSON.stringify(options)
      });

      // TODO: Implement repository method to update expiration date
      return true;
    } catch (error) {
      logger.error('Error setting cache expiration', { error, url });
      return false;
    }
  }

  /**
   * Get recent analyses for a URL
   */
  async getRecentAnalyses(url: string, limit: number = 10): Promise<PageAnalysisResult[]> {
    if (!this.cacheEnabled) {
      return [];
    }

    try {
      return await this.repository.findRecentAnalyses(url, limit);
    } catch (error) {
      logger.error('Error getting recent analyses', { error, url });
      return [];
    }
  }

  /**
   * Check if caching is enabled
   */
  isCacheEnabled(): boolean {
    return this.cacheEnabled;
  }

  /**
   * Get cache TTL in hours
   */
  getCacheTTL(): number {
    return this.ttlHours;
  }
}
