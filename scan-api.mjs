#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FETCH_TIMEOUT_MS = 10_000;
const TRUNCATION_THRESHOLDS = [100, 250, 500, 1000];

// -- Provider detection & parsing --

export function detectProvider(apiUrl) {
  if (apiUrl.includes('boards-api.greenhouse.io')) return 'greenhouse';
  if (apiUrl.includes('api.ashbyhq.com')) return 'ashby';
  if (apiUrl.includes('api.lever.co')) return 'lever';
  if (apiUrl.includes('.bamboohr.com')) return 'bamboohr';
  return 'unknown';
}

export function parseJobs(provider, data) {
  switch (provider) {
    case 'greenhouse':
      return (data.jobs || []).map(j => ({
        title: j.title || '',
        url: j.absolute_url || '',
        location: j.location?.name || '',
      }));
    case 'ashby':
      return (data.jobs || []).map(j => ({
        title: j.title || '',
        url: j.jobUrl || '',
        location: j.location || '',
      }));
    case 'lever':
      return (Array.isArray(data) ? data : []).map(j => ({
        title: j.text || '',
        url: j.hostedUrl || '',
        location: j.categories?.location || '',
      }));
    case 'bamboohr':
      return (data.result || []).map(j => ({
        title: j.jobOpeningName || '',
        url: '',
        location: j.locationLabel || '',
      }));
    default:
      return [];
  }
}

// -- Title filtering --

export function matchesTitle(title, titleFilter) {
  if (!titleFilter) return true;
  const lower = title.toLowerCase();

  const hasPositive = !titleFilter.positive?.length ||
    titleFilter.positive.some(kw => lower.includes(kw.toLowerCase()));

  const hasNegative = titleFilter.negative?.length &&
    titleFilter.negative.some(kw => lower.includes(kw.toLowerCase()));

  return hasPositive && !hasNegative;
}

// -- Truncation detection --

export function detectTruncation(jobCount, data, notes) {
  if (TRUNCATION_THRESHOLDS.includes(jobCount)) return true;
  if (typeof data === 'object' && data !== null) {
    if (data.has_more || data.hasMore || data.next || data.nextPageToken || data.paging?.next) {
      return true;
    }
  }
  if (notes && /truncat|paginate|too many/i.test(notes)) return true;
  return false;
}

// -- Fetch with timeout --

async function fetchWithTimeout(url, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// -- Load config --

function loadConfig() {
  const portalsPath = join(__dirname, 'portals.yml');
  const raw = readFileSync(portalsPath, 'utf-8');
  return yaml.load(raw);
}

// -- Main scan --

export async function scanApis(options = {}) {
  const config = loadConfig();
  const titleFilter = options.raw ? null : config.title_filter;
  const companies = (config.tracked_companies || [])
    .filter(c => c.api && c.enabled !== false)
    .filter(c => !options.company || c.name.toLowerCase() === options.company.toLowerCase());

  if (options.dryRun) {
    return {
      scannedAt: new Date().toISOString(),
      dryRun: true,
      companiesWouldScan: companies.map(c => ({
        name: c.name,
        provider: detectProvider(c.api),
        api: c.api,
      })),
      summary: { companiesWouldScan: companies.length },
    };
  }

  const results = [];
  const errors = [];
  const truncatedCompanies = [];

  const work = companies.map(async (company) => {
    const provider = detectProvider(company.api);
    try {
      const data = await fetchWithTimeout(company.api);
      const allJobs = parseJobs(provider, data);
      const truncated = detectTruncation(allJobs.length, data, company.notes);

      if (truncated) truncatedCompanies.push(company.name);

      const matchingJobs = titleFilter
        ? allJobs.filter(j => matchesTitle(j.title, titleFilter))
        : allJobs;

      results.push({
        name: company.name,
        provider,
        totalJobs: allJobs.length,
        truncated,
        matchingJobs,
      });
    } catch (err) {
      errors.push({
        name: company.name,
        provider,
        error: err.name === 'AbortError' ? 'timeout' : err.message,
      });
    }
  });

  await Promise.all(work);

  results.sort((a, b) => a.name.localeCompare(b.name));

  return {
    scannedAt: new Date().toISOString(),
    companies: results,
    truncatedCompanies,
    errors,
    summary: {
      companiesScanned: results.length,
      totalMatches: results.reduce((sum, c) => sum + c.matchingJobs.length, 0),
      errors: errors.length,
      truncated: truncatedCompanies.length,
    },
  };
}

// -- CLI --

async function main() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    raw: args.includes('--raw'),
  };

  const companyArg = args.find(a => a.startsWith('--company='));
  if (companyArg) options.company = companyArg.split('=').slice(1).join('=');

  const result = await scanApis(options);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(err => {
  console.error('❌ scan-api failed:', err.message);
  process.exit(1);
});
