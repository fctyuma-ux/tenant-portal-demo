import json
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, JSONResponse

from common import BASE_HTML, get_db, get_sprint_subtabs, markdown_to_html, render_template

router = APIRouter()


@router.get("/sprint/{sprint_num}/quiz", response_class=HTMLResponse)
def sprint_quiz_view(sprint_num: int, request: Request):
    """Sprint クイズ"""
    subtabs = get_sprint_subtabs(sprint_num, request.url.path)

    conn = get_db()
    cursor = conn.cursor()

    # クイズデータ取得
    cursor.execute("""
        SELECT
            d.domain_id,
            d.name AS domain_name,
            c.category_id,
            c.name AS category_name,
            s.subcategory_id,
            s.name AS subcategory_name,
            s.sort_order AS subcategory_sort,
            qq.question_id,
            qq.question_text,
            qq.explanation,
            qc.choice_id,
            qc.choice_text,
            qc.is_correct,
            qc.sort_order AS choice_sort,
            qc.feedback,
            tqp.passed_at AS passed_at
        FROM quiz.quiz_questions qq
        JOIN quiz.quiz_choices qc ON qq.question_id = qc.question_id
        JOIN subcategories s ON qq.subcategory_id = s.subcategory_id
        JOIN categories c ON s.category_id = c.category_id
        JOIN domains d ON c.domain_id = d.domain_id
        LEFT JOIN personal.trainee_quiz_pass tqp
            ON tqp.trainee_id = 'default'
            AND tqp.sprint = qq.sprint
            AND tqp.subcategory_id = qq.subcategory_id
        WHERE qq.sprint = ? AND qq.is_active = 1
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
        ORDER BY d.domain_id, c.sort_order, s.sort_order, qc.sort_order
    """, (sprint_num,))

    all_rows = cursor.fetchall()
    conn.close()

    # JSONデータ構築
    quiz_data = {}
    for row in all_rows:
        did = str(row["domain_id"])
        cid = row["category_id"]

        if did not in quiz_data:
            quiz_data[did] = {"name": row["domain_name"], "categories": {}}

        if cid not in quiz_data[did]["categories"]:
            quiz_data[did]["categories"][cid] = {"name": row["category_name"], "questions": {}}

        sid = row["subcategory_id"]
        cat = quiz_data[did]["categories"][cid]

        if sid not in cat["questions"]:
            md_html = ""
            domain_name = row["domain_name"]
            category_name = row["category_name"]
            subcategory_name = row["subcategory_name"]
            md_path = (
                Path(__file__).parent.parent
                / f"Sprint{sprint_num}"
                / domain_name
                / category_name
                / f"{subcategory_name}.md"
            )
            if md_path.exists():
                try:
                    md_text = md_path.read_text(encoding="utf-8")
                    md_html = markdown_to_html(md_text)
                except Exception:
                    md_html = ""

            cat["questions"][sid] = {
                "question_id": row["question_id"],
                "subcategory_id": sid,
                "subcategory_name": row["subcategory_name"],
                "question_text": row["question_text"],
                "explanation": row["explanation"],
                "passed": row["passed_at"] is not None,
                "md_html": md_html,
                "choices": []
            }

        cat["questions"][sid]["choices"].append({
            "choice_id": row["choice_id"],
            "choice_text": row["choice_text"],
            "is_correct": bool(row["is_correct"]),
            "feedback": row["feedback"]
        })

    # questions をオブジェクトから配列に変換（sort_order順）
    for did in quiz_data:
        for cid in quiz_data[did]["categories"]:
            cat = quiz_data[did]["categories"][cid]
            cat["questions"] = list(cat["questions"].values())

    quiz_json = json.dumps(quiz_data, ensure_ascii=False).replace("</", "<\\/")
    domain_options = ""
    category_options = ""
    domain_items = list(quiz_data.items())
    if domain_items:
        first_domain_id, first_domain = domain_items[0]
        for domain_id, domain in domain_items:
            total_questions = 0
            passed_questions = 0
            for category in domain["categories"].values():
                total_questions += len(category["questions"])
                passed_questions += sum(1 for q in category["questions"] if q["passed"])
            is_complete = total_questions > 0 and total_questions == passed_questions
            indicator = "✅" if is_complete else "❌"
            color = "#28a745" if is_complete else "#dc3545"
            selected = " selected" if domain_id == first_domain_id else ""
            domain_options += (
                f'<option value="{domain_id}" data-complete="{str(is_complete).lower()}" '
                f'style="color: {color};"{selected}>{indicator} {domain["name"]}</option>'
            )

        first_categories = first_domain["categories"]
        for category_id, category in first_categories.items():
            total_questions = len(category["questions"])
            passed_questions = sum(1 for q in category["questions"] if q["passed"])
            is_complete = total_questions > 0 and total_questions == passed_questions
            indicator = "✅" if is_complete else "❌"
            color = "#28a745" if is_complete else "#dc3545"
            category_options += (
                f'<option value="{category_id}" data-complete="{str(is_complete).lower()}" '
                f'style="color: {color};">{indicator} {category["name"]}</option>'
            )

    content_template = """
    <h1>Sprint @SPRINT_NUM クイズ</h1>
    <div class="subtabs">
        @SUBTABS
    </div>

    <div id="quiz-container">
        <div id="selection-screen" style="display: block;">
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px;">
                <div id="sprint-progress" style="font-size: 26px; font-weight: 800; color: #111; margin-bottom: 12px;"></div>
                <div style="margin-bottom: 20px; display: none;">
                    <label id="mode-unpassed-label" style="margin-right: 20px; font-weight: 600;">
                        <input type="radio" name="quiz-mode" value="unpassed" checked> 未正解のみ
                    </label>
                    <label id="mode-all-label" style="font-weight: 600; display: none;">
                        <input type="radio" name="quiz-mode" value="all"> 全問題
                    </label>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 15px; align-items: end;">
                    <div>
                        <label for="domain-filter" style="display: block; margin-bottom: 5px; font-weight: 600; font-size: 14px;">Domain</label>
                        <select id="domain-filter" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                            @DOMAIN_OPTIONS
                        </select>
                    </div>

                    <div>
                        <label for="category-filter" style="display: block; margin-bottom: 5px; font-weight: 600; font-size: 14px;">カテゴリ</label>
                        <select id="category-filter" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;" disabled>
                            @CATEGORY_OPTIONS
                        </select>
                    </div>

                    <div>
                        <button onclick="startQuiz()" id="start-btn" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 14px;">開始</button>
                    </div>
                </div>

                <div id="quiz-info" style="margin-top: 15px; font-size: 14px; color: #666;"></div>
                <div id="subcategory-status-list" style="margin-top: 12px;"></div>
                <div id="subcategory-docs" style="margin-top: 12px;"></div>
                <div id="quiz-error" style="margin-top: 10px; color: #dc3545; font-weight: 600; display: none;"></div>
            </div>
        </div>

        <div id="quiz-screen" style="display: none;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div id="progress" style="font-weight: 600; font-size: 16px;"></div>
                <button onclick="abortQuiz()" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 14px;">中断</button>
            </div>

            <div style="background: #f0f0f0; padding: 10px 15px; border-radius: 4px; margin-bottom: 20px; font-weight: 600;">
                <span id="subcategory-label"></span>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px;">
                <div id="question-text" style="font-size: 16px; margin-bottom: 20px; line-height: 1.6;"></div>

                <div id="choices-container" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;"></div>
            </div>

            <div id="feedback-area" style="display: none; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px;">
                <div id="feedback-message" style="margin-bottom: 15px; font-weight: 600; font-size: 16px;"></div>
                <div style="border-top: 2px solid #ddd; padding-top: 15px;">
                    <div style="font-size: 14px; color: #666;">解説:</div>
                    <div id="explanation-text" style="margin-top: 10px; line-height: 1.6;"></div>
                </div>
            </div>

            <div id="buttons-area" style="display: none; text-align: center;">
                <button onclick="nextQuestion()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; margin-right: 10px;">次の問題に進む</button>
                <button onclick="abortQuiz()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">中断</button>
            </div>
        </div>

        <div id="completion-screen" style="display: none; text-align: center;">
            <div style="background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="font-size: 24px; font-weight: 600; margin-bottom: 30px;">
                    <span id="completion-message"></span>
                </div>
                <div style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;">
                    <button onclick="resetQuiz()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">別のカテゴリを選択</button>
                    <button id="retry-btn" onclick="retryQuiz()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; display: none;"></button>
                </div>
            </div>
        </div>
    </div>

    <script>
        const quizData = @QUIZ_JSON;
        let quizState = {
            mode: "unpassed",
            selectedDomain: null,
            selectedCategory: null,
            questionList: [],
            currentIndex: 0,
            answered: false,
            incorrectIds: new Set(),
            sprint: @SPRINT_NUM
        };

        function computeDomainCompletion(domain) {
            let totalQuestions = 0;
            let passedQuestions = 0;
            Object.values(domain.categories).forEach(category => {
                totalQuestions += category.questions.length;
                passedQuestions += category.questions.filter(q => q.passed).length;
            });

            const isComplete = totalQuestions > 0 && totalQuestions === passedQuestions;
            return { isComplete, totalQuestions, passedQuestions };
        }

        function populateDomains() {
            const select = document.getElementById('domain-filter');
            const domains = Object.keys(quizData).map(k => ({
                id: k,
                name: quizData[k].name
            }));

            if (domains.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'クイズが設定されていません';
                option.disabled = true;
                select.innerHTML = '';
                select.appendChild(option);
                document.getElementById('start-btn').disabled = true;
                return;
            }

            const frag = document.createDocumentFragment();
            domains.forEach(d => {
                const option = document.createElement('option');
                option.value = d.id;
                const domain = quizData[d.id];
                if (domain) {
                    const result = computeDomainCompletion(domain);
                    const indicator = result.isComplete ? '✅' : '❌';
                    option.textContent = `${indicator} ${domain.name}`;
                    option.dataset.complete = result.isComplete ? 'true' : 'false';
                    option.style.color = result.isComplete ? '#28a745' : '#dc3545';
                } else {
                    option.textContent = d.name;
                }
                frag.appendChild(option);
            });

            select.innerHTML = '';
            select.appendChild(frag);

            quizState.selectedDomain = domains[0].id;
            updateDomainIndicators();
            updateDomainSelectColor();
            updateCategories();
        }

        function updateDomainIndicators() {
            const domainSelect = document.getElementById('domain-filter');
            Array.from(domainSelect.options).forEach(option => {
                const domainId = option.value;
                const domain = quizData[domainId];
                if (!domain) {
                    return;
                }

                const result = computeDomainCompletion(domain);
                const indicator = result.isComplete ? '✅' : '❌';
                option.textContent = `${indicator} ${domain.name}`;
                option.dataset.complete = result.isComplete ? 'true' : 'false';
                option.style.color = result.isComplete ? '#28a745' : '#dc3545';
            });
        }

        function updateDomainSelectColor() {
            const domainSelect = document.getElementById('domain-filter');
            const selectedOption = domainSelect.options[domainSelect.selectedIndex];
            if (selectedOption) {
                const isComplete = selectedOption.dataset.complete === 'true';
                domainSelect.style.backgroundColor = isComplete ? '#d4edda' : '#fff3cd';
                domainSelect.style.borderColor = isComplete ? '#28a745' : '#dc3545';
            }
        }

        function updateCategories() {
            const domainId = document.getElementById('domain-filter').value;
            const categorySelect = document.getElementById('category-filter');

            categorySelect.innerHTML = '';

            if (!domainId || !quizData[domainId]) {
                categorySelect.disabled = true;
                document.getElementById('quiz-info').textContent = '';
                return;
            }

            categorySelect.disabled = false;
            const categories = Object.keys(quizData[domainId].categories).map(k => ({
                id: k,
                name: quizData[domainId].categories[k].name,
                questions: quizData[domainId].categories[k].questions
            }));

            categories.forEach(c => {
                const option = document.createElement('option');
                option.value = c.id;

                // 完了状態を計算
                const totalQuestions = c.questions.length;
                const passedQuestions = c.questions.filter(q => q.passed).length;
                const isComplete = totalQuestions > 0 && totalQuestions === passedQuestions;

                // テキストに完了状態を表示
                const indicator = isComplete ? '✅' : '❌';
                option.textContent = `${indicator} ${c.name}`;

                // data属性に完了状態を保存
                option.dataset.complete = isComplete ? 'true' : 'false';
                option.style.color = isComplete ? '#28a745' : '#dc3545';

                categorySelect.appendChild(option);
            });

            quizState.selectedDomain = domainId;
            if (categories.length > 0) {
                quizState.selectedCategory = categories[0].id;
                // 選択された項目の色を更新
                updateCategorySelectColor();
                updateCategoryIndicators();
                updateDomainIndicators();
                updateDomainSelectColor();
                renderSprintProgress();
                renderSubcategoryStatusList();
                renderSubcategoryDocs();
                updateQuizInfo().catch(err => console.error('Error updating quiz info:', err));
            }
        }

        function updateCategoryIndicators() {
            const domainId = quizState.selectedDomain;
            const categorySelect = document.getElementById('category-filter');
            if (!domainId || !quizData[domainId]) {
                return;
            }

            Array.from(categorySelect.options).forEach(option => {
                const categoryId = option.value;
                const category = quizData[domainId].categories[categoryId];
                if (!category) {
                    return;
                }

                const totalQuestions = category.questions.length;
                const passedQuestions = category.questions.filter(q => q.passed).length;
                const isComplete = totalQuestions > 0 && totalQuestions === passedQuestions;

                const indicator = isComplete ? '✅' : '❌';
                option.textContent = `${indicator} ${category.name}`;
                option.dataset.complete = isComplete ? 'true' : 'false';
                option.style.color = isComplete ? '#28a745' : '#dc3545';
            });
        }

        function updateCategorySelectColor() {
            const categorySelect = document.getElementById('category-filter');
            const selectedOption = categorySelect.options[categorySelect.selectedIndex];
            if (selectedOption) {
                // 選択された項目の完了状態に応じて背景色を変更
                const isComplete = selectedOption.dataset.complete === 'true';
                categorySelect.style.backgroundColor = isComplete ? '#d4edda' : '#fff3cd';
                categorySelect.style.borderColor = isComplete ? '#28a745' : '#dc3545';
            }
        }

        async function updateQuizInfo() {
            const domainId = quizState.selectedDomain;
            const categoryId = quizState.selectedCategory;

            if (!domainId || !categoryId || !quizData[domainId] || !quizData[domainId].categories[categoryId]) {
                return;
            }

            const allQuestions = quizData[domainId].categories[categoryId].questions;
            const selectedMode = document.querySelector('input[name="quiz-mode"]:checked').value;

            const totalCount = allQuestions.length;

            // サーバーから最新の合格数を取得
            try {
                const response = await fetch(`/quiz/category-stats/${quizState.sprint}/${categoryId}`);
                const stats = await response.json();
                const passedCount = stats.passed;

                const completed = totalCount - passedCount === 0;
                const effectiveMode = completed ? 'all' : 'unpassed';

                if (effectiveMode === 'unpassed') {
                    document.getElementById('quiz-info').innerHTML = `<span style="font-size: 20px; font-weight: bold;">未正解: ${totalCount - passedCount}問 (全体: ${totalCount}問中${passedCount}問完了)</span>`;
                    document.getElementById('start-btn').disabled = false;
                } else {
                    if (totalCount === 0) {
                        document.getElementById('quiz-info').innerHTML = 'このカテゴリのクイズ: 0問 (0問完了)';
                    } else {
                        document.getElementById('quiz-info').innerHTML = `<span style="font-size: 20px; font-weight: bold; color: #28a745;">このカテゴリの全問題は完了していますが、何度でも復習できます！</span>`;
                    }
                    document.getElementById('start-btn').disabled = totalCount === 0;
                }

                // モード選択肢の表示/非表示を切り替え
                if (completed) {
                    document.getElementById('mode-unpassed-label').style.display = 'none';
                    document.getElementById('mode-all-label').style.display = 'inline-block';
                    document.querySelector('input[name="quiz-mode"][value="all"]').checked = true;
                } else {
                    document.getElementById('mode-unpassed-label').style.display = 'inline-block';
                    document.getElementById('mode-all-label').style.display = 'none';
                    document.querySelector('input[name="quiz-mode"][value="unpassed"]').checked = true;
                }

                quizState.mode = effectiveMode;
                renderSprintProgress();
                renderSubcategoryStatusList();
                renderSubcategoryDocs();
            } catch (err) {
                console.error('Failed to fetch quiz stats:', err);
                // フォールバック: ローカルのデータを使用
                const passedCount = allQuestions.filter(q => q.passed).length;
                const completed = totalCount - passedCount === 0;
                const effectiveMode = completed ? 'all' : 'unpassed';

                if (effectiveMode === 'unpassed') {
                    document.getElementById('quiz-info').innerHTML = `<span style="font-size: 20px; font-weight: bold;">未正解: ${totalCount - passedCount}問 (全体: ${totalCount}問中${passedCount}問完了)</span>`;
                    document.getElementById('start-btn').disabled = false;
                } else {
                    if (totalCount === 0) {
                        document.getElementById('quiz-info').innerHTML = 'このカテゴリのクイズ: 0問 (0問完了)';
                    } else {
                        document.getElementById('quiz-info').innerHTML = `<span style="font-size: 20px; font-weight: bold; color: #28a745;">このカテゴリの全問題は完了していますが、何度でも復習できます！</span>`;
                    }
                    document.getElementById('start-btn').disabled = totalCount === 0;
                }

                if (completed) {
                    document.getElementById('mode-unpassed-label').style.display = 'none';
                    document.getElementById('mode-all-label').style.display = 'inline-block';
                    document.querySelector('input[name="quiz-mode"][value="all"]').checked = true;
                } else {
                    document.getElementById('mode-unpassed-label').style.display = 'inline-block';
                    document.getElementById('mode-all-label').style.display = 'none';
                    document.querySelector('input[name="quiz-mode"][value="unpassed"]').checked = true;
                }

                quizState.mode = effectiveMode;
                renderSprintProgress();
                renderSubcategoryStatusList();
                renderSubcategoryDocs();
            }
        }

        function renderSubcategoryStatusList() {
            const domainId = quizState.selectedDomain;
            const categoryId = quizState.selectedCategory;
            const container = document.getElementById('subcategory-status-list');

            if (!domainId || !categoryId || !quizData[domainId] || !quizData[domainId].categories[categoryId]) {
                container.innerHTML = '';
                return;
            }

            const questions = quizData[domainId].categories[categoryId].questions;
            if (questions.length === 0) {
                container.innerHTML = '';
                return;
            }

            const rows = questions.map(q => {
                const indicator = q.passed ? '✅' : '❌';
                const color = q.passed ? '#28a745' : '#dc3545';
                return `
                    <div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;">
                        <span style="color: ${color}; font-weight: 700;">${indicator}</span>
                        <span style="font-size: 13px; color: #333;">${q.subcategory_name}</span>
                    </div>
                `;
            }).join('');

            container.innerHTML = `
                <div style="background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 6px; padding: 10px;">
                    <div style="font-size: 12px; color: #666; margin-bottom: 6px;">このカテゴリ内のサブカテゴリ達成状況</div>
                    ${rows}
                </div>
            `;
        }

        function renderSubcategoryDocs() {
            const domainId = quizState.selectedDomain;
            const categoryId = quizState.selectedCategory;
            const container = document.getElementById('subcategory-docs');

            if (!domainId || !categoryId || !quizData[domainId] || !quizData[domainId].categories[categoryId]) {
                container.innerHTML = '';
                return;
            }

            const questions = quizData[domainId].categories[categoryId].questions;
            if (questions.length === 0) {
                container.innerHTML = '';
                return;
            }

            const options = questions
                .map(q => {
                    const title = q.subcategory_name || '';
                    const hasDoc = q.md_html && q.md_html.trim().length > 0;
                    if (!hasDoc) {
                        return '';
                    }
                    return `<option value="${q.subcategory_id}">${title}</option>`;
                })
                .join('');

            const firstDoc = questions.find(
                q => q.md_html && q.md_html.trim().length > 0
            );
            const firstId = firstDoc ? firstDoc.subcategory_id : '';
            const firstBody = firstDoc ? firstDoc.md_html : '';

            if (!options) {
                container.innerHTML = '';
                return;
            }

            container.innerHTML = `
                <div style="font-size: 12px; color: #666; margin-bottom: 6px;">このカテゴリの詳説</div>
                <div style="display: grid; grid-template-columns: 220px 1fr; gap: 12px;">
                    <div>
                        <select id="subcategory-doc-select" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                            ${options}
                        </select>
                    </div>
                    <div id="subcategory-doc-panel" style="background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                        <div class="doc-content">${firstBody}</div>
                    </div>
                </div>
            `;

            const select = document.getElementById('subcategory-doc-select');
            if (select && firstId) {
                select.value = firstId;
            }
            if (select) {
                select.addEventListener('change', () => {
                    const selectedId = select.value;
                    const selected = questions.find(q => q.subcategory_id === selectedId);
                    const panel = document.getElementById('subcategory-doc-panel');
                    if (panel) {
                        panel.innerHTML = `<div class="doc-content">${selected ? selected.md_html : ''}</div>`;
                    }
                });
            }
        }

        function renderSprintProgress() {
            const container = document.getElementById('sprint-progress');
            let total = 0;
            let passed = 0;

            Object.values(quizData).forEach(domain => {
                Object.values(domain.categories).forEach(category => {
                    total += category.questions.length;
                    passed += category.questions.filter(q => q.passed).length;
                });
            });

            if (total === 0) {
                container.textContent = '';
                return;
            }

            container.textContent = `Sprint ${quizState.sprint} 進捗: ${passed} / ${total} 完了`;
        }

        function startQuiz() {
            const domainId = quizState.selectedDomain;
            const categoryId = quizState.selectedCategory;
            let mode = document.querySelector('input[name="quiz-mode"]:checked').value;

            if (!domainId || !categoryId || !quizData[domainId] || !quizData[domainId].categories[categoryId]) {
                return;
            }

            const allQuestions = quizData[domainId].categories[categoryId].questions;
            quizState.questionList = mode === 'unpassed' ? allQuestions.filter(q => !q.passed) : allQuestions;
            quizState.incorrectIds = new Set();

            if (quizState.questionList.length === 0) {
                // すべての問題が完了している場合（unpassed モードで全問正解）
                if (allQuestions.every(q => q.passed)) {
                    // 「全問題」モードに自動切り替えして、すべての問題を使用
                    document.querySelector('input[name="quiz-mode"][value="all"]').checked = true;
                    quizState.questionList = allQuestions;
                    mode = 'all';
                    // 以下、通常のクイズ開始処理に進む
                } else {
                    document.getElementById('quiz-error').textContent = 'クイズが見つかりません。';
                    document.getElementById('quiz-error').style.display = 'block';
                    return;
                }
            }

            quizState.currentIndex = 0;
            quizState.answered = false;
            quizState.mode = mode;

            document.getElementById('selection-screen').style.display = 'none';
            document.getElementById('quiz-screen').style.display = 'block';
            document.getElementById('completion-screen').style.display = 'none';

            showQuestion();
        }

        function showQuestion() {
            const q = quizState.questionList[quizState.currentIndex];

            document.getElementById('progress').textContent = `問題 ${quizState.currentIndex + 1} / ${quizState.questionList.length}`;
            document.getElementById('subcategory-label').textContent = `【 ${q.subcategory_name} 】`;
            document.getElementById('question-text').textContent = q.question_text;

            const choicesContainer = document.getElementById('choices-container');
            choicesContainer.innerHTML = '';

            q.choices.forEach((choice, idx) => {
                const btn = document.createElement('button');
                btn.style.cssText = 'padding: 15px; text-align: left; border: 1px solid #ccc; border-radius: 4px; background: white; cursor: pointer; font-size: 14px; transition: background-color 0.2s;';
                btn.textContent = choice.choice_text;
                btn.onclick = () => submitAnswer(choice.choice_id);
                btn.onmouseover = () => { if (!quizState.answered) btn.style.background = '#f0f0f0'; };
                btn.onmouseout = () => { if (!quizState.answered) btn.style.background = 'white'; };
                choicesContainer.appendChild(btn);
            });

            document.getElementById('feedback-area').style.display = 'none';
            document.getElementById('buttons-area').style.display = 'none';
        }

        function submitAnswer(choiceId) {
            if (quizState.answered) return;

            const q = quizState.questionList[quizState.currentIndex];
            const choice = q.choices.find(c => c.choice_id === choiceId);

            if (!choice) return;

            quizState.answered = true;

            const choiceButtons = document.querySelectorAll('#choices-container button');
            choiceButtons.forEach(btn => {
                btn.disabled = true;
                btn.style.cursor = 'default';
                btn.onmouseover = null;
                btn.onmouseout = null;
            });

            const isCorrect = choice.is_correct;
            q.choices.forEach((c, idx) => {
                const btn = choiceButtons[idx];
                if (c.choice_id === choiceId) {
                    if (isCorrect) {
                        btn.style.background = '#d4edda';
                        btn.style.borderColor = '#28a745';
                        btn.style.color = '#155724';
                        btn.textContent = '✓ ' + c.choice_text;
                    } else {
                        btn.style.background = '#f8d7da';
                        btn.style.borderColor = '#dc3545';
                        btn.style.color = '#721c24';
                        btn.textContent = '✗ ' + c.choice_text;
                    }
                } else if (c.is_correct) {
                    btn.style.background = '#d4edda';
                    btn.style.borderColor = '#28a745';
                    btn.style.color = '#155724';
                    btn.textContent = '✓ ' + c.choice_text;
                } else {
                    btn.style.background = '#e2e3e5';
                    btn.style.borderColor = '#d3d3d3';
                    btn.style.color = '#666';
                }
            });

            const feedbackMsg = document.getElementById('feedback-message');
            if (isCorrect) {
                feedbackMsg.textContent = '✓ 正解！' + (choice.feedback || '');
                feedbackMsg.style.color = '#155724';
            } else {
                feedbackMsg.textContent = '✗ 不正解。' + (choice.feedback || '');
                feedbackMsg.style.color = '#721c24';
            }

            document.getElementById('explanation-text').textContent = q.explanation || '';
            document.getElementById('feedback-area').style.display = 'block';
            document.getElementById('buttons-area').style.display = 'block';

            // 楽観的に passed フラグを更新
            if (isCorrect) {
                q.passed = true;
                quizState.incorrectIds.delete(q.question_id);
                updateCategoryIndicators();
                updateCategorySelectColor();
                updateDomainIndicators();
                updateDomainSelectColor();
                renderSprintProgress();
                renderSubcategoryStatusList();
                renderSubcategoryDocs();
            } else {
                quizState.incorrectIds.add(q.question_id);
                renderSubcategoryStatusList();
                renderSubcategoryDocs();
            }

            // サーバーに非同期で記録（fire-and-forget）
            fetch('/quiz/submit', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    sprint: quizState.sprint,
                    question_id: q.question_id,
                    choice_id: choiceId
                })
            });
        }

        function nextQuestion() {
            quizState.currentIndex += 1;
            if (quizState.currentIndex >= quizState.questionList.length) {
                showCompletion();
            } else {
                quizState.answered = false;
                showQuestion();
            }
        }

        function showCompletion() {
            const categoryName = Object.values(quizData[quizState.selectedDomain].categories)
                .find(cat => cat === quizData[quizState.selectedDomain].categories[quizState.selectedCategory]).name;

            document.getElementById('completion-message').textContent = `カテゴリ「${categoryName}」のクイズ完了！`;

            // 未正解があるかチェック
            const hasIncorrect = quizState.incorrectIds.size > 0;
            const retryBtn = document.getElementById('retry-btn');

            if (hasIncorrect) {
                retryBtn.textContent = '間違えた問題だけ再挑戦';
                retryBtn.dataset.mode = 'incorrect';
            } else {
                retryBtn.textContent = '全問題でもう一度';
                retryBtn.dataset.mode = 'all';
            }
            retryBtn.style.display = 'block';

            document.getElementById('quiz-screen').style.display = 'none';
            document.getElementById('completion-screen').style.display = 'block';
        }

        function retryQuiz() {
            const mode = document.getElementById('retry-btn').dataset.mode;
            quizState.mode = mode;
            quizState.currentIndex = 0;
            quizState.answered = false;

            const allQuestions = quizData[quizState.selectedDomain].categories[quizState.selectedCategory].questions;
            if (mode === 'incorrect') {
                const retryIds = Array.from(quizState.incorrectIds);
                quizState.incorrectIds = new Set();
                quizState.questionList = allQuestions.filter(q => retryIds.includes(q.question_id));
            } else if (mode === 'unpassed') {
                quizState.incorrectIds = new Set();
                quizState.questionList = allQuestions.filter(q => !q.passed);
            } else {
                quizState.incorrectIds = new Set();
                quizState.questionList = allQuestions;
            }

            document.getElementById('completion-screen').style.display = 'none';
            document.getElementById('quiz-screen').style.display = 'block';
            showQuestion();
        }

        function abortQuiz() {
            resetQuiz();
        }

        function resetQuiz() {
            quizState.currentIndex = 0;
            quizState.answered = false;
            quizState.questionList = [];
            quizState.incorrectIds = new Set();

            document.getElementById('selection-screen').style.display = 'block';
            document.getElementById('quiz-screen').style.display = 'none';
            document.getElementById('completion-screen').style.display = 'none';
            document.getElementById('quiz-error').style.display = 'none';

            // 選択画面に戻ったときにクイズ情報を更新（最新のデータベース情報を反映）
            updateQuizInfo().catch(err => console.error('Error updating quiz info:', err));
            updateCategoryIndicators();
            updateCategorySelectColor();
            updateDomainIndicators();
            updateDomainSelectColor();
            renderSprintProgress();
            renderSubcategoryStatusList();
            renderSubcategoryDocs();
        }

        // イベントリスナー設定
        document.getElementById('domain-filter').addEventListener('change', () => {
            const newDomain = document.getElementById('domain-filter').value;
            if (newDomain && quizData[newDomain]) {
                quizState.selectedDomain = newDomain;
                updateDomainSelectColor();
                updateCategories();
            }
        });

        document.getElementById('category-filter').addEventListener('change', () => {
            const categoryId = document.getElementById('category-filter').value;
            quizState.selectedCategory = categoryId;
            updateCategorySelectColor();
            updateQuizInfo().catch(err => console.error('Error updating quiz info:', err));
            renderSubcategoryStatusList();
            renderSubcategoryDocs();
        });

        document.querySelectorAll('input[name="quiz-mode"]').forEach(radio => {
            radio.addEventListener('change', () => {
                quizState.mode = radio.value;
                updateQuizInfo().catch(err => console.error('Error updating quiz info:', err));
            });
        });

        // 初期化
        populateDomains();
    </script>
    """

    content = render_template(
        content_template,
        SPRINT_NUM=sprint_num,
        SUBTABS=subtabs,
        QUIZ_JSON=quiz_json,
        DOMAIN_OPTIONS=domain_options,
        CATEGORY_OPTIONS=category_options,
    )

    return BASE_HTML.format(title=f"Sprint {sprint_num} - クイズ", content=content)


@router.post("/quiz/submit")
async def quiz_submit(request: Request):
    """クイズ回答の記録"""
    try:
        body = await request.json()
    except Exception:
        return JSONResponse(status_code=400, content={"error": "invalid json"})

    sprint = body.get("sprint")
    question_id = body.get("question_id")
    choice_id = body.get("choice_id")

    if not all([sprint, question_id, choice_id]):
        return JSONResponse(status_code=400, content={"error": "missing fields"})

    conn = get_db()
    cursor = conn.cursor()

    # サーバー側で正解を検証し、subcategory_id を取得
    cursor.execute("""
        SELECT qc.is_correct, qc.choice_text, qq.subcategory_id
        FROM quiz.quiz_choices qc
        JOIN quiz.quiz_questions qq ON qc.question_id = qq.question_id
        WHERE qc.choice_id = ? AND qc.question_id = ?
    """, (choice_id, question_id))

    row = cursor.fetchone()
    if not row:
        conn.close()
        return JSONResponse(status_code=400, content={"error": "invalid question_id/choice_id pair"})

    is_correct = bool(row["is_correct"])
    choice_text = row["choice_text"]
    subcategory_id = row["subcategory_id"]

    # answer_payload 作成
    payload = json.dumps({
        "choice_id": choice_id,
        "choice_text": choice_text,
        "submitted_at": datetime.now(timezone.utc).isoformat()
    }, ensure_ascii=False)

    # 受験記録を挿入
    cursor.execute("""
        INSERT INTO personal.trainee_quiz_attempts
            (trainee_id, sprint, subcategory_id, question_id, is_correct, answer_payload)
        VALUES ('default', ?, ?, ?, ?, ?)
    """, (sprint, subcategory_id, question_id, 1 if is_correct else 0, payload))

    # 正解時に合格記録を挿入（既に合格済みなら無視）
    if is_correct:
        cursor.execute("""
            INSERT OR IGNORE INTO personal.trainee_quiz_pass
                (trainee_id, sprint, subcategory_id)
            VALUES ('default', ?, ?)
        """, (sprint, subcategory_id))

    conn.commit()
    attempt_id = cursor.lastrowid
    conn.close()

    return JSONResponse(content={"ok": True, "is_correct": is_correct, "attempt_id": attempt_id})


@router.get("/quiz/category-stats/{sprint_num}/{category_id}")
async def quiz_category_stats(sprint_num: int, category_id: str):
    """カテゴリ内の合格情報を取得"""
    conn = get_db()
    cursor = conn.cursor()

    # そのカテゴリ内の全問題数と合格問題数を取得
    cursor.execute(
        """
        SELECT
            COUNT(DISTINCT qq.subcategory_id) AS total_count,
            COALESCE(COUNT(DISTINCT tqp.subcategory_id), 0) AS passed_count
        FROM quiz.quiz_questions qq
        JOIN subcategories s ON qq.subcategory_id = s.subcategory_id
        JOIN categories c ON s.category_id = c.category_id
        LEFT JOIN personal.trainee_quiz_pass tqp
            ON tqp.trainee_id = 'default'
            AND tqp.sprint = qq.sprint
            AND tqp.subcategory_id = qq.subcategory_id
        WHERE qq.sprint = ? AND c.category_id = ? AND qq.is_active = 1
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
        (sprint_num, category_id),
    )

    row = cursor.fetchone()
    conn.close()

    if not row:
        return JSONResponse(content={"total": 0, "passed": 0})

    return JSONResponse(content={
        "total": row["total_count"],
        "passed": row["passed_count"]
    })
