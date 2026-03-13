-- =====================================================
-- VANGAPALAGALAM — Supabase Database Setup Script
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- =====================================================

-- 1. USERS TABLE
create table if not exists public.users (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text not null unique,
  email      text not null unique,
  avatar     text,
  bio        text default '',
  created_at timestamptz default now()
);

-- 2. POSTS TABLE
create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  caption    text default '',
  media_url  text,
  type       text check (type in ('image','video','text')) default 'image',
  created_at timestamptz default now()
);

-- 3. STORIES TABLE
create table if not exists public.stories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  media_url  text,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- 4. LIKES TABLE
create table if not exists public.likes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  post_id    uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, post_id)
);

-- 5. COMMENTS TABLE
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  text       text not null,
  created_at timestamptz default now()
);

-- 6. FOLLOWERS TABLE
create table if not exists public.followers (
  id           uuid primary key default gen_random_uuid(),
  follower_id  uuid not null references public.users(id) on delete cascade,
  following_id uuid not null references public.users(id) on delete cascade,
  created_at   timestamptz default now(),
  unique (follower_id, following_id)
);

-- 7. MESSAGES TABLE
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references public.users(id) on delete cascade,
  receiver_id uuid not null references public.users(id) on delete cascade,
  message     text not null,
  media_url   text,
  seen        boolean default false,
  created_at  timestamptz default now()
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

alter table public.users     enable row level security;
alter table public.posts     enable row level security;
alter table public.stories   enable row level security;
alter table public.likes     enable row level security;
alter table public.comments  enable row level security;
alter table public.followers enable row level security;
alter table public.messages  enable row level security;

-- USERS policies
create policy "Public users are viewable by everyone"
  on public.users for select using (true);

create policy "Users can insert their own profile"
  on public.users for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users for update using (auth.uid() = id);

-- POSTS policies
create policy "Posts are viewable by everyone"
  on public.posts for select using (true);

create policy "Authenticated users can create posts"
  on public.posts for insert with check (auth.uid() = user_id);

create policy "Users can delete their own posts"
  on public.posts for delete using (auth.uid() = user_id);

-- STORIES policies
create policy "Active stories are viewable by everyone"
  on public.stories for select using (expires_at > now());

create policy "Authenticated users can create stories"
  on public.stories for insert with check (auth.uid() = user_id);

create policy "Users can delete their own stories"
  on public.stories for delete using (auth.uid() = user_id);

-- LIKES policies
create policy "Likes are viewable by everyone"
  on public.likes for select using (true);

create policy "Authenticated users can like"
  on public.likes for insert with check (auth.uid() = user_id);

create policy "Users can unlike"
  on public.likes for delete using (auth.uid() = user_id);

-- COMMENTS policies
create policy "Comments are viewable by everyone"
  on public.comments for select using (true);

create policy "Authenticated users can comment"
  on public.comments for insert with check (auth.uid() = user_id);

create policy "Users can delete their own comments"
  on public.comments for delete using (auth.uid() = user_id);

-- FOLLOWERS policies
create policy "Followers are viewable by everyone"
  on public.followers for select using (true);

create policy "Authenticated users can follow"
  on public.followers for insert with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on public.followers for delete using (auth.uid() = follower_id);

-- MESSAGES policies
create policy "Users can view their own messages"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Authenticated users can send messages"
  on public.messages for insert with check (auth.uid() = sender_id);

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================

-- Run these one at a time in the SQL editor:
insert into storage.buckets (id, name, public) values ('media',   'media',   true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('stories', 'stories', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;

-- Storage policies
create policy "Anyone can read media"
  on storage.objects for select using (bucket_id in ('media','stories','avatars'));

create policy "Authenticated users can upload media"
  on storage.objects for insert with check (auth.role() = 'authenticated');

create policy "Users can delete their own media"
  on storage.objects for delete using (auth.role() = 'authenticated');

-- =====================================================
-- REALTIME — enable for live features
-- =====================================================

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.likes;
alter publication supabase_realtime add table public.followers;

-- =====================================================
-- SEED DEMO DATA (optional — remove in production)
-- =====================================================
-- After signing up via the app, you can insert demo posts like:
-- insert into public.posts (user_id, caption, media_url, type)
-- values ('<your-user-id>', 'Hello Vangapalagalam! 🌌', null, 'text');
