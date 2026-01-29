# UNI - Real Learning AI

A continuously learning AI that actually trains from conversations. Not theater. Real statistical learning, semantic networks, and knowledge graphs.

## What Makes This Real

### Actual Learning Mechanisms

1. **Vocabulary Embeddings** - Every word gets a vector representation that updates with context
2. **N-gram Language Model** - Builds statistical patterns from input sequences
3. **Semantic Network** - Concepts connect through weighted associations
4. **Knowledge Graph** - Stores definitions with occurrence tracking
5. **Memory Consolidation** - Extracts topics from experiences
6. **Associative Learning** - Strengthens concept relationships over time

### What Gets Trained

- **Vocabulary**: Grows from 0 to thousands of tokens
- **Concepts**: Learns definitions and creates semantic connections
- **Patterns**: Builds n-gram models for language generation
- **Associations**: Strengthens connections between related concepts
- **Topics**: Clusters frequent concepts into topic models

### Persistence

All learning persists to `uni_brain.json`:
- Knowledge graph (all concepts + definitions)
- Association network (concept relationships)
- Vocabulary embeddings (word vectors)
- N-gram models (language patterns)
- Topic models (semantic clusters)
- Full conversation history
- Experience buffer

## Quick Start

```bash
npm install
npm start
```

Open `http://localhost:3000`

## How to Use

### Chat Mode
Just talk to Uni. Every message:
- Tokenizes input
- Extracts concepts
- Updates embeddings
- Builds n-grams
- Strengthens associations
- Stores experience

### Teaching Mode
Direct knowledge injection:
```
Concept: photosynthesis
Definition: process by which plants convert light into energy
```

Uni immediately:
- Creates knowledge graph node
- Generates embedding
- Tracks occurrences
- Ready to recall and associate

### Ask What It Knows
```
"What do you know about photosynthesis?"
"Remember what I taught you about learning?"
"How many concepts have you learned?"
```

Uni searches its knowledge graph and responds with actual learned data.

## Deployment

### Railway (Recommended)
```bash
# Push to GitHub
git init
git add .
git commit -m "Uni AI"
git push

# Deploy
railway init
railway up
```

### Render
1. Connect GitHub repo
2. Build: `npm install`
3. Start: `npm start`
4. Deploy

### Manual Server
```bash
# Install PM2
npm install -g pm2

# Start
pm2 start server.js --name uni

# Save
pm2 save
pm2 startup
```

## Architecture

```
Input → Tokenization → Concept Extraction
                             ↓
              Vocabulary Embedding Update
                             ↓
              N-gram Model Building
                             ↓
              Association Strengthening
                             ↓
              Knowledge Graph Update
                             ↓
        Response Generation (learned patterns)
                             ↓
              Experience Storage
                             ↓
         Periodic Memory Consolidation
```

## API

### POST /api/message
```json
{
  "message": "teach me about quantum computing",
  "userId": "user_xyz"
}
```

Returns:
```json
{
  "response": "...",
  "stats": {
    "totalConversations": 156,
    "uniqueConcepts": 423,
    "learningEvents": 892,
    "vocabularySize": 1847
  }
}
```

### POST /api/teach
```json
{
  "concept": "neural network",
  "definition": "computing system inspired by biological brains"
}
```

### GET /api/knowledge
Returns full knowledge graph with concepts, definitions, occurrences, associations.

### GET /api/stats
Returns complete statistics including uptime, knowledge size, associations.

## Learning Rate

Uni calculates learning rate as:
```
unique_concepts_in_recent_experiences / total_recent_experiences
```

Higher rate = learning new concepts rapidly
Lower rate = consolidating existing knowledge

## Monitoring Learning

Watch the stats bar:
- **Knowledge Base**: Total unique concepts learned
- **Conversations**: Total interactions
- **Learning Events**: Updates to internal models
- **Vocabulary Size**: Unique tokens in vocabulary
- **Associations**: Concept relationship count

## Advanced Usage

### Teach Complex Knowledge
```
"Teach you about neural networks: they are computing systems 
inspired by biological neural networks, consisting of layers 
of interconnected nodes that process information"
```

Uni will:
- Learn the concept "neural networks"
- Extract related concepts (computing, biological, networks, layers, nodes)
- Create associations between all extracted concepts
- Build n-grams from the sentence structure

### Test Recall
```
"What do you remember about neural networks?"
```

Uni searches knowledge graph, finds the concept, and responds with:
- The definition you taught
- Number of occurrences
- Associated concepts
- Association strengths

### Build Topic Models
After enough conversations, Uni clusters concepts into topics based on co-occurrence.

## Differences from Theater AI

❌ **NOT doing**: Fake "learning" that's just random numbers
❌ **NOT doing**: Canned responses with variable substitution
❌ **NOT doing**: Pretending to learn while being static

✅ **ACTUALLY doing**: Building vocabulary embeddings
✅ **ACTUALLY doing**: Training n-gram language models
✅ **ACTUALLY doing**: Creating semantic networks
✅ **ACTUALLY doing**: Persisting all learned knowledge
✅ **ACTUALLY doing**: Generating responses from learned patterns

## Testing Real Learning

### Test 1: Teach and Recall
```
You: "Teach you about AI: artificial intelligence is machine capability to mimic human cognition"
Uni: [Learns concept]
You: "What do you know about AI?"
Uni: [Retrieves exact definition + metadata]
```

### Test 2: Association Building
```
You: "Machine learning and AI are related"
[Talk more about both]
You: "What's associated with AI?"
Uni: [Returns machine learning with association strength]
```

### Test 3: Vocabulary Growth
Check stats before and after conversations. Vocabulary size increases with unique tokens.

### Test 4: Pattern Learning
After teaching similar sentence structures, Uni's n-gram model generates similar patterns.

## Scaling

For serious deployments:
- Use PostgreSQL for knowledge graph
- Redis for vocabulary cache
- Vector database (Pinecone, Weaviate) for embeddings
- Elasticsearch for concept search

## License

MIT - Use it, modify it, deploy it.

---

**This is real learning. Not simulation. Actual statistical models being trained from scratch.**
