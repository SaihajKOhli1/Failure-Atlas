"""Main CLI application for BugJournal."""

import os
import sys
from pathlib import Path
from typing import Optional, Dict, Any

import typer
from rich.console import Console
from rich.table import Table

from bugjournal import config
from bugjournal import api
from bugjournal import entries

app = typer.Typer(help="BugJournal CLI - Manage bug journals from the command line")
console = Console()


def get_api_client() -> api.BugJournalAPI:
    """Get API client with user ID and backend URL."""
    user_id = os.getenv("BUGJOURNAL_USER_ID") or config.get_user_id()
    backend_url = os.getenv("BUGJOURNAL_BACKEND_URL") or config.get_backend_url()
    
    if not user_id:
        console.print("[red]Error: User ID not found.[/red]")
        console.print("  Set it via: bugjournal init")
        console.print("  Or set env var: BUGJOURNAL_USER_ID=<uuid>")
        raise typer.Exit(1)
    
    if not backend_url:
        console.print("[red]Error: Backend URL not configured.[/red]")
        console.print("  Set it via: bugjournal init")
        console.print("  Or set env var: BUGJOURNAL_BACKEND_URL=<url>")
        raise typer.Exit(1)
    
    return api.BugJournalAPI(backend_url, user_id)


@app.command()
def init(
    backend_url: Optional[str] = typer.Option(
        None,
        "--backend-url",
        "-u",
        help="Backend base URL (default: http://localhost:8000)",
    ),
):
    """Initialize BugJournal CLI configuration."""
    # Get backend URL from flag, env var, or default
    url = backend_url or os.getenv("BUGJOURNAL_BACKEND_URL", "http://localhost:8000")
    
    # Only prompt if interactive and no value provided
    if not backend_url and not os.getenv("BUGJOURNAL_BACKEND_URL"):
        if sys.stdin.isatty():
            url = typer.prompt("Backend base URL", default=url)
        else:
            # Non-interactive, use default
            pass
    
    config.set_backend_url(url)
    
    # Get or create user ID
    user_id = os.getenv("BUGJOURNAL_USER_ID") or config.get_user_id()
    if not user_id:
        console.print("[yellow]Creating anonymous user...[/yellow]")
        try:
            api_client = api.BugJournalAPI(url, "dummy")  # Will be replaced
            user_id = api_client.create_anonymous_user()
            api_client.close()
            config.set_user_id(user_id)
            console.print(f"[green]✓[/green] Created user: {user_id}")
        except Exception as e:
            console.print(f"[red]Error creating user: {e}[/red]")
            raise typer.Exit(1)
    else:
        if os.getenv("BUGJOURNAL_USER_ID"):
            config.set_user_id(user_id)
        console.print(f"[green]✓[/green] Using user: {user_id}")
    
    console.print(f"[green]✓[/green] Configuration saved to {config.CONFIG_FILE}")
    console.print(f"[green]✓[/green] Backend URL: {url}")
    console.print(f"[green]✓[/green] User ID: {user_id}")


@app.command()
def connect(
    github_url: str = typer.Argument(..., help="GitHub repository URL"),
):
    """Connect a GitHub repository to BugJournal."""
    api_client = get_api_client()
    
    try:
        # Normalize GitHub URL
        normalized_url = github_url.strip()
        if not normalized_url.startswith("http"):
            normalized_url = f"https://github.com/{normalized_url}"
        
        # Parse owner/repo from URL
        from urllib.parse import urlparse
        parsed = urlparse(normalized_url)
        parts = parsed.path.strip("/").split("/")
        if len(parts) < 2:
            console.print(f"[red]Error: Invalid GitHub URL format: {github_url}[/red]")
            raise typer.Exit(1)
        
        owner = parts[0]
        repo_name = parts[1]
        display_name = f"{owner}/{repo_name}"
        
        console.print(f"[yellow]Connecting repository: {display_name}[/yellow]")
        repo_data = api_client.create_repo(normalized_url)
        
        repo_id = repo_data["id"]
        backend_name = repo_data.get("name", display_name)
        
        # Store repo info
        config.set_current_repo_id(repo_id)
        config.set_current_repo({
            "id": repo_id,
            "github_url": normalized_url,
            "owner": owner,
            "name": repo_name,
            "display_name": display_name,
            "backend_name": backend_name,
        })
        
        console.print(f"[green]✓[/green] Connected repository: {display_name}")
        console.print(f"  Repo ID: {repo_id}")
        console.print(f"  GitHub: {normalized_url}")
    except Exception as e:
        console.print(f"[red]Error connecting repository: {e}[/red]")
        # Handle httpx HTTPStatusError
        if hasattr(e, "response"):
            response = e.response
            try:
                error_data = response.json()
                console.print(f"Response: {error_data}")
                if response.status_code == 422:
                    console.print("[yellow]Hint: Backend expects github_url field. Update connect payload if needed.[/yellow]")
            except:
                if hasattr(response, "text"):
                    console.print(f"Response text: {response.text}")
                elif hasattr(response, "content"):
                    console.print(f"Response content: {response.content}")
        raise typer.Exit(1)
    finally:
        api_client.close()


@app.command()
def push():
    """Push local entries to the backend."""
    repo_id = config.get_current_repo_id()
    if not repo_id:
        console.print("[red]Error: No repository connected. Run 'bugjournal connect <github_url>' first.[/red]")
        raise typer.Exit(1)
    
    # Find repo root (current directory or parent with .git)
    repo_root = Path.cwd()
    git_dir = repo_root / ".git"
    if not git_dir.exists():
        # Try parent directory
        parent_git = repo_root.parent / ".git"
        if parent_git.exists():
            repo_root = repo_root.parent
        else:
            console.print("[yellow]Warning: Not in a git repository. Using current directory.[/yellow]")
    
    console.print(f"[yellow]Scanning entries in {repo_root / '.bugjournal' / 'entries'}[/yellow]")
    
    try:
        entry_list = entries.scan_entries(repo_root)
        
        if not entry_list:
            console.print("[yellow]No entries found. Create entries in .bugjournal/entries/ directory.[/yellow]")
            console.print("Run 'bugjournal sample' to create a sample entry.")
            return
        
        console.print(f"[yellow]Found {len(entry_list)} entries[/yellow]")
        
        api_client = get_api_client()
        try:
            result = api_client.create_bulk_entries(repo_id, entry_list)
            
            created = result.get("created", 0)
            updated = result.get("updated", 0)
            skipped = result.get("skipped", 0)
            
            console.print(f"[green]✓[/green] Push complete")
            console.print(f"  Created: {created}")
            console.print(f"  Updated: {updated}")
            console.print(f"  Skipped: {skipped}")
        except Exception as e:
            console.print(f"[red]Error pushing entries: {e}[/red]")
            if hasattr(e, "response") and hasattr(e.response, "text"):
                try:
                    import json
                    error_data = json.loads(e.response.text)
                    console.print(f"Error details: {json.dumps(error_data, indent=2)}")
                except:
                    console.print(f"Response: {e.response.text}")
            raise typer.Exit(1)
        finally:
            api_client.close()
    except Exception as e:
        console.print(f"[red]Error scanning entries: {e}[/red]")
        raise typer.Exit(1)


@app.command()
def repos():
    """List connected repositories."""
    api_client = get_api_client()
    
    try:
        repo_list = api_client.list_repos()
        
        if not repo_list:
            console.print("[yellow]No repositories connected.[/yellow]")
            console.print("Run 'bugjournal connect <github_url>' to connect a repository.")
            return
        
        table = Table(title="Repositories")
        table.add_column("ID", style="cyan")
        table.add_column("Name", style="green")
        table.add_column("Visibility", style="yellow")
        table.add_column("Created", style="blue")
        
        for repo in repo_list:
            repo_id = repo.get("id", "")
            name = repo.get("name", "")
            visibility = repo.get("visibility", "")
            created = repo.get("created_at", "")
            if created:
                # Format datetime
                from datetime import datetime
                try:
                    dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                    created = dt.strftime("%Y-%m-%d %H:%M")
                except:
                    pass
            
            table.add_row(repo_id, name, visibility, created)
        
        console.print(table)
    except Exception as e:
        console.print(f"[red]Error listing repositories: {e}[/red]")
        raise typer.Exit(1)
    finally:
        api_client.close()


@app.command()
def list_entries():
    """List entries for the current repository."""
    repo_id = config.get_current_repo_id()
    if not repo_id:
        console.print("[red]Error: No repository connected. Run 'bugjournal connect <github_url>' first.[/red]")
        raise typer.Exit(1)
    
    api_client = get_api_client()
    
    try:
        entry_list = api_client.list_entries(repo_id)
        
        if not entry_list:
            console.print("[yellow]No entries found for this repository.[/yellow]")
            console.print("Run 'bugjournal push' to upload entries.")
            return
        
        table = Table(title="Entries")
        table.add_column("ID", style="cyan")
        table.add_column("Title", style="green")
        table.add_column("Severity", style="yellow")
        table.add_column("Tags", style="blue")
        table.add_column("Created", style="magenta")
        
        for entry in entry_list:
            entry_id = str(entry.get("id", ""))
            title = entry.get("title", "")
            severity = entry.get("severity", "")
            tags_list = entry.get("tags", [])
            tags_str = ", ".join(tags_list) if tags_list else ""
            created = entry.get("created_at", "")
            if created:
                from datetime import datetime
                try:
                    dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                    created = dt.strftime("%Y-%m-%d")
                except:
                    pass
            
            table.add_row(entry_id, title, severity, tags_str, created)
        
        console.print(table)
    except Exception as e:
        console.print(f"[red]Error listing entries: {e}[/red]")
        raise typer.Exit(1)
    finally:
        api_client.close()


@app.command(name="entries")
def entries_command():
    """Alias for list-entries command."""
    list_entries()


@app.command()
def sample():
    """Create sample entry files in the current repository."""
    repo_root = Path.cwd()
    
    try:
        sample_files = entries.create_sample_entries(repo_root)
        console.print(f"[green]✓[/green] Created {len(sample_files)} sample entries:")
        for file_path in sample_files:
            console.print(f"  - {file_path.name}")
        console.print("\nEdit these files and run 'bugjournal push' to upload them.")
    except Exception as e:
        console.print(f"[red]Error creating sample entry: {e}[/red]")
        raise typer.Exit(1)


@app.command()
def status():
    """Show current BugJournal CLI configuration status."""
    backend_url = config.get_backend_url() or os.getenv("BUGJOURNAL_BACKEND_URL", "Not set")
    user_id = config.get_user_id() or os.getenv("BUGJOURNAL_USER_ID", "Not set")
    repo_info = config.get_current_repo()
    repo_id = config.get_current_repo_id()
    
    console.print("[bold]BugJournal CLI Status[/bold]")
    console.print(f"Backend URL: {backend_url}")
    console.print(f"User ID: {user_id}")
    
    if repo_info:
        console.print(f"\n[bold]Current Repository:[/bold]")
        console.print(f"  Name: {repo_info.get('display_name', 'N/A')}")
        console.print(f"  GitHub: {repo_info.get('github_url', 'N/A')}")
        console.print(f"  Repo ID: {repo_id or 'N/A'}")
    elif repo_id:
        console.print(f"\n[bold]Current Repository:[/bold]")
        console.print(f"  Repo ID: {repo_id}")
        console.print("  [yellow](Run 'bugjournal connect' to set full repo info)[/yellow]")
    else:
        console.print("\n[bold]Current Repository:[/bold] [yellow]Not connected[/yellow]")
        console.print("  Run 'bugjournal connect <github_url>' to connect a repository")


def main():
    """Entry point for the CLI."""
    app()


if __name__ == "__main__":
    main()

