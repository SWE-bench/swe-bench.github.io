---
title: "[SWE-Smith Multilingual] Expanding to JavaScript"
date: 2026-01-13
description: Scalable bug generation now supports JavaScript with 6,099 validated patches
authors:
  - Kevin Li
  - Arpandeep Khatua
---

This is the very first step of the **SWE-smith Multilingual** effort  - we're a team working in the open with the aim of expanding SWE-bench style task collection to non-Python programming languages.

We've expanded [SWE-Smith](https://github.com/SWE-bench/SWE-smith) to support JavaScript, generating and validating 6,099 synthetic bug patches across 74 popular JS repositories.

Here's what to expect in the coming months:

1. Get automatic repository installation + procedural modifications working for new languages. On our roadmap: JavaScript, TypeScript, Java, Rust, Golang, C++
2. Run LM based bug generation methods for all added repositories.
3. Run experiments to better understand the impact of programming languages and repositories on model training dynamics and downstream performance on coding tasks.


If you'd like to get involved, join our Slack (link on the bottom left!)
It's (currently) not explicitly on our roadmap, but another direction we'd love help with is incorporating new bug generation strategies into SWE-smith.

In this blog post, we specifically report on expanding SWE-smith to JavaScript repositories.

<!-- more -->

!!! abstract "Key Results"

    * **6,099 validated patches** out of 35,697 generated (17% validation rate)
    * **14 procedural modifiers** for JavaScript bug generation
    * **End-to-end Modal pipeline** that reduces bug generation from days to hours
    * **[HuggingFace Dataset](https://huggingface.co/datasets/SWE-bench/SWE-smith-js)**

## What is SWE-Smith?

SWE-Smith is a tool for synthesizing realistic bugs in software repositories. By applying procedural modifications to working code (like flipping operators or swapping function arguments), it creates bugs that break tests—providing training data for code repair models and evaluation benchmarks.

Until now, SWE-Smith only supported Python. This expansion brings the same capabilities to JavaScript.

## Results by Repository

The most productive repository was [josdejong/mathjs](https://github.com/josdejong/mathjs), which features lots of arithmetic operations and comprehensive unit tests—an ideal combination for procedural bug generation. It produced 845 validated patches with a 62.8% pass rate.

Here are the top performers:

| Repository | Generated | Validated | Pass Rate |
|------------|-----------|-----------|-----------|
| josdejong/mathjs | 1,346 | 845 | 62.8% |
| novnc/noVNC | 1,384 | 715 | 51.7% |
| Automattic/mongoose | 1,440 | 653 | 45.3% |
| bootstrap-vue/bootstrap-vue | 1,079 | 492 | 45.7% |
| foliojs/pdfkit | 797 | 408 | 51.2% |

??? note "All 74 repositories"

    | Repository | Generated | Validated | Pass Rate |
    |------------|-----------|-----------|-----------|
    | josdejong/mathjs | 1,346 | 845 | 62.8% |
    | novnc/noVNC | 1,384 | 715 | 51.7% |
    | Automattic/mongoose | 1,440 | 653 | 45.3% |
    | bootstrap-vue/bootstrap-vue | 1,079 | 492 | 45.7% |
    | foliojs/pdfkit | 797 | 408 | 51.2% |
    | bpampuch/pdfmake | 1,961 | 264 | 13.5% |
    | caolan/async | 645 | 233 | 36.3% |
    | enzymejs/enzyme | 819 | 228 | 30.6% |
    | Netflix/falcor | 1,046 | 166 | 15.9% |
    | nock/nock | 337 | 161 | 47.8% |
    | redux-saga/redux-saga | 277 | 153 | 55.4% |
    | sveltejs/svelte | 274 | 151 | 55.1% |
    | necolas/react-native-web | 506 | 134 | 26.5% |
    | axios/axios | 304 | 133 | 43.8% |
    | websockets/ws | 384 | 131 | 35.2% |
    | svg/svgo | 171 | 126 | 73.7% |
    | nightwatchjs/nightwatch | 963 | 121 | 12.6% |
    | emotion-js/emotion | 210 | 113 | 53.8% |
    | josdejong/jsoneditor | 920 | 111 | 12.1% |
    | mochajs/mocha | 402 | 108 | 26.9% |
    | iamkun/dayjs | 173 | 99 | 57.6% |
    | brianc/node-postgres | 319 | 97 | 30.4% |
    | Shopify/draggable | 222 | 90 | 40.5% |
    | welldone-software/why-did-you-render | 162 | 66 | 40.7% |
    | balderdashy/sails | 157 | 61 | 38.9% |
    | reactjs/react-transition-group | 95 | 49 | 51.6% |
    | remy/nodemon | 212 | 47 | 22.2% |
    | advplyr/audiobookshelf | 1,590 | 45 | 2.8% |
    | segmentio/evergreen | 114 | 41 | 36.0% |
    | webpack/webpack | 303 | 31 | 10.2% |
    | jantimon/html-webpack-plugin | 143 | 13 | 9.1% |
    | babel/babel | 78 | 9 | 11.7% |
    | mholt/PapaParse | 422 | 3 | 0.7% |
    | marko-js/marko | 255 | 2 | 0.8% |
    | 11ty/eleventy | 1,032 | 0 | 0.0% |
    | GoogleChrome/workbox | 88 | 0 | 0.0% |
    | HabitRPG/habitica | 284 | 0 | 0.0% |
    | Modernizr/Modernizr | 225 | 0 | 0.0% |
    | Qix-/color | 35 | 0 | 0.0% |
    | Unitech/pm2 | 898 | 0 | 0.0% |
    | akiran/react-slick | 40 | 0 | 0.0% |
    | davila7/claude-code-templates | 1,357 | 0 | 0.0% |
    | diegomura/react-pdf | 631 | 0 | 0.0% |
    | elbywan/wretch | 7 | 0 | 0.0% |
    | expressjs/express | 31 | 0 | 0.0% |
    | expressjs/multer | 44 | 0 | 0.0% |
    | facebookexperimental/Recoil | 178 | 0 | 0.0% |
    | forwardemail/superagent | 68 | 0 | 0.0% |
    | forwardemail/supertest | 3 | 0 | 0.0% |
    | gka/chroma.js | 33 | 0 | 0.0% |
    | hakimel/reveal.js | 1,965 | 0 | 0.0% |
    | handsontable/handsontable | 502 | 0 | 0.0% |
    | hapijs/joi | 650 | 0 | 0.0% |
    | highlightjs/highlight.js | 759 | 0 | 0.0% |
    | immutable-js/immutable-js | 636 | 0 | 0.0% |
    | impress/impress.js | 114 | 0 | 0.0% |
    | jashkenas/backbone | 7 | 0 | 0.0% |
    | jquery/jquery | 454 | 0 | 0.0% |
    | koajs/koa | 97 | 0 | 0.0% |
    | kriskowal/q | 128 | 0 | 0.0% |
    | layui/layui | 105 | 0 | 0.0% |
    | louislam/uptime-kuma | 1,227 | 0 | 0.0% |
    | mdx-js/mdx | 242 | 0 | 0.0% |
    | mrdoob/three.js | 0 | 0 | 0.0% |
    | mui/material-ui | 113 | 0 | 0.0% |
    | parallax/jsPDF | 85 | 0 | 0.0% |
    | piskelapp/piskel | 1,131 | 0 | 0.0% |
    | pqina/filepond | 6 | 0 | 0.0% |
    | remarkjs/react-markdown | 43 | 0 | 0.0% |
    | serverless/serverless | 1,144 | 0 | 0.0% |
    | sql-js/sql.js | 8 | 0 | 0.0% |
    | tj/commander.js | 321 | 0 | 0.0% |
    | usebruno/bruno | 962 | 0 | 0.0% |
    | webtorrent/webtorrent | 534 | 0 | 0.0% |

However, half of the 74 repositories contributed zero validated patches:

* **20 repos** failed during pre-gold validation (test results not parsed correctly)
* **20 repos** had too few patches (<50 patches, making validation cost outweigh contribution)

## Modifier Effectiveness

We implemented 14 procedural modifiers for JavaScript. Their effectiveness varies significantly:

| Modifier | Generated | Validated | Pass Rate |
|----------|-----------|-----------|-----------|
| `func_pm_op_flip` | 5,380 | 1,117 | 30.8% |
| `func_pm_arg_swap` | 3,228 | 722 | 32.7% |
| `func_pm_remove_assign` | 3,602 | 632 | 25.4% |
| `func_pm_remove_cond` | 4,009 | 604 | 21.9% |
| `func_pm_ctrl_invert_if` | 1,890 | 490 | 35.7% |

The `func_pm_op_flip` modifier emerged as the most productive, generating 1,117 validated patches—nearly double the next best modifier. This makes sense: flipping binary operators (e.g., `===` to `!==`, `<` to `>=`, `&&` to `||`) applies to a wide range of expressions found across all repositories.

??? note "All 14 modifiers"

    | Modifier | Description | Generated | Validated | Pass Rate |
    |----------|-------------|-----------|-----------|-----------|
    | `func_pm_op_flip` | Flip binary operators | 5,380 | 1,117 | 30.8% |
    | `func_pm_arg_swap` | Swap function arguments | 3,228 | 722 | 32.7% |
    | `func_pm_remove_assign` | Remove assignments | 3,602 | 632 | 25.4% |
    | `func_pm_remove_cond` | Remove conditionals | 4,009 | 604 | 21.9% |
    | `func_pm_ctrl_invert_if` | Swap if/else branches | 1,890 | 490 | 35.7% |
    | `func_pm_op_change_const` | Modify numeric constants | 2,559 | 487 | 28.6% |
    | `func_pm_op_swap` | Swap operands | 4,945 | 443 | 13.2% |
    | `func_pm_op_change` | Change operators (+, -, *, /) | 2,157 | 336 | 25.4% |
    | `func_pm_op_break_chains` | Break chained operations | 2,343 | 304 | 18.9% |
    | `func_pm_ternary_swap` | Swap ternary branches | 1,442 | 277 | 27.6% |
    | `func_pm_remove_loop` | Remove loop constructs | 1,356 | 253 | 24.6% |
    | `func_pm_remove_ternary` | Remove ternary expressions | 1,335 | 185 | 20.4% |
    | `func_pm_aug_assign_swap` | Swap augmented assignments | 1,063 | 143 | 18.6% |
    | `func_pm_ctrl_shuffle` | Shuffle statements in loops | 388 | 106 | 36.7% |

## Scaling with Modal

Previously, running bug generation at scale meant days of local compute. We now run the entire pipeline on [Modal](https://modal.com), reducing this to hours.

The pipeline:

1. **Generate patches** by applying procedural modifiers to repository code
2. **Validate patches** by running each repository's test suite in isolated containers
3. **Store results** in the [HuggingFace Dataset](https://huggingface.co/datasets/SWE-bench/SWE-smith-js)

The [updated documentation](https://github.com/SWE-bench/SWE-smith/blob/d9f1db9bfb5e90f7ed8eaa199e78be5692ad1286/docs/guides/create_instances.md#running-at-scale-on-modal) walks through this pipeline step by step.


## Generating tasks from PRs via SWE-gen
Alongside synthetic patches, we're expanding task creation using [SWE-gen](https://github.com/abundant-ai/SWE-gen), which turns merged GitHub PRs into verifiable tasks automatically. SWE-gen works across languages by detecting the language, build system, and test framework. It reverses the PR to reconstruct the buggy state, and verifies agent bahavior via fail-to-pass tests.

[SWE-gen-JS](https://github.com/abundant-ai/SWE-gen-JS) consists of 1,000 tasks generated from 30 popular open-source JS/TS repos. Tasks derived from real bug-fixes complement synthetic ones by capturing multi-file changes and test setups that procedural modifiers can't always emulate.


## What's Next?

To increase the number of productive repositories, we're improving the repository construction agent:

1. **Pre-validation checks**: Ensure >0 pre-gold tests pass before adding a profile
2. **Smarter repo selection**: Learn from the 20 unproductive samples to sharpen selection heuristics

The `func_pm_ctrl_shuffle` modifier also has room for improvement—its `HAS_LOOP` filter may be unnecessarily strict, limiting its applicability.

---

*Check out the [full PR](https://github.com/SWE-bench/SWE-smith/pull/192) for implementation details.*
