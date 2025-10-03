# DOSP Agent — Autoposter (Free Tier Friendly)

Posts **one approved tweet** per run from a **Google Sheet CSV** (no X reads).

## Google Sheet (Queue)
Columns (exact names):
```
id | text | media_url | scheduled_utc | approved | status
```
- `scheduled_utc`: ISO like `2025-10-03T16:00:00Z` (UTC)
- `approved`: `TRUE`
- `status`: will be set to `posted`

Publish the sheet **as CSV** (File → Publish to the web → CSV) and use that link as `QUEUE_CSV` secret.

## Mark as posted (optional)
Attach this Apps Script to the sheet and deploy as **Web App (Execute as me, Anyone with link)**, then set the URL as `GAS_WEBHOOK`:
```js
function doGet(e){
  const id = e.parameter.id;
  const sh = SpreadsheetApp.getActiveSheet();
  const data = sh.getDataRange().getValues();
  const head = data.shift();
  const col = n => head.indexOf(n)+1;
  const row = data.findIndex(r => String(r[col('id')-1])===String(id));
  if(row<0) return ContentService.createTextOutput('not found');
  const r = row+2;
  sh.getRange(r, col('status')).setValue('posted');
  sh.getRange(r, col('approved')).setValue('');
  return ContentService.createTextOutput('ok');
}
```

## Secrets (GitHub → Settings → Secrets → Actions)
- `X_API_KEY`, `X_API_SECRET`
- `ACCESS_TOKEN`, `ACCESS_SECRET`
- `QUEUE_CSV` (CSV link)
- `GAS_WEBHOOK` (optional)

## Schedule
Runs at **09:00 & 15:00 UTC**. Change in `.github/workflows/poster.yml`.
