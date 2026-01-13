"""Main CLI entry point for BugJournal"""
import typer
from pathlib import Path
from typing import Optional

from bugjournal.commands import init, new, push

app = typer.Typer(
    name="bugjournal",
    help="BugJournal CLI - Manage your bug journal entries",
    add_completion=False,
)

# Register commands
app.command(name="init")(init.init_command)
app.command(name="new")(new.new_command)
app.command(name="push")(push.push_command)


def main():
    """Entry point for the CLI"""
    app()


if __name__ == "__main__":
    main()

