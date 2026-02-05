from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

from common import BASE_HTML, TRAINEE_ROOT, get_sprint_subtabs, markdown_to_html

router = APIRouter()


@router.get("/sprint/{sprint_num}/deliverables", response_class=HTMLResponse)
def sprint_deliverables_view(sprint_num: int, request: Request):
    """Sprint 成果物選択"""
    subtabs = get_sprint_subtabs(sprint_num, request.url.path)

    deliverables = [
        ("functions", "機能一覧", "functions.md"),
        ("ui", "画面仕様", "ui.md"),
        ("data", "データ仕様", "data.md"),
        ("api", "API仕様", "api.md"),
    ]

    cards = ""
    for key, label, _ in deliverables:
        cards += f"""
        <div class="deliverable-card">
            <a href="/sprint/{sprint_num}/deliverables/{key}">{label}</a>
        </div>
        """

    content = f"""
    <h1>Sprint {sprint_num} 成果物</h1>
    <div class="subtabs">
        {subtabs}
    </div>

    <p>以下の設計ドキュメントを選択してください：</p>
    <div class="deliverables-grid">
        {cards}
    </div>
    """

    return BASE_HTML.format(title=f"Sprint {sprint_num} - 成果物", content=content)


@router.get("/sprint/{sprint_num}/deliverables/{doc_type}", response_class=HTMLResponse)
def sprint_deliverable_detail_view(sprint_num: int, doc_type: str, request: Request):
    """Sprint 成果物詳細（ドキュメント表示）"""
    subtabs = get_sprint_subtabs(sprint_num, request.url.path)

    # ドキュメントタイプのマッピング
    doc_map = {
        "functions": ("機能一覧", "functions.md"),
        "ui": ("画面仕様", "ui.md"),
        "data": ("データ仕様", "data.md"),
        "api": ("API仕様", "api.md"),
    }

    if doc_type not in doc_map:
        return BASE_HTML.format(title="Not Found", content="<h1>ドキュメントが見つかりません</h1>")

    label, filename = doc_map[doc_type]

    # ドキュメントファイルを読み込み（スプリントリポジトリの docs/requirements/ から）
    doc_path = TRAINEE_ROOT / f"training-sprint{sprint_num}" / "docs" / "requirements" / filename

    if not doc_path.exists():
        doc_content = f"<p>{label} はまだ作成されていません。</p>"
    else:
        try:
            with open(doc_path, "r", encoding="utf-8") as f:
                doc_text = f.read()
                # マークダウンをHTMLにレンダリング
                html_content = markdown_to_html(doc_text)
                doc_content = f"<div class='doc-content'>{html_content}</div>"
        except Exception as e:
            doc_content = f"<p>ドキュメント読み込みエラー: {e}</p>"

    content = f"""
    <h1>Sprint {sprint_num} - {label}</h1>
    <div class="subtabs">
        {subtabs}
    </div>

    {doc_content}
    """

    return BASE_HTML.format(title=f"Sprint {sprint_num} - {label}", content=content)
