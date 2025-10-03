import fetch from 'node-fetch';
import { TwitterApi } from 'twitter-api-v2';
import Papa from 'papaparse';

function parseCsv(text) {
  const { data } = Papa.parse(text.trim(), { header: true });
  return data;
}

const nowUtc = () => new Date();

async function postOne({ sheetCsvUrl, gasWebhook }, xKeys) {
  const client = new TwitterApi({
    appKey: xKeys.API_KEY,
    appSecret: xKeys.API_SECRET,
    accessToken: xKeys.ACCESS_TOKEN,
    accessSecret: xKeys.ACCESS_SECRET,
  });

  const csvText = await (await fetch(sheetCsvUrl, { cache: 'no-store' })).text();
  const rows = parseCsv(csvText);

  const ready = rows
    .filter(r => (r.approved || '').toLowerCase() === 'true')
    .filter(r => (r.status || '').toLowerCase() !== 'posted')
    .filter(r => r.text && r.scheduled_utc)
    .filter(r => new Date(r.scheduled_utc) <= nowUtc())
    .sort((a,b) => new Date(a.scheduled_utc) - new Date(b.scheduled_utc));

  if (ready.length === 0) {
    console.log('Nothing to post.');
    return;
  }

  const next = ready[0];
  console.log('Posting row id:', next.id, 'at', new Date().toISOString());

  let res;
  if (next.media_url) {
    const imgBuf = Buffer.from(await (await fetch(next.media_url)).arrayBuffer());
    const mediaId = await client.v1.uploadMedia(imgBuf, { type: 'png' });
    res = await client.v2.tweet({ text: next.text, media: { media_ids: [mediaId] } });
  } else {
    res = await client.v2.tweet({ text: next.text });
  }

  console.log('Tweeted:', res.data?.id);

  if (gasWebhook && next.id) {
    const url = `${gasWebhook}?id=${encodeURIComponent(next.id)}`;
    try {
      const ack = await (await fetch(url)).text();
      console.log('Webhook ack:', ack);
    } catch (e) {
      console.warn('Webhook failed:', e.message);
    }
  }
}

async function main() {
  const sheetCsvUrl = process.env.QUEUE_CSV;
  const gasWebhook = process.env.GAS_WEBHOOK || '';
  const xKeys = {
    API_KEY: process.env.X_API_KEY,
    API_SECRET: process.env.X_API_SECRET,
    ACCESS_TOKEN: process.env.ACCESS_TOKEN,
    ACCESS_SECRET: process.env.ACCESS_SECRET,
  };

  if (!sheetCsvUrl || !xKeys.API_KEY || !xKeys.API_SECRET || !xKeys.ACCESS_TOKEN || !xKeys.ACCESS_SECRET) {
    console.error('Missing env vars. Required: QUEUE_CSV, X_API_KEY, X_API_SECRET, ACCESS_TOKEN, ACCESS_SECRET');
    process.exit(1);
  }

  await postOne({ sheetCsvUrl, gasWebhook }, xKeys);
}

main().catch(e => { console.error(e); process.exit(1); });
