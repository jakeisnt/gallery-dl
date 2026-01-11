# Instagram to Are.na

Chrome extension to connect Instagram images to your Are.na channels.

## Usage

1. Browse to any Instagram post
2. Click the extension icon
3. Search for an Are.na channel
4. Click to connect the image

## Setup

```bash
pnpm install
pnpm build
```

Load `dist/` as unpacked extension in `chrome://extensions/`.

## Development

```bash
pnpm dev      # watch mode
pnpm typecheck
pnpm lint
```

## Configuration

Add your Are.na access token in the extension options. Get one at [dev.are.na](https://dev.are.na/oauth/applications).

## License

GPL-2.0 - see [LICENSE](LICENSE)
