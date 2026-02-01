#!/usr/bin/env python3
"""
R2B チェックリスト・進捗ビューア
"""

import json
import sqlite3
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse

# webappは研修生ルート直下に展開されるため、一つ上の階層がルート
TRAINEE_ROOT = Path(__file__).parent.parent
MASTER_DB = TRAINEE_ROOT / "master.sqlite"
PERSONAL_DB = TRAINEE_ROOT / "personal.sqlite"

app = FastAPI(title="R2B Progress Viewer")


def get_db():
    """マスターDBに接続し、パーソナルDBをATTACH"""
    conn = sqlite3.connect(MASTER_DB)
    conn.row_factory = sqlite3.Row
    conn.execute(f"ATTACH DATABASE '{PERSONAL_DB}' AS personal")
    return conn


# HTML テンプレート
BASE_HTML = """
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - R2B</title>
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
        table {{ width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
        th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #eee; }}
        th {{ background: #f8f9fa; font-weight: 600; }}
        tr:hover {{ background: #f8f9fa; }}
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
    </style>
</head>
<body>
    <nav>
        <a href="/">ホーム</a>
        <a href="/progress">進捗</a>
        <a href="/sprint/1">Sprint 1</a>
        <a href="/sprint/2">Sprint 2</a>
        <a href="/sprint/3">Sprint 3</a>
        <a href="/sprint/4">Sprint 4</a>
        <a href="/domains">Domain一覧</a>
    </nav>
    {content}
</body>
</html>
"""


@app.get("/", response_class=HTMLResponse)
def home():
    conn = get_db()
    cursor = conn.cursor()

    # 統計情報
    cursor.execute("SELECT COUNT(*) FROM checklist_items")
    total_items = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM checklist_details")
    total_details = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COUNT(*)
        FROM checklist_details cd
        JOIN personal.progress p ON cd.id = p.item_id
        WHERE p.status = 'check'
    """)
    completed_details = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COUNT(*)
        FROM checklist_details
    """)
    total_details_count = cursor.fetchone()[0]

    # 進捗情報
    cursor.execute("SELECT COUNT(*) FROM personal.progress")
    # This value is raw record count, not used for percent calculation anymore
    total_progress_records = cursor.fetchone()[0]

    cursor.execute("""
        SELECT domain, COUNT(*) as cnt
        FROM checklist_items
        GROUP BY domain
        ORDER BY domain
    """)
    domain_stats = cursor.fetchall()

    cursor.execute("""
        SELECT sprint, COUNT(*) as cnt
        FROM sprint_plan
        GROUP BY sprint
        ORDER BY sprint
    """)
    sprint_stats = cursor.fetchall()

    conn.close()

    # Calculate percentage based on DETAILS, which is more accurate for this checklist system
    progress_pct = round(completed_details / total_details_count * 100) if total_details_count > 0 else 0

    content = f"""
    <h1>R2B Progress Viewer</h1>

    <div class="summary">
        <div class="summary-card">
            <h3>チェックリスト項目数</h3>
            <div class="value">{total_items}</div>
        </div>
        <div class="summary-card">
            <h3>詳細項目数</h3>
            <div class="value">{total_details}</div>
        </div>
        <div class="summary-card">
            <h3>進捗 (詳細項目ベース)</h3>
            <div class="value">{completed_details} / {total_details_count}</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: {progress_pct}%"></div>
            </div>
        </div>
    </div>

    <h2>Domain別項目数</h2>
    <table>
        <tr><th>Domain</th><th>項目数</th><th></th></tr>
        {"".join(f'<tr><td>Domain {row["domain"]}</td><td>{row["cnt"]}</td><td><a href="/domain/{row["domain"]}">詳細</a></td></tr>' for row in domain_stats)}
    </table>

    <h2>Sprint別項目数</h2>
    <table>
        <tr><th>Sprint</th><th>項目数</th><th></th></tr>
        {"".join(f'<tr><td>Sprint {row["sprint"]}</td><td>{row["cnt"]}</td><td><a href="/sprint/{row["sprint"]}">詳細</a></td></tr>' for row in sprint_stats)}
    </table>
    """

    return BASE_HTML.format(title="ホーム", content=content)


@app.get("/progress", response_class=HTMLResponse)
def progress_view():
    conn = get_db()
    cursor = conn.cursor()

    # 研修生情報
    cursor.execute("SELECT * FROM personal.trainee WHERE id = 'default'")
    trainee = cursor.fetchone()

    # 進捗一覧（マスターとJOIN）
    # 進捗一覧（マスターとJOIN）
    cursor.execute("""
        SELECT
            ci.id,
            ci.domain,
            ci.title,
            p.status,
            p.updated_at,
            COUNT(cd.id) as total_details,
            SUM(CASE WHEN p2.status = 'check' THEN 1 ELSE 0 END) as checked_details
        FROM checklist_items ci
        LEFT JOIN personal.progress p ON ci.id = p.item_id
        LEFT JOIN checklist_details cd ON ci.id = cd.parent_id
        LEFT JOIN personal.progress p2 ON cd.id = p2.item_id
        GROUP BY ci.id
        ORDER BY ci.domain, ci.id
    """)
    items = cursor.fetchall()

    conn.close()

    rows = ""
    for item in items:
        status = item["status"]
        status_display = status or "未着手"
        status_class = f"status-{status}" if status else "status-none"
        
        # 詳細項目の進捗を確認
        if not status and item['total_details'] > 0:
            checked = item['checked_details'] or 0
            total = item['total_details']
            if checked == total:
                status_display = "Start Check" # 親項目自体のステータスが無いが完了している場合
                status_class = "status-check" 
                # 親が完了していないが子が完了している場合、本来は親も更新すべきだが、
                # 表示上は完了に見せる、あるいは「子は完了」と見せる
                status_display = "Check (Auto)"
            elif checked > 0:
                status_display = f"進行中 ({checked}/{total})"
                status_class = "status-explained"
        
        rows += f"""
        <tr>
            <td><a href="/item/{item['id']}">{item['id']}</a></td>
            <td><span class="domain">Domain {item['domain']}</span></td>
            <td>{item['title']}</td>
            <td><span class="status {status_class}">{status_display}</span></td>
        </tr>
        """

    content = f"""
    <h1>進捗状況</h1>
    <p>研修生: {trainee['name'] if trainee else '未設定'} | 現在のSprint: {trainee['current_sprint'] if trainee else '-'}</p>

    <table>
        <tr>
            <th>ID</th>
            <th>Domain</th>
            <th>タイトル</th>
            <th>Status</th>
        </tr>
        {rows}
    </table>
    """

    return BASE_HTML.format(title="進捗状況", content=content)


@app.get("/sprint/{sprint_num}", response_class=HTMLResponse)
def sprint_view(sprint_num: int):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            ci.id,
            ci.domain,
            ci.category,
            ci.subcategory,
            ci.title,
            ci.type,
            sp.required_status,
            p.status as current_status,
            COUNT(cd.id) as total_details,
            SUM(CASE WHEN p2.status = 'check' THEN 1 ELSE 0 END) as checked_details
        FROM sprint_plan sp
        JOIN checklist_items ci ON sp.item_id = ci.id
        LEFT JOIN personal.progress p ON ci.id = p.item_id
        LEFT JOIN checklist_details cd ON ci.id = cd.parent_id
        LEFT JOIN personal.progress p2 ON cd.id = p2.item_id
        WHERE sp.sprint = ?
        GROUP BY ci.id
        ORDER BY ci.domain, ci.id
    """, (sprint_num,))
    items = cursor.fetchall()

    conn.close()

    def render_status(status_json):
        statuses = json.loads(status_json)
        return " → ".join(f'<span class="status status-{s}">{s}</span>' for s in statuses)

    rows = ""
    for item in items:
        current = item["current_status"]
        current_display = current or "未着手"
        current_class = f"status-{current}" if current else "status-none"
        
        # 詳細項目の進捗を確認
        if not current and item['total_details'] > 0:
            checked = item['checked_details'] or 0
            total = item['total_details']
            if checked == total:
                current_display = "Check (Auto)"
                current_class = "status-check"
            elif checked > 0:
                current_display = f"進行中 ({checked}/{total})"
                current_class = "status-explained"

        rows += f"""
        <tr>
            <td><a href="/item/{item['id']}">{item['id']}</a></td>
            <td><span class="domain">Domain {item['domain']}</span></td>
            <td>{item['subcategory']}</td>
            <td>{item['title']}</td>
            <td>{render_status(item['required_status'])}</td>
            <td><span class="status {current_class}">{current_display}</span></td>
        </tr>
        """

    content = f"""
    <h1>Sprint {sprint_num} チェックリスト</h1>
    <p>全 {len(items)} 項目</p>

    <table>
        <tr>
            <th>ID</th>
            <th>Domain</th>
            <th>カテゴリ</th>
            <th>タイトル</th>
            <th>目標Status</th>
            <th>現在</th>
        </tr>
        {rows}
    </table>
    """

    return BASE_HTML.format(title=f"Sprint {sprint_num}", content=content)


@app.get("/domain/{domain}", response_class=HTMLResponse)
def domain_view(domain: str):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 
            ci.id, ci.category, ci.subcategory, ci.title, ci.type, p.status,
            COUNT(cd.id) as total_details,
            SUM(CASE WHEN p2.status = 'check' THEN 1 ELSE 0 END) as checked_details
        FROM checklist_items ci
        LEFT JOIN personal.progress p ON ci.id = p.item_id
        LEFT JOIN checklist_details cd ON ci.id = cd.parent_id
        LEFT JOIN personal.progress p2 ON cd.id = p2.item_id
        WHERE ci.domain = ?
        GROUP BY ci.id
        ORDER BY ci.id
    """, (domain,))
    items = cursor.fetchall()

    conn.close()

    rows = ""
    for item in items:
        status = item["status"]
        status_display = status or "未着手"
        status_class = f"status-{status}" if status else "status-none"

        # 詳細項目の進捗を確認
        if not status and item['total_details'] > 0:
            checked = item['checked_details'] or 0
            total = item['total_details']
            if checked == total:
                status_display = "Check (Auto)"
                status_class = "status-check"
            elif checked > 0:
                status_display = f"進行中 ({checked}/{total})"
                status_class = "status-explained"

        rows += f"""
        <tr>
            <td><a href="/item/{item['id']}">{item['id']}</a></td>
            <td>{item['subcategory']}</td>
            <td>{item['title']}</td>
            <td>{item['type']}</td>
            <td><span class="status {status_class}">{status_display}</span></td>
        </tr>
        """

    content = f"""
    <h1>Domain {domain}</h1>
    <p>全 {len(items)} 項目</p>

    <table>
        <tr>
            <th>ID</th>
            <th>カテゴリ</th>
            <th>タイトル</th>
            <th>タイプ</th>
            <th>Status</th>
        </tr>
        {rows}
    </table>
    """

    return BASE_HTML.format(title=f"Domain {domain}", content=content)


@app.get("/domains", response_class=HTMLResponse)
def domains_view():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT domain, category, COUNT(*) as cnt
        FROM checklist_items
        GROUP BY domain, category
        ORDER BY domain, category
    """)
    categories = cursor.fetchall()

    conn.close()

    rows = ""
    for cat in categories:
        rows += f"""
        <tr>
            <td><a href="/domain/{cat['domain']}">Domain {cat['domain']}</a></td>
            <td>{cat['category']}</td>
            <td>{cat['cnt']}</td>
        </tr>
        """

    content = f"""
    <h1>Domain一覧</h1>

    <table>
        <tr>
            <th>Domain</th>
            <th>カテゴリ</th>
            <th>項目数</th>
        </tr>
        {rows}
    </table>
    """

    return BASE_HTML.format(title="Domain一覧", content=content)


@app.get("/item/{item_id}", response_class=HTMLResponse)
def item_view(item_id: str):
    conn = get_db()
    cursor = conn.cursor()

    # 項目情報
    cursor.execute("""
        SELECT * FROM checklist_items WHERE id = ?
    """, (item_id,))
    item = cursor.fetchone()

    if not item:
        return BASE_HTML.format(title="Not Found", content="<h1>項目が見つかりません</h1>")

    # 進捗情報
    cursor.execute("""
        SELECT status, updated_at, note FROM personal.progress WHERE item_id = ?
    """, (item_id,))
    progress = cursor.fetchone()

    # Sprint計画
    cursor.execute("""
        SELECT sprint, required_status FROM sprint_plan WHERE item_id = ? ORDER BY sprint
    """, (item_id,))
    sprint_plans = cursor.fetchall()

    # 詳細項目と現在の進捗
    cursor.execute("""
        SELECT cd.*, p.status as current_status 
        FROM checklist_details cd 
        LEFT JOIN personal.progress p ON cd.id = p.item_id
        WHERE cd.parent_id = ? 
        ORDER BY cd.type, cd.id
    """, (item_id,))
    details = cursor.fetchall()

    conn.close()

    def render_status(status_json):
        statuses = json.loads(status_json)
        return " → ".join(f'<span class="status status-{s}">{s}</span>' for s in statuses)

    current_status = progress["status"] if progress else "未着手"
    current_class = f"status-{progress['status']}" if progress else "status-none"

    sprint_rows = ""
    for sp in sprint_plans:
        sprint_rows += f"""
        <tr>
            <td>Sprint {sp['sprint']}</td>
            <td>{render_status(sp['required_status'])}</td>
        </tr>
        """

    detail_rows = ""
    for d in details:
        current = d["current_status"] or "未着手"
        current_class = f"status-{d['current_status']}" if d["current_status"] else "status-none"
        detail_rows += f"""
        <tr>
            <td>{d['id']}</td>
            <td>{d['type']}</td>
            <td>{d['title']}</td>
            <td>{render_status(d['required_status'])}</td>
            <td><span class="status {current_class}">{current}</span></td>
        </tr>
        """

    content = f"""
    <h1>{item['id']}: {item['title']}</h1>

    <table>
        <tr><th>Domain</th><td>Domain {item['domain']}</td></tr>
        <tr><th>カテゴリ</th><td>{item['category']}</td></tr>
        <tr><th>サブカテゴリ</th><td>{item['subcategory']}</td></tr>
        <tr><th>タイプ</th><td>{item['type']}</td></tr>
        <tr><th>現在のStatus</th><td><span class="status {current_class}">{current_status}</span></td></tr>
    </table>

    <h2>Sprint計画</h2>
    <table>
        <tr><th>Sprint</th><th>到達Status</th></tr>
        {sprint_rows if sprint_rows else "<tr><td colspan='2'>Sprint計画なし</td></tr>"}
    </table>

    <h2>詳細項目</h2>
    <table>
        <tr><th>ID</th><th>タイプ</th><th>タイトル</th><th>到達Status</th><th>現在のStatus</th></tr>
        {detail_rows if detail_rows else "<tr><td colspan='5'>詳細項目なし</td></tr>"}
    </table>
    """

    return BASE_HTML.format(title=f"{item_id}: {item['title']}", content=content)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
