"""API client for BugJournal backend."""

import httpx
from typing import Dict, Any, Optional, List
from pathlib import Path


class BugJournalAPI:
    """Client for BugJournal backend API."""
    
    def __init__(self, base_url: str, user_id: str):
        """Initialize API client.
        
        Args:
            base_url: Base URL of the backend (e.g., http://localhost:8000)
            user_id: User ID for X-User-Id header
        """
        self.base_url = base_url.rstrip("/")
        self.user_id = user_id
        self.client = httpx.Client(timeout=30.0)
    
    def _headers(self) -> Dict[str, str]:
        """Get default headers with authentication."""
        return {
            "X-User-Id": self.user_id,
            "Content-Type": "application/json",
        }
    
    def create_anonymous_user(self) -> str:
        """Create an anonymous user and return user_id.
        
        Returns:
            User ID string
        """
        response = self.client.post(
            f"{self.base_url}/auth/anon",
            headers={"Content-Type": "application/json"},
        )
        response.raise_for_status()
        data = response.json()
        return data["user_id"]
    
    def create_repo(self, github_url: str) -> Dict[str, Any]:
        """Create a repository.
        
        Args:
            github_url: GitHub repository URL
            
        Returns:
            Repository data including id, name, etc.
        """
        # Backend expects github_url field
        body = {"github_url": github_url}
        
        response = self.client.post(
            f"{self.base_url}/repos",
            headers=self._headers(),
            json=body,
        )
        response.raise_for_status()
        return response.json()
    
    def list_repos(self) -> List[Dict[str, Any]]:
        """List repositories for the current user.
        
        Returns:
            List of repository dictionaries
        """
        response = self.client.get(
            f"{self.base_url}/repos",
            headers=self._headers(),
        )
        response.raise_for_status()
        data = response.json()
        return data.get("items", [])
    
    def create_bulk_entries(self, repo_id: str, entries: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Create or update entries in bulk.
        
        Args:
            repo_id: Repository ID
            entries: List of entry dictionaries
            
        Returns:
            Response data with created/updated/skipped counts
        """
        response = self.client.post(
            f"{self.base_url}/repos/{repo_id}/entries/bulk",
            headers=self._headers(),
            json={"entries": entries},
        )
        response.raise_for_status()
        return response.json()
    
    def list_entries(self, repo_id: str) -> List[Dict[str, Any]]:
        """List entries for a repository.
        
        Args:
            repo_id: Repository ID
            
        Returns:
            List of entry dictionaries
        """
        response = self.client.get(
            f"{self.base_url}/repos/{repo_id}/entries",
            headers=self._headers(),
        )
        response.raise_for_status()
        data = response.json()
        return data.get("items", [])
    
    def close(self):
        """Close the HTTP client."""
        self.client.close()

