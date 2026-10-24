# 📜 Quality Deck - Änderungsprotokoll (Changelog)

Automatisch gepflegte Revisions-Historie für **Quality Deck** (DIN EN ISO 9001:2015).

**Aktueller Stand:** [Rev. 37 (ba3ea00)](https://github.com/Schello805/Qualitydeck/commit/ba3ea0097e9e9492cff4f4523b326e016d061d8a) • Zuletzt aktualisiert: 24.10.2026 14:03:53

---

### [Rev. 37] - 24.10.2026, 14:03 (`ba3ea00`)
* **🐛 Behoben:** Fix dropdown filter state race condition and enable natural chapter sorting
* *Commit:* [`ba3ea00`](https://github.com/Schello805/Qualitydeck/commit/ba3ea0097e9e9492cff4f4523b326e016d061d8a)

### [Rev. 36] - 24.10.2026, 13:46 (`9779614`)
* **✨ Neu:** Add interactive ISO 9001 Norm-Zuordnungsmatrix and self-healing audit synchronization
* *Commit:* [`9779614`](https://github.com/Schello805/Qualitydeck/commit/97796142c235049371350da363d86b2fa64e3b05)

### [Rev. 35] - 24.10.2026, 13:23 (`72947d6`)
* **✨ Neu:** Add optional checkbox and quick-switch for general ('Alle Abteilungen') vs specific audit scope
* *Commit:* [`72947d6`](https://github.com/Schello805/Qualitydeck/commit/72947d6f6856c832e8e9f7c7bff8e2ba8a142d1f)

### [Rev. 34] - 24.10.2026, 13:18 (`a345557`)
* **🐛 Behoben:** Fix department filter synchronization and ensure all department audits are populated
* *Commit:* [`a345557`](https://github.com/Schello805/Qualitydeck/commit/a345557196a05d7902d999db4dfa92c8d77c4bf9)

### [Rev. 33] - 24.10.2026, 13:06 (`49ba5a0`)
* **🐛 Behoben:** Remove invalid --quiet flag from prisma generate
* *Commit:* [`49ba5a0`](https://github.com/Schello805/Qualitydeck/commit/49ba5a0ada88447a9438c05df1d9900d5873f602)

### [Rev. 32] - 24.10.2026, 12:52 (`48a33d9`)
* **🐛 Behoben:** Auto-discard generated local files before git pull in update.sh
* *Commit:* [`48a33d9`](https://github.com/Schello805/Qualitydeck/commit/48a33d941bf6bd84d07ecb6b443790a3fb29ba5c)

### [Rev. 31] - 24.10.2026, 12:47 (`82584de`)
* **✨ Neu:** Sync all 19 Excel departments into database and audit filters with 1-click starter
* *Commit:* [`82584de`](https://github.com/Schello805/Qualitydeck/commit/82584dee485df8b33999d706b053656f6df17a21)

### [Rev. 30] - 24.10.2026, 11:36 (`e15aa27`)
* **🚀 Update:** perf(quality): Add database indexes, parallelize queries, batch audit creation and clean linter warnings
* *Commit:* [`e15aa27`](https://github.com/Schello805/Qualitydeck/commit/e15aa2768b0f94d6beedf30504ee06b1017cba2b)

### [Rev. 29] - 24.10.2026, 11:28 (`722bc4d`)
* **✨ Neu:** Redirect root page directly to /dashboard
* *Commit:* [`722bc4d`](https://github.com/Schello805/Qualitydeck/commit/722bc4d48f49554988a594d1b27a0b3392e5b870)

### [Rev. 28] - 24.10.2026, 11:25 (`e794003`)
* **🐛 Behoben:** Patch vulnerabilities, enforce security headers, sanitize upload, protect cron and mask credentials
* *Commit:* [`e794003`](https://github.com/Schello805/Qualitydeck/commit/e7940030b61dce9feba16d2469f9a69f5e1f755d)

### [Rev. 27] - 24.10.2026, 09:46 (`ee8126a`)
* **🐛 Behoben:** Add @tailwindcss/postcss and postcss.config.mjs for complete CSS compilation
* *Commit:* [`ee8126a`](https://github.com/Schello805/Qualitydeck/commit/ee8126aa22f29ac729eddaccb0b6cdfa07ce2af2)

### [Rev. 26] - 24.10.2026, 09:36 (`e015b22`)
* **🐛 Behoben:** Bind Next.js dev and start to 0.0.0.0 for external network access
* *Commit:* [`e015b22`](https://github.com/Schello805/Qualitydeck/commit/e015b22276aa79e49d6895ea7d5577921e88e804)

### [Rev. 25] - 24.10.2026, 08:58 (`e297a4c`)
* **✨ Neu:** automatically install Node.js 20 LTS on Ubuntu/Debian/RHEL if missing
* *Commit:* [`e297a4c`](https://github.com/Schello805/Qualitydeck/commit/e297a4c75535c4daecd7fbc2294935cc1c0d7c28)

### [Rev. 24] - 24.10.2026, 08:57 (`17d7aa9`)
* **🐛 Behoben:** Avoid new Date() in prerendered server component page.tsx
* *Commit:* [`17d7aa9`](https://github.com/Schello805/Qualitydeck/commit/17d7aa94840e07b6b682fc305c4c6f5871a12925)

### [Rev. 23] - 24.10.2026, 08:56 (`4697c70`)
* **🐛 Behoben:** Use stable webpack bundler for dev script to prevent Turbopack loader panics
* *Commit:* [`4697c70`](https://github.com/Schello805/Qualitydeck/commit/4697c70a30bffb91981b67f14fecf1b22d356189)

### [Rev. 22] - 24.10.2026, 08:44 (`66f6f51`)
* **🐛 Behoben:** Remove dynamic export in check-update API for Next.js 16 cacheComponents compatibility
* *Commit:* [`66f6f51`](https://github.com/Schello805/Qualitydeck/commit/66f6f51556f53b896288766a28dcd19139a8d0dc)

### [Rev. 21] - 24.10.2026, 08:39 (`1f550f2`)
* **✨ Neu:** Complete automated push script, changelog modal, and update checker
* *Commit:* [`1f550f2`](https://github.com/Schello805/Qualitydeck/commit/1f550f234e93072ed8a849b7d71c7a7521fdf6b8)

### [Rev. 20] - 24.10.2026, 08:37 (`a329375`)
* **🔧 Wartung:** Configure automated git hooks for pre-commit and pre-push
* *Commit:* [`a329375`](https://github.com/Schello805/Qualitydeck/commit/a329375eec5b30c7504fac4daf77129ebbcea7b4)

### [Rev. 19] - 24.10.2026, 08:37 (`c5614b7`)
* **🔧 Wartung:** bump revision number and update changelog
* *Commit:* [`c5614b7`](https://github.com/Schello805/Qualitydeck/commit/c5614b75bf138cee01c147098514f335c9c809f6)

### [Rev. 18] - 24.10.2026, 08:36 (`9974dfe`)
* **🔧 Wartung:** bump revision number and update changelog
* *Commit:* [`9974dfe`](https://github.com/Schello805/Qualitydeck/commit/9974dfe0ba359555464c6ad3d0eef65bf1e49016)

### [Rev. 17] - 24.10.2026, 08:36 (`4541590`)
* **✨ Neu:** Add full installer, updater, automated revision counter, changelog and update checker in footer
* *Commit:* [`4541590`](https://github.com/Schello805/Qualitydeck/commit/4541590f245e500fd4752cd8ad0e29029f700d82)

### [Rev. 16] - 23.10.2026, 20:54 (`e44e4a4`)
* **✨ Neu:** Display ISO 9001 standard text directly above audit assessment
* *Commit:* [`e44e4a4`](https://github.com/Schello805/Qualitydeck/commit/e44e4a4f572492d1d545ef51efdb1011eb71386b)

### [Rev. 15] - 23.10.2026, 20:52 (`e3315a1`)
* **✨ Neu:** Do not preselect status, enlarge notes textarea and add multi-link support
* *Commit:* [`e3315a1`](https://github.com/Schello805/Qualitydeck/commit/e3315a120858bd8ae4c806f69749dc650d31bbdd)

### [Rev. 14] - 23.10.2026, 19:41 (`a3f2711`)
* **🐛 Behoben:** Default audit review status to fulfilled and show 3-stage action plan only on nicht erfüllt
* *Commit:* [`a3f2711`](https://github.com/Schello805/Qualitydeck/commit/a3f2711acf85bf130e72ee2a8ee470ea654a8a66)

### [Rev. 13] - 23.10.2026, 19:28 (`fb12893`)
* **🐛 Behoben:** Include general requirements in department audit checklist generation
* *Commit:* [`fb12893`](https://github.com/Schello805/Qualitydeck/commit/fb12893a7c95a63247f74e6bb5ab63f055e4e6f3)

### [Rev. 12] - 23.10.2026, 19:25 (`6ce548b`)
* **✨ Neu:** Map Excel audit matrix departments to ISO 9001 requirements
* *Commit:* [`6ce548b`](https://github.com/Schello805/Qualitydeck/commit/6ce548b27a6fa4cfac9b4a126d56a1232f1eb7e6)

### [Rev. 11] - 23.10.2026, 19:19 (`1be9f31`)
* **✨ Neu:** Add department edit modal, audit deletion, and custom requirement creation/deletion
* *Commit:* [`1be9f31`](https://github.com/Schello805/Qualitydeck/commit/1be9f312635beb00337147f72e466fb3e33e3ddf)

### [Rev. 10] - 23.10.2026, 19:12 (`98d2365`)
* **✨ Neu:** implement StartAuditButton with automated ISO 9001 checklist generation and navigation
* *Commit:* [`98d2365`](https://github.com/Schello805/Qualitydeck/commit/98d2365f19706e83b5200dc713d657316ed723a1)

### [Rev. 9] - 23.10.2026, 19:02 (`966d851`)
* **🐛 Behoben:** resolve all ESLint errors, ensure React 19 purity and effect hygiene
* *Commit:* [`966d851`](https://github.com/Schello805/Qualitydeck/commit/966d8510a7bf6db9f4d49c0e7c6e7edb7716bf84)

### [Rev. 8] - 23.10.2026, 18:29 (`002e73f`)
* **✨ Neu:** enable full drag-and-drop reordering within and across process groups with persistent order
* *Commit:* [`002e73f`](https://github.com/Schello805/Qualitydeck/commit/002e73f4ded6cbe6704fa295319cf4e6b93c5328)

### [Rev. 7] - 23.10.2026, 18:14 (`6f3fd4d`)
* **🐛 Behoben:** remove triple-line drag handle icon from process map cards
* *Commit:* [`6f3fd4d`](https://github.com/Schello805/Qualitydeck/commit/6f3fd4dd9b7cd7ba49dea077a570f34987df000d)

### [Rev. 6] - 23.10.2026, 18:10 (`88a8bfa`)
* **🐛 Behoben:** widen sidebar to 320px (w-80) and prevent text wrapping and horizontal scrollbar
* *Commit:* [`88a8bfa`](https://github.com/Schello805/Qualitydeck/commit/88a8bfa6f80f86f116cbd642d858d254ba6e1329)

### [Rev. 5] - 23.10.2026, 18:08 (`881b119`)
* **🐛 Behoben:** mount profile edit modal to body via createPortal to escape header containing block
* *Commit:* [`881b119`](https://github.com/Schello805/Qualitydeck/commit/881b1196225b7cc45d7978dbbffa1c94591ebedc)

### [Rev. 4] - 23.10.2026, 17:54 (`53ac269`)
* **✨ Neu:** complete DIN EN ISO 9001 QM suite with 8D complaints, CAPA SLAs, security hardening and installer
* *Commit:* [`53ac269`](https://github.com/Schello805/Qualitydeck/commit/53ac26959ade22fecc9415cfabfbd2aa118bbe5d)

### [Rev. 3] - 09.10.2026, 10:44 (`b0ada2a`)
* **🚀 Update:** Fix prisma imports and client instantiation
* *Commit:* [`b0ada2a`](https://github.com/Schello805/Qualitydeck/commit/b0ada2aa26ed8bc3cca692a9c4d791d91578d6b5)

### [Rev. 2] - 09.10.2026, 10:38 (`8be931f`)
* **🚀 Update:** Initial commit of Quality Deck
* *Commit:* [`8be931f`](https://github.com/Schello805/Qualitydeck/commit/8be931f563a038f60f0e412a2d786c4ccf349edf)

### [Rev. 1] - 08.10.2026, 18:38 (`5a500bf`)
* **🚀 Update:** Initial commit from Create Next App
* *Commit:* [`5a500bf`](https://github.com/Schello805/Qualitydeck/commit/5a500bf6f440d0f5538a2aa6871278c85ee8e825)

