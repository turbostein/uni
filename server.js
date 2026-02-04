/**
 * UNI - Real Learning AI with Hybrid Architecture v2
 * 
 * This system combines:
 * 1. Pre-trained LLM backend (Claude) for reasoning and generation
 * 2. Real-time learning system for memory, personalization, and knowledge
 * 3. Vector embeddings for semantic search
 * 4. Knowledge graph for structured information
 */

const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const fs = require('fs').promises;
const crypto = require('crypto');

// Import base knowledge
const knowledgeBase = require('./knowledge_base');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ============================================================================
// VECTOR OPERATIONS
// ============================================================================

class VectorStore {
  constructor() {
    this.vectors = new Map();
    this.dimension = 384;
  }

  generateLocalEmbedding(text) {
    const words = text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
    const vector = new Array(this.dimension).fill(0);
    
    words.forEach((word) => {
      const hash = this.hashString(word);
      for (let i = 0; i < this.dimension; i++) {
        vector[i] += Math.sin(hash * (i + 1) * 0.001) * (1 / Math.sqrt(words.length || 1));
      }
    });
    
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) vector.forEach((_, i) => vector[i] /= magnitude);
    return vector;
  }

  hashString(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash) + str.charCodeAt(i);
    return Math.abs(hash);
  }

  cosineSimilarity(a, b) {
    if (a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; normA += a[i] * a[i]; normB += b[i] * b[i]; }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
  }

  add(id, text, metadata = {}) {
    this.vectors.set(id, { vector: this.generateLocalEmbedding(text), text, metadata, timestamp: Date.now() });
  }

  search(query, topK = 5) {
    const queryVector = this.generateLocalEmbedding(query);
    const results = [];
    this.vectors.forEach((data, id) => {
      results.push({ id, text: data.text, metadata: data.metadata, similarity: this.cosineSimilarity(queryVector, data.vector) });
    });
    return results.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
  }

  toJSON() { return Array.from(this.vectors.entries()); }
  fromJSON(data) { this.vectors = new Map(data); }
}

// ============================================================================
// KNOWLEDGE GRAPH
// ============================================================================

class KnowledgeGraph {
  constructor() {
    this.concepts = new Map();
    this.relationships = new Map();
  }

  addConcept(name, definition, metadata = {}) {
    const key = name.toLowerCase();
    const existing = this.concepts.get(key);
    
    this.concepts.set(key, {
      name, definition,
      category: metadata.category || 'general',
      source: metadata.source || 'unknown',
      confidence: metadata.confidence || 0.5,
      occurrences: (existing?.occurrences || 0) + 1,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now()
    });
    this.discoverRelationships(name, definition);
  }

  discoverRelationships(concept, definition) {
    const words = definition.toLowerCase().split(/\s+/);
    this.concepts.forEach((data, existingConcept) => {
      if (existingConcept === concept.toLowerCase()) return;
      if (definition.toLowerCase().includes(existingConcept)) {
        this.addRelationship(concept, existingConcept, 'mentions', 0.8);
      }
    });
  }

  addRelationship(from, to, type, strength = 0.5) {
    this.relationships.set(`${from.toLowerCase()}->${to.toLowerCase()}`, { from, to, type, strength });
  }

  getConcept(name) { return this.concepts.get(name.toLowerCase()); }

  findRelated(concept, limit = 5) {
    const related = [];
    this.relationships.forEach((rel) => {
      if (rel.from.toLowerCase() === concept.toLowerCase() || rel.to.toLowerCase() === concept.toLowerCase()) {
        const other = rel.from.toLowerCase() === concept.toLowerCase() ? rel.to : rel.from;
        const data = this.concepts.get(other.toLowerCase());
        if (data) related.push({ name: other, strength: rel.strength, ...data });
      }
    });
    return related.sort((a, b) => b.strength - a.strength).slice(0, limit);
  }

  searchConcepts(query, limit = 10) {
    const results = [];
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);

    this.concepts.forEach((data, name) => {
      let score = 0;
      if (name.includes(queryLower)) score += 10;
      if (data.definition.toLowerCase().includes(queryLower)) score += 5;
      queryWords.forEach(word => {
        if (word.length > 2) {
          if (name.includes(word)) score += 3;
          if (data.definition.toLowerCase().includes(word)) score += 1;
        }
      });
      if (score > 0) results.push({ name, score, ...data });
    });
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  toJSON() { return { concepts: Array.from(this.concepts.entries()), relationships: Array.from(this.relationships.entries()) }; }
  fromJSON(data) { this.concepts = new Map(data.concepts || []); this.relationships = new Map(data.relationships || []); }
}

// ============================================================================
// CONVERSATION MEMORY
// ============================================================================

class ConversationMemory {
  constructor() {
    this.users = new Map();
    this.maxHistory = 50;
  }

  getUser(userId) {
    if (!this.users.has(userId)) {
      this.users.set(userId, { name: null, firstSeen: Date.now(), lastSeen: Date.now(), messageCount: 0, history: [], topics: new Set(), facts: new Map() });
    }
    const user = this.users.get(userId);
    user.lastSeen = Date.now();
    return user;
  }

  addMessage(userId, role, content) {
    const user = this.getUser(userId);
    user.history.push({ role, content, timestamp: Date.now() });
    if (user.history.length > this.maxHistory) user.history = user.history.slice(-this.maxHistory);
    user.messageCount++;
  }

  getRecentHistory(userId, limit = 10) { return this.getUser(userId).history.slice(-limit); }
  setUserName(userId, name) { this.getUser(userId).name = name; }
  addUserFact(userId, key, value) { this.getUser(userId).facts.set(key, { value, learnedAt: Date.now() }); }
  addTopic(userId, topic) { this.getUser(userId).topics.add(topic.toLowerCase()); }

  toJSON() {
    return Array.from(this.users.entries()).map(([id, user]) => [id, { ...user, topics: Array.from(user.topics), facts: Array.from(user.facts.entries()) }]);
  }
  fromJSON(data) {
    this.users = new Map(data.map(([id, user]) => [id, { ...user, topics: new Set(user.topics || []), facts: new Map(user.facts || []) }]));
  }
}

// ============================================================================
// LEARNING ENGINE - IMPROVED with flexible patterns
// ============================================================================

class LearningEngine {
  constructor(knowledgeGraph, vectorStore) {
    this.kg = knowledgeGraph;
    this.vs = vectorStore;
    this.learningEvents = 0;
    
    this.patterns = {
      definition: [
        /^([a-zA-Z][a-zA-Z\s]{1,40})\s+(?:is|are|means?|refers? to)\s+(.{10,})$/i,
        /^([a-zA-Z][a-zA-Z\s]{1,40})\s*[:]\s*(.{10,})$/,
        /(?:teach you about|let me tell you about|here's what|fyi|btw)\s+([a-zA-Z][a-zA-Z\s]{1,40})[:.]?\s*(.{10,})/i,
        /(?:did you know|fun fact|remember that)\s+(?:that\s+)?([a-zA-Z][a-zA-Z\s]{1,40})\s+(?:is|are)\s+(.{10,})/i,
        /(?:the definition of|define)\s+([a-zA-Z][a-zA-Z\s]{1,40})\s+(?:is|as)\s+(.{10,})/i,
        /^(?:a|an|the)\s+([a-zA-Z][a-zA-Z\s]{1,40})\s+is\s+(.{10,})$/i,
        /^([a-zA-Z][a-zA-Z\s]{1,40})\s*[-–—]\s*(.{10,})$/,
      ],
      identity: [
        /(?:my name is|i'm|i am|call me)\s+([A-Z][a-z]+)/i,
        /(?:i work (?:at|for)|my job is|i'm a|i am a)\s+(.+)/i,
        /(?:i live in|i'm from|i come from)\s+(.+)/i,
      ],
      preference: [
        /i (?:really\s+)?(?:like|love|enjoy|prefer|hate|dislike)\s+(.+)/i,
      ]
    };
  }

  extract(message, userId) {
    const extracted = { concepts: [], facts: [], userInfo: {}, topics: [] };
    
    // Skip questions for concept extraction
    if (message.trim().endsWith('?')) {
      this.extractIdentity(message, extracted);
      return extracted;
    }

    // Try definition patterns
    for (const pattern of this.patterns.definition) {
      const match = message.match(pattern);
      if (match && match[1] && match[2]) {
        const concept = match[1].trim().toLowerCase();
        const definition = match[2].trim();
        
        if (!concept.match(/^(you|i|we|they|he|she|it|my|your|this|that|there|what|how|why)$/i) &&
            definition.length >= 10 && definition.length < 500 && !definition.includes('?')) {
          extracted.concepts.push({ concept, definition });
          break;
        }
      }
    }

    this.extractIdentity(message, extracted);
    
    // Topics
    const lower = message.toLowerCase();
    this.kg.concepts.forEach((_, concept) => {
      if (lower.includes(concept) && concept.length > 3) extracted.topics.push(concept);
    });

    return extracted;
  }

  extractIdentity(message, extracted) {
    for (const pattern of this.patterns.identity) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const value = match[1].trim();
        if (pattern.source.includes('name')) {
          extracted.userInfo.name = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        } else if (pattern.source.includes('work') || pattern.source.includes('job')) {
          extracted.userInfo.occupation = value;
        } else if (pattern.source.includes('live') || pattern.source.includes('from')) {
          extracted.userInfo.location = value;
        }
      }
    }
  }

  async learn(extracted, userId) {
    let learned = false;
    for (const { concept, definition } of extracted.concepts) {
      this.kg.addConcept(concept, definition, { source: `user_${userId}`, confidence: 0.85 });
      this.vs.add(`concept_${concept}_${Date.now()}`, `${concept}: ${definition}`, { type: 'concept', concept });
      this.learningEvents++;
      learned = true;
      console.log(`📚 Learned: "${concept}"`);
    }
    return learned;
  }
}

// ============================================================================
// LLM CLIENT - Claude API Integration
// ============================================================================

class LLMClient {
  constructor() {
    this.anthropicKey = process.env.ANTHROPIC_API_KEY;
    this.useLocal = !this.anthropicKey;
    this.lastError = null;
    
    console.log(this.useLocal ? '⚠️  No API key - using local mode' : '✅ Claude API enabled');
  }

  async generate(systemPrompt, messages, options = {}) {
    if (this.anthropicKey) {
      const result = await this.callAnthropic(systemPrompt, messages, options);
      if (result) return result;
    }
    return this.generateLocal(systemPrompt, messages);
  }

  async callAnthropic(systemPrompt, messages, options = {}) {
    try {
      console.log('🤖 Calling Claude...');
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          system: systemPrompt,
          messages: messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
        })
      });

      if (!response.ok) {
        const err = await response.text();
        console.error('API error:', response.status, err);
        this.lastError = `API ${response.status}`;
        return null;
      }

      const data = await response.json();
      this.lastError = null;
      console.log('✅ Response received');
      return data.content[0].text;
    } catch (error) {
      console.error('API exception:', error.message);
      this.lastError = error.message;
      return null;
    }
  }

  generateLocal(systemPrompt, messages) {
    const lastMessage = messages[messages.length - 1]?.content || '';
    const lower = lastMessage.toLowerCase().trim();
    
    // Extract from system prompt
    const nameMatch = systemPrompt.match(/Name: (\w+)/);
    const userName = nameMatch ? nameMatch[1] : null;
    const msgMatch = systemPrompt.match(/Messages exchanged: (\d+)/);
    const msgCount = msgMatch ? parseInt(msgMatch[1]) : 0;
    const knowledgeMatch = systemPrompt.match(/RELEVANT KNOWLEDGE[^:]*:\n([\s\S]*?)(?:\n\n|INSTRUCTIONS)/);
    const knowledge = knowledgeMatch ? knowledgeMatch[1].trim() : '';
    
    // Greetings
    if (lower.match(/^(hi|hello|hey|yo|sup)[\s!.,]*$/i)) {
      return userName 
        ? `Hey ${userName}! We've chatted ${msgCount} times now. What's up?`
        : `Hello! I'm Uni. I learn and remember from our conversations. What's your name?`;
    }
    
    // Name queries
    if (lower.includes('my name') && (lower.includes('what') || lower.includes('know'))) {
      return userName 
        ? `Your name is ${userName}! We've chatted ${msgCount} times. I remember you.`
        : `You haven't told me your name yet! What should I call you?`;
    }
    
    // Name intro
    const nameIntro = lastMessage.match(/(?:my name is|i'm|i am|call me)\s+(\w+)/i);
    if (nameIntro) {
      return `Nice to meet you, ${nameIntro[1]}! I'll remember that. What would you like to talk about?`;
    }
    
    // Use knowledge if available
    if (knowledge) {
      const lines = knowledge.split('\n').filter(l => l.trim().startsWith('-'));
      if (lines.length > 0) {
        const info = lines[0].replace(/^-\s*/, '').trim();
        return info + (lines.length > 1 ? ` I also know about related topics if you're curious.` : '');
      }
    }
    
    // Questions
    if (lower.match(/^(what|how|why|when|where|who|can|do|is|are)/)) {
      return `Good question! I don't have that in my knowledge base yet. Want to teach me? Just say something like "X is Y" and I'll remember it!`;
    }
    
    // Default
    return `Interesting! Tell me more, or teach me something by explaining a concept.`;
  }
}

// ============================================================================
// MAIN UNI AI CLASS
// ============================================================================

class UniAI {
  constructor() {
    this.birthTime = Date.now();
    this.knowledgeGraph = new KnowledgeGraph();
    this.vectorStore = new VectorStore();
    this.memory = new ConversationMemory();
    this.learningEngine = new LearningEngine(this.knowledgeGraph, this.vectorStore);
    this.llm = new LLMClient();
    this.stats = { totalConversations: 0, uniqueUsers: new Set(), conceptsLearned: 0, learningEvents: 0, apiCalls: 0, apiSuccesses: 0 };
    
    this.initializeKnowledgeBase();
  }

  initializeKnowledgeBase() {
    console.log('📚 Loading knowledge base...');
    let count = 0;
    Object.entries(knowledgeBase).forEach(([category, concepts]) => {
      Object.entries(concepts).forEach(([name, definition]) => {
        this.knowledgeGraph.addConcept(name, definition, { category, source: 'base', confidence: 1.0 });
        this.vectorStore.add(`base_${name}`, `${name}: ${definition}`, { type: 'base', category, concept: name });
        count++;
      });
    });
    this.stats.conceptsLearned = count;
    console.log(`✅ Loaded ${count} concepts`);
  }

  buildSystemPrompt(userId, query) {
    const user = this.memory.getUser(userId);
    const relevantDocs = this.vectorStore.search(query, 5);
    const kgResults = this.knowledgeGraph.searchConcepts(query, 5);
    
    let prompt = `You are Uni, a friendly AI that learns and remembers.

PERSONALITY: Warm, curious, conversational. You remember users and reference past chats naturally. When you don't know something, you invite teaching. Keep responses concise (2-3 sentences usually).

USER INFO:
`;
    if (user.name) prompt += `- Name: ${user.name}\n`;
    prompt += `- Messages exchanged: ${user.messageCount}\n`;
    if (user.topics.size > 0) prompt += `- Topics discussed: ${Array.from(user.topics).slice(0, 5).join(', ')}\n`;
    user.facts.forEach((data, key) => { if (key !== 'name') prompt += `- ${key}: ${data.value}\n`; });

    // Collect knowledge
    const knowledgeSet = new Map();
    relevantDocs.forEach(doc => { if (doc.similarity > 0.2) knowledgeSet.set(doc.metadata.concept || doc.text.split(':')[0], doc.text); });
    kgResults.forEach(r => { if (!knowledgeSet.has(r.name)) knowledgeSet.set(r.name, `${r.name}: ${r.definition}`); });

    if (knowledgeSet.size > 0) {
      prompt += `\nRELEVANT KNOWLEDGE:\n`;
      knowledgeSet.forEach((text) => prompt += `- ${text}\n`);
    }

    prompt += `\nINSTRUCTIONS: Be natural and conversational. Use knowledge when relevant. If user teaches something, warmly acknowledge. Total knowledge: ${this.knowledgeGraph.concepts.size} concepts.`;
    return prompt;
  }

  async chat(message, userId = 'anonymous') {
    this.stats.totalConversations++;
    this.stats.uniqueUsers.add(userId);
    
    this.memory.addMessage(userId, 'user', message);
    
    const extracted = this.learningEngine.extract(message, userId);
    
    if (extracted.userInfo.name) this.memory.setUserName(userId, extracted.userInfo.name);
    if (extracted.userInfo.occupation) this.memory.addUserFact(userId, 'occupation', extracted.userInfo.occupation);
    if (extracted.userInfo.location) this.memory.addUserFact(userId, 'location', extracted.userInfo.location);
    extracted.topics.forEach(t => this.memory.addTopic(userId, t));
    
    const learned = await this.learningEngine.learn(extracted, userId);
    if (learned) {
      this.stats.learningEvents++;
      this.stats.conceptsLearned = this.knowledgeGraph.concepts.size;
    }
    
    const systemPrompt = this.buildSystemPrompt(userId, message);
    const history = this.memory.getRecentHistory(userId, 8);
    
    this.stats.apiCalls++;
    const response = await this.llm.generate(systemPrompt, history.map(h => ({ role: h.role, content: h.content })));
    if (!this.llm.lastError) this.stats.apiSuccesses++;
    
    this.memory.addMessage(userId, 'assistant', response);
    
    if (this.stats.totalConversations % 5 === 0) setTimeout(() => this.save(), 1000);
    
    return { response, learned, stats: this.getStats() };
  }

  async teach(concept, definition, userId = 'anonymous') {
    const c = concept.trim().toLowerCase();
    const d = definition.trim();
    if (c.length < 2 || d.length < 5) return { success: false, error: 'Too short' };
    
    this.knowledgeGraph.addConcept(c, d, { source: `direct_${userId}`, confidence: 0.95 });
    this.vectorStore.add(`taught_${c}_${Date.now()}`, `${c}: ${d}`, { type: 'taught', concept: c });
    this.stats.learningEvents++;
    this.stats.conceptsLearned = this.knowledgeGraph.concepts.size;
    
    console.log(`📖 Taught: "${c}"`);
    setTimeout(() => this.save(), 500);
    
    return { success: true, concept: c, totalConcepts: this.knowledgeGraph.concepts.size, stats: this.getStats() };
  }

  getStats() {
    return {
      totalConversations: this.stats.totalConversations,
      uniqueUsers: this.stats.uniqueUsers.size,
      conceptsLearned: this.knowledgeGraph.concepts.size,
      learningEvents: this.stats.learningEvents + this.learningEngine.learningEvents,
      vocabularySize: this.vectorStore.vectors.size,
      apiCalls: this.stats.apiCalls,
      apiSuccesses: this.stats.apiSuccesses
    };
  }

  getKnowledge(limit = 50) {
    return Array.from(this.knowledgeGraph.concepts.entries())
      .map(([name, data]) => ({
        concept: name,
        definition: data.definition.substring(0, 300),
        category: data.category,
        occurrences: data.occurrences || 1,
        source: data.source,
        associations: this.knowledgeGraph.findRelated(name, 3).length
      }))
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, limit);
  }

  async save() {
    try {
      await fs.writeFile('uni_brain.json', JSON.stringify({
        birthTime: this.birthTime,
        knowledgeGraph: this.knowledgeGraph.toJSON(),
        vectorStore: this.vectorStore.toJSON(),
        memory: this.memory.toJSON(),
        stats: { ...this.stats, uniqueUsers: Array.from(this.stats.uniqueUsers) },
        learningEvents: this.learningEngine.learningEvents
      }, null, 2));
      console.log('💾 Saved');
    } catch (e) { console.error('Save failed:', e.message); }
  }

  async load() {
    try {
      const data = JSON.parse(await fs.readFile('uni_brain.json', 'utf8'));
      this.birthTime = data.birthTime || Date.now();
      if (data.knowledgeGraph) this.knowledgeGraph.fromJSON(data.knowledgeGraph);
      if (data.vectorStore) this.vectorStore.fromJSON(data.vectorStore);
      if (data.memory) this.memory.fromJSON(data.memory);
      if (data.stats) this.stats = { ...data.stats, uniqueUsers: new Set(data.stats.uniqueUsers || []) };
      if (data.learningEvents) this.learningEngine.learningEvents = data.learningEvents;
      console.log(`✅ Loaded - ${this.knowledgeGraph.concepts.size} concepts`);
    } catch (e) { console.log('→ Fresh start'); }
  }
}

// ============================================================================
// SERVER
// ============================================================================

const uni = new UniAI();
const wss = new WebSocket.Server({ noServer: true });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.send(JSON.stringify({ type: 'state', data: { stats: uni.getStats() } }));
  ws.on('close', () => clients.delete(ws));
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(msg); });
}

app.post('/api/message', async (req, res) => {
  const { message, userId } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });
  try {
    const result = await uni.chat(message, userId || 'anonymous');
    broadcast({ type: 'conversation', data: result });
    res.json(result);
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

app.post('/api/teach', async (req, res) => {
  const { concept, definition, userId } = req.body;
  if (!concept || !definition) return res.status(400).json({ error: 'Concept and definition required' });
  try {
    const result = await uni.teach(concept, definition, userId || 'anonymous');
    if (result.success) broadcast({ type: 'learning', data: { concept: result.concept, stats: result.stats } });
    res.json(result);
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

app.get('/api/knowledge', (req, res) => {
  res.json({ knowledge: uni.getKnowledge(parseInt(req.query.limit) || 50), stats: uni.getStats() });
});

app.get('/api/stats', (req, res) => res.json(uni.getStats()));
app.get('/health', (req, res) => res.json({ status: 'ok', apiMode: !uni.llm.useLocal, stats: uni.getStats() }));

const server = app.listen(PORT, async () => {
  console.log(`\n🚀 Uni running on port ${PORT}`);
  await uni.load();
  console.log(`   Mode: ${uni.llm.useLocal ? 'Local' : 'Claude API'}`);
  console.log(`   Knowledge: ${uni.knowledgeGraph.concepts.size} concepts\n`);
});

server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
});

process.on('SIGTERM', async () => { await uni.save(); process.exit(0); });
process.on('SIGINT', async () => { await uni.save(); process.exit(0); });
setInterval(() => uni.save(), 120000);
