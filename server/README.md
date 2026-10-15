# Proxy

A small Express server that sits between the web app and the tracker APIs. Browsers can't call Redmine, Jira or ClickUp directly (CORS), so the app sends its requests here and the proxy forwards them over HTTPS.

It keeps nothing: no database, no stored keys, no request logs. Error messages have the keys masked.

## What it does

- Reads the credentials from `X-*` request headers and builds the upstream call. The old query parameters (`redmineApiKey`, `redmineUrl`, `jiraApiKey`, `jiraEmail`, `clickupApiKey`) are still accepted so an older frontend keeps working.
- Refuses targets that are not `https`, carry credentials in the URL, or point at localhost, `.local`/`.internal` hosts or private IP ranges.
- Throttles Jira and ClickUp calls to about three per second.
- Parses the TXT and XLSX worklog imports.

## Routes

| Route | What it does |
| --- | --- |
| `POST /submit-form` | Multipart upload (`file`, `type`). `custom` expects a `.txt`, `jira` expects an `.xlsx`. Returns the parsed worklogs. |
| `ALL /redmine/*` | Forwards to `https://<redmine host>/*`. Headers: `X-Redmine-Api-Key`, `X-Redmine-Url`. |
| `ALL /jira/*` | Forwards to `https://<jiraUrl>/*`. Headers: `X-Jira-Api-Key`, `X-Jira-Email`. The Jira host comes in the `jiraUrl` query parameter. |
| `ALL /clickup/*` | Forwards to `https://api.clickup.com/api/v2/*`. Header: `X-ClickUp-Api-Key`. |

## Environment

| Variable | Default | |
| --- | --- | --- |
| `PORT` | `8000` | Port to listen on. |

## Run locally

Needs Node 18 (see `engines` in `package.json`).

```bash
cd server
npm ci
npm start      # http://localhost:8000
npm test       # node's built-in test runner
```

## Deploy

Any Node host works: build context is `server/`, install with `npm ci`, start with `npm start`, set `PORT` if the host doesn't. Point the web app's proxy URL at the result.
