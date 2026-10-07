module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing folder id' });

  const API_KEY = process.env.GOOGLE_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'GOOGLE_API_KEY env var not set' });

  const fields = 'files(id,name,mimeType,size,modifiedTime)';
  const q = encodeURIComponent(`'${id}' in parents and trashed=false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=name&pageSize=500&key=${API_KEY}`;

  const upstream = await fetch(url);
  const data = await upstream.json();

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  res.status(upstream.status).json(data);
};
