from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from common import BASE_HTML, get_db

router = APIRouter()


@router.get("/item/{item_id}", response_class=HTMLResponse)
def item_view(item_id: str):
    conn = get_db()
    cursor = conn.cursor()

    # 項目情報
    cursor.execute("""
        SELECT ci.*, s.name as subcategory_name, c.name as category_name, c.domain_id, d.name as domain_name
        FROM checklist_items ci
        JOIN subcategories s ON ci.subcategory_id = s.subcategory_id
        JOIN categories c ON s.category_id = c.category_id
        JOIN domains d ON c.domain_id = d.domain_id
        WHERE ci.item_id = ?
    """, (item_id,))
    item = cursor.fetchone()

    if not item:
        return BASE_HTML.format(title="Not Found", content="<h1>項目が見つかりません</h1>")

    # 進捗情報（trainee_item_statusテーブルは使用しない）
    progress = None

    # Sprint計画
    cursor.execute("""
        SELECT sprint, required_status FROM sprint_requirements WHERE item_id = ? ORDER BY sprint
    """, (item_id,))
    sprint_plans = cursor.fetchall()

    # リソース情報
    cursor.execute("""
        SELECT * FROM item_resources WHERE item_id = ? ORDER BY kind, title
    """, (item_id,))
    resources = cursor.fetchall()

    conn.close()

    type_display_map = {
        "check_only": "確認のみ",
        "judgment_focused": "判断重視",
        "implementation_optional": "実装選択",
        "implementation_required": "実装必須"
    }
    type_display = type_display_map.get(item["item_type"], item["item_type"])

    current_status = "-"
    current_class = "status-none"

    sprint_rows = ""
    for sp in sprint_plans:
        sprint_rows += f"""
        <tr>
            <td>Sprint {sp['sprint']}</td>
            <td><span class="status status-{sp['required_status'].lower()}">{sp['required_status']}</span></td>
        </tr>
        """

    resource_rows = ""
    if resources:
        for r in resources:
            resource_rows += f"""
            <tr>
                <td>{r['kind'] or '-'}</td>
                <td><a href="{r['url']}" target="_blank">{r['title']}</a></td>
            </tr>
            """
    else:
        resource_rows = "<tr><td colspan='2'>リソースなし</td></tr>"

    content = f"""
    <h1>{item['item_id']}: {item['title']}</h1>

    <table>
        <tr><th>Domain</th><td>{item['domain_name']}</td></tr>
        <tr><th>カテゴリ</th><td>{item['category_name']}</td></tr>
        <tr><th>サブカテゴリ</th><td>{item['subcategory_name']}</td></tr>
        <tr><th>タイプ</th><td>{type_display}</td></tr>
        <tr><th>説明</th><td>{item['description'] or '-'}</td></tr>
        <tr><th>現在のStatus</th><td><span class="status {current_class}">{current_status}</span></td></tr>
    </table>

    <h2>Sprint計画</h2>
    <table>
        <tr><th>Sprint</th><th>到達Status</th></tr>
        {sprint_rows if sprint_rows else "<tr><td colspan='2'>Sprint計画なし</td></tr>"}
    </table>

    <h2>リソース</h2>
    <table>
        <tr><th>フェーズ</th><th>リソース</th></tr>
        {resource_rows}
    </table>
    """

    return BASE_HTML.format(title=f"{item_id}: {item['title']}", content=content)
