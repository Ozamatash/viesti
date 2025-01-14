/**
 * User status enum representing possible user presence states
 */
export enum UserStatus {
  Online = "Online",
  Offline = "Offline"
}

/**
 * Core user type representing a user in the system
 */
export interface User {
  id: string;
  username: string;
  profileImageUrl: string | null;
  status: UserStatus;
  lastSeen?: Date;
}

/**
 * Minimal user information, used in reactions and other places where
 * we don't need the full user object
 */
export interface MinimalUser {
  id: string;
  username: string;
} 