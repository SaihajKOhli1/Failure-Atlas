"""Create a new bug journal entry"""
import re
from datetime import datetime
from pathlib import Path
import typer
from rich.console import Console
from rich.prompt import Prompt, Confirm

from bugjournal.config import get_entries_dir
from bugjournal.utils import slugify

console = Console()


def new_command():
    """Create a new bug journal entry"""
    
    entries_dir = get_entries_dir()
    
    if not entries_dir.exists():
        console.print(f"[red]✗[/red] Entries directory not found: {entries_dir}")
        console.print("[yellow]Run 'bugjournal init' first to initialize.[/yellow]")
        raise typer.Exit(1)
    
    console.print("\n[cyan]Create a new bug journal entry[/cyan]\n")
    
    # Prompt for entry fields
    title = Prompt.ask("Title", default="")
    if not title:
        console.print("[red]✗[/red] Title is required")
        raise typer.Exit(1)
    
    product = Prompt.ask("Product", default="")
    if not product:
        console.print("[red]✗[/red] Product is required")
        raise typer.Exit(1)
    
    year = Prompt.ask("Year", default=str(datetime.now().year))
    try:
        year = int(year)
    except ValueError:
        console.print("[red]✗[/red] Year must be a number")
        raise typer.Exit(1)
    
    category = Prompt.ask("Category", default="incident")
    cause = Prompt.ask("Cause", default="infra")
    severity = Prompt.ask("Severity", default="med", choices=["low", "med", "high"])
    
    summary = Prompt.ask("Summary", default="")
    if not summary:
        console.print("[red]✗[/red] Summary is required")
        raise typer.Exit(1)
    
    tags_input = Prompt.ask("Tags (comma-separated)", default=cause)
    tags = [tag.strip() for tag in tags_input.split(",") if tag.strip()]
    
    # Create filename
    date_str = datetime.now().strftime("%Y-%m-%d")
    slug = slugify(title)
    filename = f"{date_str}-{slug}.md"
    filepath = entries_dir / filename
    
    if filepath.exists():
        if not Confirm.ask(f"\n[yellow]File {filename} already exists. Overwrite?[/yellow]", default=False):
            console.print("[green]Aborted.[/green]")
            raise typer.Exit(0)
    
    # Create file content with YAML frontmatter
    import yaml
    
    frontmatter = {
        "title": title,
        "product": product,
        "year": year,
        "category": category,
        "cause": cause,
        "severity": severity,
        "summary": summary,
        "tags": tags,
    }
    
    # Generate YAML frontmatter
    yaml_frontmatter = yaml.dump(frontmatter, default_flow_style=False, allow_unicode=True, sort_keys=False)
    
    content = f"""---
{yaml_frontmatter}---

# {title}

**Product:** {product} | **Year:** {year} | **Category:** {category} | **Cause:** {cause} | **Severity:** {severity}

## Summary

{summary}

## Details

<!-- Add more details here -->

## Resolution

<!-- Add resolution notes here -->

## Tags

{', '.join(f'`{tag}`' for tag in tags)}
"""
    
    # Write file
    try:
        with open(filepath, "w") as f:
            f.write(content)
        console.print(f"\n[green]✓[/green] Created entry: {filename}")
    except Exception as e:
        console.print(f"[red]✗[/red] Failed to create entry: {e}")
        raise typer.Exit(1)

