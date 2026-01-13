"""Configuration management for BugJournal CLI."""

import json
from pathlib import Path
from typing import Optional, Dict, Any

CONFIG_DIR = Path.home() / ".bugjournal"
CONFIG_FILE = CONFIG_DIR / "config.json"


def ensure_config_dir() -> None:
    """Ensure the config directory exists."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)


def load_config() -> Dict[str, Any]:
    """Load configuration from file."""
    ensure_config_dir()
    if not CONFIG_FILE.exists():
        return {}
    
    try:
        with open(CONFIG_FILE, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        raise RuntimeError(f"Failed to load config: {e}")


def save_config(config: Dict[str, Any]) -> None:
    """Save configuration to file."""
    ensure_config_dir()
    try:
        with open(CONFIG_FILE, "w") as f:
            json.dump(config, f, indent=2)
    except IOError as e:
        raise RuntimeError(f"Failed to save config: {e}")


def get_backend_url() -> Optional[str]:
    """Get backend URL from config."""
    config = load_config()
    return config.get("backend_url")


def set_backend_url(url: str) -> None:
    """Set backend URL in config."""
    config = load_config()
    config["backend_url"] = url
    save_config(config)


def get_user_id() -> Optional[str]:
    """Get user ID from config."""
    config = load_config()
    return config.get("user_id")


def set_user_id(user_id: str) -> None:
    """Set user ID in config."""
    config = load_config()
    config["user_id"] = user_id
    save_config(config)


def get_current_repo_id() -> Optional[str]:
    """Get current repo ID from config."""
    config = load_config()
    return config.get("current_repo_id")


def set_current_repo_id(repo_id: str) -> None:
    """Set current repo ID in config."""
    config = load_config()
    config["current_repo_id"] = repo_id
    save_config(config)


def get_current_repo() -> Optional[Dict[str, Any]]:
    """Get current repo info from config."""
    config = load_config()
    return config.get("current_repo")


def set_current_repo(repo_info: Dict[str, Any]) -> None:
    """Set current repo info in config."""
    config = load_config()
    config["current_repo"] = repo_info
    save_config(config)
