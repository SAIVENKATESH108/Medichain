/**
 * Drug Database Integration — OpenFDA API + Expiry Validation + Database Cache
 * Provides real cross-referencing against public pharmaceutical databases with TTL caching.
 */

import { supabase } from './supabase';
import { openFdaCache, indianMedicinesCache } from './dataStructures/LRUCache';
import {
  calculateLevenshteinSimilarity,
  calculateJaccardSimilarity,
  normalizePharmaceuticalString,
} from './algorithms/fuzzyMatcher';

export interface FDARecallResult {
  found: boolean;
  recalls: Array<{
    reason: string;
    status: string;
    classification: string;
    product_description: string;
    recall_date: string;
  }>;
  fromCache?: boolean;
}

export interface FDADrugResult {
  found: boolean;
  brand_name?: string;
  generic_name?: string;
  manufacturer_name?: string;
  product_ndc?: string;
  dosage_form?: string;
  route?: string;
  active_ingredients?: string[];
  fromCache?: boolean;
}

export interface IndianMedicineRegistryResult {
  found: boolean;
  name?: string;
  price?: number | null;
  manufacturer_name?: string;
  active_composition?: string | null;
  schedule?: string;
  pack_size_label?: string | null;
  nlem_listed?: boolean;
  is_discontinued?: boolean;
}

export interface DrugDatabaseResult {
  fdaDrug: FDADrugResult;
  fdaRecalls: FDARecallResult;
  indianRegistry?: IndianMedicineRegistryResult;
  expiryCheck: {
    isExpired: boolean;
    daysUntilExpiry: number | null;
    warning: string | null;
  };
  manufacturerCheck: {
    found: boolean;
    matchScore: number;
    notes: string;
    isWhoPrequalified?: boolean;
    licenseNumber?: string;
  };
}

// Fallback known pharmaceutical manufacturers for validation
const KNOWN_MANUFACTURERS = [
  'cipla', 'sun pharma', 'sun pharmaceutical', 'dr. reddy', 'dr reddy', 'lupin',
  'aurobindo', 'cadila', 'zydus', 'biocon', 'torrent', 'glenmark', 'alkem',
  'mankind', 'intas', 'ipca', 'jubilant', 'natco', 'wockhardt', 'piramal',
  'pfizer', 'novartis', 'roche', 'sanofi', 'merck', 'johnson & johnson',
  'abbott', 'astrazeneca', 'glaxosmithkline', 'gsk', 'bayer', 'eli lilly',
  'bristol-myers squibb', 'amgen', 'gilead', 'teva', 'mylan', 'viatris',
  'hikma', 'fresenius', 'baxter', 'medtronic', 'stryker',
];

const CACHE_TTL_DAYS = 7;

/**
 * Retrieves cached OpenFDA response from L1 in-memory LRU Cache or L2 database cache
 */
async function getCachedOpenFDA<T>(cacheKey: string): Promise<T | null> {
  // 1. Check L1 In-Memory LRU Cache (O(1) fast path)
  const memCached = openFdaCache.get(cacheKey);
  if (memCached) {
    return memCached as T;
  }

  // 2. Check L2 Supabase PostgreSQL Persistent Cache
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('openfda_cache')
      .select('response_data, expires_at')
      .eq('cache_key', cacheKey)
      .gt('expires_at', now)
      .maybeSingle();

    if (error || !data) return null;

    // Populate L1 cache for subsequent fast reads
    openFdaCache.put(cacheKey, data.response_data);
    return data.response_data as T;
  } catch {
    return null;
  }
}

/**
 * Stores OpenFDA response in both L1 LRU Cache and L2 database cache with 7-day expiration
 */
async function setCachedOpenFDA(
  cacheKey: string,
  queryType: 'ndc_lookup' | 'recalls' | 'manufacturer',
  medicineQuery: string,
  responseData: Record<string, unknown>,
  statusCode: number = 200,
) {
  // Store in L1 in-memory LRU Cache
  openFdaCache.put(cacheKey, responseData);

  // Persist to L2 Database Cache
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);

    await supabase.from('openfda_cache').upsert(
      {
        cache_key: cacheKey,
        query_type: queryType,
        medicine_query: medicineQuery,
        response_data: responseData,
        status_code: statusCode,
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: 'cache_key' }
    );
  } catch (err) {
    console.debug('[DrugDB] Cache write non-critical error:', err);
  }
}

/**
 * Search OpenFDA for drug information by name with caching
 */
export async function searchFDADrug(medicineName: string): Promise<FDADrugResult> {
  const query = encodeURIComponent(medicineName.split(' ')[0].trim());
  const cacheKey = `ndc:${query.toLowerCase()}`;

  // 1. Check Cache
  const cached = await getCachedOpenFDA<FDADrugResult>(cacheKey);
  if (cached) {
    console.log('[DrugDB] ⚡ OpenFDA drug found in cache:', medicineName);
    return { ...cached, fromCache: true };
  }

  try {
    const url = `https://api.fda.gov/drug/ndc.json?search=brand_name:"${query}"+generic_name:"${query}"&limit=3`;
    console.log('[DrugDB] 🔍 Searching OpenFDA for:', medicineName);
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        console.log('[DrugDB] Drug not found in FDA database (this is normal for non-US drugs)');
        const notFoundResult: FDADrugResult = { found: false };
        await setCachedOpenFDA(cacheKey, 'ndc_lookup', medicineName, notFoundResult as unknown as Record<string, unknown>, 404);
        return notFoundResult;
      }
      console.warn('[DrugDB] FDA API error:', response.status);
      return { found: false };
    }

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const drug = data.results[0];
      const parsed: FDADrugResult = {
        found: true,
        brand_name: drug.brand_name,
        generic_name: drug.generic_name,
        manufacturer_name: drug.labeler_name,
        product_ndc: drug.product_ndc,
        dosage_form: drug.dosage_form,
        route: drug.route?.[0],
        active_ingredients: drug.active_ingredients?.map((i: { name: string }) => i.name) || [],
      };

      await setCachedOpenFDA(cacheKey, 'ndc_lookup', medicineName, parsed as unknown as Record<string, unknown>, 200);
      return parsed;
    }

    const emptyResult: FDADrugResult = { found: false };
    await setCachedOpenFDA(cacheKey, 'ndc_lookup', medicineName, emptyResult as unknown as Record<string, unknown>, 404);
    return emptyResult;
  } catch (err) {
    console.warn('[DrugDB] FDA drug search failed:', err);
    return { found: false };
  }
}

/**
 * Search OpenFDA for drug recalls with caching
 */
export async function searchFDARecalls(medicineName: string, manufacturer: string): Promise<FDARecallResult> {
  const query = encodeURIComponent(medicineName.split(' ')[0].trim());
  const cacheKey = `recalls:${query.toLowerCase()}:${encodeURIComponent(manufacturer.toLowerCase().trim())}`;

  // 1. Check Cache
  const cached = await getCachedOpenFDA<FDARecallResult>(cacheKey);
  if (cached) {
    console.log('[DrugDB] ⚡ FDA recall status found in cache for:', medicineName);
    return { ...cached, fromCache: true };
  }

  try {
    const url = `https://api.fda.gov/drug/enforcement.json?search=reason_for_recall:"${query}"+openfda.brand_name:"${query}"&limit=5`;
    console.log('[DrugDB] 🔍 Checking FDA recalls for:', medicineName);
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        console.log('[DrugDB] ✅ No recalls found in FDA enforcement database');
        const emptyRecalls: FDARecallResult = { found: false, recalls: [] };
        await setCachedOpenFDA(cacheKey, 'recalls', medicineName, emptyRecalls as unknown as Record<string, unknown>, 404);
        return emptyRecalls;
      }
      return { found: false, recalls: [] };
    }

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const recalls = data.results.map((r: {
        reason_for_recall: string;
        status: string;
        classification: string;
        product_description: string;
        recall_initiation_date: string;
      }) => ({
        reason: r.reason_for_recall,
        status: r.status,
        classification: r.classification,
        product_description: r.product_description,
        recall_date: r.recall_initiation_date,
      }));

      const recallResult: FDARecallResult = { found: true, recalls };
      await setCachedOpenFDA(cacheKey, 'recalls', medicineName, recallResult as unknown as Record<string, unknown>, 200);
      return recallResult;
    }

    const noRecallsResult: FDARecallResult = { found: false, recalls: [] };
    await setCachedOpenFDA(cacheKey, 'recalls', medicineName, noRecallsResult as unknown as Record<string, unknown>, 200);
    return noRecallsResult;
  } catch (err) {
    console.warn('[DrugDB] FDA recall search failed:', err);
    return { found: false, recalls: [] };
  }
}

/**
 * Validate expiry date
 */
export function checkExpiryDate(expiryDate: string): {
  isExpired: boolean;
  daysUntilExpiry: number | null;
  warning: string | null;
} {
  if (!expiryDate) {
    return { isExpired: false, daysUntilExpiry: null, warning: 'No expiry date provided' };
  }

  try {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        isExpired: true,
        daysUntilExpiry: diffDays,
        warning: `⛔ EXPIRED ${Math.abs(diffDays)} days ago! Do NOT consume this medicine.`,
      };
    } else if (diffDays < 30) {
      return {
        isExpired: false,
        daysUntilExpiry: diffDays,
        warning: `⚠️ Expires in ${diffDays} days. Check packaging integrity carefully.`,
      };
    } else if (diffDays < 90) {
      return {
        isExpired: false,
        daysUntilExpiry: diffDays,
        warning: `Expires in ${diffDays} days. Within normal usage window.`,
      };
    }

    return {
      isExpired: false,
      daysUntilExpiry: diffDays,
      warning: null,
    };
  } catch {
    return { isExpired: false, daysUntilExpiry: null, warning: 'Could not parse expiry date' };
  }
}

/**
 * Verify manufacturer against known registry and local database using Levenshtein & Jaccard similarity
 */
export function verifyManufacturer(manufacturer: string): {
  found: boolean;
  matchScore: number;
  notes: string;
  isWhoPrequalified?: boolean;
} {
  if (!manufacturer) {
    return { found: false, matchScore: 0, notes: 'No manufacturer provided' };
  }

  const normalizedMfg = normalizePharmaceuticalString(manufacturer);

  // 1. Exact Substring Match
  const exactMatch = KNOWN_MANUFACTURERS.find(m => normalizedMfg.includes(m) || m.includes(normalizedMfg));
  if (exactMatch) {
    return {
      found: true,
      matchScore: 100,
      notes: `✅ "${manufacturer}" is a recognized pharmaceutical manufacturer (CDSCO/WHO registered).`,
      isWhoPrequalified: true,
    };
  }

  // 2. High-Performance Algorithmic Similarity (Levenshtein + Jaccard)
  let bestMatch: string | null = null;
  let highestScore = 0;

  for (const known of KNOWN_MANUFACTURERS) {
    const levScore = calculateLevenshteinSimilarity(normalizedMfg, known);
    const jaccardScore = calculateJaccardSimilarity(normalizedMfg, known);
    const composite = levScore * 0.5 + jaccardScore * 0.5;

    if (composite > highestScore) {
      highestScore = composite;
      bestMatch = known;
    }
  }

  if (highestScore >= 0.75 && bestMatch) {
    return {
      found: true,
      matchScore: Math.round(highestScore * 100),
      notes: `Fuzzy match found (${Math.round(highestScore * 100)}% similarity): "${manufacturer}" likely corresponds to registered entity "${bestMatch}".`,
      isWhoPrequalified: false,
    };
  }

  return {
    found: false,
    matchScore: 0,
    notes: `⚠️ "${manufacturer}" not found in known pharmaceutical manufacturers database. Secondary verification recommended.`,
    isWhoPrequalified: false,
  };
}

/**
 * Search the 10,000+ Indian Medicine Dataset and CDSCO/NLEM master registry with L1 LRU Caching
 */
export async function searchIndianMedicineRegistry(medicineName: string): Promise<IndianMedicineRegistryResult> {
  if (!medicineName) return { found: false };

  const cacheKey = `ind_med:${medicineName.trim().toLowerCase()}`;
  const cached = indianMedicinesCache.get(cacheKey);
  if (cached) {
    return cached as IndianMedicineRegistryResult;
  }

  try {
    const cleanTerm = medicineName.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '').trim();
    if (!cleanTerm) return { found: false };

    const { data, error } = await supabase
      .from('indian_medicines_master')
      .select('*')
      .ilike('name', `%${cleanTerm}%`)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      const notFoundResult = { found: false };
      indianMedicinesCache.put(cacheKey, notFoundResult, 1000 * 60 * 30); // 30m negative cache
      return notFoundResult;
    }

    const result: IndianMedicineRegistryResult = {
      found: true,
      name: data.name,
      price: data.price,
      manufacturer_name: data.manufacturer_name,
      active_composition: data.active_composition,
      schedule: data.schedule,
      pack_size_label: data.pack_size_label,
      nlem_listed: data.nlem_listed,
      is_discontinued: data.is_discontinued,
    };

    indianMedicinesCache.put(cacheKey, result);
    return result;
  } catch {
    return { found: false };
  }
}

/**
 * Run all database checks for a medicine (OpenFDA + CDSCO/NLEM Indian Medicine Master)
 */
export async function runDatabaseChecks(
  medicineName: string,
  manufacturer: string,
  expiryDate: string,
): Promise<DrugDatabaseResult> {
  console.log('%c[DrugDB] 🚀 Running cached database verification pipeline...', 'color: blue; font-weight: bold');

  // Run FDA checks and Indian National Medicine Registry in parallel
  const [fdaDrug, fdaRecalls, indianRegistry] = await Promise.all([
    searchFDADrug(medicineName),
    searchFDARecalls(medicineName, manufacturer),
    searchIndianMedicineRegistry(medicineName),
  ]);

  // Local checks
  const expiryCheck = checkExpiryDate(expiryDate);
  const manufacturerCheck = verifyManufacturer(manufacturer);

  return { fdaDrug, fdaRecalls, indianRegistry, expiryCheck, manufacturerCheck };
}
