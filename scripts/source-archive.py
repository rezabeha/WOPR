"""Build the public, reproducible source bundle from the deployable project."""
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

root = Path(__file__).resolve().parent.parent
dist = root / "dist"
output = dist / "wopr-source.zip"
(dist / "README.txt").write_bytes((root / "README.md").read_bytes())

files = [root / "README.md", root / "package.json", Path(__file__).resolve()]
files.extend(sorted((root / "tests").glob("*.test.js")))
files.extend(path for path in sorted(dist.rglob("*"))
             if path.is_file() and path != output and not path.name.startswith("qa-"))
with ZipFile(output, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
    for path in files:
        name = path.relative_to(root).as_posix()
        info = ZipInfo("wopr-joshua/" + name, (1983, 6, 3, 0, 0, 0))
        info.external_attr = 0o100644 << 16
        archive.writestr(info, path.read_bytes(), compress_type=ZIP_DEFLATED, compresslevel=9)
print(f"{output.name}: {len(files)} files, {output.stat().st_size:,} bytes")
