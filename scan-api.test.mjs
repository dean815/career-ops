#!/usr/bin/env node

import { detectProvider, parseJobs, matchesTitle, detectTruncation } from './scan-api.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${label}`);
  }
}

function section(name) {
  console.log(`\n📋 ${name}`);
}

// -- Provider Detection --

section('detectProvider');
assert(detectProvider('https://boards-api.greenhouse.io/v1/boards/airtable/jobs') === 'greenhouse', 'greenhouse URL');
assert(detectProvider('https://api.ashbyhq.com/posting-api/job-board/notion') === 'ashby', 'ashby URL');
assert(detectProvider('https://api.lever.co/v0/postings/mistral?mode=json') === 'lever', 'lever URL');
assert(detectProvider('https://acme.bamboohr.com/careers/list') === 'bamboohr', 'bamboohr URL');
assert(detectProvider('https://example.com/jobs') === 'unknown', 'unknown URL');

// -- Greenhouse Parsing --

section('parseJobs — Greenhouse');
const ghData = {
  jobs: [
    { title: 'Software Engineer', absolute_url: 'https://boards.greenhouse.io/co/jobs/1', location: { name: 'NYC' } },
    { title: 'PM', absolute_url: 'https://boards.greenhouse.io/co/jobs/2', location: { name: 'SF' } },
  ],
};
const ghJobs = parseJobs('greenhouse', ghData);
assert(ghJobs.length === 2, 'parses 2 greenhouse jobs');
assert(ghJobs[0].title === 'Software Engineer', 'greenhouse title');
assert(ghJobs[0].url === 'https://boards.greenhouse.io/co/jobs/1', 'greenhouse url');
assert(ghJobs[0].location === 'NYC', 'greenhouse location');

// -- Ashby Parsing --

section('parseJobs — Ashby');
const ashbyData = {
  jobs: [
    { title: 'Solutions Architect', jobUrl: 'https://jobs.ashbyhq.com/co/abc', location: 'Remote, US', department: 'Sales', team: 'Solutions' },
    { title: 'Designer', jobUrl: 'https://jobs.ashbyhq.com/co/def', location: 'London' },
  ],
};
const ashbyJobs = parseJobs('ashby', ashbyData);
assert(ashbyJobs.length === 2, 'parses 2 ashby jobs');
assert(ashbyJobs[0].title === 'Solutions Architect', 'ashby title');
assert(ashbyJobs[0].url === 'https://jobs.ashbyhq.com/co/abc', 'ashby url');
assert(ashbyJobs[0].location === 'Remote, US', 'ashby location');

// -- Lever Parsing --

section('parseJobs — Lever');
const leverData = [
  { text: 'Account Executive', hostedUrl: 'https://jobs.lever.co/co/123', categories: { location: 'Paris', team: 'Sales' } },
  { text: 'ML Engineer', hostedUrl: 'https://jobs.lever.co/co/456', categories: { location: 'Remote' } },
];
const leverJobs = parseJobs('lever', leverData);
assert(leverJobs.length === 2, 'parses 2 lever jobs');
assert(leverJobs[0].title === 'Account Executive', 'lever title');
assert(leverJobs[0].url === 'https://jobs.lever.co/co/123', 'lever url');
assert(leverJobs[0].location === 'Paris', 'lever location');

// -- Edge cases --

section('parseJobs — Edge cases');
assert(parseJobs('greenhouse', {}).length === 0, 'empty greenhouse');
assert(parseJobs('greenhouse', { jobs: null }).length === 0, 'null greenhouse jobs');
assert(parseJobs('ashby', {}).length === 0, 'empty ashby');
assert(parseJobs('lever', {}).length === 0, 'non-array lever');
assert(parseJobs('lever', []).length === 0, 'empty lever array');
assert(parseJobs('unknown', { jobs: [{ title: 'x' }] }).length === 0, 'unknown provider');

// -- Title Filtering --

section('matchesTitle');
const filter = {
  positive: ['Solutions Architect', 'Product Manager', 'Developer Advocate', 'Forward Deployed'],
  negative: ['Junior', 'Intern', 'Director', 'Staff '],
};

assert(matchesTitle('Solutions Architect', filter) === true, 'positive match');
assert(matchesTitle('Senior Solutions Architect', filter) === true, 'positive match with prefix');
assert(matchesTitle('solutions architect', filter) === true, 'case insensitive positive');
assert(matchesTitle('Software Engineer', filter) === false, 'no positive match');
assert(matchesTitle('Junior Solutions Architect', filter) === false, 'negative overrides positive');
assert(matchesTitle('Director of Product', filter) === false, 'negative match');
assert(matchesTitle('Staff Engineer', filter) === false, 'negative with trailing space');
assert(matchesTitle('Product Manager, Staffing Team', filter) === true, '"Staff " with trailing space does not match "Staffing"');

assert(matchesTitle('Product Manager, Growth', filter) === true, 'positive with suffix');
assert(matchesTitle('', filter) === false, 'empty title');
assert(matchesTitle('Anything', null) === true, 'null filter passes all');
assert(matchesTitle('Anything', {}) === true, 'empty filter passes all');
assert(matchesTitle('Anything', { positive: [], negative: [] }) === true, 'empty arrays pass all');

// -- Truncation Detection --

section('detectTruncation');
assert(detectTruncation(100, {}, '') === true, 'exactly 100 jobs');
assert(detectTruncation(250, {}, '') === true, 'exactly 250 jobs');
assert(detectTruncation(500, {}, '') === true, 'exactly 500 jobs');
assert(detectTruncation(1000, {}, '') === true, 'exactly 1000 jobs');
assert(detectTruncation(99, {}, '') === false, '99 jobs not truncated');
assert(detectTruncation(101, {}, '') === false, '101 jobs not truncated');
assert(detectTruncation(45, {}, '') === false, 'normal count');
assert(detectTruncation(50, { has_more: true }, '') === true, 'has_more flag');
assert(detectTruncation(50, { hasMore: true }, '') === true, 'hasMore flag');
assert(detectTruncation(50, { next: 'https://...' }, '') === true, 'next URL');
assert(detectTruncation(50, { nextPageToken: 'abc' }, '') === true, 'nextPageToken');
assert(detectTruncation(50, { paging: { next: 'https://...' } }, '') === true, 'paging.next');
assert(detectTruncation(50, {}, 'NOTE: API truncates at 200+') === true, 'notes mention truncation');
assert(detectTruncation(50, {}, 'paginated results only') === true, 'notes mention pagination');
assert(detectTruncation(50, {}, 'Great company to work for') === false, 'normal notes');
assert(detectTruncation(50, {}, null) === false, 'null notes');

// -- Summary --

console.log(`\n${'='.repeat(40)}`);
console.log(`✅ ${passed} passed, ❌ ${failed} failed`);
if (failed > 0) process.exit(1);
