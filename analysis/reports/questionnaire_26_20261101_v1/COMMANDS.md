# Execution record

Working directory: `C:\Users\Alvin Guillermo\Downloads\PINTIG System`.

Core generation and verification commands actually executed:

```powershell
python -m unittest discover -s analysis/scripts/reconstruction_26 -p test_build.py -v
python analysis/scripts/reconstruction_26/build.py
python analysis/scripts/reconstruction_26/verify.py
npm run check
npm run build
git diff --check
git diff --stat
```

The first `npm run check` reached TypeScript checking but Node test processes were blocked by sandbox
`spawn EPERM`. The same command was rerun with approved process access: 66 tests passed.
The seven Python tests passed; the generation and independent read-back audit exited successfully.
`git diff --check` passed with informational Windows line-ending warnings.

PDF tooling commands actually executed:

```powershell
python -m pip install --target tmp/pintig_pdf_deps pymupdf
python -m pip install --index-url https://pypi.org/simple --target tmp/pintig_pdf_deps pymupdf
```

The initial sandbox installation failed to resolve the package. The second, approved command installed
PyMuPDF2.0 into the ignored workspace-local target. Pip reported dependency conflicts with globally
installed packages, but this isolated target was only placed on sys.path for rendering; the dataset pipeline
used the existing NumPy/pandas installation recorded in run_manifest.json.

Read-only inspection used PowerShell Get-Content/Get-ChildItem, rg, pypdf text extraction and SHA-256
calculations. An attempted pypdf embedded-image extraction failed because jbig2dec was unavailable.
PyMuPDF rendering then succeeded with approved access to its installed files. Scanned PURE pages were
rendered to `tmp/pdfs/pure_1.png` through `pure_41.png`; a contact sheet and Framingham supporting-page
images were inspected. These ignored temporary files are review aids, not patient data or research outputs.

Reproduction: the build command refuses an existing version directory. Use, for example,
`python analysis/scripts/reconstruction_26/build.py --version questionnaire_26_reproduction_v2`
for a new run; that example command was **not** executed. All eleven PDF sources must be available under
Downloads, or pass `--sources DIRECTORY`. Existing hashed raw/frozen/configuration inputs are required.
