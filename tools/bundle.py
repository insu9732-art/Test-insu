"""앱을 HTML 파일 하나로 묶는다.

  python3 tools/bundle.py android <출력경로>    # 안드로이드 앱(WebView)용
  python3 tools/bundle.py artifact <출력경로>   # claude.ai 미리보기용
"""
import base64
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
target, out = sys.argv[1], Path(sys.argv[2])


def read(p):
    return (ROOT / p).read_text(encoding="utf-8")


def strip_module(js):
    js = re.sub(r"^import[\s\S]*?from '[^']+';\n", "", js, flags=re.M)
    js = re.sub(r"^export \{[^}]*\};?\n", "", js, flags=re.M)
    return re.sub(r"^export (const|function|let)", r"\1", js, flags=re.M)


app = re.sub(r"// ---------- PWA ----------[\s\S]*$", "", strip_module(read("js/app.js")))
js = "\n".join([strip_module(read("js/config.js")), strip_module(read("js/lunar-data.js")), strip_module(read("js/saju.js")), strip_module(read("js/content.js")), strip_module(read("js/reading.js")), strip_module(read("js/tojung-data.js")), strip_module(read("js/tojung.js")), strip_module(read("js/zodiac-life.js")), strip_module(read("js/dreams-animals.js")), strip_module(read("js/dreams-people.js")), strip_module(read("js/dreams-world.js")), strip_module(read("js/dreams.js")), strip_module(read("js/dream-gen.js")), strip_module(read("js/hanja-data.js")), strip_module(read("js/naming.js")), app])
icon = "data:image/svg+xml;base64," + base64.b64encode((ROOT / "icons/icon.svg").read_bytes()).decode()
body = re.search(r"<body>([\s\S]*?)<script type=\"module\"", read("index.html")).group(1)
body = body.replace('src="icons/icon.svg"', f'src="{icon}"')
css = read("styles.css")

if target == "artifact":
    css += """
/* claude.ai 미리보기 전용 보정 */
body::before { content: ""; position: fixed; inset: 0 0 auto; height: env(safe-area-inset-top, 0px); z-index: 30; background: #0842b8; }
.titlebar { top: env(safe-area-inset-top, 0px); padding-top: 5px; }
"""
    head = '<title>인수토정비결</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<meta name="theme-color" content="#0a246a">\n'
    html = f"{head}<style>\n{css}</style>\n{body}<script>\n(() => {{\n{js}\n}})();\n</script>\n"
else:
    html = f"""<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>인수토정비결</title>
<style>
{css}</style>
</head>
<body>
{body}<script>
(() => {{
{js}
}})();
</script>
</body>
</html>
"""

out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html, encoding="utf-8")
print(f"{out} ({len(html):,} bytes)")
