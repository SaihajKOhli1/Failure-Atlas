"""Initialize a new BugJournal repository"""
import json
import typer
from pathlib import Path
from rich.console import Console
from rich.prompt import Prompt

from bugjournal.config import CONFIG_FILE, CONFIG_DIR, ENTRIES_DIR

console = Console()


def init_command(
    api_base: str = typer.Option(
        "http://127.0.0.1:8000",
        "--api-base",
        help="API base URL for the BugJournal backend",
    ),
):
    """Initialize a new BugJournal repository in the current directory"""
    
    current_dir = Path.cwd()
    config_dir = current_dir / CONFIG_DIR
    entries_dir = config_dir / ENTRIES_DIR
    config_file = config_dir / CONFIG_FILE
    
    # Check if already initialized
    if config_file.exists():
        if typer.confirm(
            f"[yellow]BugJournal is already initialized in {current_dir}. Re-initialize?[/yellow]",
            default=False,
        ):
            console.print("[yellow]Re-initializing...[/yellow]")
        else:
            console.print("[green]Aborted.[/green]")
            raise typer.Exit(0)
    
    # Create directories
    try:
        config_dir.mkdir(exist_ok=True)
        entries_dir.mkdir(exist_ok=True)
        console.print(f"[green]✓[/green] Created {config_dir}/")
        console.print(f"[green]✓[/green] Created {entries_dir}/")
    except Exception as e:
        console.print(f"[red]✗[/red] Failed to create directories: {e}")
        raise typer.Exit(1)
    
    # Create config file
    config = {
        "api_base": api_base,
        "user_id": "",
        "repo_id": "",
    }
    
    try:
        with open(config_file, "w") as f:
            json.dump(config, f, indent=2)
        console.print(f"[green]✓[/green] Created {config_file}")
    except Exception as e:
        console.print(f"[red]✗[/red] Failed to create config file: {e}")
        raise typer.Exit(1)
    
    console.print("\n[green]BugJournal initialized successfully![/green]")
    console.print("\n[cyan]Next steps:[/cyan]")
    console.print("  1. Update .bugjournal/config.json with your user_id and repo_id")
    console.print("  2. Create entries with: [bold]bugjournal new[/bold]")
    console.print("  3. Push entries with: [bold]bugjournal push[/bold]")

