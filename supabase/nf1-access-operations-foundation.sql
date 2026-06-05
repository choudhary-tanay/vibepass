-- ══════════════════════════════════════════════════════════════
-- NF-1: Access + Operations Foundation
-- Run in Supabase SQL Editor after nf0e-exchange-rates.sql.
--
-- Adds the database-backed permission model used by VibePass
-- Interface and Owner Studio. This migration is additive and
-- keeps the existing profiles/staff/staff_invites flow working.
-- ══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- Permission definitions
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS permission_definitions (
  key           TEXT PRIMARY KEY,
  label         TEXT NOT NULL,
  description   TEXT,
  scope         TEXT NOT NULL CHECK (scope IN ('platform', 'business', 'shared')),
  group_name    TEXT NOT NULL,
  is_sensitive  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE permission_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_permission_definitions" ON permission_definitions;
CREATE POLICY "public_read_permission_definitions"
  ON permission_definitions FOR SELECT
  USING (true);

-- ──────────────────────────────────────────────────────────────
-- Platform role model
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key    TEXT NOT NULL UNIQUE,
  role_name   TEXT NOT NULL,
  description TEXT,
  is_system   BOOLEAN NOT NULL DEFAULT TRUE,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_role_permissions (
  role_id        UUID NOT NULL REFERENCES platform_roles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES permission_definitions(key) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_key)
);

CREATE TABLE IF NOT EXISTS platform_users (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform_role_id   UUID NOT NULL REFERENCES platform_roles(id),
  status             TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  assigned_by        UUID REFERENCES profiles(id),
  assigned_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

ALTER TABLE platform_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_read_platform_roles" ON platform_roles;
CREATE POLICY "admins_read_platform_roles"
  ON platform_roles FOR SELECT
  USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "admins_read_platform_role_permissions" ON platform_role_permissions;
CREATE POLICY "admins_read_platform_role_permissions"
  ON platform_role_permissions FOR SELECT
  USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "admins_read_platform_users" ON platform_users;
CREATE POLICY "admins_read_platform_users"
  ON platform_users FOR SELECT
  USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "service_role_platform_roles" ON platform_roles;
CREATE POLICY "service_role_platform_roles"
  ON platform_roles FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_platform_role_permissions" ON platform_role_permissions;
CREATE POLICY "service_role_platform_role_permissions"
  ON platform_role_permissions FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_platform_users" ON platform_users;
CREATE POLICY "service_role_platform_users"
  ON platform_users FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- Owner Studio role model
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS business_roles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID REFERENCES businesses(id) ON DELETE CASCADE,
  role_key     TEXT NOT NULL,
  role_name    TEXT NOT NULL,
  description  TEXT,
  is_system    BOOLEAN NOT NULL DEFAULT FALSE,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, role_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS business_roles_global_role_key_idx
  ON business_roles (role_key)
  WHERE business_id IS NULL;

CREATE TABLE IF NOT EXISTS business_role_permissions (
  role_id        UUID NOT NULL REFERENCES business_roles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES permission_definitions(key) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_key)
);

CREATE TABLE IF NOT EXISTS business_users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES profiles(id) ON DELETE SET NULL,
  staff_id          UUID REFERENCES staff(id) ON DELETE SET NULL,
  email             TEXT NOT NULL,
  full_name         TEXT,
  phone             TEXT,
  business_role_id  UUID REFERENCES business_roles(id),
  access_level      TEXT NOT NULL DEFAULT 'member'
                    CHECK (access_level IN ('owner', 'admin', 'member', 'limited')),
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive', 'invited')),
  invited_by        UUID REFERENCES profiles(id),
  invited_at        TIMESTAMPTZ,
  accepted_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, email)
);

CREATE TABLE IF NOT EXISTS business_user_invites (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  email             TEXT NOT NULL,
  full_name         TEXT,
  phone             TEXT,
  business_role_id  UUID REFERENCES business_roles(id),
  access_level      TEXT NOT NULL DEFAULT 'member'
                    CHECK (access_level IN ('owner', 'admin', 'member', 'limited')),
  invite_note       TEXT,
  token             UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  invited_by        UUID REFERENCES profiles(id),
  accepted_at       TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS business_users_business_idx ON business_users (business_id);
CREATE INDEX IF NOT EXISTS business_users_user_idx ON business_users (user_id);
CREATE INDEX IF NOT EXISTS business_users_email_idx ON business_users (lower(email));
CREATE INDEX IF NOT EXISTS business_user_invites_token_idx ON business_user_invites (token);
CREATE INDEX IF NOT EXISTS business_user_invites_business_idx ON business_user_invites (business_id);

ALTER TABLE business_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_user_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners_read_business_roles" ON business_roles;
CREATE POLICY "owners_read_business_roles"
  ON business_roles FOR SELECT
  USING (
    business_id IS NULL OR
    public.is_current_user_admin() OR
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = business_roles.business_id
        AND b.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM business_users bu
      WHERE bu.business_id = business_roles.business_id
        AND bu.user_id = auth.uid()
        AND bu.status = 'active'
    )
  );

DROP POLICY IF EXISTS "owners_manage_business_roles" ON business_roles;
CREATE POLICY "owners_manage_business_roles"
  ON business_roles FOR ALL
  USING (
    public.is_current_user_admin() OR
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = business_roles.business_id
        AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_current_user_admin() OR
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = business_roles.business_id
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners_read_business_role_permissions" ON business_role_permissions;
CREATE POLICY "owners_read_business_role_permissions"
  ON business_role_permissions FOR SELECT
  USING (
    public.is_current_user_admin() OR
    EXISTS (
      SELECT 1 FROM business_roles br
      LEFT JOIN businesses b ON b.id = br.business_id
      WHERE br.id = business_role_permissions.role_id
        AND (br.business_id IS NULL OR b.owner_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM business_roles br
      JOIN business_users bu ON bu.business_id = br.business_id
      WHERE br.id = business_role_permissions.role_id
        AND bu.user_id = auth.uid()
        AND bu.status = 'active'
    )
  );

DROP POLICY IF EXISTS "owners_manage_business_role_permissions" ON business_role_permissions;
CREATE POLICY "owners_manage_business_role_permissions"
  ON business_role_permissions FOR ALL
  USING (
    public.is_current_user_admin() OR
    EXISTS (
      SELECT 1 FROM business_roles br
      JOIN businesses b ON b.id = br.business_id
      WHERE br.id = business_role_permissions.role_id
        AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_current_user_admin() OR
    EXISTS (
      SELECT 1 FROM business_roles br
      JOIN businesses b ON b.id = br.business_id
      WHERE br.id = business_role_permissions.role_id
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners_read_business_users" ON business_users;
CREATE POLICY "owners_read_business_users"
  ON business_users FOR SELECT
  USING (
    public.is_current_user_admin() OR
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = business_users.business_id
        AND b.owner_id = auth.uid()
    ) OR
    business_users.user_id = auth.uid()
  );

DROP POLICY IF EXISTS "owners_manage_business_users" ON business_users;
CREATE POLICY "owners_manage_business_users"
  ON business_users FOR ALL
  USING (
    public.is_current_user_admin() OR
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = business_users.business_id
        AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_current_user_admin() OR
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = business_users.business_id
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners_manage_business_user_invites" ON business_user_invites;
CREATE POLICY "owners_manage_business_user_invites"
  ON business_user_invites FOR ALL
  USING (
    public.is_current_user_admin() OR
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = business_user_invites.business_id
        AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_current_user_admin() OR
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = business_user_invites.business_id
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "service_role_business_roles" ON business_roles;
CREATE POLICY "service_role_business_roles"
  ON business_roles FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_business_role_permissions" ON business_role_permissions;
CREATE POLICY "service_role_business_role_permissions"
  ON business_role_permissions FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_business_users" ON business_users;
CREATE POLICY "service_role_business_users"
  ON business_users FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_business_user_invites" ON business_user_invites;
CREATE POLICY "service_role_business_user_invites"
  ON business_user_invites FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- Updated-at trigger helper
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_platform_roles_updated_at ON platform_roles;
CREATE TRIGGER set_platform_roles_updated_at
  BEFORE UPDATE ON platform_roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_platform_users_updated_at ON platform_users;
CREATE TRIGGER set_platform_users_updated_at
  BEFORE UPDATE ON platform_users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_business_roles_updated_at ON business_roles;
CREATE TRIGGER set_business_roles_updated_at
  BEFORE UPDATE ON business_roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_business_users_updated_at ON business_users;
CREATE TRIGGER set_business_users_updated_at
  BEFORE UPDATE ON business_users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ──────────────────────────────────────────────────────────────
-- Seed permissions
-- ──────────────────────────────────────────────────────────────
INSERT INTO permission_definitions (key, label, description, scope, group_name, is_sensitive)
VALUES
  ('platform.settings.view', 'View platform settings', 'Read global platform configuration.', 'platform', 'Platform Settings', true),
  ('platform.settings.edit', 'Edit platform settings', 'Update global platform configuration.', 'platform', 'Platform Settings', true),
  ('platform.users.view', 'View platform users', 'See VibePass Interface users.', 'platform', 'User Management', true),
  ('platform.users.manage', 'Manage platform users', 'Assign platform roles and deactivate platform users.', 'platform', 'User Management', true),
  ('platform.roles.manage', 'Manage platform roles', 'Manage platform role permissions.', 'platform', 'Role Management', true),
  ('approval.manage', 'Manage approvals', 'Approve or reject business and content queues.', 'shared', 'Approval Management', false),
  ('reports.manage', 'Manage reports', 'Review and resolve reported content.', 'shared', 'Reports / Requests', false),
  ('featured.manage', 'Manage featured placement', 'Review and update featured marketplace placement.', 'shared', 'Featured Placement', false),
  ('audit_logs.view', 'View audit logs', 'Read audit trails.', 'shared', 'Audit Logs', true),
  ('health.view', 'View health dashboard', 'View platform integration health.', 'platform', 'Platform Settings', false),
  ('financials.view', 'View financial reports', 'Read revenue, profitability, and payout dashboards.', 'shared', 'Financial Reports', true),
  ('currency_rates.manage', 'Manage currency rates', 'Create and update exchange rates.', 'platform', 'Currency Rates', true),
  ('business.settings.view', 'View business settings', 'Read business profile and setup.', 'business', 'Business Settings', false),
  ('business.settings.edit', 'Edit business settings', 'Update business profile and setup.', 'business', 'Business Settings', true),
  ('users.view', 'View business users', 'See Owner Studio users and invites.', 'business', 'User Management', true),
  ('users.invite', 'Invite business users', 'Invite users into Owner Studio.', 'business', 'User Management', true),
  ('users.edit', 'Edit business users', 'Update roles, status, and access levels.', 'business', 'User Management', true),
  ('roles.manage', 'Manage business roles', 'Create custom roles and assign permissions.', 'business', 'Role Management', true),
  ('classes.view', 'View classes', 'Read classes for the business.', 'business', 'Class Management', false),
  ('classes.create', 'Create classes', 'Create classes or proposals.', 'business', 'Class Management', false),
  ('classes.edit', 'Edit classes', 'Update class details.', 'business', 'Class Management', false),
  ('classes.publish', 'Publish classes', 'Publish classes to the marketplace.', 'business', 'Class Publishing', true),
  ('bookings.view', 'View bookings', 'Read business bookings.', 'business', 'Booking Management', false),
  ('bookings.manage', 'Manage bookings', 'Update booking status and operations.', 'business', 'Booking Management', false),
  ('customers.view', 'View customers', 'See customer lists and booking context.', 'business', 'Customer Management', false),
  ('schedule.view', 'View schedule', 'See class schedule and calendar.', 'business', 'Schedule Management', false),
  ('staff.coordinate', 'Coordinate staff', 'Assign staff and manage staffing operations.', 'business', 'Staff Coordination', false),
  ('staff.earnings.view', 'View staff earnings', 'See staff earnings and payables.', 'business', 'Staff Earnings View', true),
  ('payouts.mark_paid', 'Mark staff payouts paid', 'Record staff payout payments.', 'business', 'Staff Payout Marking', true),
  ('profitability.view', 'View profitability', 'See expense and profitability reporting.', 'business', 'Profitability Reports', true),
  ('sponsors.manage', 'Manage sponsors', 'Create and update sponsor records.', 'business', 'Sponsor Management', false),
  ('sponsors.financials.view', 'View sponsor financials', 'See sponsor amounts and payment status.', 'business', 'Sponsor Financials', true),
  ('venues.view', 'View venues', 'Read venue directory and venue assignments.', 'business', 'Venue Management', false),
  ('venues.manage', 'Manage venues', 'Create and update venues.', 'business', 'Venue Management', false),
  ('venues.global.manage', 'Manage global venues', 'Create and manage platform/global venues.', 'platform', 'Global Venue Usage', true),
  ('branding.manage', 'Manage branding', 'Update business logo and white-label brand settings.', 'business', 'White-label Branding', true),
  ('notifications.view', 'View notifications', 'Read portal notifications.', 'shared', 'Notifications', false),
  ('notifications.manage', 'Manage notifications', 'Create and mark portal notifications.', 'shared', 'Notifications', false)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  scope = EXCLUDED.scope,
  group_name = EXCLUDED.group_name,
  is_sensitive = EXCLUDED.is_sensitive;

-- ──────────────────────────────────────────────────────────────
-- Seed platform preset roles
-- ──────────────────────────────────────────────────────────────
INSERT INTO platform_roles (role_key, role_name, description, is_system)
VALUES
  ('vibepass_super_admin', 'VibePass Super Admin', 'Full platform access.', true),
  ('vibepass_support', 'VibePass Support', 'Limited support and moderation access.', true),
  ('vibepass_finance_ops', 'VibePass Finance/Ops', 'Revenue, payment issue, and financial operations access.', true),
  ('vibepass_moderator', 'VibePass Moderator', 'Reports, content, and featured placement moderation access.', true)
ON CONFLICT (role_key) DO UPDATE SET
  role_name = EXCLUDED.role_name,
  description = EXCLUDED.description,
  is_system = true,
  status = 'active';

INSERT INTO platform_role_permissions (role_id, permission_key)
SELECT pr.id, pd.key
FROM platform_roles pr
CROSS JOIN permission_definitions pd
WHERE pr.role_key = 'vibepass_super_admin'
  AND pd.scope IN ('platform', 'business', 'shared')
ON CONFLICT DO NOTHING;

INSERT INTO platform_role_permissions (role_id, permission_key)
SELECT pr.id, permission_key
FROM platform_roles pr
CROSS JOIN (
  VALUES
    ('approval.manage'),
    ('reports.manage'),
    ('featured.manage'),
    ('health.view'),
    ('notifications.view'),
    ('notifications.manage'),
    ('users.view')
) AS allowed(permission_key)
WHERE pr.role_key = 'vibepass_support'
ON CONFLICT DO NOTHING;

INSERT INTO platform_role_permissions (role_id, permission_key)
SELECT pr.id, permission_key
FROM platform_roles pr
CROSS JOIN (
  VALUES
    ('financials.view'),
    ('currency_rates.manage'),
    ('platform.settings.view'),
    ('notifications.view')
) AS allowed(permission_key)
WHERE pr.role_key = 'vibepass_finance_ops'
ON CONFLICT DO NOTHING;

INSERT INTO platform_role_permissions (role_id, permission_key)
SELECT pr.id, permission_key
FROM platform_roles pr
CROSS JOIN (
  VALUES
    ('reports.manage'),
    ('featured.manage'),
    ('classes.view'),
    ('notifications.view')
) AS allowed(permission_key)
WHERE pr.role_key = 'vibepass_moderator'
ON CONFLICT DO NOTHING;

-- Existing profile.role='admin' users become Super Admin by default.
INSERT INTO platform_users (user_id, platform_role_id, status)
SELECT p.id, pr.id, 'active'
FROM profiles p
CROSS JOIN platform_roles pr
WHERE p.role = 'admin'
  AND pr.role_key = 'vibepass_super_admin'
ON CONFLICT (user_id) DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- Seed global Owner Studio presets
-- ──────────────────────────────────────────────────────────────
INSERT INTO business_roles (business_id, role_key, role_name, description, is_system, status)
VALUES
  (NULL, 'owner_studio_admin', 'Owner Studio Admin', 'Full business-side access.', true, 'active'),
  (NULL, 'management', 'Management', 'Operational class, booking, schedule, staff, venue, and limited analytics access.', true, 'active'),
  (NULL, 'instructor', 'Instructor', 'Assigned-class, profile, earnings, venue visibility, and request access.', true, 'active')
ON CONFLICT (role_key) WHERE business_id IS NULL DO UPDATE SET
  role_name = EXCLUDED.role_name,
  description = EXCLUDED.description,
  is_system = true,
  status = 'active';

INSERT INTO business_role_permissions (role_id, permission_key)
SELECT br.id, pd.key
FROM business_roles br
CROSS JOIN permission_definitions pd
WHERE br.business_id IS NULL
  AND br.role_key = 'owner_studio_admin'
  AND pd.scope IN ('business', 'shared')
ON CONFLICT DO NOTHING;

INSERT INTO business_role_permissions (role_id, permission_key)
SELECT br.id, permission_key
FROM business_roles br
CROSS JOIN (
  VALUES
    ('classes.view'),
    ('classes.create'),
    ('classes.edit'),
    ('bookings.view'),
    ('bookings.manage'),
    ('customers.view'),
    ('schedule.view'),
    ('staff.coordinate'),
    ('venues.view'),
    ('venues.manage'),
    ('sponsors.manage'),
    ('notifications.view'),
    ('notifications.manage')
) AS allowed(permission_key)
WHERE br.business_id IS NULL
  AND br.role_key = 'management'
ON CONFLICT DO NOTHING;

INSERT INTO business_role_permissions (role_id, permission_key)
SELECT br.id, permission_key
FROM business_roles br
CROSS JOIN (
  VALUES
    ('classes.view'),
    ('classes.create'),
    ('schedule.view'),
    ('staff.earnings.view'),
    ('venues.view'),
    ('notifications.view')
) AS allowed(permission_key)
WHERE br.business_id IS NULL
  AND br.role_key = 'instructor'
ON CONFLICT DO NOTHING;

-- Existing business owners become Owner Studio Admin users.
INSERT INTO business_users (
  business_id,
  user_id,
  email,
  full_name,
  phone,
  business_role_id,
  access_level,
  status,
  accepted_at
)
SELECT
  b.id,
  p.id,
  COALESCE(NULLIF(p.email, ''), b.email),
  NULLIF(p.name, ''),
  p.phone,
  br.id,
  'owner',
  'active',
  NOW()
FROM businesses b
JOIN profiles p ON p.id = b.owner_id
CROSS JOIN business_roles br
WHERE br.business_id IS NULL
  AND br.role_key = 'owner_studio_admin'
ON CONFLICT (business_id, email) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  full_name = COALESCE(EXCLUDED.full_name, business_users.full_name),
  phone = COALESCE(EXCLUDED.phone, business_users.phone),
  business_role_id = EXCLUDED.business_role_id,
  access_level = 'owner',
  status = 'active',
  accepted_at = COALESCE(business_users.accepted_at, NOW());

-- Existing linked staff become business users with Management/Instructor presets.
-- Staff rows can contain duplicate emails for the same business after old
-- invite/linkage repairs, so dedupe before ON CONFLICT to avoid SQLSTATE 21000.
WITH deduped_staff AS (
  SELECT DISTINCT ON (s.business_id, lower(s.email))
    s.id,
    s.business_id,
    s.user_id,
    lower(s.email) AS email,
    s.name,
    s.phone,
    s.user_group,
    s.status
  FROM staff s
  WHERE s.email IS NOT NULL
    AND s.email <> ''
  ORDER BY
    s.business_id,
    lower(s.email),
    (s.user_id IS NOT NULL) DESC,
    (s.user_group = 'management') DESC,
    (s.status = 'active') DESC,
    s.id
)
INSERT INTO business_users (
  business_id,
  user_id,
  staff_id,
  email,
  full_name,
  phone,
  business_role_id,
  access_level,
  status,
  accepted_at
)
SELECT
  s.business_id,
  s.user_id,
  s.id,
  s.email,
  s.name,
  s.phone,
  br.id,
  CASE WHEN s.user_group = 'management' THEN 'admin' ELSE 'member' END,
  COALESCE(NULLIF(s.status, ''), 'active'),
  CASE WHEN s.user_id IS NOT NULL THEN NOW() ELSE NULL END
FROM deduped_staff s
JOIN business_roles br
  ON br.business_id IS NULL
 AND br.role_key = CASE WHEN s.user_group = 'management' THEN 'management' ELSE 'instructor' END
ON CONFLICT (business_id, email) DO UPDATE SET
  user_id = COALESCE(EXCLUDED.user_id, business_users.user_id),
  staff_id = COALESCE(EXCLUDED.staff_id, business_users.staff_id),
  full_name = COALESCE(EXCLUDED.full_name, business_users.full_name),
  phone = COALESCE(EXCLUDED.phone, business_users.phone),
  business_role_id = EXCLUDED.business_role_id,
  access_level = EXCLUDED.access_level,
  status = EXCLUDED.status;

-- ──────────────────────────────────────────────────────────────
-- Permission helper functions for APIs/RLS
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.has_platform_permission(p_permission_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    LEFT JOIN platform_users pu
      ON pu.user_id = p.id
     AND pu.status = 'active'
    LEFT JOIN platform_role_permissions prp
      ON prp.role_id = pu.platform_role_id
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND (
        p_permission_key = 'admin.basic'
        OR prp.permission_key = p_permission_key
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.has_business_permission(
  p_business_id UUID,
  p_permission_key TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM businesses b
    WHERE b.id = p_business_id
      AND b.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM business_users bu
    JOIN business_role_permissions brp
      ON brp.role_id = bu.business_role_id
    WHERE bu.business_id = p_business_id
      AND bu.user_id = auth.uid()
      AND bu.status = 'active'
      AND brp.permission_key = p_permission_key
  )
  OR EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  );
$$;

GRANT SELECT ON permission_definitions TO anon, authenticated;
GRANT SELECT ON platform_roles, platform_role_permissions, platform_users TO authenticated;
GRANT SELECT ON business_roles, business_role_permissions, business_users, business_user_invites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON platform_roles, platform_role_permissions, platform_users TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON business_roles, business_role_permissions, business_users, business_user_invites TO service_role;
GRANT EXECUTE ON FUNCTION public.has_platform_permission(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_business_permission(UUID, TEXT) TO authenticated;

SELECT 'NF-1 access and operations foundation complete.' AS result;
