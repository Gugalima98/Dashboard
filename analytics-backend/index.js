require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');
const util = require('util');
const crypto = require('crypto');

const log_file = fs.createWriteStream(__dirname + '/analytics-backend.log', {flags : 'w'});
const log_stdout = process.stdout;

console.log = function(d) { //
  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
};

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: 'http://localhost:8080',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
}));

app.use(express.json());

const db = new sqlite3.Database('./tokens.db', (err) => {
  if (err) {
    console.error('Erro ao abrir o banco de dados SQLite:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite.');
    db.serialize(() => {
        db.run(
          `CREATE TABLE IF NOT EXISTS google_tokens (
            id TEXT PRIMARY KEY,
            refresh_token TEXT NOT NULL,
            client_id TEXT NOT NULL,
            client_secret TEXT NOT NULL,
            redirect_uri TEXT NOT NULL
          )`,
          (err) => { if (err) console.error('Erro ao criar tabela google_tokens:', err.message); }
        );
        db.run(
          `CREATE TABLE IF NOT EXISTS site_mappings (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            ga4_property_id TEXT NOT NULL,
            ga4_property_name TEXT NOT NULL,
            gsc_site_url TEXT NOT NULL
          )`,
          (err) => { if (err) console.error('Erro ao criar tabela site_mappings:', err.message); }
        );
    });
  }
});

const scopes = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
];

app.get('/', (req, res) => {
  res.send('Analytics Backend is running!');
});

app.post('/auth/google', async (req, res) => {
  const { user_id, client_id, client_secret, redirect_uri } = req.body;
  if (!user_id || !client_id || !client_secret || !redirect_uri) {
    return res.status(400).send('Missing required parameters.');
  }
  try {
    const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uri);
    const authorizationUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: JSON.stringify({ user_id, client_id, client_secret, redirect_uri }),
    });
    res.json({ redirectUrl: authorizationUrl });
  } catch (err) {
    console.error('Erro ao iniciar autenticação Google:', err.message);
    res.status(500).send('Internal server error.');
  }
});

app.get('/auth/google/callback', async (req, res) => {
  const { code, state } = req.query;
  let stateData;
  try {
    stateData = JSON.parse(state);
  } catch (e) {
    return res.status(400).send('Invalid state parameter.');
  }
  const { user_id, client_id, client_secret, redirect_uri } = stateData;
  if (!user_id || !client_id || !client_secret || !redirect_uri) {
    return res.status(400).send('Missing required parameters in state.');
  }
  try {
    const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uri);
    const { tokens } = await oauth2Client.getToken(code);
    if (tokens.refresh_token) {
      db.run(
        `INSERT OR REPLACE INTO google_tokens (id, refresh_token, client_id, client_secret, redirect_uri) VALUES (?, ?, ?, ?, ?)`, 
        [user_id, tokens.refresh_token, client_id, client_secret, redirect_uri],
        (err) => { if (err) console.error('Erro ao salvar refresh_token:', err.message); }
      );
    }
    res.redirect('http://localhost:8080/analytics?re-auth=true');
  } catch (error) {
    console.error('Erro ao obter tokens:', error.message);
    res.status(500).send('Erro na autenticação.');
  }
});

app.get('/api/google/connection-status', async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(401).send('User ID is required.');
  try {
    db.get(`SELECT id FROM google_tokens WHERE id = ?`, [user_id], (err, row) => {
      if (err) return res.status(500).json({ error: 'Erro ao verificar status.' });
      res.json({ connected: !!row });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sites', async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(401).send('User ID is required.');
  try {
    db.all(`SELECT id, name, ga4_property_name, gsc_site_url FROM site_mappings WHERE user_id = ?`, [user_id], (err, rows) => {
      if (err) return res.status(500).send('Erro interno do servidor.');
      res.json(rows);
    });
  } catch (error) {
    res.status(500).send('Erro ao buscar sites mapeados.');
  }
});

app.get('/api/google/ga4-properties', async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(401).send('User ID is required.');
  try {
    db.get(`SELECT refresh_token, client_id, client_secret, redirect_uri FROM google_tokens WHERE id = ?`, [user_id], async (err, row) => {
      if (err || !row) return res.status(404).send('Conta Google não conectada.');
      const oauth2Client = new google.auth.OAuth2(row.client_id, row.client_secret, row.redirect_uri);
      oauth2Client.setCredentials({ refresh_token: row.refresh_token });
      const analyticsadmin = google.analyticsadmin({ version: 'v1beta', auth: oauth2Client });
      const response = await analyticsadmin.accountSummaries.list({ pageSize: 200 });
      const ga4Properties = [];
      (response.data.accountSummaries || []).forEach(summary => {
        if (summary.propertySummaries) {
          summary.propertySummaries.forEach(prop => {
            ga4Properties.push({ id: prop.property, name: prop.displayName });
          });
        }
      });
      res.json(ga4Properties);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/google/gsc-sites', async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(401).send('User ID is required.');
  try {
    db.get(`SELECT refresh_token, client_id, client_secret, redirect_uri FROM google_tokens WHERE id = ?`, [user_id], async (err, row) => {
      if (err || !row) return res.status(404).send('Conta Google não conectada.');
      const oauth2Client = new google.auth.OAuth2(row.client_id, row.client_secret, row.redirect_uri);
      oauth2Client.setCredentials({ refresh_token: row.refresh_token });
      const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });
      const gscResponse = await searchconsole.sites.list();
      res.json(gscResponse.data.siteEntry || []);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sites/mappings', async (req, res) => {
  const { user_id, name, ga4_property_id, ga4_property_name, gsc_site_url } = req.body;
  if (!user_id || !name || !ga4_property_id || !gsc_site_url) return res.status(400).send('Parâmetros faltando.');
  const id = crypto.randomUUID();
  db.run(
    `INSERT INTO site_mappings (id, user_id, name, ga4_property_id, ga4_property_name, gsc_site_url) VALUES (?, ?, ?, ?, ?, ?)`, 
    [id, user_id, name, ga4_property_id, ga4_property_name, gsc_site_url],
    function(err) { if (err) return res.status(500).send('Erro ao salvar mapeamento.');
      res.status(201).json({ id });
    }
  );
});

app.delete('/api/sites/mappings/:id', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;
  db.run(`DELETE FROM site_mappings WHERE id = ? AND user_id = ?`, [id, user_id], function(err) {
    if (err) return res.status(500).send('Erro ao deletar mapeamento.');
    if (this.changes === 0) return res.status(404).send('Mapeamento não encontrado ou não autorizado.');
    res.status(204).send();
  });
});

app.post('/api/analytics/data', async (req, res) => {
  const { user_id, mapping_id, startDate, endDate } = req.body;

  if (!user_id || !mapping_id || !startDate || !endDate) {
    return res.status(400).send('Missing required parameters.');
  }

  try {
    db.get(`SELECT refresh_token, client_id, client_secret, redirect_uri FROM google_tokens WHERE id = ?`, [user_id], async (err, tokenRow) => {
      if (err || !tokenRow) {
        return res.status(404).send('Conta Google não conectada.');
      }

      db.get(`SELECT ga4_property_id, gsc_site_url FROM site_mappings WHERE id = ? AND user_id = ?`, [mapping_id, user_id], async (err, mappingRow) => {
        if (err || !mappingRow) {
          return res.status(404).send('Mapeamento não encontrado.');
        }

        const oauth2Client = new google.auth.OAuth2(tokenRow.client_id, tokenRow.client_secret, tokenRow.redirect_uri);
        oauth2Client.setCredentials({ refresh_token: tokenRow.refresh_token });
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);

        const analyticsdata = google.analyticsdata({ version: 'v1beta', auth: oauth2Client });
        const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });

        const formattedStartDate = startDate;
        const formattedEndDate = endDate;

        let overviewData = { pageviews: 0, visitors: 0, clicks: 0, impressions: 0, ctr: 0, position: 0, mostVisitedPages: [], devices: [] };

        try {
          const gaResponse = await analyticsdata.properties.runReport({
            property: mappingRow.ga4_property_id,
            requestBody: {
              dateRanges: [{ startDate: formattedStartDate, endDate: formattedEndDate }],
              metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
            },
          });
          const metrics = gaResponse.data.rows?.[0]?.metricValues;
          overviewData.visitors = metrics?.[0]?.value ? parseInt(metrics[0].value, 10) : 0;
          overviewData.pageviews = metrics?.[1]?.value ? parseInt(metrics[1].value, 10) : 0;
        } catch (gaErr) {
          console.error('Erro ao buscar dados GA4:', gaErr.message);
        }

        try {
          const pagesResponse = await analyticsdata.properties.runReport({
            property: mappingRow.ga4_property_id,
            requestBody: {
              dateRanges: [{ startDate: formattedStartDate, endDate: formattedEndDate }],
              dimensions: [{ name: 'pagePath' }],
              metrics: [{ name: 'screenPageViews' }],
              limit: 10,
            },
          });
          overviewData.mostVisitedPages = pagesResponse.data.rows?.map(row => ({
            page: row.dimensionValues[0].value,
            views: parseInt(row.metricValues[0].value, 10),
          })) || [];
        } catch (pagesErr) {
          console.error('Erro ao buscar Páginas Mais Visitadas:', pagesErr.message);
          overviewData.mostVisitedPages = [];
        }

        try {
          const devicesResponse = await analyticsdata.properties.runReport({
            property: mappingRow.ga4_property_id,
            requestBody: {
              dateRanges: [{ startDate: formattedStartDate, endDate: formattedEndDate }],
              dimensions: [{ name: 'deviceCategory' }],
              metrics: [{ name: 'screenPageViews' }],
            },
          });
          overviewData.devices = devicesResponse.data.rows?.map(row => ({
            device: row.dimensionValues[0].value,
            views: parseInt(row.metricValues[0].value, 10),
          })) || [];
        } catch (devicesErr) {
          console.error('Erro ao buscar Dados de Dispositivos:', devicesErr.message);
          overviewData.devices = [];
        }

        try {
          const gscResponse = await searchconsole.searchanalytics.query({
            siteUrl: mappingRow.gsc_site_url,
            requestBody: {
              startDate: formattedStartDate,
              endDate: formattedEndDate,
            },
          });
          const gscRow = gscResponse.data.rows?.[0];
          overviewData.clicks = gscRow?.clicks || 0;
          overviewData.impressions = gscRow?.impressions || 0;
          overviewData.ctr = gscRow?.ctr || 0;
          overviewData.position = gscRow?.position || 0;
        } catch (gscErr) {
          console.error('Erro ao buscar dados GSC:', gscErr.message);
        }

                res.json(overviewData);
      });
    });
  } catch (error) {
    console.error('Erro ao buscar dados de analytics:', error.message);
    res.status(500).send('Erro ao buscar dados de analytics.');
  }
});

app.listen(PORT, () => {
  console.log(`Analytics Backend rodando na porta ${PORT}`);
});
