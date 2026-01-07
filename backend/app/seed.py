"""Seed the database with demo posts from the frontend"""
import sys
from app.db import SessionLocal, init_db
from app.models import Post, Tag

# Demo posts from frontend
DEMO_POSTS = [
    {
        "title": "Quibi: premium content… with the wrong distribution",
        "product": "Quibi",
        "year": 2020,
        "category": "media / mobile",
        "cause": "distribution",
        "severity": "high",
        "tags": ["distribution", "strategy", "timing"],
        "summary": "Quibi launched with high production value but weak sharing/virality mechanics and unclear differentiation vs. YouTube/TikTok. Timing during a lockdown also reduced commuter use-cases. Lesson: bake distribution into the product, not the marketing.",
        "votes": 842
    },
    {
        "title": "Google Glass: the trust gap was bigger than the tech gap",
        "product": "Google Glass",
        "year": 2013,
        "category": "consumer hardware",
        "cause": "trust",
        "severity": "high",
        "tags": ["trust", "ux", "timing"],
        "summary": "The product triggered privacy fears ('being recorded') and social discomfort, with unclear mainstream value. Lesson: solve the social contract first (signals, consent, norms), then scale the tech.",
        "votes": 615
    },
    {
        "title": "SaaS outage: a rollout without guardrails",
        "product": "ExampleCo",
        "year": 2024,
        "category": "B2B SaaS",
        "cause": "infra",
        "severity": "med",
        "tags": ["infra", "rollout", "alerts"],
        "summary": "A deploy changed a query pattern, spiking DB load. No feature flag fallback, weak alerting, and no canary. Lesson: progressive delivery + kill-switches + DB safety (indexes, limits, timeouts).",
        "votes": 402
    },
    {
        "title": "Pricing mismatch: users loved it… until they paid",
        "product": "StartupX",
        "year": 2022,
        "category": "productivity",
        "cause": "pricing",
        "severity": "med",
        "tags": ["pricing", "strategy"],
        "summary": "Product adoption was strong but conversion collapsed because value wasn't obvious at the paywall. Lesson: price around a clear moment of value, show outcomes, and avoid surprise tiers.",
        "votes": 318
    },
    {
        "title": "Feature flop: built for power users, launched for everyone",
        "product": "ToolCo",
        "year": 2023,
        "category": "productivity",
        "cause": "ux",
        "severity": "low",
        "tags": ["ux", "strategy"],
        "summary": "Complex interface delighted early adopters but confused mainstream users. No onboarding, feature discovery was buried. Lesson: match UI complexity to user sophistication, or invest heavily in progressive disclosure.",
        "votes": 256
    },
    {
        "title": "Market timing miss: launched when everyone was distracted",
        "product": "SocialApp",
        "year": 2020,
        "category": "social",
        "cause": "timing",
        "severity": "med",
        "tags": ["timing", "strategy"],
        "summary": "Launch coincided with a major news cycle that dominated attention. Press push vanished, early users churned. Lesson: check the calendar, monitor news cycles, have a backup launch plan.",
        "votes": 189
    }
]

def seed_database():
    """Seed the database with demo posts"""
    print("Initializing database tables...")
    init_db()
    
    db = SessionLocal()
    try:
        # Check if posts already exist
        existing_count = db.query(Post).count()
        if existing_count > 0:
            print(f"Database already has {existing_count} posts. Skipping seed.")
            return

        print("Seeding database with demo posts...")
        for post_data in DEMO_POSTS:
            # Create tags first
            tags = []
            for tag_name in post_data["tags"]:
                tag = db.query(Tag).filter(Tag.name == tag_name.lower()).first()
                if not tag:
                    tag = Tag(name=tag_name.lower())
                    db.add(tag)
                    db.flush()
                tags.append(tag)

            # Create post with specific votes
            post = Post(
                title=post_data["title"],
                product=post_data["product"],
                year=post_data["year"],
                category=post_data["category"],
                cause=post_data["cause"].lower(),
                severity=post_data["severity"].lower(),
                summary=post_data["summary"],
                votes=post_data["votes"],
                tags=tags
            )
            db.add(post)

        db.commit()
        print(f"Successfully seeded {len(DEMO_POSTS)} posts!")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()

