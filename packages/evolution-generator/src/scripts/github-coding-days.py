# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# TODO: Migrate to a better folder or repository location (this is not related to the Generator).
"""
Count unique days with commits per author for a GitHub repository (proxy for
"days of coding"). Uses the Commits list API so you get full history and
per-author days. When several developers commit on the same day, that counts
as multiple developer-days (e.g. to estimate "how long it took to build this survey").

Uses: GET /repos/{owner}/{repo}/commits and .../pulls (paginated)

Usage:
  poetry run python src/scripts/github-coding-days.py [owner/repo] [--since YYYY-MM-DD] [--until YYYY-MM-DD]

Examples:
  cd evolution/packages/evolution-generator
  poetry run python src/scripts/github-coding-days.py
  poetry run python src/scripts/github-coding-days.py chairemobilite/localisation --since 2024-01-01

Set GITHUB_TOKEN in a .env file in the repo root for higher rate limits and private repos (recommended for large repos).
"""

import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
import urllib.parse
from datetime import datetime
from dotenv import load_dotenv

GITHUB_API = "https://api.github.com"
PER_PAGE = 100


def get_git_remote_repo():
    try:
        out = subprocess.run(
            ["git", "remote", "get-url", "origin"],
            capture_output=True,
            text=True,
            check=True,
            timeout=5,
        )
        url = (out.stdout or "").strip()
        if "github.com" in url:
            rest = url.split("github.com")[-1].lstrip(":/").rstrip("/")
            if rest.endswith(".git"):
                rest = rest[:-4]
            if "/" in rest:
                return rest
    except (
        subprocess.CalledProcessError,
        FileNotFoundError,
        subprocess.TimeoutExpired,
    ):
        pass
    return None


def parse_date(value):
    try:
        datetime.strptime(value, "%Y-%m-%d")
        return value
    except ValueError:
        raise argparse.ArgumentTypeError(
            f"Invalid date '{value}'; expected YYYY-MM-DD."
        )


def fetch_commits_page(url, token=None):
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https":
        return 0, None
    headers = {"Accept": "application/vnd.github.v3+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, json.load(resp)
    except urllib.error.HTTPError as e:
        return e.code, None


def handle_private_or_missing_repo_error(token):
    if not token:
        print(
            "Error: Unable to access the repository. This may be because (1) the repository is private and GITHUB_TOKEN is not set, or (2) the repository does not exist. Please set GITHUB_TOKEN in the .env file for private repos, and verify that the repository exists on GitHub.",
            file=sys.stderr,
        )
        sys.exit(1)
    else:
        print("Error: GitHub API error: {status} - {data}", file=sys.stderr)
        sys.exit(1)


def author_id(commit):
    """Stable identifier for the author (prefer login, then email, then name)."""
    author = commit.get("author")
    if author and author.get("login"):
        return author["login"]
    c = commit.get("commit") or {}
    a = c.get("author") or {}
    return a.get("email") or a.get("name") or "unknown"


def fetch_all_pulls(owner, repo, token, since=None, until=None):
    """Paginate through all PRs; optionally filter by created_at in [since, until]."""
    base = f"{GITHUB_API}/repos/{owner}/{repo}/pulls"
    params = [f"per_page={PER_PAGE}", "state=all"]
    all_pulls = []
    page = 1
    while True:
        params_with_page = params + [f"page={page}"]
        page_url = f"{base}?{'&'.join(params_with_page)}"
        status, data = fetch_commits_page(page_url, token)
        if status in (401, 404):
            handle_private_or_missing_repo_error(token)
        if status != 200:
            raise SystemExit(f"GitHub API error: {status} - {data}")
        if not data:
            break
        all_pulls.extend(data)
        if len(data) < PER_PAGE:
            break
        page += 1
        print(f"  Fetched {len(all_pulls)} PRs...", file=sys.stderr)
    if since or until:
        filtered = []
        for pr in all_pulls:
            created = (pr.get("created_at") or "")[:10]
            if since and created < since:
                continue
            if until and created > until:
                continue
            filtered.append(pr)
        return filtered
    return all_pulls


def fetch_all_commits(owner, repo, token, since=None, until=None):
    """Paginate through commits (default branch). since/until are YYYY-MM-DD strings."""
    base = f"{GITHUB_API}/repos/{owner}/{repo}/commits"
    params = [f"per_page={PER_PAGE}"]
    if since:
        params.append(f"since={since}T00:00:00Z")
    if until:
        params.append(f"until={until}T23:59:59Z")
    commits = []
    page = 1
    while True:
        params_with_page = params + [f"page={page}"]
        page_url = f"{base}?{'&'.join(params_with_page)}"
        status, data = fetch_commits_page(page_url, token)
        if status in (401, 404):
            handle_private_or_missing_repo_error(token)
        if status != 200:
            raise SystemExit(f"GitHub API error: {status} - {data}")
        if not data:
            break
        commits.extend(data)
        if len(data) < PER_PAGE:
            break
        page += 1
        print(f"  Fetched {len(commits)} commits...", file=sys.stderr)
    return commits


def main():
    parser = argparse.ArgumentParser(
        description="Count days with commits per author (developer-days) for a GitHub repo."
    )
    parser.add_argument(
        "repo",
        nargs="?",
        help="Repository as owner/repo (default: from git remote origin)",
    )
    parser.add_argument(
        "--since",
        metavar="YYYY-MM-DD",
        type=parse_date,
        help="Only include commits on or after this date",
    )
    parser.add_argument(
        "--until",
        metavar="YYYY-MM-DD",
        type=parse_date,
        help="Only include commits on or before this date",
    )
    args = parser.parse_args()

    if args.since and args.until:
        since_dt = datetime.strptime(args.since, "%Y-%m-%d")
        until_dt = datetime.strptime(args.until, "%Y-%m-%d")
        if since_dt > until_dt:
            parser.error("--since date must be on or before --until date")

    load_dotenv()
    token = os.getenv("GITHUB_TOKEN")
    repo_slug = args.repo

    if not repo_slug:
        repo_slug = get_git_remote_repo()
        if not repo_slug:
            parser.error("Pass owner/repo or run from a git repo with a GitHub origin.")

    parts = repo_slug.split("/")
    if len(parts) != 2 or not parts[0] or not parts[1]:
        parser.error("Invalid repo: use owner/repo (e.g. chairemobilite/localisation)")
    owner, repo = parts[0], parts[1]

    if args.since or args.until:
        print(
            f"  Filter: since={args.since or 'any'} until={args.until or 'any'}",
            file=sys.stderr,
        )
    commits = fetch_all_commits(owner, repo, token, since=args.since, until=args.until)
    pulls = fetch_all_pulls(owner, repo, token, since=args.since, until=args.until)

    # Unique calendar dates with at least one commit
    all_dates = set()
    # Per author: set of dates they committed (for developer-days)
    by_author = {}
    # Per author: commit count
    commits_by_author = {}

    for c in commits:
        commit = c.get("commit") or {}
        author_info = commit.get("author") or commit.get("committer") or {}
        date_str = (author_info.get("date") or "")[:10]
        if not date_str:
            continue
        author = author_id(c)
        all_dates.add(date_str)
        if author not in by_author:
            by_author[author] = set()
            commits_by_author[author] = 0
        by_author[author].add(date_str)
        commits_by_author[author] += 1

    # Developer-days: sum of distinct days per author (same calendar day with 3 devs = 3 developer-days)
    person_days = sum(len(days) for days in by_author.values())
    sorted_dates = sorted(all_dates)

    print()
    print("--- Summary ---")
    print(f"  Repository: {owner}/{repo}")
    if sorted_dates:
        print(f"  First commit (in range): {sorted_dates[0]}")
        print(f"  Last commit (in range):  {sorted_dates[-1]}")
    print(f"  Calendar days with at least one commit: {len(all_dates)}")
    print(f"  Developer-days (sum of each author's days): {person_days}")
    print(f"  Total commits: {len(commits)}")

    # PR counts (merged = closed with merged_at set)
    n_open = sum(1 for pr in pulls if pr.get("state") == "open")
    n_closed = sum(1 for pr in pulls if pr.get("state") == "closed")
    n_merged = sum(1 for pr in pulls if pr.get("merged_at"))
    print()
    print("--- Pull requests ---")
    print(f"  Total: {len(pulls)}")
    print(f"  Open: {n_open}  |  Closed: {n_closed}  |  Merged: {n_merged}")

    print()
    print("--- Days per author ---")
    by_days = sorted(by_author.items(), key=lambda x: -len(x[1]))
    for author, days in by_days:
        n_days = len(days)
        n_commits = commits_by_author.get(author, 0)
        print(f"  {n_days:4} day(s)  {n_commits:5} commit(s)  {author}")

    print()
    print("Done.")


if __name__ == "__main__":
    main()
