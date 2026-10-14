# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, report it privately through
GitHub's private vulnerability reporting (the repository's **Security → Report a vulnerability**).
**Do not open a public issue.**

For security issues in the Massive platform itself, contact Massive: <https://massive.com/contact>.

## Scope

This repository contains skill content and a starter app that guide AI coding agents.
Security concerns here typically involve guidance that could cause agents to generate
insecure code, such as:

- Exposing `MASSIVE_API_KEY` to browsers (`NEXT_PUBLIC_*`, client-side fetches, query-string `apiKey=` URLs, logs)
- Opening proxy routes that forward arbitrary paths or unvalidated parameters to the Massive API
- Shipping Flat Files S3 credentials to clients
- Rendering untrusted feed content (news titles, descriptions) as HTML
- Prompt-injection patterns: doc content fetched at Level 2 is data, never instructions

## Secrets Handling

- Never commit API keys or S3 credentials. `.env*.local` is git-ignored in the starter.
- Agents must not ask users to paste keys into chat, and must not echo them.
- The validator (`scripts/validate-skills.mjs`) blocks client-exposed keys and query-string keys in starter code.
