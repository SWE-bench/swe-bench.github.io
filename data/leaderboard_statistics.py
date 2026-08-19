#!/usr/bin/env python3
"""Sampling error and significance groups for leaderboard entries.

Two numbers are added to every entry that publishes per-instance results:

    resolved_se   the binomial standard error of THAT entry's resolve rate over
                  the instances it was scored on, in percentage points:
                  100 * sqrt(p*(1-p)/n). It is the sampling error of one rate on
                  a fixed instance set. It is NOT the error of a difference
                  between two entries: two entries are scored on the same
                  instances, so their difference is a paired quantity with a
                  smaller error than these two marginals suggest. Read this
                  column as "how precisely is this one number measured", never
                  as "these two entries overlap, therefore they are tied".

    tie_group     the significance group, from the paired comparison that the SE
                  column deliberately does not perform. Entries are ordered by
                  resolve rate; the highest ungrouped entry anchors a group, and
                  every entry an exact two-sided McNemar test cannot separate
                  from that anchor at alpha = 0.05 joins it. Group membership is
                  therefore a statement about the comparison with the anchor,
                  not a claim that all members are mutually indistinguishable,
                  and not a property of any entry on its own.

Both require per-instance outcomes. Entries without them get neither number, and
the caller is expected to render that as "not published" rather than as a blank
that reads like a pass. Where the highest entry on a board publishes nothing, the
anchor is the highest entry that does, and the summary says who it is and how
many unmeasured entries rank above it — a group is a statement about a comparison,
and it cannot be read without knowing what the comparison was against.

No multiplicity correction is applied to the comparisons against an anchor. A
correction would make separation harder and the groups larger, so the group
sizes produced here are a lower bound on how much of a board is statistically
indistinguishable.

Neither number is a repeatability estimate. Both condition on the single run each
entry reports. A rerun of the same system on the same instances is not observable
in this data, so nothing here bounds how much a score would move on a second run,
and neither column may be read as the uncertainty of the ranking itself.

    python leaderboard_statistics.py --selftest
    python leaderboard_statistics.py leaderboards.json     # report, writes nothing
"""

from __future__ import annotations

import argparse
import json
import math
import pathlib
import sys

ALPHA = 0.05


def _binom_cdf_half(k: int, n: int) -> float:
    """P(X <= k) for X ~ Binomial(n, 0.5), computed exactly."""
    return sum(math.comb(n, i) for i in range(k + 1)) / (2.0**n)


def mcnemar_exact(a: dict, b: dict) -> float:
    """Two-sided exact McNemar p-value over the instances both entries report.

    a and b map instance id -> bool (resolved). Only shared instances are used,
    because the test is paired: an instance one entry never attempted carries no
    information about the difference between them.
    """
    shared = a.keys() & b.keys()
    a_only = sum(1 for i in shared if a[i] and not b[i])
    b_only = sum(1 for i in shared if b[i] and not a[i])
    n = a_only + b_only
    if n == 0:
        return 1.0
    return min(1.0, 2.0 * _binom_cdf_half(min(a_only, b_only), n))


def binomial_se_pp(resolved: int, n: int) -> float:
    """Standard error of a resolve rate, in percentage points."""
    if n <= 0:
        return 0.0
    p = resolved / n
    return 100.0 * math.sqrt(p * (1.0 - p) / n)


def _outcomes(entry: dict) -> dict | None:
    details = entry.get("per_instance_details")
    if not details:
        return None
    return {k: bool(v.get("resolved")) for k, v in details.items()}


def annotate(leaderboard: dict, alpha: float = ALPHA) -> dict:
    """Add resolved_se / n_instances / tie_group in place. Returns a summary."""
    results = leaderboard.get("results", [])
    ranked = sorted(results, key=lambda r: -(float(r.get("resolved") or 0)))

    for entry in results:
        outcomes = _outcomes(entry)
        if outcomes is None:
            continue
        n = len(outcomes)
        entry["n_instances"] = n
        entry["resolved_se"] = round(binomial_se_pp(sum(outcomes.values()), n), 2)

    measurable = [r for r in ranked if _outcomes(r) is not None]
    summary = {
        "name": leaderboard.get("name"),
        "entries": len(results),
        "with_per_instance": len(measurable),
        "grouped": 0,
        "groups": 0,
        "top_tie_group_size": 0,
        "anchor": None,
        "unmeasured_above_anchor": 0,
    }
    if not measurable:
        return summary

    # Group 1 is anchored on the highest entry that publishes per-instance
    # results, which is not always the highest entry on the board. Whoever it is
    # gets named, because a group is a statement about a comparison and the
    # reader cannot check it without knowing what the comparison was against.
    anchor_index = ranked.index(measurable[0])
    summary["anchor"] = measurable[0].get("model_display") or measurable[0].get("name")
    summary["unmeasured_above_anchor"] = anchor_index

    pending = measurable
    group = 0
    while pending:
        group += 1
        anchor, rest = pending[0], pending[1:]
        anchor_outcomes = _outcomes(anchor)
        anchor["tie_group"] = group
        pending = []
        for entry in rest:
            if mcnemar_exact(anchor_outcomes, _outcomes(entry)) >= alpha:
                entry["tie_group"] = group
            else:
                pending.append(entry)
        if group == 1:
            summary["top_tie_group_size"] = 1 + sum(
                1 for e in rest if e.get("tie_group") == 1
            )

    summary["groups"] = group
    summary["grouped"] = sum(1 for r in results if r.get("tie_group"))
    leaderboard["statistics"] = dict(summary, alpha=alpha)
    return summary


def annotate_all(leaderboards: list[dict], alpha: float = ALPHA) -> list[dict]:
    return [annotate(lb, alpha) for lb in leaderboards]


# ------------------------------------------------------------------ selftest

def _entry(name: str, outcomes: list[int]) -> dict:
    return {
        "name": name,
        "resolved": 100.0 * sum(outcomes) / len(outcomes),
        "per_instance_details": {
            f"i{i}": {"resolved": bool(v)} for i, v in enumerate(outcomes)
        },
    }


def selftest() -> int:
    failures = []

    # An entry compared with itself is never separated, at any size.
    same = [i % 3 == 0 for i in range(500)]
    a = {f"i{i}": v for i, v in enumerate(same)}
    if mcnemar_exact(a, dict(a)) != 1.0:
        failures.append("identical entries were separated")

    # The control above must not pass for lack of power: plant flips one way.
    b = dict(a)
    flipped = 0
    for k in list(b):
        if b[k] and flipped < 40:
            b[k] = False
            flipped += 1
    if mcnemar_exact(a, b) >= 1e-6:
        failures.append("40 planted one-directional flips were not detected")

    # Discordance that is balanced is not evidence of a difference, however big.
    c, d = {}, {}
    for i in range(200):
        c[f"i{i}"], d[f"i{i}"] = (i % 2 == 0), (i % 2 == 1)
    if mcnemar_exact(c, d) < ALPHA:
        failures.append("200 balanced discordant pairs were called a difference")

    # SE is the textbook binomial one, and zero variance means zero error.
    if abs(binomial_se_pp(250, 500) - 100 * math.sqrt(0.25 / 500)) > 1e-9:
        failures.append("binomial SE does not match sqrt(p(1-p)/n)")
    if binomial_se_pp(500, 500) != 0.0:
        failures.append("a perfect score did not get a zero SE")

    # Grouping: two indistinguishable leaders and one clearly worse entry give
    # group 1 = {leader, near-tie} and group 2 = {laggard}.
    lead = [1] * 260 + [0] * 240
    near = lead[:]
    near[0], near[1], near[259] = 0, 0, 0
    near[300], near[301] = 1, 1
    lag = [1] * 150 + [0] * 350
    lb = {"name": "t", "results": [_entry("lead", lead), _entry("near", near), _entry("lag", lag)]}
    s = annotate(lb)
    got = {r["name"]: r.get("tie_group") for r in lb["results"]}
    if got != {"lead": 1, "near": 1, "lag": 2}:
        failures.append(f"grouping was {got}, expected lead/near in 1 and lag in 2")
    if s["top_tie_group_size"] != 2:
        failures.append(f"top group size was {s['top_tie_group_size']}, expected 2")

    # An entry with no per-instance results gets no numbers and no group, and it
    # does not shift anyone else's group.
    lb2 = {"name": "t2", "results": [_entry("lead", lead), {"name": "silent", "resolved": 40.0},
                                     _entry("lag", lag)]}
    annotate(lb2)
    silent = lb2["results"][1]
    if "tie_group" in silent or "resolved_se" in silent:
        failures.append("an entry without per-instance results was given statistics")
    if {r["name"]: r.get("tie_group") for r in lb2["results"] if "per_instance_details" in r} != {
            "lead": 1, "lag": 2}:
        failures.append("a silent entry changed the groups of the others")

    # A board whose top entry publishes nothing still gets groups, anchored on
    # the highest entry that does — and that entry is named, with a count of how
    # many unmeasured entries rank above it, so the anchor is never implicit.
    lb3 = {"name": "t3", "results": [{"name": "top", "resolved": 99.0}, _entry("lead", lead),
                                     _entry("lag", lag)]}
    s3 = annotate(lb3)
    if s3["anchor"] != "lead" or s3["unmeasured_above_anchor"] != 1:
        failures.append(f"anchor was {s3['anchor']!r} with {s3['unmeasured_above_anchor']} "
                        "unmeasured above it, expected 'lead' with 1")
    if lb3["results"][0].get("tie_group") is not None:
        failures.append("an entry with no per-instance results was put in a group")
    if s3["groups"] != 2:
        failures.append(f"expected 2 groups under an unmeasured top entry, got {s3['groups']}")

    # A board where nothing is measurable produces no groups and no anchor.
    lb4 = {"name": "t4", "results": [{"name": "a", "resolved": 9.0}, {"name": "b", "resolved": 8.0}]}
    s4 = annotate(lb4)
    if s4["groups"] or s4["anchor"] is not None or "statistics" in lb4:
        failures.append("a board with no per-instance results was given statistics")

    # Only shared instances are compared.
    short = {"i0": True, "i1": False}
    long_ = {"i0": True, "i1": False, "i2": True, "i3": True}
    if mcnemar_exact(short, long_) != 1.0:
        failures.append("instances missing from one entry were treated as failures")

    if failures:
        print("SELFTEST FAILED")
        for f in failures:
            print("  -", f)
        return 1
    print("selftest passed: identical entries never separated, planted flips detected, "
          "balanced discordance not called a difference, SE matches the binomial formula, "
          "the anchor is the highest measurable entry and is named, missing per-instance "
          "results stay empty")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("json", nargs="?", help="leaderboards.json to report on (not modified)")
    ap.add_argument("--selftest", action="store_true")
    args = ap.parse_args()

    if args.selftest or not args.json:
        return selftest()

    data = json.loads(pathlib.Path(args.json).read_text(encoding="utf-8"))
    boards = data["leaderboards"] if isinstance(data, dict) else data
    for s in annotate_all(boards):
        print(f"{s['name']:<14} entries={s['entries']:>4} with per-instance={s['with_per_instance']:>4} "
              f"grouped={s['grouped']:>4} groups={s['groups']:>3} top group={s['top_tie_group_size']:>3}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
