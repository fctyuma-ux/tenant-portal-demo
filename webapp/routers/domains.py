from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from common import BASE_HTML, get_db

router = APIRouter()


@router.get("/domain/{domain_id}", response_class=HTMLResponse)
def domain_view(domain_id: int):
    conn = get_db()
    cursor = conn.cursor()

    # Domain情報を取得
    cursor.execute("SELECT name FROM domains WHERE domain_id = ?", (domain_id,))
    domain = cursor.fetchone()
    if not domain:
        return BASE_HTML.format(title="Not Found", content="<h1>Domainが見つかりません</h1>")

    cursor.execute("""
        SELECT
            ci.item_id,
            c.name as category_name,
            s.name as subcategory_name,
            ci.title,
            ci.item_type
        FROM checklist_items ci
        JOIN subcategories s ON ci.subcategory_id = s.subcategory_id
        JOIN categories c ON s.category_id = c.category_id
        WHERE c.domain_id = ?
        ORDER BY ci.item_id
    """, (domain_id,))
    items = cursor.fetchall()

    conn.close()

    type_display_map = {
        "check_only": "確認のみ",
        "judgment_focused": "判断重視",
        "implementation_optional": "実装選択",
        "implementation_required": "実装必須"
    }

    rows = ""
    for item in items:
        type_display = type_display_map.get(item["item_type"], item["item_type"])

        rows += f"""
        <tr>
            <td><a href="/item/{item['item_id']}">{item['item_id']}</a></td>
            <td>{item['subcategory_name']}</td>
            <td>{item['title']}</td>
            <td>{type_display}</td>
        </tr>
        """

    content = f"""
    <h1>{domain['name']}</h1>
    <p>全 {len(items)} 項目</p>

    <table>
        <tr>
            <th>ID</th>
            <th>サブカテゴリ</th>
            <th>タイトル</th>
            <th>タイプ</th>
        </tr>
        {rows}
    </table>
    """

    return BASE_HTML.format(title=f"{domain['name']}", content=content)


@router.get("/domains", response_class=HTMLResponse)
def domains_view():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT d.domain_id, d.name, c.category_id, c.name as category_name, COUNT(ci.item_id) as cnt
        FROM domains d
        LEFT JOIN categories c ON d.domain_id = c.domain_id
        LEFT JOIN subcategories s ON c.category_id = s.category_id
        LEFT JOIN checklist_items ci ON s.subcategory_id = ci.subcategory_id
        GROUP BY d.domain_id, c.category_id
        ORDER BY d.domain_id, c.category_id
    """)
    categories = cursor.fetchall()

    conn.close()

    rows = ""
    for cat in categories:
        rows += f"""
        <tr>
            <td><a href="/domain/{cat['domain_id']}">{cat['name']}</a></td>
            <td>{cat['category_name'] or '-'}</td>
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
