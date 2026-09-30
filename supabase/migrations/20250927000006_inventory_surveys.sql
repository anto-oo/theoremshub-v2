-- ============================================================================
-- Slice 6: Inventory & Surveys
-- Purpose: Creates inventory_items, inventory_categories, inventory_snapshots,
-- inventory_snapshot_items, surveys, survey_responses.
-- Implements snapshot model for inventory (immutable history).
-- Surveys support open/anonymous and logged-user types, no access codes.
-- All tables use RLS with has_role().
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. inventory_categories table
--    Admin can create/delete. Used to filter items.
-- ---------------------------------------------------------------------------
CREATE TABLE public.inventory_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_categories_name ON public.inventory_categories(name);

-- ---------------------------------------------------------------------------
-- 2. inventory_items table
--    Current state is derived from latest snapshot, not stored here.
--    This table only holds the item definitions (name, category).
-- ---------------------------------------------------------------------------
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id INT REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_inventory_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_inventory_items_updated_at();

CREATE INDEX idx_inventory_items_category_id ON public.inventory_items(category_id);
CREATE INDEX idx_inventory_items_name ON public.inventory_items(name);

-- ---------------------------------------------------------------------------
-- 3. inventory_snapshots table
--    Every update creates a new immutable snapshot row.
-- ---------------------------------------------------------------------------
CREATE TABLE public.inventory_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_snapshots_created_at ON public.inventory_snapshots(created_at);
CREATE INDEX idx_inventory_snapshots_created_by ON public.inventory_snapshots(created_by);

-- ---------------------------------------------------------------------------
-- 4. inventory_snapshot_items table
--    Items within a snapshot with their quantities at that point in time.
-- ---------------------------------------------------------------------------
CREATE TABLE public.inventory_snapshot_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES public.inventory_snapshots(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(snapshot_id, item_id)
);

CREATE INDEX idx_inventory_snapshot_items_snapshot_id ON public.inventory_snapshot_items(snapshot_id);
CREATE INDEX idx_inventory_snapshot_items_item_id ON public.inventory_snapshot_items(item_id);

-- ---------------------------------------------------------------------------
-- 5. surveys table
--    Questions stored as JSONB. Status: draft / open / closed.
--    survey_type: 'open' (anonymous, public link) or 'logged_in' (dashboard).
-- ---------------------------------------------------------------------------
CREATE TYPE survey_status AS ENUM ('draft', 'open', 'closed');
CREATE TYPE survey_type AS ENUM ('open', 'logged_in');

CREATE TABLE public.surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status survey_status NOT NULL DEFAULT 'draft',
  survey_type survey_type NOT NULL DEFAULT 'logged_in',
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_surveys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER surveys_updated_at
  BEFORE UPDATE ON public.surveys
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_surveys_updated_at();

CREATE INDEX idx_surveys_status ON public.surveys(status);
CREATE INDEX idx_surveys_survey_type ON public.surveys(survey_type);
CREATE INDEX idx_surveys_created_by ON public.surveys(created_by);

-- ---------------------------------------------------------------------------
-- 6. survey_responses table
--    One row per respondent per survey. Answers stored as JSONB.
-- ---------------------------------------------------------------------------
CREATE TABLE public.survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  respondent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_survey_responses_survey_id ON public.survey_responses(survey_id);
CREATE INDEX idx_survey_responses_respondent_id ON public.survey_responses(respondent_id);

-- ---------------------------------------------------------------------------
-- 7. RLS Policies
-- ---------------------------------------------------------------------------

-- --- inventory_categories ---
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories"
  ON public.inventory_categories
  FOR SELECT
  USING (TRUE);

CREATE POLICY "Admin can insert categories"
  ON public.inventory_categories
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete categories"
  ON public.inventory_categories
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- --- inventory_items ---
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view items"
  ON public.inventory_items
  FOR SELECT
  USING (TRUE);

CREATE POLICY "Admin can insert items"
  ON public.inventory_items
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update items"
  ON public.inventory_items
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete items"
  ON public.inventory_items
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- --- inventory_snapshots ---
ALTER TABLE public.inventory_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view snapshots"
  ON public.inventory_snapshots
  FOR SELECT
  USING (TRUE);

CREATE POLICY "Admin can insert snapshots"
  ON public.inventory_snapshots
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- --- inventory_snapshot_items ---
ALTER TABLE public.inventory_snapshot_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view snapshot items"
  ON public.inventory_snapshot_items
  FOR SELECT
  USING (TRUE);

CREATE POLICY "Admin can insert snapshot items"
  ON public.inventory_snapshot_items
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- --- surveys ---
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view open surveys"
  ON public.surveys
  FOR SELECT
  USING (status = 'open');

CREATE POLICY "Admin can view all surveys"
  ON public.surveys
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can insert surveys"
  ON public.surveys
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update surveys"
  ON public.surveys
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete surveys"
  ON public.surveys
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- --- survey_responses ---
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert responses to open surveys"
  ON public.survey_responses
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.surveys WHERE surveys.id = survey_responses.survey_id AND surveys.status = 'open')
  );

CREATE POLICY "Admin can view all responses"
  ON public.survey_responses
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete responses"
  ON public.survey_responses
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 8. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_inventory_items_created_at ON public.inventory_items(created_at);
CREATE INDEX idx_surveys_created_at ON public.surveys(created_at);
CREATE INDEX idx_survey_responses_created_at ON public.survey_responses(created_at);
