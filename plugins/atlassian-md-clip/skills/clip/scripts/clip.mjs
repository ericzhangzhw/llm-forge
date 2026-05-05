import { chromium } from 'playwright';
import { Defuddle } from 'defuddle/node';
import { parseHTML } from 'linkedom';
import { createHash } from 'crypto';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const COOKIE_FILE = 'cookies.txt';

// --- Argument parsing ---

const args = process.argv.slice(2);
let BASE = process.env.ATLASSIAN_BASE_URL?.replace(/\/+$/, '') || '';
let OUT_DIR = process.env.ATLASSIAN_CLIP_OUT || 'raw';
let FORCE = false;
const items = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--base' && args[i + 1]) {
    BASE = args[++i].replace(/\/+$/, '');
  } else if (args[i] === '--out' && args[i + 1]) {
    OUT_DIR = args[++i].replace(/\/+$/, '');
  } else if (args[i] === '--force') {
    FORCE = true;
  } else {
    items.push(args[i]);
  }
}
if (!BASE) {
  console.error('Error: No Atlassian base URL provided.');
  console.error('Either pass --base URL or set ATLASSIAN_BASE_URL env var.');
  console.error('\nUsage: node clip.mjs --base URL [--out DIR] [--force] TICKET-ID|WIKI-URL [...]');
  process.exit(1);
}
if (items.length === 0) {
  console.error('Usage: node clip.mjs --base URL [--out DIR] [--force] TICKET-ID|WIKI-URL [...]');
  console.error('  --out DIR: output directory (default: raw)');
  console.error('  --force: re-clip even if local file is up to date');
  console.error('  TICKET-ID: PROJ-123 (Jira)');
  console.error('  WIKI-URL: full wiki URL or numeric page ID (Confluence)');
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

const jiraIds = [];
const wikiInputs = [];
for (const item of items) {
  if (/^[A-Z]+-\d+$/.test(item)) {
    jiraIds.push(item);
  } else {
    wikiInputs.push(item);
  }
}

// --- Shared utilities ---

function parseCookiesTxt(filePath) {
  return readFileSync(filePath, 'utf8').split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(l => {
      const [domain, , path, secure, expires, name, value] = l.split('\t');
      if (!name) return null;
      return {
        name: name.trim(),
        value: (value || '').trim(),
        domain: domain.startsWith('.') ? domain : `.${domain}`,
        path: path || '/',
        secure: secure === 'TRUE',
        expires: Number(expires) || -1,
      };
    })
    .filter(Boolean);
}

async function htmlToMarkdown(html, url) {
  const { document } = parseHTML(`<html><body>${html}</body></html>`);
  const result = await Defuddle(document, url, { markdown: true });
  return result.content || '';
}

function contentHash(text) {
  return createHash('sha256').update(text).digest('hex');
}

function buildContent(lines) {
  return lines.filter(l => l !== null).join('\n') + '\n';
}

function hasChanged(outPath, newContent) {
  if (!existsSync(outPath)) return true;
  const oldContent = readFileSync(outPath, 'utf8');
  const strip = s => s.replace(/^clipped:.*$/m, '');
  return contentHash(strip(oldContent)) !== contentHash(strip(newContent));
}

// --- Jira helpers ---

function adfToText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.type === 'text') return node.text || '';
  if (node.type === 'hardBreak') return '\n';
  if (node.type === 'paragraph') return (node.content || []).map(adfToText).join('') + '\n\n';
  if (node.type === 'heading') {
    const level = node.attrs?.level || 1;
    return '#'.repeat(level) + ' ' + (node.content || []).map(adfToText).join('') + '\n\n';
  }
  if (node.type === 'bulletList') return (node.content || []).map(adfToText).join('');
  if (node.type === 'orderedList') return (node.content || []).map((c, i) => adfToText(c, i + 1)).join('');
  if (node.type === 'listItem') return '- ' + (node.content || []).map(adfToText).join('').trim() + '\n';
  if (node.type === 'codeBlock') return '```\n' + (node.content || []).map(adfToText).join('') + '\n```\n\n';
  if (node.type === 'blockquote') return '> ' + (node.content || []).map(adfToText).join('').trim() + '\n\n';
  if (node.type === 'table') return tableToMarkdown(node) + '\n\n';
  if (node.type === 'tableRow') return (node.content || []).map(adfToText);
  if (node.type === 'tableHeader' || node.type === 'tableCell') return (node.content || []).map(adfToText).join('').trim();
  if (node.type === 'inlineCard' || node.type === 'blockCard') return node.attrs?.url ? `[${node.attrs.url}](${node.attrs.url})` : '';
  if (node.type === 'mediaGroup' || node.type === 'mediaSingle') return '';
  if (node.content) return node.content.map(adfToText).join('');
  return '';
}

function tableToMarkdown(tableNode) {
  const rows = (tableNode.content || []).map(row =>
    (row.content || []).map(cell =>
      (cell.content || []).map(adfToText).join('').trim().replace(/\n/g, ' ')
    )
  );
  if (rows.length === 0) return '';
  const header = rows[0];
  return [
    '| ' + header.join(' | ') + ' |',
    '| ' + header.map(() => '---').join(' | ') + ' |',
    ...rows.slice(1).map(r => '| ' + r.join(' | ') + ' |'),
  ].join('\n');
}

async function clipJira(context, id) {
  const outPath = join(OUT_DIR, `${id}.md`);

  const apiUrl = `${BASE}/rest/api/3/issue/${id}?fields=summary,description,status,priority,labels,assignee,reporter,parent,comment,issuelinks,updated&expand=renderedFields`;
  const resp = await context.request.get(apiUrl);
  if (!resp.ok()) throw new Error(`API ${resp.status()}: ${resp.statusText()}`);
  const data = await resp.json();

  const f = data.fields;
  const rf = data.renderedFields || {};
  const remoteUpdated = f.updated || '';
  const alreadyExists = existsSync(outPath);

  const summary = f.summary || id;
  const status = f.status?.name || '';
  const priority = f.priority?.name || '';
  const labels = (f.labels || []).join(', ');
  const assignee = f.assignee?.displayName || 'Unassigned';
  const reporter = f.reporter?.displayName || '';
  const parent = f.parent ? `[${f.parent.key} ${f.parent.fields?.summary || ''}](${BASE}/browse/${f.parent.key})` : '';

  const childResp = await context.request.get(`${BASE}/rest/api/3/search/jql?jql=${encodeURIComponent(`parent = ${id}`)}&fields=key,summary,status,priority,assignee&maxResults=100`);
  const children = childResp.ok() ? (await childResp.json()).issues || [] : [];
  const childrenMd = children.map(c => {
    const cf = c.fields;
    return `- [${c.key}](${BASE}/browse/${c.key}) — ${cf.summary || ''} [${cf.status?.name || ''}, ${cf.priority?.name || ''}]`;
  }).join('\n');

  let description = '';
  if (rf.description) {
    description = await htmlToMarkdown(rf.description, `${BASE}/browse/${id}`);
  } else if (f.description) {
    description = adfToText(f.description).trim();
  }

  const comments = (f.comment?.comments || []).map(c => {
    const author = c.author?.displayName || 'Unknown';
    const date = c.created?.slice(0, 10) || '';
    const body = c.renderedBody || adfToText(c.body).trim();
    return `**${author}** (${date}):\n${body}`;
  }).join('\n\n---\n\n');

  const links = (f.issuelinks || []).map(l => {
    const type = l.type?.outward || l.type?.name || '';
    const linked = l.outwardIssue || l.inwardIssue;
    if (!linked) return null;
    return `- ${type}: [${linked.key}](${BASE}/browse/${linked.key}) — ${linked.fields?.summary || ''}`;
  }).filter(Boolean).join('\n');

  const lines = [
    '---',
    `title: "${id} - ${summary.replace(/"/g, '\\"')}"`,
    `source: "${BASE}/browse/${id}"`,
    `clipped: ${new Date().toISOString().slice(0, 10)}`,
    `updated: "${remoteUpdated.slice(0, 10)}"`,
    'tags:',
    '  - "raw"',
    '---',
    '',
    `# ${summary}`,
    '',
    '## Details',
    '',
    '| Field | Value |',
    '| --- | --- |',
    `| Status | ${status} |`,
    `| Priority | ${priority} |`,
    `| Labels | ${labels} |`,
    `| Assignee | ${assignee} |`,
    `| Reporter | ${reporter} |`,
    parent ? `| Parent | ${parent} |` : null,
    '',
    '## Description',
    '',
    description || '*(No description)*',
  ];

  if (childrenMd) lines.push('', '## Child Issues', '', childrenMd);
  if (links) lines.push('', '## Linked Issues', '', links);
  if (comments) lines.push('', '## Comments', '', comments);

  const content = buildContent(lines);

  if (alreadyExists && !FORCE && !hasChanged(outPath, content)) {
    console.log(`SKIP ${id} (up to date)`);
    return 'skipped';
  }

  writeFileSync(outPath, content);
  const tag = alreadyExists ? 'UPDATE' : 'OK  ';
  console.log(`${tag} ${id} — ${summary.slice(0, 60)} (${children.length} children)`);
  return alreadyExists ? 'updated' : 'clipped';
}

// --- Confluence helpers ---

function parseWikiUrl(input) {
  if (/^\d+$/.test(input)) return { pageId: input, base: BASE };
  const match = input.match(/\/wiki\/spaces\/[^/]+\/pages\/(\d+)/);
  if (match) {
    const urlBase = input.match(/^(https?:\/\/[^/]+)/);
    return { pageId: match[1], base: urlBase ? urlBase[1] : BASE };
  }
  console.error(`Cannot parse wiki URL: ${input}`);
  return null;
}

function slugify(title) {
  return title.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, ' ').substring(0, 80).trim();
}

async function clipWiki(context, input) {
  const parsed = parseWikiUrl(input);
  if (!parsed) return 'failed';
  const { pageId, base } = parsed;

  const apiUrl = `${base}/wiki/api/v2/pages/${pageId}?body-format=storage`;
  const resp = await context.request.get(apiUrl);
  if (!resp.ok()) throw new Error(`API ${resp.status()}: ${resp.statusText()}`);
  const data = await resp.json();

  const title = data.title || `Page ${pageId}`;
  const spaceId = data.spaceId || '';
  const version = data.version?.number || 1;
  const lastModified = data.version?.createdAt?.slice(0, 10) || '';
  const author = data.version?.by?.displayName || '';
  const webUrl = data._links?.base
    ? `${data._links.base}${data._links.webui}`
    : input;

  let spaceName = '', spaceKey = '';
  if (spaceId) {
    const spaceResp = await context.request.get(`${base}/wiki/api/v2/spaces/${spaceId}`);
    if (spaceResp.ok()) {
      const spaceData = await spaceResp.json();
      spaceName = spaceData.name || '';
      spaceKey = spaceData.key || '';
    }
  }

  const childResp = await context.request.get(`${base}/wiki/api/v2/pages/${pageId}/children?limit=50`);
  const children = childResp.ok() ? (await childResp.json()).results || [] : [];
  const childrenMd = children.map(c => {
    const childUrl = c._links?.webui
      ? `${data._links?.base || base}${c._links.webui}`
      : `${base}/wiki/spaces/${spaceKey}/pages/${c.id}`;
    return `- [${c.title}](${childUrl})`;
  }).join('\n');

  const storageBody = data.body?.storage?.value || '';
  let processedBody = storageBody;
  let imgCount = 0;

  if (storageBody) {
    const assetDir = join(OUT_DIR, 'assets', pageId);
    const acImages = [...storageBody.matchAll(/<ac:image[^>]*>[\s\S]*?<\/ac:image>/g)];

    if (acImages.length > 0) {
      mkdirSync(assetDir, { recursive: true });
      for (const m of acImages) {
        const tag = m[0];
        const fnMatch = tag.match(/ri:filename="([^"]+)"/);
        if (!fnMatch) continue;
        const filename = fnMatch[1];
        const localPath = join(assetDir, filename);

        if (!existsSync(localPath)) {
          try {
            const dlUrl = `${base}/wiki/download/attachments/${pageId}/${encodeURIComponent(filename)}`;
            const imgResp = await context.request.get(dlUrl);
            if (imgResp.ok()) {
              writeFileSync(localPath, await imgResp.body());
              imgCount++;
            }
          } catch { /* skip failed downloads */ }
        } else {
          imgCount++;
        }
        const relPath = `assets/${pageId}/${filename}`;
        processedBody = processedBody.replace(tag, `<img src="${relPath}" alt="${filename}" />`);
      }
    }
  }

  let bodyMd = '';
  if (processedBody) {
    bodyMd = await htmlToMarkdown(processedBody, webUrl);
    bodyMd = bodyMd.replace(/\(https?:\/\/[^)]*?\/(assets\/\d+\/[^)]+)\)/g, '($1)');
  }

  const labelResp = await context.request.get(`${base}/wiki/rest/api/content/${pageId}/label`);
  const labels = labelResp.ok() ? (await labelResp.json()).results || [] : [];
  const labelStr = labels.map(l => l.name).join(', ');

  const slug = slugify(title);
  const fileName = `${slug} - ${spaceName || spaceKey || 'Confluence'}`;
  const outPath = join(OUT_DIR, `${fileName}.md`);
  const alreadyExists = existsSync(outPath);

  const lines = [
    '---',
    `title: "${title.replace(/"/g, '\\"')}"`,
    `source: "${webUrl}"`,
    `space: "${spaceName || spaceKey}"`,
    `page_id: "${pageId}"`,
    `clipped: ${new Date().toISOString().slice(0, 10)}`,
    `last_modified: "${lastModified}"`,
    `author: "${author}"`,
    'tags:',
    '  - "raw"',
    '  - "confluence"',
    labelStr ? labels.map(l => `  - "${l.name}"`).join('\n') : null,
    '---',
    '',
    `# ${title}`,
    '',
    '## Details',
    '',
    '| Field | Value |',
    '| --- | --- |',
    `| Space | ${spaceName} (${spaceKey}) |`,
    `| Version | ${version} |`,
    `| Last Modified | ${lastModified} |`,
    `| Author | ${author} |`,
    labelStr ? `| Labels | ${labelStr} |` : null,
    '',
    '## Content',
    '',
    bodyMd || '*(No content)*',
  ];

  if (childrenMd) lines.push('', '## Child Pages', '', childrenMd);

  const content = buildContent(lines);

  if (alreadyExists && !FORCE && !hasChanged(outPath, content)) {
    console.log(`SKIP ${title} (up to date)`);
    return 'skipped';
  }

  writeFileSync(outPath, content);
  const tag = alreadyExists ? 'UPDATE' : 'OK  ';
  console.log(`${tag} ${title.slice(0, 60)} (${children.length} child pages, ${imgCount} images)`);
  return alreadyExists ? 'updated' : 'clipped';
}

// --- Main ---

if (!existsSync(COOKIE_FILE)) {
  console.error(`Missing ${COOKIE_FILE} in the current directory.`);
  console.error('Steps to create it:');
  console.error('1. Install "Get cookies.txt LOCALLY" Chrome extension');
  console.error('2. Navigate to your Atlassian instance while logged in');
  console.error('3. Export cookies and save as cookies.txt in your project root');
  process.exit(1);
}

const cookies = parseCookiesTxt(COOKIE_FILE);
console.log(`Loaded ${cookies.length} cookies from ${COOKIE_FILE}`);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
await context.addCookies(cookies);

let clipped = 0, updated = 0, skipped = 0, failed = 0;

for (const id of jiraIds) {
  try {
    const result = await clipJira(context, id);
    if (result === 'clipped') clipped++;
    else if (result === 'updated') updated++;
    else if (result === 'skipped') skipped++;
  } catch (err) {
    console.error(`FAIL ${id}: ${err.message}`);
    failed++;
  }
  await new Promise(r => setTimeout(r, 500));
}

for (const input of wikiInputs) {
  try {
    const result = await clipWiki(context, input);
    if (result === 'clipped') clipped++;
    else if (result === 'updated') updated++;
    else if (result === 'skipped') skipped++;
    else if (result === 'failed') failed++;
  } catch (err) {
    console.error(`FAIL ${input}: ${err.message}`);
    failed++;
  }
  await new Promise(r => setTimeout(r, 500));
}

await browser.close();
console.log(`\nDone: ${clipped} new, ${updated} updated, ${skipped} up-to-date, ${failed} failed, ${items.length} total`);
