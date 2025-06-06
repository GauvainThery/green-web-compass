/**
 * Analysis domain model - Core analysis concepts and value objects
 */

import { ResourceCollection } from './resource.js';

// Analysis configuration value objects
export interface AnalysisOptions {
  interactionLevel: 'minimal' | 'default' | 'thorough';
  deviceType: 'desktop' | 'mobile';
  maxInteractions: number;
  maxScrollSteps: number;
  timeout: number;
  verboseLogging: boolean;
}

export interface DeviceConfiguration {
  viewport: {
    width: number;
    height: number;
    deviceScaleFactor: number;
    isMobile: boolean;
    hasTouch: boolean;
  };
}

// Analysis result aggregate root
export interface AnalysisResult {
  url: string;
  timestamp: string;
  options: AnalysisOptions;
  duration: number;
  resources: ResourceCollection;
  metadata: {
    pageTitle?: string;
    hasFrames: boolean;
    hasServiceWorker: boolean;
    pageSize: {
      width: number;
      height: number;
    };
  };
}

// Device configurations for different types
export const DEVICE_CONFIGURATIONS: Record<string, DeviceConfiguration> = {
  desktop: {
    viewport: {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false
    }
  },
  mobile: {
    viewport: {
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    }
  }
};

// Analysis configuration factory
export function createAnalysisOptions(
  interactionLevel: 'minimal' | 'default' | 'thorough' = 'default',
  deviceType: 'desktop' | 'mobile' = 'desktop'
): AnalysisOptions {
  const baseConfig: AnalysisOptions = {
    interactionLevel,
    deviceType,
    timeout: 120000,
    verboseLogging: true,
    maxInteractions: 2,
    maxScrollSteps: 3
  };

  switch (interactionLevel) {
    case 'minimal':
      return {
        ...baseConfig,
        maxInteractions: 0,
        maxScrollSteps: 1
      };
    case 'thorough':
      return {
        ...baseConfig,
        maxInteractions: 5,
        maxScrollSteps: 6
      };
    default:
      return baseConfig;
  }
}
