-- Database Schema for Bookmarked
-- Derived from docs/architecture/table_UML.md (branch: refactor/docs-uml-table)
-- Target RDBMS: PostgreSQL (Supabase / local PostgreSQL)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. Core Entities
-- ============================================================================

-- Stores application-specific user profiles.
-- Authentication and passwords managed externally by Supabase Auth (auth.users).
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    photo_url TEXT,
    bio TEXT,
    timezone VARCHAR(100) NOT NULL DEFAULT 'Europe/Lisbon',
    profile_visibility VARCHAR(20) NOT NULL DEFAULT 'private',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    streak_type VARCHAR(20) NOT NULL DEFAULT 'daily',
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    hit_streak BOOLEAN NOT NULL DEFAULT FALSE
);

-- Represents mutual social connections and pending friend requests between users.
CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMPTZ
);

-- ============================================================================
-- 2. Book Data
-- ============================================================================

-- Stores catalog information for books.
CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    isbn13 VARCHAR(13) UNIQUE,
    page_count INTEGER,
    cover_url TEXT,
    is_community_added BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Stores information about book authors.
CREATE TABLE authors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL
);

-- Junction table supporting many-to-many relationship between books and authors.
CREATE TABLE book_authors (
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
    PRIMARY KEY (book_id, author_id)
);

-- Granular sub-classification or genre tag for books.
CREATE TABLE genres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE
);

-- Junction table supporting many-to-many relationship between books and genres.
CREATE TABLE book_genres (
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    genre_id UUID NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (book_id, genre_id)
);

-- Broad parent category classification for books.
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE
);

-- ============================================================================
-- 3. Book Actions
-- ============================================================================

-- Tracks a user's current reading state and progress for a specific book.
CREATE TABLE reading_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    current_page INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Stores star ratings and optional written reviews left by users for books.
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. Groups
-- ============================================================================

-- Base entity for collaborative reading communities.
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Represents a shelf, folder, or curated list of books (User XOR Group constraint).
CREATE TABLE lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    visibility VARCHAR(20) NOT NULL DEFAULT 'private',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_list_owner CHECK (
        (user_id IS NOT NULL AND group_id IS NULL) OR
        (user_id IS NULL AND group_id IS NOT NULL)
    )
);

-- Junction table linking books included within a list or shelf.
CREATE TABLE list_books (
    list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (list_id, book_id)
);

-- Association table managing user membership and roles within a group.
CREATE TABLE member (
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, user_id)
);

-- Specific group subtype focused on structured communal reading of designated books.
CREATE TABLE book_clubs (
    group_id UUID PRIMARY KEY REFERENCES groups(id) ON DELETE CASCADE,
    current_book_id UUID REFERENCES books(id) ON DELETE SET NULL
);

-- Reading cycle or round within a book club targeting a specific book and deadline.
CREATE TABLE book_club_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_club_id UUID NOT NULL REFERENCES book_clubs(group_id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    start DATE NOT NULL,
    deadline DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Specific group subtype focused on competitive reading goals over a fixed period.
CREATE TABLE challenges (
    id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    win_metric VARCHAR(20) NOT NULL,
    metric_goal INTEGER NOT NULL,
    target_genre_id UUID REFERENCES genres(id) ON DELETE SET NULL,
    target_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    target_author_id UUID REFERENCES authors(id) ON DELETE SET NULL
);

-- Current status and progress of a user on a challenge.
CREATE TABLE challenge_status (
    id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0
);

-- Live reading session hosted in real time by a group moderator.
CREATE TABLE group_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'open'
);

-- Member attendance and participation within an active group reading session.
CREATE TABLE member_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_session_id UUID NOT NULL REFERENCES group_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMPTZ,
    pages_read INTEGER NOT NULL DEFAULT 0,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE
);

-- Maintains standings and scoring contexts for groups and challenges.
CREATE TABLE leaderboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metric VARCHAR(20) NOT NULL,
    target_genre_id UUID REFERENCES genres(id) ON DELETE SET NULL,
    target_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    target_author_id UUID REFERENCES authors(id) ON DELETE SET NULL
);

-- Member score and computed rank within a leaderboard.
CREATE TABLE leaderboard_entries (
    leaderboard_id UUID NOT NULL REFERENCES leaderboards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    rank INTEGER NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (leaderboard_id, user_id)
);

-- Chat room container associated 1:1 with a group.
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Chat message or comment (Conversation XOR BookClubRound constraint).
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    round_id UUID REFERENCES book_club_rounds(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_post_parent CHECK (
        (conversation_id IS NOT NULL AND round_id IS NULL) OR
        (conversation_id IS NULL AND round_id IS NOT NULL)
    )
);

-- ============================================================================
-- 5. User Statistics
-- ============================================================================

-- Logs an individual solo reading session completed by a user.
CREATE TABLE reading_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    counted_minutes INTEGER NOT NULL DEFAULT 0,
    pages_read INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Personal reading targets set by a user for a given year.
CREATE TABLE reading_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_date DATE NOT NULL,
    metric VARCHAR(20) NOT NULL,
    value INTEGER NOT NULL,
    target_genre_id UUID REFERENCES genres(id) ON DELETE SET NULL,
    target_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    target_author_id UUID REFERENCES authors(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 6. Notifications
-- ============================================================================

-- Generic in-app notification delivered to a user via polymorphic reference.
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
