# Security Policy

We take the security of Beer Goggle Games seriously.

## Reporting a Vulnerability

If you believe you have found a security vulnerability, please email:

- security@beergogglegames.co.uk

Include as much detail as possible (steps to reproduce, affected pages, and any proof-of-concept). We will acknowledge receipt within 3 business days.

## Supported Versions

We continuously deploy from the `def-main` branch. Only the latest deployed version is supported.

## Update Cadence

- Automated dependency checks via Dependabot (weekly)
- Platform updates for Astro/Tailwind as needed
- Security fixes are prioritized ahead of feature work

## Scope

This project is a static site deployed to GitHub Pages. There is no server-side processing of user input. Nevertheless, we:

- Avoid inline untrusted HTML
- Sanitize any content generated from external sources
- Pin critical build tooling versions via lockfile

If you have questions about this policy, contact the email above.
