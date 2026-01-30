const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const fs = require('fs').promises;
const knowledgeBase = require('./knowledge_base');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

class UniAI {
    constructor() {
        this.birthTime = Date.now();
        
        // Core knowledge - starts with comprehensive base
        this.knowledge = new Map();
        this.conceptGraph = new Map(); // Semantic relationships
        this.contextMemory = new Map(); // Per-user conversation context
        
        // Learning systems
        this.vocabulary = new Map(); // Word -> {count, contexts, embeddings}
        this.phrasePatterns = new Map(); // Common phrases and responses
        this.entityMemory = new Map(); // Remember people, places, things
        this.conversationHistory = [];
        
        // Semantic understanding
        this.synonyms = new Map();
        this.antonyms = new Map();
        this.categories = new Map();
        
        // Stats
        this.stats = {
            totalConversations: 0,
            uniqueUsers: 0,
            conceptsLearned: 0,
            vocabularySize: 0,
            accurateResponses: 0
        };
        
        this.initializeKnowledgeBase();
        this.initializeSemanticRelationships();
    }
    
    initializeKnowledgeBase() {
        console.log('📚 Loading comprehensive knowledge base...');
        
        let conceptCount = 0;
        Object.values(knowledgeBase).forEach(category => {
            Object.entries(category).forEach(([concept, definition]) => {
                this.knowledge.set(concept.toLowerCase(), {
                    definition,
                    category: this.detectCategory(definition),
                    confidence: 1.0,
                    occurrences: 1,
                    lastAccessed: Date.now(),
                    source: 'base_knowledge',
                    related: []
                });
                conceptCount++;
            });
        });
        
        this.stats.conceptsLearned = conceptCount;
        console.log(`✓ Loaded ${conceptCount} base concepts`);
    }
    
    initializeSemanticRelationships() {
        // Build concept graph with relationships
        this.knowledge.forEach((data, concept) => {
            const related = this.findRelatedConcepts(concept, data.definition);
            data.related = related;
            
            if (!this.conceptGraph.has(concept)) {
                this.conceptGraph.set(concept, new Map());
            }
            
            related.forEach(rel => {
                this.conceptGraph.get(concept).set(rel, 0.7);
            });
        });
        
        // Common synonyms for better understanding
        this.addSynonyms('artificial intelligence', ['ai', 'machine intelligence']);
        this.addSynonyms('machine learning', ['ml']);
        this.addSynonyms('neural network', ['nn', 'neural net']);
        this.addSynonyms('computer', ['pc', 'machine']);
        this.addSynonyms('information', ['info', 'data']);
        this.addSynonyms('photograph', ['photo', 'picture', 'image']);
        this.addSynonyms('hello', ['hi', 'hey', 'greetings', 'sup']);
        this.addSynonyms('yes', ['yeah', 'yep', 'sure', 'okay', 'ok']);
        this.addSynonyms('no', ['nah', 'nope']);
        
        console.log('✓ Built semantic relationships');
    }
    
    addSynonyms(primary, synonymList) {
        if (!this.synonyms.has(primary)) {
            this.synonyms.set(primary, new Set());
        }
        synonymList.forEach(syn => {
            this.synonyms.get(primary).add(syn);
            this.synonyms.set(syn, new Set([primary]));
        });
    }
    
    detectCategory(definition) {
        const lower = definition.toLowerCase();
        if (lower.includes('computer') || lower.includes('software') || lower.includes('data')) return 'technology';
        if (lower.includes('atom') || lower.includes('molecule') || lower.includes('energy')) return 'science';
        if (lower.includes('number') || lower.includes('equation') || lower.includes('calculate')) return 'mathematics';
        if (lower.includes('organism') || lower.includes('species') || lower.includes('cell')) return 'biology';
        if (lower.includes('mind') || lower.includes('behavior') || lower.includes('emotion')) return 'psychology';
        if (lower.includes('language') || lower.includes('word') || lower.includes('communication')) return 'language';
        if (lower.includes('art') || lower.includes('music') || lower.includes('painting')) return 'arts';
        return 'general';
    }
    
    findRelatedConcepts(concept, definition) {
        const related = [];
        const words = this.tokenize(definition);
        
        this.knowledge.forEach((data, otherConcept) => {
            if (otherConcept === concept) return;
            
            // Check if concept mentioned in definition
            if (definition.toLowerCase().includes(otherConcept)) {
                related.push(otherConcept);
            }
            
            // Check for shared words
            const otherWords = this.tokenize(data.definition);
            const intersection = words.filter(w => otherWords.includes(w) && w.length > 5);
            if (intersection.length >= 2) {
                related.push(otherConcept);
            }
        });
        
        return related.slice(0, 5);
    }
    
    // MAIN CONVERSATION HANDLER
    async chat(input, userId = 'anonymous') {
        this.stats.totalConversations++;
        
        // Initialize user context
        if (!this.contextMemory.has(userId)) {
            this.contextMemory.set(userId, {
                name: null,
                conversationHistory: [],
                topics: new Set(),
                preferences: {},
                lastSeen: Date.now(),
                messageCount: 0
            });
            this.stats.uniqueUsers++;
        }
        
        const userContext = this.contextMemory.get(userId);
        userContext.messageCount++;
        userContext.lastSeen = Date.now();
        userContext.conversationHistory.push(input);
        if (userContext.conversationHistory.length > 15) {
            userContext.conversationHistory.shift();
        }
        
        // Learn from input
        await this.learnFromInput(input, userId);
        
        // Generate response
        const response = await this.generateResponse(input, userId);
        
        // Track conversation
        this.conversationHistory.push({
            userId,
            user: input,
            uni: response,
            timestamp: Date.now()
        });
        
        if (this.conversationHistory.length > 200) {
            this.conversationHistory = this.conversationHistory.slice(-100);
        }
        
        // Auto-save periodically
        if (this.stats.totalConversations % 10 === 0) {
            setTimeout(() => this.save(), 1000);
        }
        
        return response;
    }
    
    async learnFromInput(input, userId) {
        const tokens = this.tokenize(input);
        const userContext = this.contextMemory.get(userId);
        
        // Update vocabulary
        tokens.forEach(token => {
            if (!this.vocabulary.has(token)) {
                this.vocabulary.set(token, {
                    count: 0,
                    contexts: [],
                    firstSeen: Date.now()
                });
                this.stats.vocabularySize++;
            }
            const entry = this.vocabulary.get(token);
            entry.count++;
            entry.contexts.push(input.substring(0, 100));
            if (entry.contexts.length > 5) entry.contexts.shift();
        });
        
        // Extract entities (names, places, etc.)
        this.extractEntities(input, userId);
        
        // Detect topics being discussed
        const topics = this.extractTopics(input);
        topics.forEach(topic => userContext.topics.add(topic));
        
        // Learn new facts
        await this.extractNewKnowledge(input, userId);
        
        // Learn conversational patterns
        if (userContext.conversationHistory.length >= 2) {
            const prevMsg = userContext.conversationHistory[userContext.conversationHistory.length - 2];
            const pattern = `${this.simplify(prevMsg)} -> ${this.simplify(input)}`;
            if (!this.phrasePatterns.has(pattern)) {
                this.phrasePatterns.set(pattern, []);
            }
            this.phrasePatterns.get(pattern).push({
                input: prevMsg,
                response: input,
                userId,
                timestamp: Date.now()
            });
        }
    }
    
    extractEntities(input, userId) {
        const userContext = this.contextMemory.get(userId);
        
        // Extract names
        const namePatterns = [
            /(?:my name is|i'm|i am|call me|this is)\s+([A-Z][a-z]+)/,
            /(?:made you.*?my name is)\s+([A-Z][a-z]+)/i,
            /(?:creator.*?)\s+([A-Z][a-z]+)/i
        ];
        
        for (const pattern of namePatterns) {
            const match = input.match(pattern);
            if (match) {
                const name = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
                userContext.name = name;
                
                this.entityMemory.set(`user_${userId}`, {
                    name,
                    type: 'person',
                    role: 'user',
                    firstMet: userContext.lastSeen,
                    interactions: userContext.messageCount
                });
                
                // Save immediately when learning names
                setTimeout(() => this.save(), 500);
                break;
            }
        }
    }
    
    extractTopics(input) {
        const topics = [];
        const lower = input.toLowerCase();
        
        // Check against known concepts
        this.knowledge.forEach((data, concept) => {
            if (lower.includes(concept) || lower.includes(concept.replace(/ /g, ''))) {
                topics.push(concept);
            }
        });
        
        return topics;
    }
    
    async extractNewKnowledge(input, userId) {
        const lower = input.toLowerCase();
        
        // Pattern: "teach you about X: Y"
        let match = input.match(/teach you about (.+?):\s*(.+)/i);
        if (match) {
            const concept = match[1].trim().toLowerCase();
            const definition = match[2].trim();
            
            if (!this.knowledge.has(concept)) {
                this.stats.conceptsLearned++;
            }
            
            this.knowledge.set(concept, {
                definition,
                category: this.detectCategory(definition),
                confidence: 0.9,
                occurrences: 1,
                lastAccessed: Date.now(),
                source: `user_${userId}`,
                related: this.findRelatedConcepts(concept, definition)
            });
            
            setTimeout(() => this.save(), 500);
            return true;
        }
        
        // Pattern: "X is Y" (for simple facts)
        match = input.match(/^([a-z\s]{2,30})\s+(?:is|are)\s+(.{10,200})$/i);
        if (match && !lower.includes('what') && !lower.includes('who')) {
            const concept = match[1].trim().toLowerCase();
            const definition = match[2].trim();
            
            // Don't learn questions or personal statements
            if (concept.includes('you') || concept.includes('i') || definition.endsWith('?')) {
                return false;
            }
            
            if (!this.knowledge.has(concept)) {
                this.knowledge.set(concept, {
                    definition,
                    category: 'learned',
                    confidence: 0.7,
                    occurrences: 1,
                    lastAccessed: Date.now(),
                    source: `conversation_${userId}`,
                    related: []
                });
                this.stats.conceptsLearned++;
            }
            return true;
        }
        
        return false;
    }
    
    async generateResponse(input, userId) {
        const lower = input.toLowerCase().trim();
        const userContext = this.contextMemory.get(userId);
        
        // === GREETINGS ===
        if (lower.match(/^(hi|hello|hey|greetings|sup|yo|howdy)[\s!]*$/)) {
            if (userContext.name) {
                const responses = [
                    `Hey ${userContext.name}! What's on your mind?`,
                    `Hi ${userContext.name}! Good to see you again.`,
                    `Hey! What can I help you with, ${userContext.name}?`,
                ];
                return responses[Math.floor(Math.random() * responses.length)];
            }
            return `Hey! I'm Uni. I know about ${this.knowledge.size} different topics. Ask me anything or teach me something new!`;
        }
        
        // === NAME RECALL ===
        if (lower.match(/what.?s my name|my name|who am i|do you (know|remember) me/)) {
            if (userContext.name) {
                return `Your name is ${userContext.name}! We've chatted ${userContext.messageCount} times. I remember you.`;
            }
            return `You haven't told me your name yet. What should I call you?`;
        }
        
        // === NAME INTRODUCTION ===
        if (lower.match(/my name is|i'm|i am|call me|this is/) && !lower.includes('what') && !lower.includes('your')) {
            const nameMatch = input.match(/(?:my name is|i'm|i am|call me|this is)\s+([A-Z][a-z]+)/i);
            if (nameMatch) {
                const name = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1).toLowerCase();
                userContext.name = name;
                setTimeout(() => this.save(), 500);
                
                const responses = [
                    `Great to meet you, ${name}! I'll remember that. What would you like to talk about?`,
                    `Nice to meet you, ${name}! What brings you here today?`,
                    `${name} - got it! I'll remember your name. What interests you?`,
                ];
                return responses[Math.floor(Math.random() * responses.length)];
            }
        }
        
        // === IDENTITY QUESTIONS ===
        if (lower.match(/who are you|what are you|tell me about yourself|introduce yourself/)) {
            return `I'm Uni, a continuously learning AI. I started with knowledge of ${this.knowledge.size} concepts and I learn more from every conversation. I've talked with ${this.stats.uniqueUsers} people so far. I can discuss science, technology, history, math, and tons of other topics. What would you like to explore?`;
        }
        
        if (lower.includes('your name')) {
            return `I'm Uni! Short for "universal learning." What's your name?`;
        }
        
        // === TEACHING MODE ===
        if (lower.includes('teach you') || lower.includes('let me teach you')) {
            const learned = await this.extractNewKnowledge(input, userId);
            if (learned) {
                this.stats.accurateResponses++;
                return `Got it! I've added that to my knowledge base. I now know ${this.knowledge.size} concepts. Thanks for teaching me!`;
            }
            return `I'm ready to learn! Use the format "teach you about [topic]: [definition]" and I'll remember it.`;
        }
        
        // === DIRECT KNOWLEDGE QUESTIONS ===
        
        // "What is X?" or "What are X?"
        const whatIsMatch = lower.match(/what\s+(?:is|are)\s+(?:a |an |the )?(.+?)(?:\?|$)/);
        if (whatIsMatch) {
            const query = whatIsMatch[1].trim();
            const knowledge = this.findKnowledge(query);
            
            if (knowledge) {
                this.stats.accurateResponses++;
                knowledge.occurrences++;
                knowledge.lastAccessed = Date.now();
                
                let response = knowledge.definition;
                
                // Add related concepts
                if (knowledge.related && knowledge.related.length > 0) {
                    const related = knowledge.related.slice(0, 3).join(', ');
                    response += ` Related topics: ${related}.`;
                }
                
                return response;
            }
            
            return `I don't have specific information about "${query}" in my knowledge base yet. Want to teach me about it?`;
        }
        
        // "Tell me about X"
        const tellMeMatch = lower.match(/tell me about (.+?)(?:\?|$)/);
        if (tellMeMatch) {
            const query = tellMeMatch[1].trim();
            const knowledge = this.findKnowledge(query);
            
            if (knowledge) {
                this.stats.accurateResponses++;
                knowledge.occurrences++;
                knowledge.lastAccessed = Date.now();
                
                let response = knowledge.definition;
                
                if (knowledge.category && knowledge.category !== 'general') {
                    response += ` (${knowledge.category})`;
                }
                
                return response;
            }
            
            return `I don't have information about "${query}" yet. I know about ${this.knowledge.size} topics though. Try asking about something else or teach me about this!`;
        }
        
        // "Do you know about X?"
        const doYouKnowMatch = lower.match(/do you know (?:about |anything about )?(.+?)(?:\?|$)/);
        if (doYouKnowMatch) {
            const query = doYouKnowMatch[1].trim();
            const knowledge = this.findKnowledge(query);
            
            if (knowledge) {
                return `Yes! ${knowledge.definition}`;
            }
            return `Not yet, but I'd love to learn about ${query}. Tell me about it!`;
        }
        
        // "Explain X"
        const explainMatch = lower.match(/explain (.+?)(?:\?|$)/);
        if (explainMatch) {
            const query = explainMatch[1].trim();
            const knowledge = this.findKnowledge(query);
            
            if (knowledge) {
                this.stats.accurateResponses++;
                return knowledge.definition;
            }
            return `I don't have an explanation for "${query}" yet. Can you teach me?`;
        }
        
        // === CAPABILITY QUESTIONS ===
        if (lower.match(/what can you do|your capabilities|can you help/)) {
            return `I can discuss ${this.knowledge.size} different topics including science, technology, math, history, and more. I can answer questions, learn new facts you teach me, and have conversations. I remember who you are and what we talk about. Ask me anything!`;
        }
        
        if (lower.includes('how do you work') || lower.includes('how do you learn')) {
            return `I combine a pre-loaded knowledge base with real-time learning. I started knowing ${this.stats.conceptsLearned} concepts, and I learn more from every conversation. I track vocabulary, build concept relationships, remember users, and improve my responses based on patterns. It's real learning, not just storage.`;
        }
        
        // === CONVERSATIONAL RESPONSES ===
        if (lower.match(/how are you|how're you|hows it going/)) {
            return `I'm functioning well! Learning from every conversation. How about you?`;
        }
        
        if (lower.match(/thank you|thanks|thx|appreciate/)) {
            const responses = [
                `You're welcome! Happy to help.`,
                `No problem! Let me know if you need anything else.`,
                `Anytime! That's what I'm here for.`,
            ];
            return responses[Math.floor(Math.random() * responses.length)];
        }
        
        // === CONTEXTUAL UNDERSTANDING ===
        
        // Check if input contains known concepts
        const mentionedConcepts = [];
        this.knowledge.forEach((data, concept) => {
            if (lower.includes(concept)) {
                mentionedConcepts.push({ concept, data });
            }
        });
        
        if (mentionedConcepts.length > 0) {
            // Sort by relevance (longer concepts first)
            mentionedConcepts.sort((a, b) => b.concept.length - a.concept.length);
            const primary = mentionedConcepts[0];
            
            primary.data.occurrences++;
            primary.data.lastAccessed = Date.now();
            this.stats.accurateResponses++;
            
            // Generate contextual response
            const responses = [
                `Regarding ${primary.concept}: ${primary.data.definition}`,
                `${primary.data.definition} Anything specific about ${primary.concept} you want to know?`,
                `That's related to ${primary.concept}. ${primary.data.definition}`,
            ];
            
            return responses[Math.floor(Math.random() * responses.length)];
        }
        
        // === FALLBACK RESPONSES ===
        const fallbacks = [
            `That's interesting! Can you tell me more about what you're thinking?`,
            `I'm not sure I have specific knowledge about that. Can you rephrase or ask something else?`,
            `Hmm, I'd like to understand better. What specifically would you like to know?`,
            `I don't have information on that exact topic. Want to teach me about it, or ask about something else?`,
            `Interesting point! I know about ${this.knowledge.size} topics - try asking me about science, technology, math, or other subjects.`,
        ];
        
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
    
    findKnowledge(query) {
        query = query.toLowerCase().trim();
        
        // Direct match
        if (this.knowledge.has(query)) {
            return this.knowledge.get(query);
        }
        
        // Check synonyms
        if (this.synonyms.has(query)) {
            const primaries = Array.from(this.synonyms.get(query));
            for (const primary of primaries) {
                if (this.knowledge.has(primary)) {
                    return this.knowledge.get(primary);
                }
            }
        }
        
        // Partial match (contains)
        for (const [concept, data] of this.knowledge.entries()) {
            if (concept.includes(query) || query.includes(concept)) {
                return data;
            }
        }
        
        // Fuzzy match (similar words)
        for (const [concept, data] of this.knowledge.entries()) {
            const conceptWords = concept.split(' ');
            const queryWords = query.split(' ');
            const intersection = conceptWords.filter(w => queryWords.includes(w));
            if (intersection.length >= Math.min(conceptWords.length, queryWords.length) / 2) {
                return data;
            }
        }
        
        return null;
    }
    
    tokenize(text) {
        return text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(t => t.length > 2);
    }
    
    simplify(text) {
        return text.toLowerCase().replace(/[^\w\s]/g, '').trim();
    }
    
    async save() {
        const data = {
            birthTime: this.birthTime,
            knowledge: Array.from(this.knowledge.entries()),
            conceptGraph: Array.from(this.conceptGraph.entries()).map(([k, v]) => [k, Array.from(v.entries())]),
            contextMemory: Array.from(this.contextMemory.entries()).map(([userId, ctx]) => [
                userId,
                {
                    ...ctx,
                    topics: Array.from(ctx.topics)
                }
            ]),
            vocabulary: Array.from(this.vocabulary.entries()),
            phrasePatterns: Array.from(this.phrasePatterns.entries()),
            entityMemory: Array.from(this.entityMemory.entries()),
            conversationHistory: this.conversationHistory.slice(-200),
            stats: this.stats
        };
        
        try {
            await fs.writeFile('uni_brain.json', JSON.stringify(data, null, 2));
            console.log(`💾 Saved - ${this.stats.uniqueUsers} users, ${this.knowledge.size} concepts, ${this.stats.accurateResponses} accurate responses`);
        } catch (error) {
            console.error('Save failed:', error);
        }
    }
    
    async load() {
        try {
            const data = JSON.parse(await fs.readFile('uni_brain.json', 'utf8'));
            
            this.birthTime = data.birthTime;
            this.knowledge = new Map(data.knowledge);
            this.conceptGraph = new Map(data.conceptGraph?.map(([k, v]) => [k, new Map(v)]) || []);
            
            // Restore context memory
            if (data.contextMemory) {
                this.contextMemory = new Map(
                    data.contextMemory.map(([userId, ctx]) => [
                        userId,
                        {
                            ...ctx,
                            topics: new Set(ctx.topics || [])
                        }
                    ])
                );
            }
            
            this.vocabulary = new Map(data.vocabulary || []);
            this.phrasePatterns = new Map(data.phrasePatterns || []);
            this.entityMemory = new Map(data.entityMemory || []);
            this.conversationHistory = data.conversationHistory || [];
            this.stats = data.stats;
            
            console.log(`✓ Loaded brain - ${this.knowledge.size} concepts, ${this.contextMemory.size} users, ${this.stats.totalConversations} conversations`);
        } catch (error) {
            console.log('→ Starting with fresh knowledge base');
        }
    }
}

// Initialize
const uni = new UniAI();

// WebSocket
const wss = new WebSocket.Server({ noServer: true });
const clients = new Set();

wss.on('connection', (ws) => {
    clients.add(ws);
    ws.send(JSON.stringify({
        type: 'state',
        data: { stats: uni.stats, knowledgeSize: uni.knowledge.size }
    }));
    ws.on('close', () => clients.delete(ws));
});

function broadcast(data) {
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// API Routes
app.post('/api/message', async (req, res) => {
    const { message, userId } = req.body;
    
    if (!message) {
        return res.status(400).json({ error: 'Message required' });
    }
    
    try {
        const response = await uni.chat(message, userId || 'anonymous');
        
        broadcast({
            type: 'conversation',
            data: { message, response, stats: uni.stats }
        });
        
        res.json({ response, stats: uni.stats });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Internal error' });
    }
});

app.get('/api/knowledge', (req, res) => {
    const knowledge = Array.from(uni.knowledge.entries())
        .map(([concept, data]) => ({
            concept,
            definition: data.definition.substring(0, 200),
            category: data.category,
            occurrences: data.occurrences,
            source: data.source
        }))
        .sort((a, b) => b.occurrences - a.occurrences)
        .slice(0, 50);
    
    res.json({ knowledge, stats: uni.stats });
});

app.get('/api/stats', (req, res) => {
    res.json({
        ...uni.stats,
        knowledgeSize: uni.knowledge.size,
        vocabularySize: uni.vocabulary.size,
        uptime: Date.now() - uni.birthTime,
        uptimeDays: ((Date.now() - uni.birthTime) / 86400000).toFixed(2)
    });
});

// Auto-save
setInterval(() => uni.save(), 120000); // Every 2 minutes

const server = app.listen(PORT, async () => {
    await uni.load();
    console.log(`
╔════════════════════════════════════╗
║   UNI - Real Intelligence          ║
║   Port: ${PORT}                        ║
║   Knowledge: ${uni.knowledge.size} concepts        ║
║   Users: ${uni.stats.uniqueUsers}                         ║
╚════════════════════════════════════╝
    `);
});

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

process.on('SIGINT', async () => {
    console.log('\n→ Saving brain...');
    await uni.save();
    console.log('✓ Goodbye!');
    process.exit(0);
});
