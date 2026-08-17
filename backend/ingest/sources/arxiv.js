import { XMLParser } from "fast-xml-parser";

/**
 * Recent open-access astronomy abstracts from arXiv.
 *
 * Abstracts rather than full texts: they are self-contained summaries, they
 * fit an embedding window without chunking, and arXiv's terms allow their use.
 * The full PDFs would need chunking, licence checks per paper, and far more
 * storage for little retrieval gain at this scale.
 *
 * Note the https. Plain http://export.arxiv.org returns an empty body from
 * some networks -- it fails silently rather than erroring, which is the worst
 * kind of failure, so the scheme is pinned here deliberately.
 */

const ARXIV_API = "https://export.arxiv.org/api/query";

// astro-ph subcategories, chosen to span the questions this app attracts.
const CATEGORIES = ["astro-ph.GA", "astro-ph.SR", "astro-ph.EP", "astro-ph.CO"];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

const collapse = (text) => String(text ?? "").replace(/\s+/g, " ").trim();

async function fetchCategory(category, perCategory) {
  const url =
    `${ARXIV_API}?search_query=cat:${encodeURIComponent(category)}` +
    `&start=0&max_results=${perCategory}&sortBy=submittedDate&sortOrder=descending`;

  const response = await fetch(url, {
    headers: { "User-Agent": "celestial-chatbot/1.0 (educational project)" },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) throw new Error(`arXiv responded ${response.status}`);

  const parsed = parser.parse(await response.text());
  // A single result comes back as an object rather than an array.
  const entries = parsed?.feed?.entry;
  if (!entries) return [];

  return (Array.isArray(entries) ? entries : [entries]).map((entry) => ({
    source: "arxiv",
    title: collapse(entry.title),
    url: typeof entry.id === "string" ? entry.id : null,
    content: `${collapse(entry.title)} (arXiv ${category}). ${collapse(entry.summary)}`,
  }));
}

// arXiv's terms of use ask for roughly three seconds between requests. Firing
// the categories in parallel earned a 429 immediately, so they are fetched one
// at a time with a pause. Ingestion is an offline job -- twelve extra seconds
// costs nothing and being a good API citizen matters more.
const REQUEST_SPACING_MS = 3000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function loadArxiv({ perCategory = 8 } = {}) {
  const documents = [];
  const failures = [];

  for (const [index, category] of CATEGORIES.entries()) {
    if (index > 0) await sleep(REQUEST_SPACING_MS);

    try {
      documents.push(...(await fetchCategory(category, perCategory)));
    } catch (error) {
      failures.push(`${category}: ${error.message}`);
    }
  }

  if (failures.length) {
    console.warn(`  ${failures.length} arXiv categories failed -- ${failures[0]}`);
  }

  // Abstracts under a couple of hundred characters are usually withdrawal
  // notices or errata rather than science.
  return documents.filter((doc) => doc.content.length > 250);
}
