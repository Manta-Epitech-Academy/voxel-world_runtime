# World Generator on the workshop platform — port plan

State on 2026-11-01. Deadline: **14/11**. Edouard announces the subject for Coding Clubs from
14/11 to 15/12, and Nancy (Yohann) runs it at the end of November as a one-day session.

## The sources (2026-11-04)

The app has been reverse-engineered into readable sources on branch `sources`
(README.md lists the modules). The build replaces the patched page: no more
`scripts/port.py`, no more `embed.js` (now `src/plateforme.js`). Three changes
on purpose: dockview panels, Monaco's beginner settings, and the solutions
gone for good. GitHub Pages serves the build under `/sources/`, the root staying
the `wrp-port` page that ctf-0110 frames. When `sources` is merged to main:
`tools/build_runtime.sh` in the platform must switch the `voxel-world` case
from `KIND="static"` to a Vite build (as `tic80`), the adapter's STORAGE_KEYS
can add `mwg.disposition`, and the subject's `deploy/ctf-0110` branch can
point at the root again once the Pages workflow deploys the build there.

## Short version

The subject runs on the platform, and step 1 was completed end to end on a local CTFd. The
seven steps validate themselves with no instructor code. What is left is mostly merging,
deploying the runtime image, and a few decisions only Kevin can take. Honest estimate: **about
two days of work**, ready for 14/11 if the decisions below are taken by the review on 9/11.

## Interim deployment on ctf-0110 (2026-11-02)

Kevin asked for World Generator on `https://ctf-0110.epiboost.fr`, which was empty. The image there
has no voxel-world adapter and the cluster serves no voxel-world runtime, so this is an interim
shape, not the target one:

- **Content:** subject branch `deploy/ctf-0110`, imported with `tools/sync_subject.py`. The
  instance's `workshop_source` points to that branch, so the admin sync page re-imports it.
- **Runtime:** served by **GitHub Pages from this repo's `wrp-port` branch**, framed as an
  `external` runtime with `?plateforme=1`. That hides the app's copy of the text and keeps its
  step list. Warning: **every push to `wrp-port` changes what ctf-0110 serves**, straight away.
  The pinned `version` is ignored for an external runtime.
- **Validation:** instructor codes (`checkpoint`), because a cross-origin frame cannot receive the
  token secret. The codes are in the admin answer sheet, and in Kevin's local `~/.secrets`.
- **Not done: participant access.** Like the other instances, ctf-0110 has self-registration
  closed, and participants arrive through Jump. It has no `workshop_jump_instance` and no Jump
  keys yet, so only the admin can open it.
- **Lost compared to the target:** automatic validation, the runtime following the step being
  read, and work kept server-side. The work stays in the browser only, because the frame is
  cross-origin.

Moving to the target shape means the "What is left" items 2 and 3 below. Then switch the subject
back to `ctfd-workshop-plugin` and re-sync.

## What is done

Three repositories, one new branch each. Nothing is merged, deployed or opened as a PR.

| Repository | Branch | What it holds |
|---|---|---|
| `voxel-world_subject` | `ctfd-workshop-plugin` (pushed) | the subject in convention 2.0, 12 captures, token validation |
| `voxel-world_runtime` | `wrp-port` | this port: `index.html`, `embed.js`, port script, test, nginx image |
| `ctfd-workshop-platform` | `feat/voxel-world-runtime` | adapter, token scheme, build case, icon |

**There are no readable sources.** The app exists only as the single minified page in
`World-Generator.zip` on `main`. So the port does not rebuild the app. `scripts/port.py`
patches the page, and each patch must match exactly once or the script stops. The patches:

1. Blank the seven step solutions inside the bundle, so they are gone from the page source too.
2. Remove the « ↺ Corrigé précédent » button and its code.
3. Send an event after each check, so `embed.js` knows when a step is fully green.
4. Expose « go to step N » for the platform adapter.

**Each step's « défis » are now the platform's validation.** When every check of a step is
green, `embed.js` shows `monde{…}`: an HMAC of the instance's secret and the step number. The
sync computes the same value and sets it as the flag. The adapter copies the code into the
step's answer field, and the student presses Submit. Student Lua cannot reach the secret,
because wasmoon runs with no access to JavaScript.

**In platform mode** the runtime hides its own copy of the text, hints and step list. It keeps
the step title, the objective and the live check list, and it follows the step the student is
on.

## What was tested

| Test | Result |
|---|---|
| `tests/check.py`: no solution text left in `index.html` | pass |
| `tests/check.py`: each of the 7 official solutions turns its step green and shows the code the platform expects | pass, 7/7 |
| Platform `build_runtime.sh voxel-world` from this branch | builds a 2-file dist |
| Local CTFd, real sync, real browser: register, read intro, open runtime, type step 1, Générer, code fills in, Submit | **step 1 solved**, step 2 unlocked |
| Runtime opens on the student's current step and keeps their code after reload | pass |
| Runtime image: app served, old version pin redirects to `latest`, repo files return 404 | pass |

**Not tested:**

- Steps 2 to 7 inside CTFd. They passed in the runtime alone, through the same event and the same token.
- The production image of CTFd. The local test used an older local build of `ctfd-custom`, because the GHCR image needs a login this machine does not have.
- Kubernetes, Firefox, school PCs, and a whole room loading the page at once.
- HTTPS. The token needs `crypto.subtle`, which only works on HTTPS or localhost.

## Where the solutions are today

- **`voxel-world_runtime` on `main`, a public repo.** `World-Generator.zip` holds `corriges/etape-1.lua` to `etape-7.lua` and `solution.lua`, and its page holds the solutions plus the button. They have been public since commit `ab2d5b3`.
- **The original `LISEZ-MOI.txt`** tells instructors about the button and the folder.
- **The subject's hints.** Step 1's second hint is the exact line, which is fine only if step 1 is a modelling step. Step 2's third hint gives the loop skeleton, not the full answer.
- The `wrp-port` branch, the subject branch and the platform branch contain no solution.

**Proposal:**

1. Move the zip and the solutions to a private repo, `voxel-world_solutions`, like `tortue_solutions`. Then delete the zip from `main`. Deleting it does not remove it from history: removing it for good means rewriting `main` or making the repo private, which is Kevin's call.
2. Late students lose « Corrigé précédent », and every step builds on the previous step's code. In a room, the instructor pastes the previous step's solution from the private repo. The admin answer sheet also shows each step's code, so an instructor can unblock validation without giving any code.
3. Coding Clubs with no Epitech instructor have no way to catch up. That is the main teaching gap of the port.

## What is left for 14/11

In order:

1. **Kevin's review and decisions**, on 9/11: see the list below. About 1 h.
2. **Merge the three branches**, then rebuild the `ctfd-custom` image, since the plugin is baked into it. Half a day with checks.
3. **Kubernetes:** add `voxel-world` to the runtimes component and the Ingress paths, pin the image tag, and create the instance overlay. Needs cluster access. Half a day.
4. **Pane layout.** In a 55% side pane the runtime stacks its panels, and the 3D world gets the bottom third. Options: a wider pane, the pop-out tab, or a compact layout in platform mode. 1 to 2 h.
5. **Run all 7 steps inside CTFd** on the real image, in Chrome and Firefox, over HTTPS. 2 h.
6. **A test read of the subject**, with simulated readers or a real playtest. The text was ported as written and nobody has read it on the platform yet. Half a day.
7. **Small polish:**
   - The platform's English line "The runtime filled in an answer — check it, then submit" shows in a French page.
   - Hint titles render as « Voir l'indice » twice.

## Risks

- **No sources.** Any change to the app's logic means patching minified code. The port script catches a page that changed, but cannot make a real change easy. If the author has the sources, get them.
- **WebGL on school PCs.** The world needs hardware acceleration. The original notes already say a blue or black world means it is off.
- **Page weight:** 4.85 MB, 1.35 MB gzipped, per student. Fine on a normal network, slow on a weak school link with 30 students at once.
- **HTTPS is required** for validation. An HTTP or LAN-only instance would show the green checks but no code.
- **Catching up without solutions**, see above.
- **One-day session in Nancy.** The steps total about 2 h 45. The day needs more content, or a slower pace with bonus work.

## Decisions Kevin must take

1. **Solutions:** move them to a private repo, and rewrite `main` or make the runtime repo private?
2. **Catching up:** how does a late student get the previous step's code, especially in a Coding Club with no Epitech instructor?
3. **Step 1 as a modelling step:** is it one? Its second hint gives the exact line.
4. **Instance mode for the Coding Clubs:** instructor-led or self-serve? Validation works either way. The mode changes registration and the review flow.
5. **Who deploys:** cluster access, and the date the image is pinned for the sessions.
6. **Nancy's full day:** is 2 h 45 of steps enough, or does it need a second part?
