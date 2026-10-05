export interface ExtractedEntities {
  amounts: number[];
  vpas: string[];
  urls: string[];
  domains: string[];
  phoneNumbers: string[];
  emails: string[];
}

export function normalizeUrlCandidate(candidate: string): string | null {
  if (!candidate || typeof candidate !== 'string') return null;

  let str = candidate.trim();

  // Strip trailing punctuation (. , ; : ! ? ) ] } > ' ")
  str = str.replace(/[.,;:!?)\\]\}>'"]+$/g, '');

  if (str.startsWith('www.')) {
    str = 'http://' + str;
  }

  try {
    const parsed = new URL(str);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    const host = parsed.hostname.toLowerCase();
    const port = parsed.port ? `:${parsed.port}` : '';
    let path = parsed.pathname;

    // Drop trailing slash if pathname length > 1 (e.g. /pay/ -> /pay)
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }

    const search = parsed.search; // Preserves query parameters, omits fragment/hash (#...)
    return `${parsed.protocol}//${host}${port}${path}${search}`;
  } catch {
    return null;
  }
}

export function extractCandidateUrls(text: string): string[] {
  if (!text) return [];

  const candidates: string[] = [];
  let match: RegExpExecArray | null;

  // 1. Markdown links: [label](url)
  const mdRegex = /\[[^\]]*\]\(([^)\s]+)\)/gi;
  while ((match = mdRegex.exec(text)) !== null) {
    if (match[1]) candidates.push(match[1]);
  }

  // 2. HTML href values: href="url" or href='url'
  const hrefRegex = /href=["']([^"'\s]+)["']/gi;
  while ((match = hrefRegex.exec(text)) !== null) {
    if (match[1]) candidates.push(match[1]);
  }

  // 3. Bare URLs: exclude whitespace, < > " ' ` ] )
  const bareRegex = /(?:https?:\/\/|www\.)[^\s<>"'`\]\)]+/gi;
  while ((match = bareRegex.exec(text)) !== null) {
    if (match[0]) candidates.push(match[0]);
  }

  return candidates;
}

export function extractUrlsAndDomains(text: string): { urls: string[]; domains: string[] } {
  const rawCandidates = extractCandidateUrls(text);
  const normalizedUrls: string[] = [];
  const domains: string[] = [];
  const seenHostPaths = new Set<string>();

  for (const c of rawCandidates) {
    const norm = normalizeUrlCandidate(c);
    if (norm) {
      try {
        const parsed = new URL(norm);
        const hostPath = parsed.hostname + parsed.pathname;
        if (!seenHostPaths.has(hostPath)) {
          seenHostPaths.add(hostPath);
          if (normalizedUrls.length < 5) {
            normalizedUrls.push(norm);
            if (!domains.includes(parsed.hostname)) {
              domains.push(parsed.hostname);
            }
          }
        }
      } catch {
        // ignore
      }
    }
  }

  return { urls: normalizedUrls, domains };
}

export function extractEntities(text: string): ExtractedEntities {
  const amounts: number[] = [];
  const vpas: string[] = [];
  const phoneNumbers: string[] = [];
  const emails: string[] = [];

  if (!text) {
    return { amounts, vpas, urls: [], domains: [], phoneNumbers, emails };
  }

  // Extract Amounts (e.g. ₹ 3,000, Rs. 1,00,000, 500 INR, 5000 rupees)
  const amountRegexes = [
    /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/gi,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:rs\.?|rupees|inr|₹)/gi,
  ];

  for (const regex of amountRegexes) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      const valStr = match[1].replace(/,/g, '');
      const num = parseFloat(valStr);
      if (!isNaN(num) && num > 0 && !amounts.includes(num)) {
        amounts.push(num);
      }
    }
  }

  // Extract VPAs (e.g. john@upi, shop@okicici)
  const vpaRegex = /[a-zA-Z0-9.\-_]{2,}@[a-zA-Z0-9.\-]{2,}/gi;
  let vpaMatch;
  while ((vpaMatch = vpaRegex.exec(text)) !== null) {
    const candidate = vpaMatch[0].toLowerCase();
    if (!vpas.includes(candidate)) {
      vpas.push(candidate);
    }
  }

  // Extract URLs & Domains with normalisation & deduplication
  const { urls, domains } = extractUrlsAndDomains(text);

  // Extract Phone Numbers (+91 / 0 prefix / 10 digits starting 6-9, spaces/hyphens tolerated)
  const phoneRegex = /(?:\+91[\s-]?)?(?:0[\s-]?)?([6-9])([\s\-]?\d){9}\b/g;
  let phoneMatch;
  while ((phoneMatch = phoneRegex.exec(text)) !== null) {
    const cleanPhone = phoneMatch[0].replace(/\D/g, '');
    let standardized = cleanPhone;
    if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
      standardized = cleanPhone.substring(2);
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
      standardized = cleanPhone.substring(1);
    }
    if (standardized.length === 10 && !phoneNumbers.includes(standardized)) {
      phoneNumbers.push(standardized);
    }
  }

  // Extract Email Addresses
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  let emailMatch;
  while ((emailMatch = emailRegex.exec(text)) !== null) {
    const cleanEmail = emailMatch[0].toLowerCase();
    // Exclude VPAs masquerading as emails (if they don't have a valid domain ending)
    // Actually standard email regex matches VPAs too if they look like emails, but let's just collect them.
    if (!emails.includes(cleanEmail)) {
      emails.push(cleanEmail);
    }
  }

  return { amounts, vpas, urls, domains, phoneNumbers, emails };
}
