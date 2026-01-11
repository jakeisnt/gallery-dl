# Privacy Policy

**Instagram to Are.na** Chrome Extension

Last updated: January 2026

## Overview

This extension connects Instagram images to your Are.na channels. We respect your privacy and are committed to protecting your personal information.

## Data Collection

### What we collect

- **Are.na Access Token**: Stored locally in your browser to authenticate with Are.na's API
- **Image URLs**: Temporarily processed to connect images to Are.na (not stored)

### What we do NOT collect

- Personal information (name, email, etc.)
- Browsing history
- Instagram credentials or account data
- Analytics or usage tracking data

## Data Storage

- Your Are.na access token is stored using Chrome's `storage.sync` API, which syncs across your signed-in Chrome browsers
- No data is sent to any server other than Are.na's official API (`api.are.na`)
- No data is shared with third parties

## Permissions

This extension requires the following permissions:

- **storage**: To save your Are.na access token
- **activeTab**: To access the current Instagram page and extract image URLs
- **scripting**: To execute scripts that find images on Instagram pages
- **host_permissions** (instagram.com, cdninstagram.com): To access Instagram pages and CDN images

## Third-Party Services

This extension communicates only with:

- **Are.na API** (api.are.na): To search channels and create blocks

## Data Retention

- Your access token remains stored until you remove it from the extension settings or uninstall the extension
- No other data is retained

## Your Rights

You can:

- View your stored access token in the extension settings
- Delete your access token at any time
- Uninstall the extension to remove all stored data

## Changes to This Policy

We may update this privacy policy from time to time. Changes will be reflected in the "Last updated" date.

## Contact

For questions about this privacy policy, please open an issue at the project repository.
