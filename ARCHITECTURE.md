# gallery-dl Architecture Analysis

## Overview

gallery-dl is a Python-based command-line tool for downloading images and other media from various websites. The codebase follows a modular, plugin-based architecture with clear separation of concerns.

## Core Architecture

```
gallery_dl/
├── __init__.py          # Main entry point, CLI handling
├── __main__.py          # Module execution entry
├── config.py            # Configuration management
├── job.py               # Job orchestration (download, data, url jobs)
├── extractor/           # Site-specific extraction logic
│   ├── __init__.py      # Extractor registration/discovery
│   ├── common.py        # Base Extractor class
│   ├── message.py       # Message types (Directory, Url, Queue)
│   └── instagram.py     # Instagram-specific extractor
├── downloader/          # Download handlers
│   ├── __init__.py      # Downloader discovery
│   ├── common.py        # Base downloader class
│   └── http.py          # HTTP/HTTPS downloader
├── postprocessor/       # Post-download processing
├── text.py              # String/text utilities
├── util.py              # General utilities
├── path.py              # Path formatting
├── formatter.py         # String formatting
├── cache.py             # Caching mechanisms
├── cookies.py           # Cookie handling
└── output.py            # Output/logging
```

## Key Components

### 1. Extractor System (`extractor/`)

The extractor system is the heart of gallery-dl. Each website has its own extractor module.

#### Base Extractor (`extractor/common.py`)

```python
class Extractor:
    category = ""           # Site name (e.g., "instagram")
    subcategory = ""        # Content type (e.g., "post", "user")
    directory_fmt = (...)   # Directory naming pattern
    filename_fmt = "..."    # Filename pattern
    archive_fmt = "..."     # Archive key format
    root = ""               # Base URL
    cookies_domain = ""     # Cookie domain

    def __init__(self, match):
        self.url = match.string
        self.match = match
        self.groups = match.groups()
        # Initialize session, options, cookies

    def items(self):
        """Generator yielding (Message, url, metadata) tuples"""
        yield Message.Directory, "", data
        yield Message.Url, url, file_data
        yield Message.Queue, url, queue_data

    def request(self, url, **kwargs):
        """Make HTTP request with retry logic, rate limiting"""

    def request_json(self, url, **kwargs):
        """Request and parse JSON response"""

    def login(self):
        """Handle authentication"""
```

#### Extractor Discovery (`extractor/__init__.py`)

- Maintains a list of module names
- `find(url)` iterates through extractors and matches URL patterns
- Each extractor has a `pattern` regex to match URLs
- `from_url(url)` creates an extractor instance

### 2. Message System (`extractor/message.py`)

Messages are the communication protocol between extractors and jobs:

```python
class Message:
    Directory = 2   # Set target directory + metadata
    Url = 3         # Download this URL with metadata
    Queue = 6       # Process this URL with another extractor
```

Message tuples: `(MessageType, url_or_path, metadata_dict)`

### 3. Job System (`job.py`)

Jobs orchestrate the extraction and download process:

```python
class Job:
    def run(self):
        self._init()
        self.dispatch(extractor)

    def dispatch(self, messages):
        for msg, url, kwdict in messages:
            if msg == Message.Directory:
                self.handle_directory(kwdict)
            elif msg == Message.Url:
                self.handle_url(url, kwdict)
            elif msg == Message.Queue:
                self.handle_queue(url, kwdict)

class DownloadJob(Job):
    def handle_url(self, url, kwdict):
        # Set filename, check archive, download
        pathfmt.set_filename(kwdict)
        self.download(url)

    def download(self, url):
        downloader = self.get_downloader(url[:url.find(":")])
        return downloader.download(url, self.pathfmt)
```

### 4. Downloader System (`downloader/`)

Handles actual file downloads:

```python
class HttpDownloader(DownloaderBase):
    def download(self, url, pathfmt):
        response = self.session.request("GET", url, stream=True)
        # Handle partial content, retries, validation
        with pathfmt.open(mode) as fp:
            for data in response.iter_content(chunk_size):
                fp.write(data)
```

### 5. Configuration (`config.py`)

- Hierarchical configuration: global → category → subcategory
- Sources: config files, command-line options
- `config.interpolate(path, key)` to retrieve values

---

## Instagram Extractor Deep Dive (`extractor/instagram.py`)

### Class Hierarchy

```
InstagramExtractor (base)
├── InstagramPostExtractor      # /p/*, /reel/*
├── InstagramUserExtractor      # /@username (dispatcher)
├── InstagramPostsExtractor     # /username/posts/
├── InstagramReelsExtractor     # /username/reels/
├── InstagramTaggedExtractor    # /username/tagged/
├── InstagramStoriesExtractor   # /stories/username/
├── InstagramHighlightsExtractor# /username/highlights/
├── InstagramSavedExtractor     # /username/saved/
├── InstagramCollectionExtractor# /username/saved/collection/
├── InstagramTagExtractor       # /explore/tags/
├── InstagramInfoExtractor      # /username/info/
├── InstagramAvatarExtractor    # /username/avatar/
├── InstagramFollowersExtractor # /username/followers/
└── InstagramFollowingExtractor # /username/following/
```

### Base InstagramExtractor

```python
class InstagramExtractor(Extractor):
    category = "instagram"
    root = "https://www.instagram.com"
    cookies_domain = ".instagram.com"
    cookies_names = ("sessionid",)  # Required for authentication
    request_interval = (6.0, 12.0)   # Rate limiting

    def _init(self):
        self.csrf_token = util.generate_token()
        # Choose API: REST or GraphQL
        if self.config("api") == "graphql":
            self.api = InstagramGraphqlAPI(self)
        else:
            self.api = InstagramRestAPI(self)

    def login(self):
        if self.cookies_check(self.cookies_names):
            return  # Already authenticated
        # Username/password login deprecated, use browser cookies
```

### API Classes

#### InstagramRestAPI

Uses Instagram's private REST API:

```python
class InstagramRestAPI:
    def _call(self, endpoint, **kwargs):
        url = "https://www.instagram.com/api" + endpoint
        headers = {
            "X-CSRFToken": extr.csrf_token,
            "X-IG-App-ID": "936619743392459",
            "X-IG-WWW-Claim": extr.www_claim,
            "X-Requested-With": "XMLHttpRequest",
        }
        return extr.request_json(url, headers=headers, **kwargs)

    def user_id(self, screen_name):
        user = self.user_by_name(screen_name)
        return user["id"]

    def user_feed(self, user_id):
        endpoint = f"/v1/feed/user/{user_id}/"
        return self._pagination(endpoint, params={"count": 30})

    def media(self, shortcode):
        media_id = id_from_shortcode(shortcode)
        endpoint = f"/v1/media/{media_id}/info/"
        return self._pagination(endpoint)

    def reels_media(self, reel_ids):
        endpoint = "/v1/feed/reels_media/"
        return self._call(endpoint, params={"reel_ids": reel_ids})
```

#### InstagramGraphqlAPI

Uses Instagram's GraphQL API:

```python
class InstagramGraphqlAPI:
    def _call(self, query_hash, variables):
        url = "https://www.instagram.com/graphql/query/"
        params = {
            "query_hash": query_hash,
            "variables": json.dumps(variables),
        }
        return extr.request_json(url, params=params)

    def media(self, shortcode):
        query_hash = "9f8827793ef34641b2fb195d4d41151c"
        variables = {"shortcode": shortcode, ...}
        return self._call(query_hash, variables)
```

### Post Parsing

```python
def _parse_post_rest(self, post):
    data = {
        "post_id": post["pk"],
        "post_shortcode": post["code"],
        "username": owner["username"],
        "post_date": self.parse_timestamp(post["taken_at"]),
        "description": caption["text"],
        "_files": [],
    }

    for item in items:  # carousel_media or single
        image = item["image_versions2"]["candidates"][0]
        video = item.get("video_versions", [{}])[0]

        media = {
            "media_id": item["pk"],
            "display_url": image["url"],
            "video_url": video.get("url"),
            "width": image["width"],
            "height": image["height"],
        }
        data["_files"].append(media)

    return data
```

### Items Generator

```python
def items(self):
    self.login()
    data = self.metadata()

    for post in self.posts():
        post = self._parse_post_rest(post)
        files = post.pop("_files")

        yield Message.Directory, "", post

        for file in files:
            file = {**post, **file}

            if video_url := file.get("video_url"):
                yield Message.Url, video_url, file

            url = file["display_url"]
            yield Message.Url, url, file
```

### Authentication Flow

1. Check for `sessionid` cookie
2. If present, validate by making API request
3. If missing/invalid, require user to provide browser cookies
4. Cookies can come from:
   - Config file (`cookies: {sessionid: "..."}`)
   - Cookies.txt file
   - Browser extraction (`cookies-from-browser: chrome`)

### Key Instagram Data Structures

**Post (REST API)**:
```json
{
    "pk": "1234567890",
    "code": "ABC123xyz",
    "taken_at": 1609459200,
    "user": {"pk": "...", "username": "..."},
    "caption": {"text": "..."},
    "image_versions2": {
        "candidates": [{"url": "...", "width": 1080, "height": 1080}]
    },
    "video_versions": [{"url": "...", "width": 720, "height": 1280}],
    "carousel_media": [...]
}
```

---

## Key Patterns for TypeScript Port

### 1. URL Pattern Matching
```python
pattern = r"(?:https?://)?(?:www\.)?instagram\.com/p/([^/?#]+)"
# Translate to TypeScript regex
```

### 2. Pagination Pattern
```python
def _pagination(self, endpoint, params):
    params["max_id"] = None
    while True:
        data = self._call(endpoint, params=params)
        yield from data["items"]
        if not data.get("more_available"):
            return
        params["max_id"] = data["next_max_id"]
```

### 3. Rate Limiting
```python
request_interval = (6.0, 12.0)  # Random delay between requests
```

### 4. Cookie-Based Auth
```python
cookies_names = ("sessionid",)
self.cookies_check(self.cookies_names)
```

### 5. Shortcode/ID Conversion
```python
_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"

def id_from_shortcode(shortcode):
    return util.bdecode(shortcode, _ALPHABET)

def shortcode_from_id(post_id):
    return util.bencode(int(post_id), _ALPHABET)
```

---

## Text Extraction Utilities (`text.py`)

Critical utilities for parsing HTML/JSON responses:

```python
def extract(txt, begin, end, pos=None):
    """Extract text between two markers"""
    first = txt.index(begin, pos) + len(begin)
    last = txt.index(end, first)
    return txt[first:last], last+len(end)

def extr(txt, begin, end, default=""):
    """Simplified extract"""

def extract_iter(txt, begin, end):
    """Yield all matches between markers"""

def nameext_from_url(url, data=None):
    """Extract filename and extension from URL"""
```
