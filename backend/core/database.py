"""Database engine initialization, connection pooling, and session management."""

from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from backend.core.config import get_settings


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass


_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        settings = get_settings()
        db_url = settings.database_url

        if db_url.startswith("sqlite"):
            from sqlalchemy import event

            _engine = create_async_engine(
                db_url,
                echo=(settings.log_level.upper() == "DEBUG"),
                connect_args={"timeout": 30.0},
            )

            @event.listens_for(_engine.sync_engine, "connect")
            def set_sqlite_pragma(dbapi_connection, connection_record):
                cursor = dbapi_connection.cursor()
                cursor.execute("PRAGMA journal_mode=WAL")
                cursor.execute("PRAGMA busy_timeout=30000")
                cursor.close()

        else:
            # Normalize standard Postgres URI to SQLAlchemy asyncpg dialect
            if db_url.startswith("postgres://"):
                db_url = "postgresql+asyncpg://" + db_url[len("postgres://"):]
            elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+asyncpg://"):
                db_url = "postgresql+asyncpg://" + db_url[len("postgresql://"):]

            # asyncpg prefers ssl parameter over sslmode/channel_binding in query string
            db_url = db_url.replace("sslmode=require", "ssl=require").replace("channel_binding=require&", "").replace("&channel_binding=require", "")

            _engine = create_async_engine(
                db_url,
                echo=(settings.log_level.upper() == "DEBUG"),
                pool_pre_ping=True,
                pool_size=10,
                max_overflow=20,
            )
    return _engine


async def init_db() -> None:
    """Initialize database tables if they do not exist."""
    engine = get_engine()
    # Import models so all tables are registered on Base
    from backend.storage import models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _session_factory
    if _session_factory is None:
        engine = get_engine()
        _session_factory = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
    return _session_factory


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency injection provider yielding an async database session."""
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

