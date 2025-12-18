#!/usr/bin/env python3
import json
import pathlib
import shutil
from flask import Flask
from flask_flatpages import FlatPages
from jinja2 import Environment, FileSystemLoader, select_autoescape


ROOT = pathlib.Path(__file__).parent
TEMPLATES = ROOT / "templates"
DIST = ROOT / "dist"

def get_pages():
    pages = {}
    pages_dir = TEMPLATES / "pages"
    for file in pages_dir.glob("*.html"):
        template_path = f"pages/{file.name}"
        output_file = file.name
        pages[template_path] = output_file
    return pages

PAGES = get_pages()


def parse_frontmatter(content):
    """Parse YAML-style frontmatter from markdown content."""
# Set up Flask app for FlatPages
app = Flask(__name__)
app.config['FLATPAGES_ROOT'] = str(ROOT / 'data' / 'posts')
app.config['FLATPAGES_EXTENSION'] = '.md'
app.config['FLATPAGES_MARKDOWN_EXTENSIONS'] = [
    'extra',
    'codehilite',
    'fenced_code',
    'attr_list',
    'md_in_html',
    'admonition',
    'pymdownx.details',
    'pymdownx.superfences',
    'pymdownx.highlight',
    'pymdownx.inlinehilite',
    'pymdownx.snippets',
]
pages_obj = FlatPages(app)


def load_blog_posts():
    """Load blog posts using FlatPages."""
    with app.app_context():
        posts = []
        for page in pages_obj:
            # Extract title from first H1 in content if not in meta
            title = page.meta.get('title', page.path)
            if not title or title == page.path:
                # Try to extract from first H1 in HTML
                import re
                h1_match = re.search(r'<h1>(.*?)</h1>', page.html)
                if h1_match:
                    title = h1_match.group(1)
            
            # Handle authors - can be list or string
            authors = page.meta.get('authors', '')
            if isinstance(authors, list):
                authors = ', '.join(authors)
            
            # Handle categories
            categories = page.meta.get('categories', [])
            if isinstance(categories, list):
                categories = ', '.join(categories)
            
            post = {
                'slug': page.path,
                'title': title,
                'date': page.meta.get('date', ''),
                'description': page.meta.get('description', ''),
                'authors': authors,
                'categories': categories,
                'html': page.html,
            }
            posts.append(post)
        # Sort by date (newest first)
        posts.sort(key=lambda x: x['date'], reverse=True)
        return posts


def main() -> None:
    # set up Jinja environment
    env = Environment(
        loader=FileSystemLoader(TEMPLATES),
        autoescape=select_autoescape(["html"])
    )
    
    # start fresh each run
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    
    # copy static assets
    if (ROOT / "css").exists():
        shutil.copytree(ROOT / "css", DIST / "css")
    if (ROOT / "img").exists():
        shutil.copytree(ROOT / "img", DIST / "img")
    if (ROOT / "js").exists():
        shutil.copytree(ROOT / "js", DIST / "js")
    
    # Copy blog post assets (images, etc.)
    posts_data_dir = ROOT / "data" / "posts"
    if posts_data_dir.exists():
        for item in posts_data_dir.iterdir():
            if item.is_dir():
                # Copy image directories for blog posts
                dest = DIST / "img" / "blog" / item.name
                dest.parent.mkdir(parents=True, exist_ok=True)
                if dest.exists():
                    shutil.rmtree(dest)
                shutil.copytree(item, dest)
    
    if (ROOT / "favicon.ico").exists():
        shutil.copy(ROOT / "favicon.ico", DIST / "favicon.ico")
    if (ROOT / "CNAME").exists():
        shutil.copy(ROOT / "CNAME", DIST / "CNAME")
    else:
        raise FileNotFoundError("CNAME file not found. Please create a CNAME file in the root directory.")
    
    # load data
    with open(ROOT / "data/leaderboards.json", "r") as f:
        leaderboards = json.load(f)
    with open(ROOT / "data/press.json", "r") as f:
        press = json.load(f)
        press = sorted(press, key=lambda x: x["date"], reverse=True)
    
    # Load blog posts
    posts = load_blog_posts()
    
    # Collect tags per leaderboard and global tags
    leaderboard_tags = {}
    all_tags = set()
    
    for leaderboard in leaderboards["leaderboards"] if isinstance(leaderboards, dict) else leaderboards:
        leaderboard_name = leaderboard["name"]
        leaderboard_tags[leaderboard_name] = set()
        
        for entry in leaderboard["results"]:
            if "tags" in entry and entry["tags"]:
                entry_tags = entry["tags"]
                leaderboard_tags[leaderboard_name].update(entry_tags)
                all_tags.update(entry_tags)
    
    # Convert sets to sorted lists for JSON serialization
    for leaderboard_name in leaderboard_tags:
        leaderboard_tags[leaderboard_name] = sorted(list(leaderboard_tags[leaderboard_name]))
    all_tags = sorted(list(all_tags))
    
    # render all pages
    for tpl_name, out_name in PAGES.items():
        # Skip blog and post templates - they're handled separately
        if out_name in ['blog.html', 'post.html']:
            continue
            
        tpl = env.get_template(tpl_name)
        html = tpl.render(
            title="SWE-bench",
            base_path="",
            leaderboards=leaderboards["leaderboards"] if isinstance(leaderboards, dict) else leaderboards,
            press=press,
            all_tags=all_tags,  # Keep for backward compatibility
            leaderboard_tags=leaderboard_tags,  # New per-leaderboard tags
        )
        (DIST / out_name).write_text(html)
        print(f"built {out_name}")
    
    # Render blog listing page
    if posts:
        blog_tpl = env.get_template('pages/blog.html')
        blog_html = blog_tpl.render(
            title="SWE-bench Blog",
            posts=posts,
            leaderboards=leaderboards["leaderboards"] if isinstance(leaderboards, dict) else leaderboards,
            press=press,
            all_tags=all_tags,
            leaderboard_tags=leaderboard_tags,
        )
        (DIST / "blog.html").write_text(blog_html)
        print(f"built blog.html")
        
        # Render individual blog posts at root level (not in subdirectory)
        post_tpl = env.get_template('pages/post.html')
        for post in posts:
            # Fix image paths in HTML to point to img/blog/
            import re
            # Replace image paths like "250820-mini-roulette/image.svg" with "img/blog/250820-mini-roulette/image.svg"
            post['html'] = re.sub(
                r'src="([^/"]+)/([^"]+)"',
                r'src="img/blog/\1/\2"',
                post['html']
            )
            
            post_html = post_tpl.render(
                title=f"{post['title']}",
                post=post,
                leaderboards=leaderboards["leaderboards"] if isinstance(leaderboards, dict) else leaderboards,
                press=press,
                all_tags=all_tags,
                leaderboard_tags=leaderboard_tags,
            )
            (DIST / f"post-{post['slug']}.html").write_text(post_html)
            print(f"built post-{post['slug']}.html")
    
    print("All pages generated successfully!")


if __name__ == "__main__":
    main()
