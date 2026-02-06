from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

from common import BASE_HTML, TRAINEE_ROOT, get_sprint_subtabs, markdown_to_html

router = APIRouter()

# home.py の _count_design_docs と一致する10種類の成果物定義
# (key, label, path, type)
#   type: "file" = 単一ファイル, "dir" = ディレクトリ内の *.md をすべて表示
DELIVERABLES = [
    ("business-requirements", "ビジネス要件", "business-requirements/business-requirements.md", "file"),
    ("personas", "ペルソナ", "personas", "dir"),
    ("journey", "ジャーニーマップ", "journey/journey.md", "file"),
    ("specifications", "仕様", "specifications", "dir"),
    ("requirements-v1", "要件定義v1", "requirements-v1", "dir"),
    ("ipo", "IPO", "ipo/ipo.md", "file"),
    ("data", "データ仕様", "data/data-list.md", "file"),
    ("database", "データベース設計", "database/database-design.md", "file"),
    ("requirements-v2", "要件定義v2", "requirements-v2", "dir"),
    ("api", "API仕様", "api/api-design.md", "file"),
]

# key → (label, path, type) のルックアップ
_DOC_MAP = {item[0]: (item[1], item[2], item[3]) for item in DELIVERABLES}


def _get_requirements_base(sprint_num: int) -> Path | None:
    """
    training-sprint{N}/docs/requirements のベースパスを取得。
    home.py の _count_design_docs と同じ探索順序。
    """
    possible_paths = [
        TRAINEE_ROOT.parent / f"training-sprint{sprint_num}" / "docs" / "requirements",
        TRAINEE_ROOT / f"training-sprint{sprint_num}" / "docs" / "requirements",
        Path.home() / f"training-sprint{sprint_num}" / "docs" / "requirements",
    ]
    for p in possible_paths:
        if p.exists():
            return p
    return None


def _check_exists(base_path: Path | None, path_str: str, dtype: str) -> bool:
    """成果物が存在するかチェック（home.py と同じ判定ロジック）"""
    if not base_path:
        return False
    if dtype == "file":
        return (base_path / path_str).exists()
    else:  # dir
        dir_path = base_path / path_str
        return dir_path.exists() and bool(list(dir_path.glob("*.md")))


@router.get("/sprint/{sprint_num}/deliverables", response_class=HTMLResponse)
def sprint_deliverables_view(sprint_num: int, request: Request):
    """Sprint 成果物選択"""
    subtabs = get_sprint_subtabs(sprint_num, request.url.path)
    base_path = _get_requirements_base(sprint_num)

    rows = ""
    for key, label, path_str, dtype in DELIVERABLES:
        exists = _check_exists(base_path, path_str, dtype)
        status_icon = "&#x2705;" if exists else "&#x2B1C;"
        rows += f"""
        <a href="/sprint/{sprint_num}/deliverables/{key}"
           style="display:flex; align-items:center; gap:10px; padding:12px 16px;
                  background:white; border:1px solid #e0e0e0; border-radius:6px;
                  text-decoration:none; color:#333; font-weight:500; transition:background 0.15s;"
           onmouseover="this.style.background='#f0f4ff'" onmouseout="this.style.background='white'">
            <span>{status_icon}</span>
            <span>{label}</span>
        </a>
        """

    content = f"""
    <h1>Sprint {sprint_num} 成果物</h1>
    <div class="subtabs">
        {subtabs}
    </div>

    <p>以下の設計ドキュメントを選択してください：</p>
    <div style="display:flex; flex-direction:column; gap:6px; margin:20px 0;">
        {rows}
    </div>
    """

    return BASE_HTML.format(title=f"Sprint {sprint_num} - 成果物", content=content)


@router.get("/sprint/{sprint_num}/deliverables/{doc_type}", response_class=HTMLResponse)
def sprint_deliverable_detail_view(sprint_num: int, doc_type: str, request: Request):
    """Sprint 成果物詳細（ドキュメント表示）"""
    subtabs = get_sprint_subtabs(sprint_num, request.url.path)

    if doc_type not in _DOC_MAP:
        return BASE_HTML.format(
            title="Not Found",
            content="<h1>ドキュメントが見つかりません</h1>",
        )

    label, path_str, dtype = _DOC_MAP[doc_type]
    base_path = _get_requirements_base(sprint_num)

    if not base_path:
        doc_content = f"<p>{label} はまだ作成されていません。</p>"
    elif dtype == "file":
        doc_path = base_path / path_str
        if not doc_path.exists():
            doc_content = f"<p>{label} はまだ作成されていません。</p>"
        else:
            try:
                doc_text = doc_path.read_text(encoding="utf-8")
                html_content = markdown_to_html(doc_text)
                doc_content = f"<div class='doc-content'>{html_content}</div>"
            except Exception as e:
                doc_content = f"<p>ドキュメント読み込みエラー: {e}</p>"
    else:  # dir — ディレクトリ内の全 .md を連結表示
        dir_path = base_path / path_str
        md_files = sorted(dir_path.glob("*.md")) if dir_path.exists() else []
        if not md_files:
            doc_content = f"<p>{label} はまだ作成されていません。</p>"
        else:
            try:
                sections = []
                for md_file in md_files:
                    doc_text = md_file.read_text(encoding="utf-8")
                    html_content = markdown_to_html(doc_text)
                    sections.append(
                        f"<div class='doc-content' style='margin-bottom: 24px; "
                        f"padding-bottom: 24px; border-bottom: 1px solid #e0e0e0;'>"
                        f"<div style='font-size: 12px; color: #888; margin-bottom: 8px;'>"
                        f"&#x1F4C4; {md_file.name}</div>"
                        f"{html_content}</div>"
                    )
                doc_content = "\n".join(sections)
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
