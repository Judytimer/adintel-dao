/**
 * Core type definitions for AdIntel DAO
 */

// Platform types
export type Platform = 'facebook' | 'google' | 'linkedin' | 'twitter' | 'other';

// Ad types
export type AdType = 'display' | 'video' | 'sponsored' | 'image' | 'native';

// Sentiment types
export type Sentiment = 'positive' | 'negative' | 'neutral';

// Industry types
export type Industry = 'technology' | 'finance' | 'retail' | 'health' | 'education' | 'other';

// Viewport position
export type ViewportPosition = 'top' | 'bottom' | 'left' | 'right' | 'center';

// Size category
export type SizeCategory = 'small' | 'medium' | 'large' | 'extra-large';

// Achievement status
export type TaskStatus = 'pending' | 'in_progress' | 'completed';

// Priority levels
export type Priority = 'high' | 'medium' | 'low';

/**
 * Ad position information
 */
export interface AdPosition {
  top: number;
  left: number;
  viewportPosition: ViewportPosition;
}

/**
 * Ad size information
 */
export interface AdSize {
  width: number;
  height: number;
  category: SizeCategory;
}

/**
 * Text features extracted from ad
 */
export interface TextFeatures {
  wordCount: number;
  hasCallToAction: boolean;
  sentiment: Sentiment;
  industry: Industry;
}

/**
 * Ad metadata structure
 */
export interface AdData {
  id: string;
  timestamp: string;
  platform: Platform;
  type: AdType;
  position: AdPosition;
  size: AdSize;
  textFeatures: TextFeatures;
}

/**
 * Daily statistics
 */
export interface DailyStats {
  adsSubmitted: number;
  pointsEarned: number;
}

/**
 * Total statistics
 */
export interface TotalStats {
  totalAds: number;
  totalPoints: number;
  startDate: string;
}

/**
 * Achievement definition
 */
export interface Achievement {
  threshold: number;
  title: string;
  points: number;
  unlocked?: boolean;
  unlockedAt?: string;
}

/**
 * Achievement map
 */
export interface AchievementMap {
  [key: string]: Achievement;
}

/**
 * User statistics
 */
export interface UserStats {
  balance: number;
  today: {
    adsSubmitted: number;
    pointsEarned: number;
    remaining: number;
  };
  total: {
    adsSubmitted: number;
    pointsEarned: number;
    startDate?: string;
  };
  achievements: number;
  currentStreak: number;
  allAchievements?: AchievementMap;
  dailyStats?: Record<string, DailyStats>;
}

/**
 * Submission result
 */
export interface SubmissionResult {
  success: boolean;
  reason?: string;
  points?: number;
  totalBalance?: number;
  newAchievements?: Achievement[];
  dailyLimit?: number;
  submitted?: number;
  adId?: string;
  error?: string;
}

/**
 * Extension settings
 */
export interface ExtensionSettings {
  enabled: boolean;
  notifications: boolean;
  privacy_mode: 'strict' | 'balanced' | 'minimal';
}

/**
 * Export data structure
 */
export interface ExportData {
  exportDate: string;
  balance: number;
  stats: {
    daily: Record<string, DailyStats>;
    total: TotalStats;
  };
  achievements: AchievementMap;
  adsCount: number;
  adDataSummary?: {
    cachedAds: number;
  };
}

/**
 * Message types for extension communication
 */
export type MessageType = 
  | 'AD_DETECTED'
  | 'GET_STATS'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'EXPORT_DATA'
  | 'CLEAR_DATA'
  | 'SETTINGS_UPDATED';

/**
 * Extension message structure
 */
export interface ExtensionMessage<T = any> {
  type: MessageType;
  data?: T;
  settings?: Partial<ExtensionSettings>;
}

/**
 * Chrome storage structure
 */
export interface StorageData {
  enabled?: boolean;
  notifications?: boolean;
  privacy_mode?: ExtensionSettings['privacy_mode'];
  point_balance?: number;
  daily_stats?: Record<string, DailyStats>;
  total_stats?: TotalStats;
  submitted_ads?: Record<string, boolean>;
  achievements?: AchievementMap;
  ad_data_cache?: AdData[];
}