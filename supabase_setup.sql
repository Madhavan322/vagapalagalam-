-- =====================================================
-- VANGAPALAGALAM — COMPLETE FINAL SETUP
-- =====================================================

-- STEP 1: TABLES
create table if not exists public.users (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text not null unique,
  email      text not null unique,
  avatar     text,
  bio        text default '',
  created_at timestamptz default now()
);

create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  caption    text default '',
  media_url  text,
  type       text check (type in ('image','video','text')) default 'image',
  created_at timestamptz default now()
);

create table if not exists public.stories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  media_url  text,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create table if not exists public.likes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  post_id    uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, post_id)
);

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  text       text not null,
  created_at timestamptz default now()
);

create table if not exists public.followers (
  id           uuid primary key default gen_random_uuid(),
  follower_id  uuid not null references public.users(id) on delete cascade,
  following_id uuid not null references public.users(id) on delete cascade,
  created_at   timestamptz default now(),
  unique (follower_id, following_id)
);

create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references public.users(id) on delete cascade,
  receiver_id uuid not null references public.users(id) on delete cascade,
  message     text not null,
  media_url   text,
  seen        boolean default false,
  created_at  timestamptz default now()
);

-- STEP 2: RLS
alter table public.users     enable row level security;
alter table public.posts     enable row level security;
alter table public.stories   enable row level security;
alter table public.likes     enable row level security;
alter table public.comments  enable row level security;
alter table public.followers enable row level security;
alter table public.messages  enable row level security;

-- STEP 3: DROP EXISTING POLICIES
drop policy if exists "Public users are viewable by everyone" on public.users;
drop policy if exists "Users can insert their own profile"    on public.users;
drop policy if exists "Users can update their own profile"    on public.users;
drop policy if exists "Posts are viewable by everyone"        on public.posts;
drop policy if exists "Authenticated users can create posts"  on public.posts;
drop policy if exists "Users can delete their own posts"      on public.posts;
drop policy if exists "Active stories are viewable by everyone" on public.stories;
drop policy if exists "Authenticated users can create stories"  on public.stories;
drop policy if exists "Users can delete their own stories"      on public.stories;
drop policy if exists "Likes are viewable by everyone"        on public.likes;
drop policy if exists "Authenticated users can like"          on public.likes;
drop policy if exists "Users can unlike"                      on public.likes;
drop policy if exists "Comments are viewable by everyone"     on public.comments;
drop policy if exists "Authenticated users can comment"       on public.comments;
drop policy if exists "Users can delete their own comments"   on public.comments;
drop policy if exists "Followers are viewable by everyone"    on public.followers;
drop policy if exists "Authenticated users can follow"        on public.followers;
drop policy if exists "Users can unfollow"                    on public.followers;
drop policy if exists "Users can view their own messages"     on public.messages;
drop policy if exists "Authenticated users can send messages" on public.messages;
drop policy if exists "Anyone can read media"                 on storage.objects;
drop policy if exists "Authenticated users can upload media"  on storage.objects;
drop policy if exists "Users can delete their own media"      on storage.objects;

-- STEP 4: CREATE POLICIES
create policy "Public users are viewable by everyone"
  on public.users for select using (true);
create policy "Users can insert their own profile"
  on public.users for insert with check (true);
create policy "Users can update their own profile"
  on public.users for update using (auth.uid() = id);

create policy "Posts are viewable by everyone"
  on public.posts for select using (true);
create policy "Authenticated users can create posts"
  on public.posts for insert with check (auth.uid() = user_id);
create policy "Users can delete their own posts"
  on public.posts for delete using (auth.uid() = user_id);

create policy "Active stories are viewable by everyone"
  on public.stories for select using (expires_at > now());
create policy "Authenticated users can create stories"
  on public.stories for insert with check (auth.uid() = user_id);
create policy "Users can delete their own stories"
  on public.stories for delete using (auth.uid() = user_id);

create policy "Likes are viewable by everyone"
  on public.likes for select using (true);
create policy "Authenticated users can like"
  on public.likes for insert with check (auth.uid() = user_id);
create policy "Users can unlike"
  on public.likes for delete using (auth.uid() = user_id);

create policy "Comments are viewable by everyone"
  on public.comments for select using (true);
create policy "Authenticated users can comment"
  on public.comments for insert with check (auth.uid() = user_id);
create policy "Users can delete their own comments"
  on public.comments for delete using (auth.uid() = user_id);

create policy "Followers are viewable by everyone"
  on public.followers for select using (true);
create policy "Authenticated users can follow"
  on public.followers for insert with check (auth.uid() = follower_id);
create policy "Users can unfollow"
  on public.followers for delete using (auth.uid() = follower_id);

create policy "Users can view their own messages"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "Authenticated users can send messages"
  on public.messages for insert with check (auth.uid() = sender_id);

-- STEP 5: STORAGE BUCKETS
insert into storage.buckets (id, name, public) values ('media',   'media',   true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('stories', 'stories', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;

create policy "Anyone can read media"
  on storage.objects for select
  using (bucket_id in ('media', 'stories', 'avatars'));
create policy "Authenticated users can upload media"
  on storage.objects for insert
  with check (auth.role() = 'authenticated');
create policy "Users can delete their own media"
  on storage.objects for delete
  using (auth.role() = 'authenticated');

-- STEP 6: REALTIME (safe)
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'posts') then
    alter publication supabase_realtime add table public.posts;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'likes') then
    alter publication supabase_realtime add table public.likes;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'followers') then
    alter publication supabase_realtime add table public.followers;
  end if;
end $$;

-- STEP 7: AUTO-CREATE PROFILE ON SIGNUP (trigger fix)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, username, avatar, bio, created_at)
  values (
    new.id,
    new.email,
    split_part(new.email, '@', 1),
    'https://api.dicebear.com/8.x/identicon/svg?seed=' || split_part(new.email, '@', 1) || '&backgroundColor=040408',
    '',
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================================================
-- 🛠️ NUCLEAR REPAIR: DATA VISIBILITY & RECURSION WIPE
-- =====================================================
-- Run this block if you see "infinite recursion detected in policy" or 500 errors.
-- These blocks dynamically find and delete ALL policies on the core tables.

-- 1. DYNAMICALLY DROP ALL POLICIES ON USERS
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
    END LOOP;
END $$;

-- 2. DYNAMICALLY DROP ALL POLICIES ON MESSAGES (and restore keys)
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'messages' AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.messages', pol.policyname);
    END LOOP;
END $$;

-- 3. RE-ENABLE FRESH, NON-RECURSIVE POLICIES
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "safe_read_users" ON public.users FOR SELECT USING (true);
CREATE POLICY "safe_insert_users" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "safe_update_users" ON public.users FOR UPDATE USING (auth.uid() = id);

-- 4. FIX MESSAGES RELATIONSHIPS & POLICIES
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "safe_read_messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "safe_insert_messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "safe_delete_messages" ON public.messages FOR DELETE USING (auth.uid() = sender_id);

-- =====================================================
-- ⚡ REALTIME ACTIVATION (MANDATORY)
-- =====================================================
-- Run this in your Supabase SQL Editor to enable instant chat sync.
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
END $$;

-- Optimize for real-time deletions (Unsend)
ALTER TABLE public.messages REPLICA IDENTITY FULL;