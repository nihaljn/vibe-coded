const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'papers.json');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

async function loadPapers() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function savePapers(papers) {
  // Ensure data directory exists
  const dataDir = path.dirname(DATA_FILE);
  await fs.mkdir(dataDir, { recursive: true });
  
  await fs.writeFile(DATA_FILE, JSON.stringify(papers, null, 2));
}

function extractArxivId(url) {
  const match = url.match(/arxiv\.org\/(?:abs|pdf)\/([0-9]{4}\.[0-9]{4,5}(?:v[0-9]+)?)/);
  return match ? match[1] : null;
}

async function fetchArxivPaper(arxivId) {
  try {
    const response = await axios.get(`http://export.arxiv.org/api/query?id_list=${arxivId}`);
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(response.data);
    
    const entry = result.feed.entry[0];
    if (!entry) throw new Error('Paper not found');
    
    return {
      id: arxivId,
      title: entry.title[0].trim(),
      authors: entry.author.map(author => author.name[0]),
      abstract: entry.summary[0].trim().replace(/\n/g, ' '),
      published: entry.published[0].split('T')[0],
      url: `https://arxiv.org/abs/${arxivId}`,
      tags: [],
      comments: '',
      highlighted: false,
      dateAdded: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to fetch paper: ${error.message}`);
  }
}

app.post('/api/papers', async (req, res) => {
  try {
    const { url } = req.body;
    const arxivId = extractArxivId(url);
    
    if (!arxivId) {
      return res.status(400).json({ error: 'Invalid arXiv URL' });
    }
    
    const papers = await loadPapers();
    const existing = papers.find(p => p.id === arxivId);
    
    if (existing) {
      return res.status(400).json({ error: 'Paper already exists' });
    }
    
    const paperData = await fetchArxivPaper(arxivId);
    papers.push(paperData);
    await savePapers(papers);
    
    res.json(paperData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/papers', async (req, res) => {
  try {
    const papers = await loadPapers();
    res.json(papers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/papers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tags, comments, highlighted } = req.body;
    
    const papers = await loadPapers();
    const paperIndex = papers.findIndex(p => p.id === id);
    
    if (paperIndex === -1) {
      return res.status(404).json({ error: 'Paper not found' });
    }
    
    papers[paperIndex] = {
      ...papers[paperIndex],
      tags: tags !== undefined ? tags : papers[paperIndex].tags,
      comments: comments !== undefined ? comments : papers[paperIndex].comments,
      highlighted: highlighted !== undefined ? highlighted : papers[paperIndex].highlighted
    };
    
    await savePapers(papers);
    res.json(papers[paperIndex]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/papers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const papers = await loadPapers();
    const filteredPapers = papers.filter(p => p.id !== id);
    
    if (papers.length === filteredPapers.length) {
      return res.status(404).json({ error: 'Paper not found' });
    }
    
    await savePapers(filteredPapers);
    res.json({ message: 'Paper deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/export', async (req, res) => {
  try {
    const papers = await loadPapers();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="papers-export.json"');
    res.json(papers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Paper tracker running on http://localhost:${PORT}`);
});