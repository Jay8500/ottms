// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,

  // ── Supabase ────────────────────────────────────────────────────────────
  // Dashboard → Project Settings → API
  //   supabaseUrl : https://<project-ref>.supabase.co
  //   supabaseKey : the "Publishable key" (sb_publishable_…) on newer projects,
  //                 or the legacy "anon public" JWT on older ones.
  //
  // NEVER put the service_role / secret key here — it bypasses Row Level
  // Security and this file ships inside the APK.
  supabaseUrl: 'https://kdafyqbfvlibytunzkns.supabase.co',
  supabaseKey: 'sb_publishable_tgYEaENe9QC7gK63N_0QUQ_PGArUzwv',
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
