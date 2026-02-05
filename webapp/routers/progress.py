from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from common import BASE_HTML, get_db

router = APIRouter()


@router.get("/progress", response_class=HTMLResponse)
def progress_view():
    conn = get_db()
    cursor = conn.cursor()

    # 研修生情報
    cursor.execute("SELECT * FROM personal.trainees WHERE trainee_id = 'default'")
    trainee = cursor.fetchone()

    # Sprint毎のフェーズ進捗を取得
    cursor.execute(
        """
        SELECT
            sprint,
            phase,
            status,
            started_at,
            completed_at
        FROM personal.trainee_sprint_phases
        WHERE trainee_id = 'default'
        ORDER BY sprint,
            CASE phase
                WHEN 'learn' THEN 1
                WHEN 'design' THEN 2
                WHEN 'build' THEN 3
                WHEN 'review' THEN 4
                WHEN 'presentation' THEN 5
            END
        """
    )
    phase_rows = cursor.fetchall()
    conn.close()

    phase_to_column = {
        "learn": "Learn",
        "design": "Design",
        "build": "Build",
        "review": "Review",
        "presentation": "Presentation",
    }

    # stats[sprint][phase] = status
    stats = {sprint: {p: "not_started" for p in phase_to_column} for sprint in range(1, 5)}
    for row in phase_rows:
        sprint = row["sprint"]
        phase = row["phase"]
        if sprint in stats and phase in stats[sprint]:
            stats[sprint][phase] = row["status"]

    def status_display(status):
        if status == "completed":
            return '<span style="color: #28a745;">✅ 完了</span>'
        elif status == "in_progress":
            return '<span style="color: #007bff;">🔄 進行中</span>'
        else:
            return '<span style="color: #6c757d;">⬜ 未開始</span>'

    header_cells = "".join(f"<th>{label}</th>" for label in phase_to_column.values())
    body_rows = ""
    for sprint in range(1, 5):
        cells = []
        for phase in phase_to_column:
            status = stats[sprint][phase]
            cells.append(f"<td>{status_display(status)}</td>")
        body_rows += f"<tr><td>Sprint {sprint}</td>{''.join(cells)}</tr>"

    content = f"""
    <h1>進捗状況</h1>
    <p>研修生: {trainee['name'] if trainee else '未設定'}</p>

    <table>
        <tr>
            <th>Sprint</th>
            {header_cells}
        </tr>
        {body_rows}
    </table>
    """

    return BASE_HTML.format(title="進捗状況", content=content)
