from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, RedirectResponse

from common import (
    BASE_HTML,
    SPRINT_DOCS_METADATA,
    extract_title_from_md,
    extract_title_from_md_file,
    get_sprint_subtabs,
    markdown_to_html,
)

router = APIRouter()


@router.get("/sprint/{sprint_num}")
def sprint_view(sprint_num: int):
    """Sprint概要ページ（デフォルトは概要にリダイレクト）"""
    return RedirectResponse(url=f"/sprint/{sprint_num}/overview", status_code=302)


@router.get("/sprint/{sprint_num}/overview", response_class=HTMLResponse)
def sprint_overview_view(sprint_num: int, request: Request):
    """Sprint概要 - マークダウンファイル一覧（表形式）"""
    subtabs = get_sprint_subtabs(sprint_num, request.url.path)

    # webapp/Sprint{N}フォルダのマークダウンファイルを読み込み
    sprint_folder = Path(__file__).parent.parent / f"Sprint{sprint_num}"

    files_html = ""

    if sprint_folder.exists():
        # マークダウンファイルをリスト
        md_files = sorted(sprint_folder.glob("base-knowledge/*.md"))
        if sprint_num == 1:
            desired_order = [
                "Sprint1の全体像.md",
                "AI駆動開発.md",
                "設計原則.md",
                "開発手法.md",
                "LLM API.md",
                "補足項目.md",
            ]
            order_index = {name: idx for idx, name in enumerate(desired_order)}
            md_files.sort(key=lambda p: order_index.get(p.name, 999))

        if md_files:
            # メタデータを取得
            metadata = SPRINT_DOCS_METADATA.get(sprint_num, {})

            # 表形式で表示
            files_html = """
            <table style="width: 100%; border-collapse: collapse; background: white; margin-top: 20px;">
                <thead>
                    <tr style="background: #f8f9fa; border-bottom: 2px solid #007bff;">
                        <th style="padding: 15px; text-align: left; font-weight: 600;">タイトル</th>
                        <th style="padding: 15px; text-align: left; font-weight: 600;">概要</th>
                    </tr>
                </thead>
                <tbody>
            """

            for md_file in md_files:
                doc_stem = md_file.stem
                file_metadata = metadata.get(doc_stem, {})
                title = file_metadata.get("title", extract_title_from_md_file(md_file))
                summary = file_metadata.get("summary", "")

                files_html += f"""
                    <tr style="border-bottom: 1px solid #eee; cursor: pointer;" onclick="window.location.href='/sprint/{sprint_num}/overview/{doc_stem}';">
                        <td style="padding: 15px; vertical-align: top;">
                            <a href="/sprint/{sprint_num}/overview/{doc_stem}" style="color: #007bff; text-decoration: none; font-weight: 500; cursor: pointer;">
                                {title}
                            </a>
                        </td>
                        <td style="padding: 15px; vertical-align: top; color: #666;">
                            {summary}
                        </td>
                    </tr>
                """

            files_html += """
                </tbody>
            </table>
            """
        else:
            files_html = "<p>マークダウンファイルが見つかりません。</p>"
    else:
        files_html = f"<p>Sprint {sprint_num} のフォルダが見つかりません。</p>"

    content = f"""
    <h1>Sprint {sprint_num} 概要</h1>
    <div class="subtabs">
        {subtabs}
    </div>

    <h2>資料一覧</h2>
    {files_html}
    """

    return BASE_HTML.format(title=f"Sprint {sprint_num} - 概要", content=content)


@router.get("/sprint/{sprint_num}/overview/{doc_name}", response_class=HTMLResponse)
def sprint_overview_detail_view(sprint_num: int, doc_name: str, request: Request):
    """Sprint概要 - 詳細ドキュメント表示"""
    subtabs = get_sprint_subtabs(sprint_num, request.url.path)

    # ファイル名から .md を読み込み
    sprint_folder = Path(__file__).parent.parent / f"Sprint{sprint_num}"
    doc_file = sprint_folder / "base-knowledge" / f"{doc_name}.md"

    if not doc_file.exists():
        # sprint{N}- プレフィックスを試す
        doc_file = sprint_folder / "base-knowledge" / f"sprint{sprint_num}-{doc_name}.md"

    if not doc_file.exists():
        return BASE_HTML.format(title="Not Found", content="<h1>ドキュメントが見つかりません</h1>")

    try:
        with open(doc_file, "r", encoding="utf-8") as f:
            md_text = f.read()
            title = extract_title_from_md(md_text)
            html_content = markdown_to_html(md_text)
            doc_content = f"<div class='doc-content'>{html_content}</div>"
    except Exception as e:
        doc_content = f"<p>ドキュメント読み込みエラー: {e}</p>"
        title = "エラー"

    # 戻るリンク
    back_link = f'<p><a href="/sprint/{sprint_num}/overview">← 概要に戻る</a></p>'

    content = f"""
    <div class="subtabs">
        {subtabs}
    </div>

    {back_link}
    {doc_content}
    """

    return BASE_HTML.format(title=f"Sprint {sprint_num} - {title}", content=content)
