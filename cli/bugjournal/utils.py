"""Utility functions for BugJournal CLI"""
import re
import hashlib
from pathlib import Path


def slugify(text: str) -> str:
    """Convert text to a URL-friendly slug"""
    # Convert to lowercase
    text = text.lower()
    # Replace spaces and underscores with hyphens
    text = re.sub(r'[_\s]+', '-', text)
    # Remove all non-word characters except hyphens
    text = re.sub(r'[^\w\-]+', '', text)
    # Remove multiple consecutive hyphens
    text = re.sub(r'\-+', '-', text)
    # Remove leading/trailing hyphens
    text = text.strip('-')
    # Limit length
    return text[:50]


def compute_file_hash(filepath: Path) -> str:
    """Compute SHA256 hash of a file"""
    sha256_hash = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            sha256_hash.update(chunk)
    return f"sha256:{sha256_hash.hexdigest()}"


def parse_frontmatter(content: str):
    """Parse YAML frontmatter from markdown file
    
    Returns:
        tuple: (frontmatter_dict, body_content)
    """
    import yaml
    
    content_stripped = content.strip()
    if not content_stripped.startswith("---"):
        raise ValueError("File does not start with YAML frontmatter")
    
    # Find the end of frontmatter
    lines = content_stripped.split("\n")
    if lines[0].strip() != "---":
        raise ValueError("File does not start with YAML frontmatter delimiter")
    
    # Find closing delimiter
    end_idx = None
    for i, line in enumerate(lines[1:], 1):
        if line.strip() == "---":
            end_idx = i
            break
    
    if end_idx is None:
        raise ValueError("YAML frontmatter not closed (missing ---)")
    
    # Extract frontmatter and body
    frontmatter_lines = lines[1:end_idx]
    body_lines = lines[end_idx + 1:]
    
    frontmatter_text = "\n".join(frontmatter_lines)
    body_text = "\n".join(body_lines).strip()
    
    try:
        frontmatter = yaml.safe_load(frontmatter_text)
        if frontmatter is None:
            frontmatter = {}
        return frontmatter, body_text
    except yaml.YAMLError as e:
        raise ValueError(f"Invalid YAML frontmatter: {e}")

