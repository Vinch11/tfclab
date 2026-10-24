import assert from "node:assert/strict";
import { PGlite } from "npm:@electric-sql/pglite@0.5.11";
// In-memory PostgreSQL only. The test cannot read environment credentials or open sockets.
Deno.test({
  name:
    "additive link migration: PostgreSQL constraints, RLS, privilege and owner isolation",
  permissions: { net: false, env: false, read: true },
  async fn() {
    const db = new PGlite();
    try {
      await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE TABLE auth.users (id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      CREATE TABLE public.athletes (id uuid PRIMARY KEY, coach_id uuid NOT NULL REFERENCES auth.users);
      GRANT USAGE ON SCHEMA auth, public TO authenticated, service_role, anon;
      GRANT SELECT ON public.athletes TO authenticated, service_role;
      INSERT INTO auth.users VALUES ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');
      INSERT INTO public.athletes VALUES
        ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','11111111-1111-4111-8111-111111111111'),
        ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','11111111-1111-4111-8111-111111111111'),
        ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1','22222222-2222-4222-8222-222222222222');
    `);
      const migration = await Deno.readTextFile(
        new URL(
          "../../migrations/20261024210000_nolio_v2_athlete_links.sql",
          import.meta.url,
        ),
      );
      await db.exec(migration);
      const insert = (
        athlete: string,
        remote: string,
        coach = "11111111-1111-4111-8111-111111111111",
      ) =>
        db.query(
          "INSERT INTO public.nolio_v2_athlete_links(coach_id,athlete_id,connection_key,nolio_user_id) VALUES($1,$2,'mock',$3) RETURNING nolio_user_id",
          [coach, athlete, remote],
        );
      await db.exec("SET ROLE service_role");
      const result = await insert(
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
        "usr_Opaque-A_7",
      );
      assert.equal(
        (result.rows[0] as { nolio_user_id: string }).nolio_user_id,
        "usr_Opaque-A_7",
      );
      await assert.rejects(
        () => insert("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2", "usr_Opaque-A_7"),
        /unique constraint/,
      );
      await assert.rejects(
        () => insert("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1", "usr_Other"),
        /unique constraint/,
      );
      await assert.rejects(
        () => insert("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2", "1234"),
        /check constraint/,
      );
      await assert.rejects(
        () => insert("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1", "usr_Foreign"),
        /athlete_not_owned/,
      );
      await insert(
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
        "usr_OpaqueB",
        "22222222-2222-4222-8222-222222222222",
      );
      await db.exec(
        "RESET ROLE; SET ROLE authenticated; SET request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111'",
      );
      assert.equal(
        (await db.query("SELECT * FROM public.nolio_v2_athlete_links")).rows
          .length,
        1,
      );
      await assert.rejects(
        () => insert("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2", "usr_New"),
        /permission denied/,
      );
      await assert.rejects(() =>
        db.exec(
          "UPDATE public.nolio_v2_athlete_links SET nolio_user_id='usr_Stolen'",
        ), /permission denied/);
      await assert.rejects(
        () => db.exec("DELETE FROM public.nolio_v2_athlete_links"),
        /permission denied/,
      );
      await db.exec(
        "SET request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222'",
      );
      const b = await db.query<{ nolio_user_id: string }>(
        "SELECT nolio_user_id FROM public.nolio_v2_athlete_links",
      );
      assert.deepEqual(
        b.rows.map((x) => x.nolio_user_id),
        ["usr_OpaqueB"],
      );
      await db.exec("RESET ROLE; SET ROLE anon");
      await assert.rejects(
        () => db.exec("SELECT * FROM public.nolio_v2_athlete_links"),
        /permission denied/,
      );
      await db.exec(
        "RESET ROLE; UPDATE public.athletes SET coach_id='22222222-2222-4222-8222-222222222222' WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'; SET ROLE authenticated; SET request.jwt.claim.sub='11111111-1111-4111-8111-111111111111'",
      );
      assert.equal(
        (await db.query("SELECT * FROM public.nolio_v2_athlete_links")).rows
          .length,
        0,
      );
      // A transferred local athlete doesn't confer ownership of the old link on the new coach.
      await db.exec(
        "SET request.jwt.claim.sub='22222222-2222-4222-8222-222222222222'",
      );
      assert.equal(
        (await db.query("SELECT * FROM public.nolio_v2_athlete_links")).rows
          .length,
        1,
      );
      await db.exec(
        "RESET ROLE; DELETE FROM public.athletes WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'",
      );
      assert.equal(
        (await db.query("SELECT * FROM public.nolio_v2_athlete_links")).rows
          .length,
        1,
      );
      const cols = await db.query<{ column_name: string }>(
        "SELECT column_name FROM information_schema.columns WHERE table_name='nolio_v2_athlete_links'",
      );
      assert(
        !cols.rows.some((x) => /token|secret|pat|payload/i.test(x.column_name)),
      );
    } finally {
      await db.close();
    }
  },
});
