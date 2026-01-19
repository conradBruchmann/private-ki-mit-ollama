# Lösungen Kapitel 9: Dokumenten-Pipeline mit Ollama

## Übung 1: HTML-Loader

```typescript
// src/loaders/html-loader.ts
import * as cheerio from 'cheerio';
import { readFile, stat } from 'fs/promises';
import { createHash } from 'crypto';
import { basename } from 'path';
import type { DocumentLoader, LoadedDocument, DocumentMetadata } from './index';

export interface HTMLSection {
  tag: string;
  level?: number;
  content: string;
}

export class HTMLLoader implements DocumentLoader {
  supportedTypes = ['html', 'htm'];

  async load(filePath: string): Promise<LoadedDocument> {
    const html = await readFile(filePath, 'utf-8');
    const stats = await stat(filePath);
    const hash = createHash('sha256').update(html).digest('hex');

    const $ = cheerio.load(html);
    
    // Strukturierte Extraktion
    const sections = this.extractStructure($);
    const content = this.sectionsToMarkdown(sections);
    
    // Metadaten aus HTML extrahieren
    const title = $('title').text() || $('h1').first().text() || undefined;
    const author = $('meta[name="author"]').attr('content');

    return {
      id: hash.substring(0, 16),
      content,
      metadata: {
        source: filePath,
        filename: basename(filePath),
        fileType: 'html',
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        wordCount: content.split(/\s+/).length,
        title,
        author,
        hash
      }
    };
  }

  private extractStructure($: cheerio.CheerioAPI): HTMLSection[] {
    const sections: HTMLSection[] = [];
    
    // Überschriften
    $('h1, h2, h3, h4, h5, h6').each((_, el) => {
      const $el = $(el);
      const tag = el.tagName.toLowerCase();
      const level = parseInt(tag.charAt(1));
      sections.push({
        tag,
        level,
        content: $el.text().trim()
      });
    });
    
    // Paragraphen
    $('p').each((_, el) => {
      const text = $(el).text().trim();
      if (text) {
        sections.push({ tag: 'p', content: text });
      }
    });
    
    // Listen
    $('ul, ol').each((_, el) => {
      const $list = $(el);
      const items: string[] = [];
      $list.find('li').each((_, li) => {
        items.push($(li).text().trim());
      });
      sections.push({
        tag: el.tagName.toLowerCase(),
        content: items.join('\n')
      });
    });
    
    // Tabellen
    $('table').each((_, table) => {
      const rows: string[][] = [];
      $(table).find('tr').each((_, tr) => {
        const cells: string[] = [];
        $(tr).find('th, td').each((_, cell) => {
          cells.push($(cell).text().trim());
        });
        rows.push(cells);
      });
      sections.push({
        tag: 'table',
        content: rows.map(r => r.join(' | ')).join('\n')
      });
    });
    
    // Code-Blöcke
    $('pre, code').each((_, el) => {
      sections.push({
        tag: 'code',
        content: $(el).text().trim()
      });
    });
    
    return sections;
  }

  private sectionsToMarkdown(sections: HTMLSection[]): string {
    return sections.map(section => {
      switch (section.tag) {
        case 'h1': return `# ${section.content}`;
        case 'h2': return `## ${section.content}`;
        case 'h3': return `### ${section.content}`;
        case 'h4': return `#### ${section.content}`;
        case 'h5': return `##### ${section.content}`;
        case 'h6': return `###### ${section.content}`;
        case 'ul': return section.content.split('\n').map(i => `- ${i}`).join('\n');
        case 'ol': return section.content.split('\n').map((i, idx) => `${idx + 1}. ${i}`).join('\n');
        case 'table': return '```\n' + section.content + '\n```';
        case 'code': return '```\n' + section.content + '\n```';
        default: return section.content;
      }
    }).join('\n\n');
  }
}

// In unified-loader.ts registrieren:
// this.registerLoader(new HTMLLoader());
```

---

## Übung 2: Hybrid Search

```typescript
// src/search/hybrid-search.ts
import Ollama from 'ollama';

interface SearchResult {
  id: string;
  content: string;
  score: number;
  vectorScore?: number;
  bm25Score?: number;
}

// BM25 Implementierung
class BM25 {
  private k1 = 1.5;
  private b = 0.75;
  private documents: string[] = [];
  private avgDocLength = 0;
  private docFreqs: Map<string, number> = new Map();
  private docLengths: number[] = [];

  index(documents: string[]): void {
    this.documents = documents;
    this.docLengths = documents.map(d => d.split(/\s+/).length);
    this.avgDocLength = this.docLengths.reduce((a, b) => a + b, 0) / documents.length;
    
    // Document frequencies berechnen
    for (const doc of documents) {
      const terms = new Set(this.tokenize(doc));
      for (const term of terms) {
        this.docFreqs.set(term, (this.docFreqs.get(term) || 0) + 1);
      }
    }
  }

  search(query: string, topK: number = 10): { index: number; score: number }[] {
    const queryTerms = this.tokenize(query);
    const scores: { index: number; score: number }[] = [];
    
    for (let i = 0; i < this.documents.length; i++) {
      const docTerms = this.tokenize(this.documents[i]);
      let score = 0;
      
      for (const term of queryTerms) {
        const tf = docTerms.filter(t => t === term).length;
        const df = this.docFreqs.get(term) || 0;
        const idf = Math.log((this.documents.length - df + 0.5) / (df + 0.5) + 1);
        
        const tfNorm = (tf * (this.k1 + 1)) / 
          (tf + this.k1 * (1 - this.b + this.b * this.docLengths[i] / this.avgDocLength));
        
        score += idf * tfNorm;
      }
      
      scores.push({ index: i, score });
    }
    
    return scores.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(t => t.length > 2);
  }
}

// Hybrid Search Klasse
export class HybridSearch {
  private ollama: Ollama;
  private bm25: BM25;
  private documents: string[] = [];
  private embeddings: number[][] = [];
  private alpha: number; // Gewichtung: 0 = nur BM25, 1 = nur Vector

  constructor(alpha: number = 0.5) {
    this.ollama = new Ollama();
    this.bm25 = new BM25();
    this.alpha = alpha;
  }

  async index(documents: string[]): Promise<void> {
    this.documents = documents;
    
    // BM25 Index
    this.bm25.index(documents);
    
    // Vector Embeddings
    console.log('Generiere Embeddings...');
    this.embeddings = [];
    for (const doc of documents) {
      const response = await this.ollama.embed({
        model: 'nomic-embed-text',
        input: doc
      });
      this.embeddings.push(response.embeddings[0]);
    }
  }

  async search(query: string, topK: number = 5): Promise<SearchResult[]> {
    // BM25 Scores
    const bm25Results = this.bm25.search(query, this.documents.length);
    const bm25Scores = new Map(bm25Results.map(r => [r.index, r.score]));
    
    // Vector Scores
    const queryEmb = await this.ollama.embed({
      model: 'nomic-embed-text',
      input: query
    }).then(r => r.embeddings[0]);
    
    const vectorScores = this.embeddings.map((emb, idx) => ({
      index: idx,
      score: this.cosineSimilarity(queryEmb, emb)
    }));
    
    // Normalisieren
    const maxBM25 = Math.max(...bm25Results.map(r => r.score)) || 1;
    const maxVector = Math.max(...vectorScores.map(r => r.score)) || 1;
    
    // Kombinierte Scores
    const combined: SearchResult[] = this.documents.map((doc, idx) => {
      const bm25Norm = (bm25Scores.get(idx) || 0) / maxBM25;
      const vectorNorm = vectorScores[idx].score / maxVector;
      
      return {
        id: `doc-${idx}`,
        content: doc,
        score: (1 - this.alpha) * bm25Norm + this.alpha * vectorNorm,
        vectorScore: vectorNorm,
        bm25Score: bm25Norm
      };
    });
    
    return combined
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] ** 2;
      normB += b[i] ** 2;
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

// Verwendung
async function main() {
  const search = new HybridSearch(0.6); // 60% Vector, 40% BM25
  
  const docs = [
    "Python ist eine interpretierte Programmiersprache",
    "JavaScript wird für Webentwicklung verwendet",
    "Machine Learning nutzt statistische Methoden",
    "Docker containerisiert Anwendungen effizient"
  ];
  
  await search.index(docs);
  
  const results = await search.search("Programmiersprache für Web");
  console.log(results);
}
```

---

## Übung 3: Chunk-Visualisierung

```typescript
// chunk-visualizer.ts
import { readFileSync } from 'fs';
import chalk from 'chalk';

interface ChunkInfo {
  start: number;
  end: number;
  text: string;
  overlap: boolean;
}

function visualizeChunks(
  text: string, 
  chunkSize: number, 
  overlap: number
): void {
  const chunks: ChunkInfo[] = [];
  
  for (let i = 0; i < text.length; i += chunkSize - overlap) {
    chunks.push({
      start: i,
      end: Math.min(i + chunkSize, text.length),
      text: text.slice(i, i + chunkSize),
      overlap: i > 0
    });
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Dokument: ${text.length} Zeichen`);
  console.log(`Chunk-Size: ${chunkSize}, Overlap: ${overlap}`);
  console.log(`Anzahl Chunks: ${chunks.length}`);
  console.log(`${'='.repeat(60)}\n`);
  
  // Farbige Visualisierung
  const colors = [chalk.bgBlue, chalk.bgGreen, chalk.bgYellow, chalk.bgMagenta, chalk.bgCyan];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const color = colors[i % colors.length];
    const overlapMarker = chunk.overlap ? chalk.red('[OVERLAP]') : '';
    
    console.log(`${chalk.bold(`Chunk ${i + 1}`)} ${overlapMarker}`);
    console.log(`Position: ${chunk.start}-${chunk.end} (${chunk.end - chunk.start} chars)`);
    console.log(color(chunk.text.slice(0, 100) + (chunk.text.length > 100 ? '...' : '')));
    console.log();
  }
  
  // Overlap-Bereiche hervorheben
  console.log(`\n${'='.repeat(60)}`);
  console.log('Overlap-Analyse:');
  console.log(`${'='.repeat(60)}\n`);
  
  for (let i = 1; i < chunks.length; i++) {
    const prevEnd = chunks[i - 1].end;
    const currStart = chunks[i].start;
    const overlapText = text.slice(currStart, prevEnd);
    
    if (overlapText) {
      console.log(`Chunks ${i} ↔ ${i + 1}: ${overlapText.length} chars overlap`);
      console.log(chalk.red(`"${overlapText.slice(0, 50)}..."`));
      console.log();
    }
  }
}

// Statistiken
function analyzeChunks(text: string, chunkSize: number, overlap: number): void {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  const words = text.split(/\s+/);
  
  let brokenSentences = 0;
  let position = 0;
  
  while (position < text.length) {
    const chunkEnd = position + chunkSize;
    
    // Prüfen ob Satz unterbrochen
    for (const sentence of sentences) {
      const sentenceStart = text.indexOf(sentence);
      const sentenceEnd = sentenceStart + sentence.length;
      
      if (sentenceStart < chunkEnd && sentenceEnd > chunkEnd) {
        brokenSentences++;
      }
    }
    
    position += chunkSize - overlap;
  }
  
  console.log(`\n📊 Statistiken:`);
  console.log(`   Sätze im Dokument: ${sentences.length}`);
  console.log(`   Wörter im Dokument: ${words.length}`);
  console.log(`   Unterbrochene Sätze: ${brokenSentences}`);
  console.log(`   Chunk-Effizienz: ${((sentences.length - brokenSentences) / sentences.length * 100).toFixed(1)}%`);
}

// CLI
const text = readFileSync(process.argv[2] || 'sample.txt', 'utf-8');
const chunkSize = parseInt(process.argv[3]) || 500;
const overlap = parseInt(process.argv[4]) || 50;

visualizeChunks(text, chunkSize, overlap);
analyzeChunks(text, chunkSize, overlap);
```

---

## Übung 4: Live-Monitoring mit File Watcher

```typescript
// live-indexer.ts
import { watch } from 'chokidar';
import { ChromaClient } from 'chromadb';
import Ollama from 'ollama';
import { readFileSync } from 'fs';
import { basename, extname } from 'path';

const ollama = new Ollama();
const chroma = new ChromaClient();

async function indexDocument(
  collection: any, 
  filePath: string
): Promise<void> {
  const ext = extname(filePath).toLowerCase();
  if (!['.md', '.txt', '.html'].includes(ext)) {
    return;
  }

  const content = readFileSync(filePath, 'utf-8');
  const chunks = content.match(/.{1,500}/g) || [];
  
  console.log(`📄 Indexiere: ${basename(filePath)} (${chunks.length} chunks)`);
  
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await ollama.embed({
      model: 'nomic-embed-text',
      input: chunks[i]
    }).then(r => r.embeddings[0]);
    
    const id = `${basename(filePath)}-${i}-${Date.now()}`;
    
    await collection.add({
      ids: [id],
      embeddings: [embedding],
      documents: [chunks[i]],
      metadatas: [{
        source: filePath,
        chunk: i,
        indexedAt: new Date().toISOString()
      }]
    });
  }
  
  console.log(`✅ Fertig: ${basename(filePath)}`);
}

async function removeDocument(
  collection: any, 
  filePath: string
): Promise<void> {
  const filename = basename(filePath);
  
  // Alle Chunks dieser Datei finden und löschen
  const results = await collection.get({
    where: { source: filePath }
  });
  
  if (results.ids.length > 0) {
    await collection.delete({ ids: results.ids });
    console.log(`🗑️  Entfernt: ${filename} (${results.ids.length} chunks)`);
  }
}

async function main() {
  const WATCH_PATH = process.argv[2] || './documents';
  const COLLECTION = 'live-index';
  
  const collection = await chroma.getOrCreateCollection({ 
    name: COLLECTION 
  });
  
  console.log(`\n👁️  Überwache: ${WATCH_PATH}`);
  console.log(`   Collection: ${COLLECTION}`);
  console.log(`   Strg+C zum Beenden\n`);
  
  const watcher = watch(WATCH_PATH, {
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: {
      stabilityThreshold: 1000,
      pollInterval: 100
    }
  });
  
  watcher
    .on('add', path => indexDocument(collection, path))
    .on('change', async path => {
      await removeDocument(collection, path);
      await indexDocument(collection, path);
    })
    .on('unlink', path => removeDocument(collection, path))
    .on('error', error => console.error('Watcher error:', error));
  
  // Statistik alle 30 Sekunden
  setInterval(async () => {
    const count = await collection.count();
    console.log(`\n📊 Index-Status: ${count} Chunks total\n`);
  }, 30000);
}

main().catch(console.error);
```

```bash
# Verwendung
npx tsx live-indexer.ts ./my-documents

# In einem anderen Terminal: Dateien hinzufügen/ändern
echo "Neuer Inhalt" > ./my-documents/test.md
# → Wird automatisch indexiert
```
