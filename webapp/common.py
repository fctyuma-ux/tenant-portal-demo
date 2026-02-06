#!/usr/bin/env python3
"""Shared helpers and constants for webapp routes."""

import re
import sqlite3
from pathlib import Path
from string import Template

try:
    import markdown
except ImportError:
    markdown = None

# webappは研修生ルート直下に展開されるため、一つ上の階層がルート
TRAINEE_ROOT = Path(__file__).parent.parent
MASTER_DB = TRAINEE_ROOT / "db" / "master.sqlite"
PERSONAL_DB = TRAINEE_ROOT / "db" / "personal.sqlite"
QUIZ_DB = TRAINEE_ROOT / "db" / "quiz.sqlite"

# Sprint別の資料メタデータ（タイトル、概要）
SPRINT_DOCS_METADATA = {
    1: {
        "Sprint1の全体像": {
            "title": "Sprint 1 の全体像",
            "summary": "AIと協働して、動くものを作れるようになるためのスプリント全体像を解説します"
        },
        "開発手法": {
            "title": "開発手法（DDD/TDD/BDD/SDD）",
            "summary": "ソフトウェア開発における4つの重要な手法とプロセス"
        },
        "設計原則": {
            "title": "設計原則",
            "summary": "DRY原則など、良いソフトウェアを作るための設計原則を学びます"
        },
        "LLM API": {
            "title": "LLM API の基礎",
            "summary": "LLMをシステムの一部として活用する技術とAPI実装"
        },
        "AI駆動開発": {
            "title": "AI駆動開発",
            "summary": "AIと協働してソフトウェアを開発する方法と役割分担"
        },
        "補足項目": {
            "title": "補足項目",
            "summary": "Sprint 1で詳細解説しなかった残りの項目を一覧化"
        }
    }
}


class SafeTemplate(Template):
    delimiter = "@"
    idpattern = r"[A-Z_][A-Z0-9_]*"


def render_template(template: str, **values) -> str:
    return SafeTemplate(template).substitute(**values)


def get_db():
    """マスターDBに接続し、パーソナルDB・クイズDBをATTACH"""
    conn = sqlite3.connect(str(MASTER_DB))
    conn.row_factory = sqlite3.Row
    conn.execute(f"ATTACH DATABASE '{str(PERSONAL_DB)}' AS personal")
    conn.execute(f"ATTACH DATABASE '{str(QUIZ_DB)}' AS quiz")
    return conn


def extract_title_from_md(content: str) -> str:
    """マークダウンの最初のh1タイトルを抽出"""
    lines = content.split('\n')
    for line in lines:
        if line.startswith('# '):
            return line[2:].strip()
    return ""


def extract_title_from_md_file(file_path: Path) -> str:
    """マークダウンファイルの最初のh1タイトルを抽出"""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            return extract_title_from_md(content)
    except Exception:
        return file_path.stem.replace("sprint", "Sprint ").replace("-", " ")


def markdown_to_html(content: str) -> str:
    """マークダウンをHTMLにレンダリング（Mermaid図対応）"""
    # Mermaid図ブロックを事前に処理
    content = _process_mermaid_blocks(content)

    if markdown:
        return markdown.markdown(content, extensions=['extra', 'codehilite', 'toc', 'fenced_code'])
    else:
        # markdownライブラリがない場合は簡易的にレンダリング
        lines = content.split('\n')
        html_lines = []
        in_code = False
        code_lang = ""
        for line in lines:
            if line.startswith('```'):
                if in_code:
                    in_code = False
                    html_lines.append('</code></pre>')
                else:
                    in_code = True
                    code_lang = line[3:].strip()
                    html_lines.append(f'<pre><code class="language-{code_lang}">')
            elif in_code:
                html_lines.append(line)
            elif line.startswith('# '):
                html_lines.append(f'<h1>{line[2:].strip()}</h1>')
            elif line.startswith('## '):
                html_lines.append(f'<h2>{line[3:].strip()}</h2>')
            elif line.startswith('### '):
                html_lines.append(f'<h3>{line[4:].strip()}</h3>')
            elif line.startswith('- '):
                html_lines.append(f'<li>{line[2:].strip()}</li>')
            elif line.strip() == '':
                html_lines.append('<br>')
            else:
                html_lines.append(f'<p>{line}</p>')
        return '\n'.join(html_lines)


def _process_mermaid_blocks(content: str) -> str:
    """Mermaid図ブロック（```mermaid...```）をHTMLに変換"""
    # ```mermaid ... ``` ブロックを <div class="mermaid"> に変換
    pattern = r'```mermaid\n(.*?)\n```'

    def replace_mermaid(match):
        mermaid_code = match.group(1)
        return f'<div class="mermaid">\n{mermaid_code}\n</div>'

    # multiline対応
    content = re.sub(pattern, replace_mermaid, content, flags=re.DOTALL)
    return content


# HTML テンプレート
BASE_HTML = """
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - R2B</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <script>
        mermaid.initialize({{ startOnLoad: true, theme: 'default' }});

        // グループの展開状態を管理
        const expandedGroups = {{}};

        // typeフィルタの取得
        function getTypeFilter() {{
            const checks = document.querySelectorAll('input[name="type-filter"]:checked');
            return Array.from(checks).map(c => c.value);
        }}

        // グループ展開/折りたたみ
        function toggleGroup(groupId) {{
            expandedGroups[groupId] = !expandedGroups[groupId];
            updateGroupDisplay(groupId);
            const toggleIcon = document.getElementById(`toggle-${{groupId}}`);
            toggleIcon.textContent = expandedGroups[groupId] ? '▼' : '▶';
        }}

        // グループの表示状態を更新
        function updateGroupDisplay(groupId) {{
            const rows = document.querySelectorAll(`.group-row-${{groupId}}`);
            const typeFilter = getTypeFilter();
            const isExpanded = expandedGroups[groupId] || false;

            rows.forEach(row => {{
                const detailType = row.getAttribute('data-type');
                const matchesFilter = typeFilter.length === 0 || typeFilter.includes(detailType);

                // 展開されていて、フィルタにマッチしたら表示
                row.style.display = (isExpanded && matchesFilter) ? 'table-row' : 'none';
            }});
        }}

        // フィルタ変更時
        function onFilterChange() {{
            // すべてのグループについて表示状態を更新
            const toggleIcons = document.querySelectorAll('[id^="toggle-group-"]');
            toggleIcons.forEach(icon => {{
                const groupId = icon.id.replace('toggle-', '');
                updateGroupDisplay(groupId);
            }});
        }}
    </script>
    <style>
        * {{ box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }}
        h1 {{ color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }}
        h2 {{ color: #555; margin-top: 30px; }}
        nav {{ background: #007bff; padding: 15px; border-radius: 8px; margin-bottom: 20px; }}
        nav a {{ color: white; text-decoration: none; margin-right: 20px; font-weight: bold; }}
        nav a:hover {{ text-decoration: underline; }}
        .subtabs {{ display: flex; gap: 10px; margin: 20px 0; border-bottom: 2px solid #e0e0e0; }}
        .subtab-link {{ padding: 10px 15px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 4px 4px 0 0; text-decoration: none; color: #333; font-weight: 500; }}
        .subtab-link:hover {{ background: #e0e0e0; }}
        .subtab-link.active {{ background: white; color: #007bff; border-bottom: 2px solid #007bff; position: relative; bottom: -2px; }}
        table {{ width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
        th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #eee; }}
        th {{ background: #f8f9fa; font-weight: 600; }}
        tbody tr {{ cursor: pointer; transition: background-color 0.2s ease; }}
        tbody tr:hover {{ background: #e8f4f8; }}
        .status {{ display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }}
        .status-check {{ background: #e3f2fd; color: #1976d2; }}
        .status-build {{ background: #e8f5e9; color: #388e3c; }}
        .status-explained {{ background: #fff3e0; color: #f57c00; }}
        .status-understood {{ background: #f3e5f5; color: #7b1fa2; }}
        .status-none {{ background: #fafafa; color: #999; }}
        .domain {{ display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; background: #e0e0e0; }}
        .summary {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }}
        .summary-card {{ background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
        .summary-card h3 {{ margin: 0 0 10px 0; color: #666; font-size: 14px; }}
        .summary-card .value {{ font-size: 32px; font-weight: bold; color: #007bff; }}
        .progress-bar {{ height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden; margin-top: 10px; }}
        .progress-fill {{ height: 100%; background: #4caf50; }}
        a {{ color: #007bff; text-decoration: none; }}
        a:hover {{ text-decoration: underline; }}
        .deliverables-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; }}
        .deliverable-card {{ background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }}
        .deliverable-card a {{ display: block; padding: 10px; color: #007bff; text-decoration: none; font-weight: bold; }}
        .deliverable-card a:hover {{ background: #f0f0f0; border-radius: 4px; }}
        .doc-content {{ background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-top: 20px; line-height: 1.6; }}
        .doc-content h1 {{ border-bottom: 2px solid #007bff; padding-bottom: 10px; margin-top: 30px; }}
        .doc-content h1:first-child {{ margin-top: 0; }}
        .doc-content h2 {{ border-bottom: 1px solid #eee; padding-bottom: 8px; margin-top: 25px; }}
        .doc-content h3 {{ margin-top: 20px; }}
        .doc-content pre {{ background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto; border-left: 3px solid #007bff; }}
        .doc-content code {{ background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; }}
        .doc-content pre code {{ background: transparent; padding: 0; }}
        .doc-content ul, .doc-content ol {{ margin: 10px 0; padding-left: 30px; }}
        .doc-content li {{ margin: 5px 0; }}
        .doc-content blockquote {{ border-left: 4px solid #007bff; padding-left: 15px; margin-left: 0; color: #666; }}
        .doc-content .mermaid {{ background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e0e0e0; display: flex; justify-content: center; }}
        .doc-content table {{ border-collapse: collapse; width: 100%; margin: 15px 0; }}
        .doc-content table, .doc-content th, .doc-content td {{ border: 1px solid #ddd; }}
        .doc-content th {{ background: #f5f5f5; padding: 10px; text-align: left; }}
        .doc-content td {{ padding: 10px; }}
        .type-badge-knowledge {{ background: #e3f2fd; color: #1565c0; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 12px; }}
        .type-badge-experience {{ background: #f3e5f5; color: #6a1b9a; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 12px; }}
        .filter-section {{ background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e0e0e0; }}
        .filter-section label {{ margin-right: 20px; cursor: pointer; }}
        .filter-section input[type="checkbox"] {{ margin-right: 5px; }}
    </style>
</head>
<body>
    <nav>
        <a href="/">ホーム</a>
        <a href="/sprint/1">Sprint 1</a>
        <a href="/sprint/2">Sprint 2</a>
        <a href="/sprint/3">Sprint 3</a>
        <a href="/sprint/4">Sprint 4</a>
        <a href="/domains">Domain一覧</a>
    </nav>
    {content}
    <script>hljs.highlightAll();</script>
</body>
</html>
"""


def get_sprint_subtabs(sprint_num: int, current_path: str = "") -> str:
    """Sprint用のサブタブHTMLを生成

    Args:
        sprint_num: Sprint番号
        current_path: 現在のURL path（アクティブなタブを判定するため）
    """
    subtabs_data = [
        ("overview", "概要"),
        ("checklist", "チェックリスト"),
        ("quiz", "詳説&クイズ"),
        ("deliverables", "成果物"),
    ]

    html = ""
    for key, label in subtabs_data:
        url = f"/sprint/{sprint_num}/{key}"
        # 現在のURLが該当のサブタブのURLを含むかチェック
        is_active = current_path.startswith(f"/sprint/{sprint_num}/{key}")
        active_class = " active" if is_active else ""
        html += f'<a href="{url}" class="subtab-link{active_class}">{label}</a>'

    return html
