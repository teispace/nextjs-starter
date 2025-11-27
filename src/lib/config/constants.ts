import { Environment } from '../enums';

export const API_VERSION = 'v1';
export const BASE_API_PREFIX = '/api';
export const API_PREFIX = `${BASE_API_PREFIX}/${API_VERSION}`;
export const API_RESPONSE_DATA_KEY = 'data';
export const SAVE_AUTH_TOKENS = false;

// Environment checks
export const isProduction = process.env.NODE_ENV === Environment.PRODUCTION;
export const isDevelopment = process.env.NODE_ENV === Environment.DEVELOPMENT;
export const isTest = process.env.NODE_ENV === Environment.TEST;
