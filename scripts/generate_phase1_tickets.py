#!/usr/bin/env python3
"""Generate Phase-1 ticket stubs from acceptance_criteria_matrix.csv"""
from __future__ import annotations
import csv
from pathlib import Path

CSV_PATH = Path("docs/prd/acceptance_criteria_matrix.csv")
OUTPUT_PATH = Path("tracker/issues/generated_phase1_tickets.md")

LABELS = [
    "frontend/*",
    "backend/*",
    "qa",
    "security",
    "devops",
    "docs",
]

def build_ticket_rows():
    with CSV_PATH.open(newline="") as fh:
        reader = csv.DictReader(fh)
        for idx, row in enumerate(reader, start=2):  # line numbers (header=1)
            user_story = row["User Story"].strip()
            story_id = row["ID"].strip()
            given = row["Given"].strip()
            when = row["When"].strip()
            then = row["Then"].strip()
            perf = row["Perf Target"].strip()
            notes = row["Notes"].strip()
            anchor = f"docs/prd/acceptance_criteria_matrix.csv:{idx}"
            title = f"{story_id} — {user_story}"
            body = [
                f"## Scope\n- Traceability: `{anchor}`\n- Labels: {', '.join(LABELS)}",
                "",
                "## Acceptance Snapshot",
                f"- Given: {given}",
                f"- When: {when}",
                f"- Then: {then}",
                f"- Perf target: {perf or 'TBD'}",
            ]
            if notes:
                body.append(f"- Notes: {notes}")
            yield title, "\n".join(body)

def main() -> None:
    if not CSV_PATH.exists():
        raise SystemExit(f"CSV not found: {CSV_PATH}")
    rows = list(build_ticket_rows())
    if not rows:
        OUTPUT_PATH.write_text("<!-- No acceptance criteria rows present. Populate the CSV then rerun. -->\n")
        return
    lines = []
    for title, body in rows:
        lines.append(f"# {title}\n")
        lines.append(body)
        lines.append("\n---\n")
    OUTPUT_PATH.write_text("\n".join(lines))

if __name__ == "__main__":
    main()
