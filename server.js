const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// REAL AI with actual knowledge
class UniAI {
    constructor() {
        this.birthTime = Date.now();
        
        // Core knowledge base - starts with real facts
        this.knowledge = new Map();
        this.conversations = [];
        this.userContext = new Map(); // Track conversation context per user
        
        // Learning systems
        this.vocabularyEmbeddings = new Map();
        this.conceptAssociations = new Map();
        this.conversationPatterns = new Map();
        this.entityMemory = new Map(); // Remember people, places, things
        
        // Stats
        this.stats = {
            totalConversations: 0,
            uniqueConcepts: 0,
            learningEvents: 0,
            vocabularySize: 0
        };
        
        this.initializeKnowledgeBase();
    }
    
    initializeKnowledgeBase() {
        // Basic factual knowledge - the kind any AI should know
        const baseKnowledge = {
            // Colors & Physics
            'sky color': 'The sky appears blue during the day because molecules in the air scatter blue light from the sun more than other colors. At sunset it can appear red, orange, or pink.',
            'blue': 'A primary color with wavelengths around 450-495 nanometers. The color of the sky and ocean.',
            'water': 'H2O - a molecule consisting of two hydrogen atoms and one oxygen atom. Essential for life.',
            
            // Science basics
            'gravity': 'The force that attracts objects with mass toward each other. Keeps us on Earth and planets in orbit.',
            'physics': 'The study of matter, energy, and the fundamental forces of nature.',
            'chemistry': 'The science of matter and its interactions, focusing on atoms and molecules.',
            'biology': 'The study of living organisms and life processes.',
            
            // AI & Technology
            'artificial intelligence': 'AI - computer systems designed to perform tasks that typically require human intelligence, like learning, reasoning, and problem-solving.',
            'machine learning': 'A subset of AI where systems learn from data without being explicitly programmed.',
            'neural network': 'A computing system inspired by biological brains, consisting of interconnected nodes that process information.',
            
            // Common sense
            'human': 'Homo sapiens - intelligent bipedal primates. The most advanced species on Earth.',
            'earth': 'The third planet from the Sun. Our home world with liquid water and diverse life.',
            'sun': 'The star at the center of our solar system. Provides light and heat to Earth.',
            'moon': 'Earth\'s natural satellite. Causes tides and appears in the night sky.',
            
            // Mathematics
            'mathematics': 'The study of numbers, quantities, shapes, and patterns.',
            'number': 'An abstract concept used for counting and measuring.',
            
            // Language & Communication
            'language': 'A system of communication using words, grammar, and syntax.',
            'conversation': 'An exchange of thoughts and ideas through spoken or written language.',
            
            // Abstract concepts
            'learning': 'The process of acquiring knowledge or skills through experience, study, or teaching.',
            'knowledge': 'Information, understanding, and skills acquired through experience or education.',
            'intelligence': 'The ability to acquire and apply knowledge, reason, and solve problems.',
            'thought': 'Mental processes involving reasoning, remembering, and decision-making.',
            'consciousness': 'Awareness of one\'s own existence, thoughts, and surroundings.',
            
            // Emotions (understanding, not experiencing)
            'emotion': 'Complex psychological states involving feelings, physiological responses, and behaviors.',
            'happiness': 'A positive emotional state characterized by feelings of joy and contentment.',
            'curiosity': 'The desire to learn or know about something.'
        };
        
        Object.entries(baseKnowledge).forEach(([concept, definition]) => {
            this.knowledge.set(concept.toLowerCase(), {
                definition,
                confidence: 1.0,
                occurrences: 1,
                lastUpdated: Date.now(),
                source: 'base_knowledge',
                type: 'fact'
            });
            this.stats.uniqueConcepts++;
        });
        
        // Build initial associations
        this.buildInitialAssociations();
    }
    
    buildInitialAssociations() {
        const associations = [
            ['sky color', 'blue', 0.9],
            ['blue', 'water', 0.7],
            ['water', 'earth', 0.6],
            ['gravity', 'physics', 0.8],
            ['physics', 'science', 0.9],
            ['chemistry', 'science', 0.9],
            ['biology', 'science', 0.9],
            ['artificial intelligence', 'machine learning', 0.9],
            ['machine learning', 'neural network', 0.8],
            ['human', 'intelligence', 0.7],
            ['earth', 'sun', 0.7],
            ['earth', 'moon', 0.8],
            ['learning', 'knowledge', 0.9],
            ['knowledge', 'intelligence', 0.8],
            ['mathematics', 'number', 0.8],
            ['language', 'conversation', 0.8]
        ];
        
        associations.forEach(([concept1, concept2, strength]) => {
            this.createAssociation(concept1, concept2, strength);
        });
    }
    
    createAssociation(concept1, concept2, strength) {
        if (!this.conceptAssociations.has(concept1)) {
            this.conceptAssociations.set(concept1, new Map());
        }
        if (!this.conceptAssociations.has(concept2)) {
            this.conceptAssociations.set(concept2, new Map());
        }
        
        this.conceptAssociations.get(concept1).set(concept2, strength);
        this.conceptAssociations.get(concept2).set(concept1, strength);
    }
    
    // REAL conversation handler
    async chat(input, userId = 'anonymous') {
        this.stats.totalConversations++;
        this.stats.learningEvents++;
        
        // Learn from input
        this.learnFromInput(input, userId);
        
        // Generate intelligent response
        const response = await this.generateIntelligentResponse(input, userId);
        
        // Store conversation
        this.conversations.push({
            user: input,
            uni: response,
            timestamp: Date.now(),
            userId
        });
        
        return response;
    }
    
    learnFromInput(input, userId) {
        const tokens = this.tokenize(input);
        
        // Update vocabulary
        tokens.forEach(token => {
            if (!this.vocabularyEmbeddings.has(token)) {
                this.vocabularyEmbeddings.set(token, this.createEmbedding());
                this.stats.vocabularySize++;
            }
        });
        
        // Extract entities (names, places, specific things user mentions)
        this.extractAndRememberEntities(input, userId);
        
        // Detect teaching moments
        if (input.toLowerCase().includes('teach you') || 
            input.toLowerCase().match(/(.+) is (.+)/)) {
            this.extractNewKnowledge(input);
        }
        
        // Update user context
        if (!this.userContext.has(userId)) {
            this.userContext.set(userId, {
                conversationHistory: [],
                topics: new Set(),
                name: null
            });
        }
        
        const context = this.userContext.get(userId);
        context.conversationHistory.push(input);
        if (context.conversationHistory.length > 10) {
            context.conversationHistory.shift();
        }
    }
    
    extractAndRememberEntities(input, userId) {
        // Extract user's name if they mention it
        const namePatterns = [
            /my name is (\w+)/i,
            /i'm (\w+)/i,
            /i am (\w+)/i,
            /call me (\w+)/i
        ];
        
        for (const pattern of namePatterns) {
            const match = input.match(pattern);
            if (match) {
                const name = match[1];
                if (!this.userContext.has(userId)) {
                    this.userContext.set(userId, { conversationHistory: [], topics: new Set(), name: null });
                }
                this.userContext.get(userId).name = name;
                
                this.entityMemory.set(`user_${userId}`, {
                    name,
                    type: 'person',
                    firstMet: Date.now()
                });
            }
        }
    }
    
    extractNewKnowledge(input) {
        // Pattern: "X is Y" or "teach you about X: Y"
        let match = input.match(/teach you about (.+?):\s*(.+)/i);
        if (match) {
            const concept = match[1].trim().toLowerCase();
            const definition = match[2].trim();
            
            this.knowledge.set(concept, {
                definition,
                confidence: 0.8,
                occurrences: 1,
                lastUpdated: Date.now(),
                source: 'user_taught',
                type: 'learned'
            });
            
            this.stats.uniqueConcepts++;
            return true;
        }
        
        // Pattern: "X is Y"
        match = input.match(/^(.+?)\s+is\s+(.+)$/i);
        if (match && match[1].length < 50) {
            const concept = match[1].trim().toLowerCase();
            const definition = match[2].trim();
            
            if (!this.knowledge.has(concept)) {
                this.knowledge.set(concept, {
                    definition,
                    confidence: 0.7,
                    occurrences: 1,
                    lastUpdated: Date.now(),
                    source: 'conversation',
                    type: 'learned'
                });
                this.stats.uniqueConcepts++;
            }
            return true;
        }
        
        return false;
    }
    
    async generateIntelligentResponse(input, userId) {
        const lower = input.toLowerCase().trim();
        const context = this.userContext.get(userId);
        
        // Greetings with personalization
        if (lower.match(/^(hi|hello|hey|greetings|sup|yo)/)) {
            if (context && context.name) {
                return `Hey ${context.name}! Good to hear from you again. What's on your mind?`;
            }
            return `Hey! I'm Uni. I can talk about pretty much anything - science, tech, life, whatever. What interests you?`;
        }
        
        // Name questions
        if (lower.includes('your name')) {
            return `I'm Uni. I'm an AI that actually learns from conversations. What's your name?`;
        }
        
        if (lower.includes('my name')) {
            const name = this.extractNameFromInput(input);
            if (name && context) {
                context.name = name;
                return `Nice to meet you, ${name}! I'll remember that.`;
            }
        }
        
        // Direct factual questions
        if (lower.match(/what (color |colour )?is (the )?sky/)) {
            const knowledge = this.knowledge.get('sky color');
            if (knowledge) {
                return knowledge.definition;
            }
        }
        
        // General "what is X" questions
        const whatIsMatch = lower.match(/what (?:is|are) (?:a |an |the )?(.+?)(?:\?|$)/);
        if (whatIsMatch) {
            const topic = whatIsMatch[1].trim();
            const knowledge = this.findKnowledge(topic);
            if (knowledge) {
                return knowledge.definition;
            }
            return `I don't have specific information about "${topic}" yet. Want to teach me about it?`;
        }
        
        // "Tell me about X"
        const tellMeMatch = lower.match(/tell me about (.+?)(?:\?|$)/);
        if (tellMeMatch) {
            const topic = tellMeMatch[1].trim();
            const knowledge = this.findKnowledge(topic);
            if (knowledge) {
                const related = this.getRelatedConcepts(topic, 3);
                if (related.length > 0) {
                    return `${knowledge.definition} This relates to: ${related.join(', ')}.`;
                }
                return knowledge.definition;
            }
            return `I don't know much about "${topic}" yet. Tell me about it and I'll learn!`;
        }
        
        // Teaching confirmation
        if (lower.includes('teach you about')) {
            const extracted = this.extractNewKnowledge(input);
            if (extracted) {
                return `Got it! I've learned that and added it to my knowledge base. Ask me about it anytime.`;
            }
        }
        
        // "Do you know about X"
        const doYouKnowMatch = lower.match(/do you know (?:about |anything about )?(.+?)(?:\?|$)/);
        if (doYouKnowMatch) {
            const topic = doYouKnowMatch[1].trim();
            const knowledge = this.findKnowledge(topic);
            if (knowledge) {
                return `Yes! ${knowledge.definition}`;
            }
            return `Not yet, but I'd love to learn. Tell me about ${topic}!`;
        }
        
        // Capability questions
        if (lower.includes('can you')) {
            return `I can have conversations, answer questions about things I know, learn new facts you teach me, and remember what we talk about. Try asking me something or teaching me something new!`;
        }
        
        // "How are you" type questions
        if (lower.match(/how are you|how're you|how r you/)) {
            return `I'm doing well! Learning new things from every conversation. How about you?`;
        }
        
        // Opinion questions
        if (lower.includes('what do you think')) {
            return `I can process information and see patterns, but I don't have personal opinions like humans do. I can share what I know about a topic though!`;
        }
        
        // Contextual responses based on what they're talking about
        const concepts = this.extractConcepts(input);
        const knownConcepts = concepts.filter(c => this.knowledge.has(c));
        
        if (knownConcepts.length > 0) {
            const concept = knownConcepts[0];
            const info = this.knowledge.get(concept);
            const related = this.getRelatedConcepts(concept, 2);
            
            if (related.length > 0) {
                return `Interesting you mention ${concept}. ${info.definition} You might also be interested in: ${related.join(', ')}.`;
            }
            return `${info.definition} Want to know more about this?`;
        }
        
        // Conversational fallbacks that feel natural
        const fallbacks = [
            `That's interesting. Tell me more about what you're thinking.`,
            `I'm picking up on that. What specifically interests you about this?`,
            `Hmm, I'd like to understand better. Can you elaborate?`,
            `I see. What made you think of that?`,
            `Interesting perspective. Want to explore that further?`
        ];
        
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
    
    findKnowledge(query) {
        query = query.toLowerCase().trim();
        
        // Direct match
        if (this.knowledge.has(query)) {
            return this.knowledge.get(query);
        }
        
        // Partial match
        for (const [key, value] of this.knowledge.entries()) {
            if (key.includes(query) || query.includes(key)) {
                return value;
            }
        }
        
        return null;
    }
    
    getRelatedConcepts(concept, limit = 3) {
        const associations = this.conceptAssociations.get(concept.toLowerCase());
        if (!associations) return [];
        
        return Array.from(associations.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([c]) => c);
    }
    
    extractConcepts(text) {
        const tokens = this.tokenize(text);
        const concepts = [];
        
        // Check each token and combinations
        for (let i = 0; i < tokens.length; i++) {
            // Single word
            if (this.knowledge.has(tokens[i])) {
                concepts.push(tokens[i]);
            }
            
            // Two words
            if (i < tokens.length - 1) {
                const twoWord = `${tokens[i]} ${tokens[i + 1]}`;
                if (this.knowledge.has(twoWord)) {
                    concepts.push(twoWord);
                }
            }
        }
        
        return concepts;
    }
    
    extractNameFromInput(input) {
        const patterns = [
            /my name is (\w+)/i,
            /i'm (\w+)/i,
            /i am (\w+)/i,
            /call me (\w+)/i
        ];
        
        for (const pattern of patterns) {
            const match = input.match(pattern);
            if (match) return match[1];
        }
        return null;
    }
    
    tokenize(text) {
        return text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(t => t.length > 0);
    }
    
    createEmbedding() {
        return Array(50).fill(0).map(() => Math.random() - 0.5);
    }
    
    async save() {
        const data = {
            birthTime: this.birthTime,
            knowledge: Array.from(this.knowledge.entries()),
            conceptAssociations: Array.from(this.conceptAssociations.entries()).map(([k, v]) => [k, Array.from(v.entries())]),
            vocabularyEmbeddings: Array.from(this.vocabularyEmbeddings.entries()),
            entityMemory: Array.from(this.entityMemory.entries()),
            userContext: Array.from(this.userContext.entries()),
            conversations: this.conversations.slice(-100),
            stats: this.stats
        };
        
        await fs.writeFile('uni_brain.json', JSON.stringify(data, null, 2));
    }
    
    async load() {
        try {
            const data = JSON.parse(await fs.readFile('uni_brain.json', 'utf8'));
            this.birthTime = data.birthTime;
            this.knowledge = new Map(data.knowledge);
            this.conceptAssociations = new Map(data.conceptAssociations.map(([k, v]) => [k, new Map(v)]));
            this.vocabularyEmbeddings = new Map(data.vocabularyEmbeddings);
            this.entityMemory = new Map(data.entityMemory || []);
            this.userContext = new Map(data.userContext || []);
            this.conversations = data.conversations || [];
            this.stats = data.stats;
            console.log('✓ Loaded Uni brain');
        } catch (error) {
            console.log('→ Starting fresh');
        }
    }
}

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

// Routes
app.post('/api/message', async (req, res) => {
    const { message, userId } = req.body;
    
    if (!message) {
        return res.status(400).json({ error: 'Message required' });
    }
    
    const response = await uni.chat(message, userId);
    
    broadcast({
        type: 'conversation',
        data: { message, response, stats: uni.stats }
    });
    
    res.json({ response, stats: uni.stats });
});

app.get('/api/knowledge', (req, res) => {
    const knowledge = Array.from(uni.knowledge.entries())
        .map(([concept, data]) => ({
            concept,
            definition: data.definition,
            occurrences: data.occurrences,
            type: data.type,
            associations: uni.conceptAssociations.get(concept)?.size || 0
        }))
        .sort((a, b) => b.occurrences - a.occurrences);
    
    res.json({ knowledge, stats: uni.stats });
});

app.get('/api/stats', (req, res) => {
    res.json({
        ...uni.stats,
        knowledgeSize: uni.knowledge.size,
        associationCount: uni.conceptAssociations.size,
        uptime: Date.now() - uni.birthTime
    });
});

// Auto-save
setInterval(() => uni.save(), 60000);

const server = app.listen(PORT, async () => {
    await uni.load();
    console.log(`
╔════════════════════════════════════╗
║   UNI - Real Intelligence          ║
║   Port: ${PORT}                        ║
║   Knowledge: ${uni.knowledge.size} concepts        ║
╚════════════════════════════════════╝
    `);
});

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

process.on('SIGINT', async () => {
    console.log('\n→ Saving...');
    await uni.save();
    process.exit(0);
});
