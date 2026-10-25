# lia's brain

A tiny Jekyll blog for GitHub Pages.

## Local setup

```bash
bundle install
bundle exec jekyll serve
```

Then open:

`http://localhost:4000`

## Add a post

Create a Markdown file in `_posts`:

`YYYY-MM-DD-title.md`

Example:

```md
---
layout: post
title: "文章標題"
date: 2026-08-17
description: "一句簡短描述"
---

正文。
```

## Deploy with GitHub Pages

1. Create a GitHub repository.
2. Push all files in this folder.
3. In GitHub → Settings → Pages.
4. Select **GitHub Actions** or deploy from the branch, depending on your Pages setup.
5. Add a custom domain later if you want.

## Before publishing

Replace this URL in `subscribe.md`:

`https://YOUR-SUBSTACK.substack.com`

with your real Substack URL.

## Project thumbnails

Home pagination uses `_plugins/pagination.rb` and `posts_per_page` in `_config.yml`.
Restart Jekyll after changing plugin code or configuration. For GitHub Pages,
use an Actions build: its built-in safe-mode build does not load custom plugins.

Edit `_data/projects.yml` to update project titles, links, and thumbnails.
Put images in `assets/images/projects/` and set `thumbnail: /assets/images/projects/your-cover.jpg` and `thumbnail_alt`. Leave `thumbnail` empty for the default cover. Images use a 4:3 frame and retain their own colors.
