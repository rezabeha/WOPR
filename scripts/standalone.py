"""Create the single-file offline edition, including a fresh source archive."""
import argparse
import base64
import json
import posixpath
import re
import subprocess
import sys
from pathlib import Path

project = Path(__file__).resolve().parent.parent
dist = project / "dist"

def data_url(name, media_type):
    payload = base64.b64encode((dist / name).read_bytes()).decode("ascii")
    return f"data:{media_type};base64,{payload}"

def build(output):
    subprocess.run([sys.executable, str(project / "scripts/source-archive.py")], check=True)
    modules = {}
    relative_js = re.compile(r"""(['"])(\.\.?/[^'"]+\.js)\1""")

    def collect(path):
        if path in modules:
            return

        def dependency(match):
            quote, relative = match.groups()
            target = posixpath.normpath(posixpath.join(posixpath.dirname(path), relative))
            collect(target)
            return f"{quote}@@URL:{target}@@{quote}"

        source = relative_js.sub(dependency, (dist / path).read_text(encoding="utf-8"))
        if path == "js/visuals.js":
            for asset in ("land", "land-dots"):
                name = f"assets/{asset}.json"
                source = source.replace("./" + name, data_url(name, "application/json"))
        if path == "js/app.js":
            source = source.replace('href="./wopr-source.zip" download',
                                    f'href="{data_url("wopr-source.zip", "application/zip")}" download="wopr-source.zip"')
            source = source.replace('href="./README.txt" target="_blank" rel="noopener"',
                                    f'href="{data_url("README.txt", "text/plain")}" download="WOPR-README.txt"')
        modules[path] = source

    collect("js/app.js")
    payload = json.dumps(list(modules.items()), ensure_ascii=False, separators=(",", ":")).replace("<", r"\u003c")
    bootstrap = """<script type="module">
const modules=MODULE_PAYLOAD, urls={};
for(const [name,body] of modules){
 const source=body.replace(/@@URL:([^@]+)@@/g,(_,name)=>urls[name]);
 urls[name]=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
}
await import(urls['js/app.js']);
</script>""".replace("MODULE_PAYLOAD", payload)
    html = (dist / "index.html").read_text(encoding="utf-8")
    css = (dist / "terminal.css").read_text(encoding="utf-8")
    html = html.replace('<link rel="stylesheet" href="./terminal.css">', f"<style>\n{css}\n</style>")
    for asset in ("mark", "wordmark"):
        name = f"assets/{asset}.svg"
        html = html.replace("./" + name, data_url(name, "image/svg+xml"))
    html = html.replace('<script type="module" src="./js/app.js"></script>', bootstrap)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(html, encoding="utf-8")
    print(f"{output.name}: {len(modules)} modules, {output.stat().st_size:,} bytes")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path, nargs="?", default=project / "WOPR-Terminal.html")
    build(parser.parse_args().output)
