# Remote Design Jobs

A tiny personal aggregator for **product design / UI / UX** jobs that are remote-friendly
for **Vietnam, APAC, or worldwide**. No dependencies — just Node 18+.

## Run

```bash
node server.js
# open http://localhost:4321
```

## How it works

- `sources.json` holds the list of job boards. The server fetches every enabled source,
  keeps only jobs whose title matches `roleKeywords`, dedupes them, and tags each job
  with a region: `vietnam`, `apac`, `worldwide`, `other`, or `unspecified`.
- Results are cached for 10 minutes; the **↻ Refresh** button forces a re-fetch.
- The UI filters by region (default: *Vietnam-eligible* = Vietnam + APAC + Worldwide)
  and free-text search.

## Adding / editing sources (manual, no code needed)

Edit `sources.json` and hit Refresh in the browser — the file is re-read on every fetch.

**JSON API source** — point `map` fields at the response's field names (dot paths OK,
`root` is the path to the jobs array, `""` if the response itself is the array):

```json
{
  "name": "Some Board",
  "enabled": true,
  "type": "json",
  "url": "https://example.com/api/jobs",
  "map": {
    "root": "data.jobs",
    "title": "title",
    "company": "company.name",
    "location": "region",
    "url": "apply_url",
    "date": "posted_at",
    "tags": "tags",
    "salary": "salary"
  }
}
```

**RSS source** — just the feed URL:

```json
{ "name": "Some Feed", "enabled": true, "type": "rss", "url": "https://example.com/jobs.rss" }
```

Set `"enabled": false` to keep a source in the list without fetching it.
You can also tune `roleKeywords` (title must contain at least one, case-insensitive).
