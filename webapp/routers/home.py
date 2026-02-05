from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from common import BASE_HTML, get_db, TRAINEE_ROOT

router = APIRouter()


def _count_design_docs(sprint: int) -> tuple[int, int]:
    """
    Design phaseの進捗を計算（作成済みドキュメント種類数 / 10）

    チェック対象（10種類）:
    1. business-requirements/business-requirements.md
    2. personas/*.md（1つ以上あれば1）
    3. journey/journey.md
    4. specifications/*.md（1つ以上あれば1）
    5. requirements-v1/*.md（1つ以上あれば1）
    6. ipo/ipo.md
    7. data/data-list.md
    8. database/database-design.md
    9. requirements-v2/*.md（1つ以上あれば1）
    10. api/api-design.md
    """
    # training-sprint{N}ディレクトリを探す
    # 研修生ローカルルートの親ディレクトリから探索
    possible_paths = [
        TRAINEE_ROOT.parent / f"training-sprint{sprint}" / "docs" / "requirements",
        TRAINEE_ROOT / f"training-sprint{sprint}" / "docs" / "requirements",
        Path.home() / f"training-sprint{sprint}" / "docs" / "requirements",
    ]

    base_path = None
    for p in possible_paths:
        if p.exists():
            base_path = p
            break

    if not base_path:
        return 0, 10

    count = 0

    # 単一ファイルのチェック
    single_files = [
        "business-requirements/business-requirements.md",
        "journey/journey.md",
        "ipo/ipo.md",
        "data/data-list.md",
        "database/database-design.md",
        "api/api-design.md",
    ]
    for f in single_files:
        if (base_path / f).exists():
            count += 1

    # ディレクトリ内に1つ以上.mdファイルがあればカウント
    dir_checks = [
        "personas",
        "specifications",
        "requirements-v1",
        "requirements-v2",
    ]
    for d in dir_checks:
        dir_path = base_path / d
        if dir_path.exists() and list(dir_path.glob("*.md")):
            count += 1

    return count, 10


def _get_phase_progress(cursor, sprint: int) -> dict:
    """
    各phaseの進捗を取得

    Returns:
        {
            'learn': (achieved, required),
            'design': (achieved, required),
            'build': (achieved, required),
            'review': (achieved, required),
            'presentation': (achieved, required),
        }
    """
    progress = {}

    # Learn: クイズ合格数/問題数
    cursor.execute(
        """
        SELECT
            COUNT(DISTINCT qq.subcategory_id) AS total_count,
            COALESCE(COUNT(DISTINCT tqp.subcategory_id), 0) AS passed_count
        FROM quiz.quiz_questions qq
        LEFT JOIN personal.trainee_quiz_pass tqp
            ON tqp.trainee_id = 'default'
            AND tqp.sprint = qq.sprint
            AND tqp.subcategory_id = qq.subcategory_id
        WHERE qq.is_active = 1
          AND qq.sprint = ?
          AND EXISTS (
            SELECT 1
            FROM sprint_requirements sr
            JOIN checklist_items ci ON sr.item_id = ci.item_id
            JOIN status_defs sd ON sr.required_status = sd.status
            JOIN status_defs sd_checked ON sd_checked.status = 'CHECKED'
            WHERE sr.sprint = qq.sprint
              AND ci.subcategory_id = qq.subcategory_id
              AND ci.is_active = 1
              AND sd.rank >= sd_checked.rank
              AND NOT EXISTS (
                SELECT 1
                FROM sprint_requirements sr_prev
                JOIN status_defs sd_prev ON sr_prev.required_status = sd_prev.status
                WHERE sr_prev.item_id = sr.item_id
                  AND sr_prev.sprint < sr.sprint
                  AND sd_prev.rank >= sd_checked.rank
              )
          )
        """,
        (sprint,),
    )
    row = cursor.fetchone()
    if row:
        progress["learn"] = (row["passed_count"], row["total_count"])
    else:
        progress["learn"] = (0, 0)

    # Design: ドキュメント作成数/10
    progress["design"] = _count_design_docs(sprint)

    # Build/Review/Presentation: trainee_sprint_phasesのstatusを確認
    cursor.execute(
        """
        SELECT phase, status
        FROM personal.trainee_sprint_phases
        WHERE trainee_id = 'default' AND sprint = ?
        """,
        (sprint,),
    )
    phase_rows = cursor.fetchall()
    phase_status = {row["phase"]: row["status"] for row in phase_rows}

    for phase in ["build", "review", "presentation"]:
        status = phase_status.get(phase, "not_started")
        achieved = 1 if status == "completed" else 0
        progress[phase] = (achieved, 1)

    return progress


def _render_progress_bar(achieved: int, required: int) -> str:
    """進捗バーのHTMLを生成"""
    pct = int(round((achieved / required) * 100)) if required else 0
    bar = (
        f'<div style="width: 100%; height: 10px; border: 1px solid #cfd8dc; '
        f'border-radius: 6px; overflow: hidden; background: #fff;">'
        f'<div style="height: 100%; width: {pct}%; '
        f'background: linear-gradient(90deg, #ffffff 0%, #4caf50 100%);"></div>'
        f"</div>"
    )
    return (
        f"<td>"
        f'<div style="font-size: 12px; color: #333; margin-bottom: 4px;">{pct}%</div>'
        f'<div style="display: flex; align-items: center; gap: 6px;">'
        f'<div style="flex: 1;">{bar}</div>'
        f'<span style="font-size: 11px; color: #666; white-space: nowrap;">{achieved} / {required}</span>'
        f"</div>"
        f"</td>"
    )


@router.get("/", response_class=HTMLResponse)
def home():
    conn = get_db()
    cursor = conn.cursor()

    # Domain別統計
    cursor.execute("""
        SELECT d.domain_id, d.name, COUNT(ci.item_id) as cnt
        FROM domains d
        LEFT JOIN categories c ON d.domain_id = c.domain_id
        LEFT JOIN subcategories s ON c.category_id = s.category_id
        LEFT JOIN checklist_items ci ON s.subcategory_id = ci.subcategory_id
        GROUP BY d.domain_id, d.name
        ORDER BY d.domain_id
    """)
    domain_stats = cursor.fetchall()

    # Sprint別統計
    cursor.execute("""
        SELECT sr.sprint, COUNT(DISTINCT sr.item_id) as cnt
        FROM sprint_requirements sr
        GROUP BY sr.sprint
        ORDER BY sr.sprint
    """)
    sprint_stats = cursor.fetchall()

    # Phase別進捗（Sprint毎）
    phase_order = ["learn", "design", "build", "review", "presentation"]
    phase_labels = {
        "learn": "Learn",
        "design": "Design",
        "build": "Build",
        "review": "Review",
        "presentation": "Presentation",
    }

    # Sprint Status を取得するためのクエリ
    cursor.execute(
        """
        SELECT sprint, status
        FROM personal.trainee_sprint_phases
        WHERE trainee_id = 'default'
        """
    )
    all_phase_status = cursor.fetchall()

    # sprint -> {phase: status} のマップを作成
    sprint_phase_map = {}
    for row in all_phase_status:
        sprint = row["sprint"]
        if sprint not in sprint_phase_map:
            sprint_phase_map[sprint] = []
        sprint_phase_map[sprint].append(row["status"])

    def calc_sprint_status(sprint: int) -> str:
        """Sprint status を phase status から計算"""
        statuses = sprint_phase_map.get(sprint, [])
        if not statuses:
            return "not_started"
        if all(s == "not_started" for s in statuses):
            return "not_started"
        if all(s == "completed" for s in statuses):
            return "completed"
        return "in_progress"

    def render_status_badge(status: str) -> str:
        """Status バッジのHTMLを生成"""
        if status == "completed":
            return '<span style="background: #4caf50; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">完了</span>'
        elif status == "in_progress":
            return '<span style="background: #2196f3; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">進行中</span>'
        else:
            return '<span style="background: #9e9e9e; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">未開始</span>'

    sprint_progress_rows = ""
    for sprint in range(1, 5):
        progress = _get_phase_progress(cursor, sprint)
        cells = []
        for phase in phase_order:
            achieved, required = progress.get(phase, (0, 0))
            cells.append(_render_progress_bar(achieved, required))
        sprint_status = calc_sprint_status(sprint)
        status_cell = f"<td style='text-align: center;'>{render_status_badge(sprint_status)}</td>"
        sprint_progress_rows += f"<tr><td>Sprint {sprint}</td>{''.join(cells)}{status_cell}</tr>"

    conn.close()

    content = f"""
    <h1>R2B Progress Viewer</h1>

    <table>
        <tr>
            <th style="width: 80px;">Sprint</th>
            <th style="width: 120px;">{phase_labels['learn']}</th>
            <th style="width: 120px;">{phase_labels['design']}</th>
            <th style="width: 120px;">{phase_labels['build']}</th>
            <th style="width: 120px;">{phase_labels['review']}</th>
            <th style="width: 120px;">{phase_labels['presentation']}</th>
            <th style="width: 80px;">Status</th>
        </tr>
        {sprint_progress_rows}
    </table>
    <div style="border-bottom: 2px solid #007bff; margin: 20px 0;"></div>

    <h2>Domain別項目数</h2>
    <table>
        <tr><th>Domain</th><th>項目数</th><th></th></tr>
        {"".join(f'<tr><td>{row["name"]}</td><td>{row["cnt"]}</td><td><a href="/domain/{row["domain_id"]}">詳細</a></td></tr>' for row in domain_stats)}
    </table>

    <h2>Sprint別項目数</h2>
    <table>
        <tr><th>Sprint</th><th>項目数</th><th></th></tr>
        {"".join(f'<tr><td>Sprint {row["sprint"]}</td><td>{row["cnt"]}</td><td><a href="/sprint/{row["sprint"]}">詳細</a></td></tr>' for row in sprint_stats)}
    </table>
    """

    return BASE_HTML.format(title="ホーム", content=content)
