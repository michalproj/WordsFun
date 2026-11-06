# Wyrazy z literek — Words from Letters

A small practice page for anyone learning to read and write in **Polish**.

> **Polish only.** The alphabet, the word list and the interface are all Polish. The page does not support other languages.

Whoever is helping with the learning (a parent, tutor, teacher or older sibling) marks the letters the learner already knows. The page then draws Polish words made **only** from those letters, so every word on screen uses letters the learner has already met.

## Features

- **Known letters**: tap any of the 32 letters of the Polish alphabet (shown as upper- and lowercase pairs) to mark it as known.
- **Word length**: choose a range from 2 to 15 letters.
- **How many words**: 10, 20 or 30 per draw.
- **Live count**: before drawing, the page shows how many matching words there are.
- **Reading progress**: tap a word once it has been read. It turns green, and a progress bar tracks how many words are done.
- **Safe, everyday vocabulary**: about 43,000 common Polish word forms suitable for young learners, filtered to exclude vulgar, offensive and adult words.
- **Works on a big screen and on a phone**: two columns on wide screens; tabs and a bottom action bar on phones.
- **Printable**: printing the page gives a clean list of the drawn words.

## Privacy

The selected letters, word length and word count are saved only in the browser's `localStorage`, so the page remembers them next time. Nothing is collected or sent anywhere. The page uses no cookies, no analytics and no third-party requests; even the fonts are served from the page itself.

## Running locally

The page is plain static HTML, CSS and JavaScript with no build step. It loads the word lists with `fetch`, so it has to be served over HTTP; opening `index.html` directly from disk will not work.

```
python -m http.server -d public 8109
```

Then open http://localhost:8109.

## Deploying to GitHub Pages

Publishing is **manual**: pushing to `main` does not change the live site.

One-time setup:

1. Push the repository to GitHub.
2. Go to **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**.

To publish the current state of `main`:

1. Push your changes.
2. Open the **Actions** tab and select **Deploy to GitHub Pages** in the list on the left.
3. Click **Run workflow**, keep the `main` branch and confirm with **Run workflow**.
4. After about a minute the run turns green and the site is updated. If the old version still shows, hard-refresh the page (Ctrl+F5), because GitHub Pages caches files for a few minutes.

The workflow (`.github/workflows/pages.yml`) publishes the `public/` directory.

The site will be available at `https://<user>.github.io/<repository>/`. All paths are relative, so it also works from a subdirectory or on any other static host (e.g. Cloudflare Pages with `public` as the output directory and no build command).

## Project structure

```
public/
  index.html      the whole app (HTML, CSS and JS in one file)
  words/NN.txt    word lists, one file per word length (NN = number of letters)
  words/index.json
  fonts/          Andika and Baloo 2 (woff2) + OFL.txt
tools/            scripts used to build the word lists
```

## Licenses

- Fonts: [Andika](https://software.sil.org/andika/) and [Baloo 2](https://github.com/EkType/Baloo2), both under the SIL Open Font License 1.1 (see `public/fonts/OFL.txt`).
- The word list may be used for non-commercial purposes only.
