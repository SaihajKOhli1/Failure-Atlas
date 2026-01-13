"""Push bug journal entries to the API"""
import requests
import typer
from pathlib import Path
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

from bugjournal.config import load_config, validate_config, get_entries_dir
from bugjournal.utils import parse_frontmatter, compute_file_hash

console = Console()


def push_command(
    dry_run: bool = typer.Option(
        False,
        "--dry-run",
        help="Show what would be pushed without actually pushing",
    ),
    show_ids: bool = typer.Option(
        False,
        "--show-ids",
        help="Print the post IDs returned after push",
    ),
    show_details: bool = typer.Option(
        False,
        "--show-details",
        help="Fetch and display full details (title, status, body preview) for each entry",
    ),
):
    """Push bug journal entries to the API"""
    
    # Load and validate config
    config = load_config()
    validate_config(config)
    
    api_base = config["api_base"].rstrip("/")
    user_id = config["user_id"]
    repo_id = config["repo_id"]
    
    entries_dir = get_entries_dir()
    
    if not entries_dir.exists():
        console.print(f"[red]✗[/red] Entries directory not found: {entries_dir}")
        console.print("[yellow]Run 'bugjournal init' first to initialize.[/yellow]")
        raise typer.Exit(1)
    
    # Find all markdown files
    entry_files = sorted(entries_dir.glob("*.md"))
    
    if not entry_files:
        console.print("[yellow]No entry files found in .bugjournal/entries/[/yellow]")
        console.print("[cyan]Create entries with: bugjournal new[/cyan]")
        raise typer.Exit(0)
    
    console.print(f"\n[cyan]Found {len(entry_files)} entry file(s)[/cyan]\n")
    
    # Parse entries
    entries = []
    errors = []
    
    for entry_file in entry_files:
        try:
            with open(entry_file, "r", encoding="utf-8") as f:
                content = f.read()
            
            frontmatter, body = parse_frontmatter(content)
            
            # Validate required fields
            required_fields = ["title", "product", "year", "category", "cause", "severity", "summary"]
            missing = [field for field in required_fields if not frontmatter.get(field)]
            
            if missing:
                errors.append(f"{entry_file.name}: Missing fields: {', '.join(missing)}")
                continue
            
            # Compute content hash
            content_hash = compute_file_hash(entry_file)
            
            # Compute relative source path
            source_path = f"entries/{entry_file.name}"
            
            # Build entry payload
            entry = {
                "source_path": source_path,
                "content_hash": content_hash,
                "title": str(frontmatter["title"]),
                "product": str(frontmatter["product"]),
                "year": int(frontmatter["year"]),
                "category": str(frontmatter["category"]),
                "cause": str(frontmatter["cause"]),
                "severity": str(frontmatter["severity"]).lower(),
                "summary": str(frontmatter["summary"]),
                "tags": frontmatter.get("tags", []) if isinstance(frontmatter.get("tags"), list) else [],
            }
            
            entries.append(entry)
            
        except Exception as e:
            errors.append(f"{entry_file.name}: {str(e)}")
    
    # Report errors
    if errors:
        console.print("[red]Errors parsing entries:[/red]")
        for error in errors:
            console.print(f"  [red]✗[/red] {error}")
        console.print()
    
    if not entries:
        console.print("[red]✗[/red] No valid entries to push")
        raise typer.Exit(1)
    
    # Show entries to be pushed
    if dry_run:
        table = Table(title="Entries to Push (Dry Run)")
        table.add_column("Source Path", style="cyan")
        table.add_column("Title", style="magenta")
        table.add_column("Content Hash", style="yellow")
        
        for entry in entries:
            table.add_row(
                entry["source_path"],
                entry["title"],
                entry["content_hash"][:20] + "...",
            )
        
        console.print(table)
        console.print(f"\n[yellow]Dry run: Would push {len(entries)} entry(ies)[/yellow]")
        console.print(f"API: {api_base}/repos/{repo_id}/entries/bulk")
        raise typer.Exit(0)
    
    # Push to API
    url = f"{api_base}/repos/{repo_id}/entries/bulk"
    headers = {
        "Content-Type": "application/json",
        "X-User-Id": user_id,
    }
    payload = {"entries": entries}
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("[cyan]Pushing entries...", total=None)
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            progress.stop()
            
            if response.status_code == 200:
                result = response.json()
                
                console.print("\n[green]✓ Push successful![/green]\n")
                
                # Show results
                table = Table(title="Push Results")
                table.add_column("Metric", style="cyan")
                table.add_column("Count", style="magenta", justify="right")
                
                table.add_row("Created", str(result.get("created", 0)))
                table.add_row("Updated", str(result.get("updated", 0)))
                table.add_row("Skipped", str(result.get("skipped", 0)))
                
                console.print(table)
                
                # Show IDs if requested
                entries_result = result.get("entries", [])
                if show_ids and entries_result:
                    console.print("\n[cyan]Entry IDs:[/cyan]")
                    entry_ids = [str(entry.get("id", "?")) for entry in entries_result]
                    console.print(f"  {', '.join(entry_ids)}")
                
                # Fetch and show details if requested
                if show_details and entries_result:
                    console.print("\n[cyan]Entry Details:[/cyan]\n")
                    
                    for entry in entries_result:
                        entry_id = entry.get("id")
                        if not entry_id:
                            console.print(f"  [yellow]⚠[/yellow] Entry missing ID")
                            continue
                        
                        # Fetch full details
                        detail_url = f"{api_base}/posts/{entry_id}"
                        detail_headers = {
                            "X-User-Id": user_id,
                        }
                        
                        try:
                            detail_response = requests.get(detail_url, headers=detail_headers, timeout=10)
                            
                            if detail_response.status_code == 200:
                                detail_data = detail_response.json()
                                title = detail_data.get("title", "N/A")
                                status = detail_data.get("status") or "N/A"
                                body = detail_data.get("body", "")
                                
                                # Get first 1-2 lines of body
                                body_preview = ""
                                if body:
                                    body_lines = body.strip().split("\n")
                                    if len(body_lines) >= 2:
                                        body_preview = " ".join(body_lines[:2])
                                        if len(body_preview) > 120:
                                            body_preview = body_preview[:120] + "..."
                                    else:
                                        body_preview = body_lines[0] if body_lines else ""
                                        if len(body_preview) > 120:
                                            body_preview = body_preview[:120] + "..."
                                else:
                                    body_preview = "(no body)"
                                
                                # Display entry
                                console.print(f"  [bold cyan]#{entry_id}[/bold cyan] [bold]{title}[/bold]")
                                console.print(f"    Status: [yellow]{status}[/yellow]")
                                console.print(f"    Body: {body_preview}")
                                console.print()
                            else:
                                console.print(f"  [yellow]⚠[/yellow] Failed to fetch details for entry #{entry_id} (HTTP {detail_response.status_code})")
                                
                        except requests.exceptions.RequestException as e:
                            console.print(f"  [yellow]⚠[/yellow] Error fetching details for entry #{entry_id}: {str(e)}")
                        except Exception as e:
                            console.print(f"  [yellow]⚠[/yellow] Unexpected error for entry #{entry_id}: {str(e)}")
                
            elif response.status_code == 401:
                console.print("\n[red]✗ Authentication failed[/red]")
                console.print("[yellow]Check that user_id in config.json is correct.[/yellow]")
                raise typer.Exit(1)
            elif response.status_code == 403:
                console.print("\n[red]✗ Permission denied[/red]")
                console.print("[yellow]Check that repo_id in config.json is correct and you own the repository.[/yellow]")
                raise typer.Exit(1)
            elif response.status_code == 404:
                console.print("\n[red]✗ Repository not found[/red]")
                console.print("[yellow]Check that repo_id in config.json is correct.[/yellow]")
                raise typer.Exit(1)
            else:
                console.print(f"\n[red]✗ API error: {response.status_code}[/red]")
                try:
                    error_detail = response.json()
                    console.print(f"[yellow]Details: {error_detail}[/yellow]")
                except:
                    console.print(f"[yellow]Response: {response.text}[/yellow]")
                raise typer.Exit(1)
                
        except requests.exceptions.ConnectionError:
            progress.stop()
            console.print("\n[red]✗ Connection error[/red]")
            console.print(f"[yellow]Could not connect to {api_base}[/yellow]")
            console.print("[yellow]Check that the backend is running and api_base is correct.[/yellow]")
            raise typer.Exit(1)
        except requests.exceptions.Timeout:
            progress.stop()
            console.print("\n[red]✗ Request timeout[/red]")
            console.print("[yellow]The request took too long. Please try again.[/yellow]")
            raise typer.Exit(1)
        except Exception as e:
            progress.stop()
            console.print(f"\n[red]✗ Unexpected error: {e}[/red]")
            raise typer.Exit(1)

