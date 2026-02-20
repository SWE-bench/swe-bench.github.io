<p align="center">
  <a href="https://github.com/princeton-nlp/Llamao">
    <img src="img/swe-bench-banner-bg.svg" width="50%" alt="swellama logo" />
  </a>
</p>

# SWE-bench Website

The SWE-bench website for leaderboards and project information.

## Table of Contents

- [SWE-bench Website](#swe-bench-website)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Development](#development)
  - [Directory Structure](#directory-structure)
  - [How the Website Works](#how-the-website-works)
    - [Build Process](#build-process)
    - [Template System](#template-system)
    - [Leaderboard Data Flow](#leaderboard-data-flow)
    - [CSS Organization](#css-organization)
    - [JavaScript Usage](#javascript-usage)
  - [Customizing the Website](#customizing-the-website)
    - [Adding a New Page](#adding-a-new-page)
    - [Updating the Leaderboard](#updating-the-leaderboard)
    - [Changing the Theme](#changing-the-theme)
    - [Adding New Features](#adding-new-features)
  - [Deployment](#deployment)
  - [Troubleshooting](#troubleshooting)

## Overview

This is the codebase for the [SWE-bench website](https://www.swebench.com), which showcases leaderboards for the SWE-bench benchmark. SWE-bench tests systems' ability to solve GitHub issues automatically.

The site is built using:
- Jinja2 for HTML templating
- Pure CSS (organized in modular files)
- Vanilla JavaScript for interactivity
- Python for the build process

The site is statically generated and can be hosted on GitHub Pages or any other static hosting service.

## Getting Started

> [!note]
> For better viewing of json diffs, run `git config diff.json.algorithm histogram`

### Prerequisites

- Python 3.8 or higher
- [`uv`](https://docs.astral.sh/uv/getting-started/installation/) for Python package management

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/swe-bench/swe-bench.github.io.git
   cd swe-bench.github.io
   ```

2. Install dependencies (uv will automatically create and manage the virtual environment):
   ```bash
   make install
   ```

### Development

1. Build the site:
   ```bash
   make build
   ```

2. Start a local development server:
   ```bash
   make serve
   ```

3. Open your browser and navigate to http://localhost:8000

## Directory Structure

```
.
├── build.py             # Build script that generates the static site
├── CNAME                # Domain configuration for GitHub Pages
├── css/                 # CSS files organized by functionality
│   ├── components.css   # Styles for UI components
│   ├── core.css         # Core styling variables and base styles
│   ├── layout.css       # Layout-related styles
│   ├── main.css         # CSS entry point that imports all stylesheets
│   ├── pages.css        # Page-specific styles
│   └── utilities.css    # Utility classes
├── data/                # Data files used in the site generation
│   └── leaderboards.json  # Leaderboard data
├── dist/                # Generated static site (created by build.py)
├── favicon.ico          # Site favicon
├── img/                 # Image assets
├── js/                  # JavaScript files
│   ├── citation.js      # Citation functionality
│   ├── citationFormat.js # Citation format handlers
│   ├── mainResults.js   # Main leaderboard functionality
│   ├── tableByRepo.js   # Repository filter functionality
│   ├── tableByYear.js   # Year filter functionality
│   └── viewer.js        # Results viewer functionality
├── Makefile             # Automation for common tasks
├── pyproject.toml      # Python project configuration and dependencies
└── templates/           # Jinja2 templates
    ├── base.html        # Base template with common structure
    ├── _leaderboard_table.html  # Reusable leaderboard table component
    ├── _sidebar.html    # Sidebar component
    └── pages/           # Page-specific templates
        ├── citations.html
        ├── contact.html
        ├── index.html
        ├── lite.html
        ├── multimodal.html
        ├── submit.html
        └── viewer.html
```

## How the Website Works

### Build Process

The website is built using a static site generator implemented in `build.py`. This script:

1. Loads templates from the `templates` directory
2. Loads data from `data/leaderboards.json`
3. Renders each template in `templates/pages/` to a corresponding HTML file in `dist/`
4. Copies static assets (CSS, JS, images, favicon, etc.) to the `dist/` directory

### Template System

The website uses Jinja2 for templating:

- `templates/base.html`: The main template that defines the site structure
- `templates/_sidebar.html`: The sidebar component included in the base template
- `templates/_leaderboard_table.html`: The reusable leaderboard table component
- `templates/pages/*.html`: Individual page templates that extend the base template

Templates use Jinja2 syntax for:
- Template inheritance (`{% extends 'base.html' %}`)
- Including components (`{% include "_sidebar.html" %}`)
- Block definitions and overriding (`{% block content %}{% endblock %}`)
- Variable rendering (`{{ variable }}`)
- Control structures (`{% if condition %}{% endif %}`)

### Leaderboard Data Flow

The leaderboard data follows a specific flow from JSON to rendered HTML:

1. **Data Source**: All leaderboard data is stored in `data/leaderboards.json`. This JSON file contains an array of leaderboards under the key `"leaderboards"`, with each leaderboard having a `"name"` (e.g., "Test", "Lite", "Verified", "Multimodal") and a list of `"results"` entries.

2. **Data Loading**: During the build process in `build.py`, the JSON file is loaded and passed to the Jinja2 templates as the `leaderboards` variable:
   ```python
   # From build.py
   with open(ROOT / "data/leaderboards.json", "r") as f:
       leaderboards = json.load(f)
   
   # Passed to templates during rendering
   html = tpl.render(
       title="SWE-bench", 
       leaderboards=leaderboards["leaderboards"]
   )
   ```

3. **Reusable Table Component**: The `_leaderboard_table.html` template is a reusable component that loops through the leaderboards array and renders a table for each one:
   ```html
   {% for leaderboard in leaderboards %}
   <div class="tabcontent" id="leaderboard-{{leaderboard.name}}">
       <table class="table scrollable data-table">
           <!-- Table headers -->
           <tbody>
               {% for item in leaderboard.results if not item.warning %}
               <tr>
                   <!-- Row data from each result item -->
               </tr>
               {% endfor %}
           </tbody>
       </table>
   </div>
   {% endfor %}
   ```

4. **Page-Specific Rendering**: In page templates like `lite.html`, the leaderboard data can be rendered in a more focused way by filtering for a specific leaderboard:
   ```html
   {% for leaderboard in leaderboards %}
       {% if leaderboard.name == "Lite" %}
           <table class="table scrollable data-table">
               <!-- Only renders the "Lite" leaderboard -->
           </table>
       {% endif %}
   {% endfor %}
   ```

5. **Dynamic Badges and Formatting**: The templates add special badges and formatting to entries:
   - Medal emoji (🥇, 🥈, 🥉) for the top 3 entries
   - "New" badge (🆕) for recent submissions 
   - "Open source" badge (🤠) when `item.oss` is true
   - "Verified" checkmark (✅) when `item.verified` is true
   - Percentage formatting with 2 decimal places: `{{ "%.2f"|format(item.resolved|float) }}`

6. **JavaScript Enhancements**: After the HTML is rendered, JavaScript files like `mainResults.js`, `tableByRepo.js`, and `tableByYear.js` enhance the tables with sorting, filtering, and tab switching functionality.

This modular approach allows for easy updates to leaderboard data - simply modify the JSON file, and the changes will propagate throughout the site during the next build.

### CSS Organization

CSS is organized into modular files and imported through `main.css`:

- `core.css`: Base styles, variables, and resets
- `layout.css`: Grid and layout components
- `components.css`: UI component styles
- `pages.css`: Page-specific styles
- `utilities.css`: Utility classes for common styling needs

This organization makes it easy to find and update specific styles.

### JavaScript Usage

JavaScript is used for interactive features:

- `mainResults.js`: Main leaderboard functionality including filtering and sorting
- `tableByRepo.js` & `tableByYear.js`: Additional table filtering
- `citation.js` & `citationFormat.js`: Citation formatting and copying
- `viewer.js`: Results viewer page functionality

## Customizing the Website

### Adding a New Page

To add a new page to the website:

1. Create a new HTML file in `templates/pages/`, e.g., `templates/pages/new-page.html`
2. Start with the basic template structure:
   ```html
   {% extends 'base.html' %}
   
   {% block title %}New Page Title{% endblock %}
   
   {% block content %}
   <section class="container">
       <div class="content-section">
           <h2>Your New Page</h2>
           <p>Content goes here...</p>
       </div>
   </section>
   {% endblock %}
   ```
3. Add any page-specific CSS to `css/pages.css`
4. Add any page-specific JavaScript to the `js/` directory and include it in your template:
   ```html
   {% block js_files %}
   <script src="js/your-script.js"></script>
   {% endblock %}
   ```
5. Update the sidebar navigation in `templates/_sidebar.html` to include your new page
6. Rebuild the site with `make build`

### Updating the Leaderboard

To update the leaderboard data:

1. Edit `data/leaderboards.json` with the new entries
2. The JSON structure follows this format:
   ```json
   {
     "leaderboards": [
       {
         "name": "Test",
         "results": [
           {
             "name": "Model Name",
             "folder": "folder_name",
             "resolved": 33.83,
             "date": "2025-02-27",
             "logs": true,
             "trajs": true,
             "site": "https://example.com",
             "verified": true,
             "oss": true,
             "org_logo": "https://example.com/logo.png",
             "warning": null
           },
           // More entries...
         ]
       },
       // More leaderboards (Verified, Lite, Multimodal)...
     ]
   }
   ```
3. Each leaderboard has a `name` and a list of `results` entries
4. Each result has various fields describing a model's performance
5. After updating the JSON, rebuild the site with `make build`

### Changing the Theme

To customize the visual appearance:

1. Main color variables are defined in `css/core.css`:
   - Edit color variables to change the overall color scheme
   - Update typography variables to change fonts

2. Layout structures are in `css/layout.css`:
   - Modify container sizes, grid layouts, etc.

3. Component styling is in `css/components.css`:
   - Update button styles, card styles, table styles, etc.

4. To add dark mode styles, look for `.dark-mode` selectors throughout the CSS files

### Adding New Features

When adding new features:

1. Avoid directly modifying existing code; extend it instead
2. Add new CSS in an appropriate file based on its purpose
3. Add new JavaScript files for new functionality
4. Update templates to include new components
5. Maintain the existing structure and coding style

## Deployment

The website is designed to be deployed to GitHub Pages:

1. Build the site with `make build`
2. Commit and push changes to the GitHub repository under the `main` or `master` branch
3. Configure the domain to serve from the `gh-pages` branch (root directory) in your repository settings
4. The domain is configured via the `CNAME` file and the GitHub repository settings

See [deploy.yml](.github/workflows/deploy.yml) for the GitHub Actions workflow that handles automatic deployment to GitHub Pages.

## Troubleshooting

Common issues:

- **Build fails**: Make sure you have all dependencies installed with `make install`
- **CSS changes not appearing**: Check if you're editing the correct CSS file and if it's imported in `main.css`. Force refresh the page (Cmd+Shift+R) if changes aren't showing.
- **JavaScript not working**: Check browser console for errors and ensure your script is included in the template
- **Template changes not appearing**: Make sure you're building the site after making changes with `make build`. `make serve` also builds the site automatically.
